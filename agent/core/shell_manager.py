"""Shell process management for DeployX agent."""
import subprocess
import threading
import platform
import os
import signal
import logging
import asyncio
import time

logger = logging.getLogger(__name__)

class ShellManager:
    def __init__(self):
        self.current_process: subprocess.Popen = None
        self.current_shell = None
        self.output_thread = None
        self.running = False
        self.output_callback = None
        self.last_command = ""
        self.command_history = []
        self.history_index = 0

    async def start_shell(self, shell_name: str, shell_path: str, output_callback):
        """Start a shell subprocess using provided path."""
        try:
            logger.info(f"Starting shell {shell_name} with path {shell_path}")
            await self.cleanup_process()
            self.output_callback = output_callback

            if not os.path.exists(shell_path):
                logger.error(f"Shell executable not found at path: {shell_path}")
                return False

            # Configure shell arguments for interactivity
            env = os.environ.copy()
            env["PYTHONUNBUFFERED"] = "1"
            env["TERM"] = "xterm-256color"
            
            if shell_name == "cmd":
                cmd = [shell_path, "/Q"]  # /Q for no echo, no /K to allow clean prompt
            elif shell_name in ["powershell", "pwsh"]:
                # Minimal PowerShell configuration
                cmd = [
                    shell_path,
                    "-NoExit",
                    "-Command",
                    "$ErrorActionPreference='Stop'; $ProgressPreference='SilentlyContinue';"
                ]
            elif shell_name == "bash":
                env["PS1"] = "\\w\\$ "  # Set simple prompt
                if platform.system().lower() == "windows":
                    if "system32" in shell_path.lower() or "windowsapps" in shell_path.lower():
                        git_bash = r"C:\Program Files\Git\bin\bash.exe"
                        if os.path.exists(git_bash):
                            shell_path = git_bash
                            logger.info(f"Using Git Bash at: {git_bash}")
                cmd = [shell_path, "--login", "-i"]
            else:
                cmd = [shell_path, "-i"]
            
            logger.info(f"Prepared command: {cmd}")

            logger.info(f"Starting shell process: {' '.join(cmd)}")

            env = os.environ.copy()
            env["PYTHONUNBUFFERED"] = "1"
            env["TERM"] = "xterm-256color"

            system = platform.system().lower()
            if system == "windows":
                startup_info = subprocess.STARTUPINFO()
                startup_info.dwFlags |= subprocess.STARTF_USESHOWWINDOW
                startup_info.wShowWindow = subprocess.SW_HIDE
                
                self.current_process = subprocess.Popen(
                    cmd,
                    stdin=subprocess.PIPE,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    text=True,
                    bufsize=0,
                    env=env,
                    creationflags=subprocess.CREATE_NEW_PROCESS_GROUP,
                    startupinfo=startup_info
                )
            else:
                self.current_process = subprocess.Popen(
                    cmd,
                    stdin=subprocess.PIPE,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    text=True,
                    bufsize=0,
                    env=env,
                    preexec_fn=os.setsid
                )

            self.current_shell = shell_name
            self.running = True

            # Start output thread
            self.output_thread = threading.Thread(target=self._monitor_output, daemon=True)
            self.output_thread.start()

            # Verify shell is running and responsive
            if self.current_process.poll() is not None:
                logger.error(f"Shell process terminated immediately with code {self.current_process.returncode}")
                return False
                
            # Give the shell a moment to initialize
            await asyncio.sleep(0.5)
                
            logger.info(f"Shell {shell_name} started successfully")
            return True

        except Exception as e:
            logger.error(f"Failed to start shell {shell_name}: {e}")
            return False

    def _monitor_output(self):
        """Monitor subprocess output in a separate thread."""
        try:
            while self.running and self.current_process and self.current_process.poll() is None:
                try:
                    # Handle non-Windows systems with select
                    if platform.system().lower() != "windows":
                        import select
                        ready, _, _ = select.select([self.current_process.stdout], [], [], 0.1)
                        if ready:
                            data = self.current_process.stdout.read(4096)
                            if not data:
                                time.sleep(0.01)
                                continue
                        else:
                            time.sleep(0.01)
                            continue
                    # Handle Windows systems
                    else:
                        try:
                            data = os.read(self.current_process.stdout.fileno(), 4096)
                            if isinstance(data, bytes):
                                data = data.decode('utf-8', errors='replace')
                        except OSError:
                            time.sleep(0.01)
                            continue
                    
                    if data:
                        try:
                            if self.output_callback:
                                loop = asyncio.new_event_loop()
                                asyncio.set_event_loop(loop)
                                loop.run_until_complete(self.output_callback(data))
                                loop.close()
                        except Exception as e:
                            logger.error(f"Failed to send output: {e}")

                    elif self.current_process.poll() is not None:
                        break
                    else:
                        time.sleep(0.01)

                except Exception as e:
                    logger.error(f"Error reading output: {e}")
                    break

        except Exception as e:
            logger.error(f"Output monitoring error: {e}")
        finally:
            if self.current_process and self.current_process.poll() is not None:
                try:
                    exit_code = self.current_process.returncode
                    exit_message = f"\r\n[Process exited with code {exit_code}]\r\n"
                    if self.output_callback:
                        loop = asyncio.new_event_loop()
                        asyncio.set_event_loop(loop)
                        loop.run_until_complete(self.output_callback(exit_message))
                        loop.close()
                except Exception as e:
                    logger.error(f"Failed to send exit message: {e}")

    async def execute_command(self, command: str):
        """Execute command in the current shell."""
        if not self.current_process:
            logger.error("No shell process exists")
            return False

        if self.current_process.poll() is not None:
            logger.error(f"Shell process has terminated with code {self.current_process.returncode}")
            return False

        try:
            # Special handling for control sequences
            if command == '\u0003':  # Ctrl+C
                logger.info("Received Ctrl+C signal")
                return await self.send_interrupt(force=True)
            elif command == '\u001A':  # Ctrl+Z
                logger.info("Received Ctrl+Z signal")
                return await self.send_suspend(force=True)
            elif command == '\u0004':  # Ctrl+D
                logger.info("Received Ctrl+D signal")
                if platform.system().lower() != "windows":
                    os.write(self.current_process.stdin.fileno(), b'\x04')
                return True
            elif command == '\u001b[A':  # Up arrow
                return await self.get_previous_command()
            elif command == '\u001b[B':  # Down arrow
                return await self.get_next_command()
            elif command in ['cls', 'clear']:
                return await self.clear_terminal()
            elif command == '\u001b[A':  # Up arrow
                return await self.get_previous_command()
            elif command == '\u001b[B':  # Down arrow
                return await self.get_next_command()
            elif command in ['cls', 'clear']:
                return await self.clear_terminal()

            self.last_command = command.strip()
            if self.last_command:
                self.command_history.append(self.last_command)
                self.history_index = len(self.command_history)

            if self.last_command:
                self.command_history.append(self.last_command)
                self.history_index = len(self.command_history)

            # Handle standard input
            if self.current_process.stdin:
                self.current_process.stdin.write(command)
                self.current_process.stdin.flush()
                logger.debug(f"Sent command to shell: {repr(command)}")
                return True

            return False
            
        except OSError as e:
            logger.error(f"OS error during command execution: {e}")
            return False
        except Exception as e:
            logger.error(f"Failed to execute command: {e}")
            return False

    async def send_interrupt(self, force=False):
        """Send interrupt signal to the current process."""
        if not self.current_process or self.current_process.poll() is not None:
            return False

        system = platform.system().lower()
        logger.info(f"Attempting to send interrupt signal to {self.current_shell} on {system}")

        try:
            if system == "windows":
                # Special handling for ping command
                if "ping" in self.last_command:
                    logger.info("Ping command detected, using special interrupt handling.")
                    return await self._handle_windows_ping_interrupt()

                # Standard approach for other commands
                logger.info("Sending standard interrupt signal.")
                self.current_process.send_signal(signal.CTRL_C_EVENT)
                await asyncio.sleep(0.2) # Give it a moment to process

                if force and self.current_process.poll() is None:
                    logger.warning("Process did not terminate, forcing a new prompt.")
                    if self.current_process.stdin:
                        self.current_process.stdin.write('\r\n')
                        self.current_process.stdin.flush()
            else:
                # Unix systems - use SIGINT
                logger.info("Sending SIGINT to process group.")
                os.killpg(os.getpgid(self.current_process.pid), signal.SIGINT)
            
            return True

        except Exception as e:
            logger.error(f"Failed to send interrupt signal: {e}")
            return False

    async def _handle_windows_ping_interrupt(self):
        """Handle interrupt for ping command on Windows."""
        try:
            # First, send a standard Ctrl+C to allow it to print statistics
            logger.info("Sending CTRL_C_EVENT to ping process.")
            self.current_process.send_signal(signal.CTRL_C_EVENT)
            
            # Give it a moment to print stats, but don't wait too long
            await asyncio.sleep(0.25)

            # Then, forcefully kill any remaining ping.exe processes to ensure termination
            logger.info("Forcefully terminating ping.exe process to ensure it stops.")
            
            # This runs a command to kill the process outside the current shell
            kill_cmd = 'taskkill /F /IM ping.exe /T'
            subprocess.run(kill_cmd, shell=True, capture_output=True, text=True)
            
            # Give a moment for the OS to handle termination
            await asyncio.sleep(0.1)

            # Refresh the prompt in the parent shell
            if self.current_process and self.current_process.stdin and self.current_process.poll() is None:
                logger.info("Sending newline to get a fresh prompt.")
                self.current_process.stdin.write('\r\n')
                self.current_process.stdin.flush()

            return True
        except Exception as e:
            logger.error(f"Error in ping interrupt handler: {e}")
            return False
    
    async def _force_stop_ping_command(self):
        """DEPRECATED: This method is no longer the primary way to stop ping."""
        logger.warning("Using deprecated _force_stop_ping_command.")
        return await self._handle_windows_ping_interrupt()
    
    async def send_suspend(self, force=False):
        """Send suspend signal (Ctrl+Z) to the current process."""
        if not self.current_process or self.current_process.poll() is not None:
            return False

        system = platform.system().lower()
        logger.info(f"Attempting to send suspend signal to {self.current_shell} on {system}")

        try:
            if system == "windows":
                # Windows doesn't properly support job control (background/foreground)
                # so redirect to the interrupt handler which has better techniques
                return await self.send_interrupt(force=True)
            else:
                # Unix systems - use SIGTSTP
                try:
                    os.killpg(os.getpgid(self.current_process.pid), signal.SIGTSTP)
                    logger.info("Sent SIGTSTP to process group")
                except Exception as e:
                    logger.error(f"Failed to send SIGTSTP: {e}")
                    if self.current_process.stdin:
                        self.current_process.stdin.write('\r\n')
                        self.current_process.stdin.flush()
                    
                    # Fallback to interrupt if needed
                    if force:
                        return await self.send_interrupt(force=True)

            return True

        except Exception as e:
            logger.error(f"Failed to send suspend signal: {e}")
            return False
            
    def _is_long_running_cmd(self):
        """Check if current process is likely a long-running Windows command.
        
        This helps identify commands like ping, tracert, etc. that need special handling.
        """
        if not self.current_process or platform.system().lower() != "windows":
            return False
            
        # We can't directly access the command name of a running subprocess,
        # but we can use heuristics based on the shell type
        if self.current_shell == "cmd" or self.current_shell == "powershell":
            # These commands are known to behave differently with Ctrl+C/Z
            return True
            
        return False

    async def cleanup_process(self):
        """Cleanup current subprocess and its output thread."""
        self.running = False
        process = self.current_process

        if process:
            try:
                system = platform.system().lower()
                if system == "windows":
                    process.terminate()
                else:
                    try:
                        os.killpg(os.getpgid(process.pid), signal.SIGTERM)
                    except Exception:
                        process.terminate()

                try:
                    process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    logger.warning("Process didn't terminate gracefully, forcing kill")
                    if system == "windows":
                        process.kill()
                    else:
                        try:
                            os.killpg(os.getpgid(process.pid), signal.SIGKILL)
                        except Exception:
                            process.kill()

            except Exception as e:
                logger.error(f"Error cleaning up process: {e}")
            finally:
                self.current_process = None
                self.current_shell = None

        # Clean up the output thread
        if self.output_thread and self.output_thread.is_alive():
            # Yield control briefly to let thread wrap up
            try:
                self.output_thread.join(timeout=2)
            except Exception:
                pass
        self.output_thread = None
        return True

    async def get_previous_command(self):
        """Get the previous command from history and send it to the terminal."""
        if self.history_index > 0:
            self.history_index -= 1
            command = self.command_history[self.history_index]
            await self.output_callback(f"\033[2K\r{command}")
            return command
        return self.command_history[0] if self.command_history else ""

    async def get_next_command(self):
        """Get the next command from history and send it to the terminal."""
        if self.history_index < len(self.command_history) - 1:
            self.history_index += 1
            command = self.command_history[self.history_index]
            await self.output_callback(f"\033[2K\r{command}")
            return command
        elif self.history_index == len(self.command_history) - 1:
            self.history_index += 1
            await self.output_callback("\033[2K\r")
        return ""

    async def clear_terminal(self):
        """Return a dictionary to signal a terminal clear event."""
        return {'type': 'clear'}