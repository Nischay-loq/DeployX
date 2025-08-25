"""Shell process management for DeployX agent."""
import subprocess
import threading
import platform
import os
import signal
import logging
import asyncio
import time
import psutil

logger = logging.getLogger(__name__)

class ShellManager:
    def __init__(self):
        self.current_process: subprocess.Popen = None
        self.current_shell = None
        self.output_thread = None
        self.running = False
        self.output_callback = None

    async def start_shell(self, shell_name: str, shell_path: str, output_callback):
        """Start a shell subprocess using provided path."""
        try:
            logger.info(f"Starting shell {shell_name} with path {shell_path}")
            self.cleanup_process()
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

    def _get_all_child_processes(self, parent_pid):
        """Get all child processes recursively."""
        try:
            parent = psutil.Process(parent_pid)
            children = []
            
            # Get direct children
            for child in parent.children(recursive=True):
                children.append(child)
            
            return children
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            return []

    async def execute_command(self, command: str):
        """Execute command in the current shell."""
        if not self.current_process:
            logger.error("No shell process exists")
            return False

        if self.current_process.poll() is not None:
            logger.error(f"Shell process has terminated with code {self.current_process.returncode}")
            return False

        try:
            # Handle special control characters
            if command == '\u0003' or command.strip() == '^C':  # Ctrl+C
                logger.info("Received Ctrl+C signal")
                return await self.send_interrupt()
            elif command == '\u001a' or command.strip() == '^Z':  # Ctrl+Z
                logger.info("Received Ctrl+Z signal")
                return await self.send_suspend()

            # Handle standard input - don't add extra newline if command already ends with one
            if self.current_process.stdin:
                if not command.endswith('\n') and not command.endswith('\r\n'):
                    command += '\n'
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

    async def send_interrupt(self):
        """Send interrupt signal to the current process and all its children."""
        if not self.current_process or self.current_process.poll() is not None:
            return False

        system = platform.system().lower()
        logger.info(f"Attempting to send interrupt signal to {self.current_shell} on {system}")

        try:
            if system == "windows":
                # Get all child processes first
                child_processes = self._get_all_child_processes(self.current_process.pid)
                logger.info(f"Found {len(child_processes)} child processes")
                
                # Kill child processes first (like ping.exe)
                for child in child_processes:
                    try:
                        logger.info(f"Terminating child process: {child.name()} (PID: {child.pid})")
                        child.terminate()
                        # Give it a moment to terminate gracefully
                        try:
                            child.wait(timeout=1)
                        except psutil.TimeoutExpired:
                            logger.info(f"Force killing child process: {child.name()} (PID: {child.pid})")
                            child.kill()
                    except (psutil.NoSuchProcess, psutil.AccessDenied) as e:
                        logger.warning(f"Could not terminate child process {child.pid}: {e}")
                
                # Now try to interrupt the shell itself
                try:
                    # Try CTRL_C_EVENT first
                    self.current_process.send_signal(signal.CTRL_C_EVENT)
                    logger.info("Sent CTRL_C_EVENT to shell process")
                    await asyncio.sleep(0.2)
                    
                    # If shell is still running, try CTRL_BREAK_EVENT
                    if self.current_process.poll() is None:
                        self.current_process.send_signal(signal.CTRL_BREAK_EVENT)
                        logger.info("Sent CTRL_BREAK_EVENT to shell process")
                        await asyncio.sleep(0.3)
                    
                except Exception as e:
                    logger.error(f"Failed to send interrupt signals to shell: {e}")
                    # Last resort - write Ctrl+C directly to stdin
                    try:
                        if self.current_process.stdin:
                            self.current_process.stdin.write('\x03')
                            self.current_process.stdin.flush()
                            logger.info("Wrote Ctrl+C character to shell stdin")
                    except:
                        pass
            else:
                # Unix/Linux handling
                try:
                    # Get all child processes
                    child_processes = self._get_all_child_processes(self.current_process.pid)
                    logger.info(f"Found {len(child_processes)} child processes")
                    
                    # Send SIGINT to all child processes
                    for child in child_processes:
                        try:
                            logger.info(f"Sending SIGINT to child process: {child.name()} (PID: {child.pid})")
                            child.send_signal(signal.SIGINT)
                        except (psutil.NoSuchProcess, psutil.AccessDenied) as e:
                            logger.warning(f"Could not send SIGINT to child process {child.pid}: {e}")
                    
                    # Send SIGINT to the process group
                    os.killpg(os.getpgid(self.current_process.pid), signal.SIGINT)
                    logger.info("Sent SIGINT to process group")
                    await asyncio.sleep(0.5)
                except Exception as e:
                    logger.error(f"Failed to send SIGINT: {e}")
                    # Fallback to writing Ctrl+C to stdin
                    try:
                        if self.current_process.stdin:
                            self.current_process.stdin.write('\x03')
                            self.current_process.stdin.flush()
                    except:
                        pass

            return True

        except Exception as e:
            logger.error(f"Failed to send interrupt signal: {e}")
            return False
            
    async def send_suspend(self):
        """Send suspend signal (Ctrl+Z) to the current process."""
        if not self.current_process or self.current_process.poll() is not None:
            return False

        system = platform.system().lower()
        logger.info(f"Attempting to send suspend signal to {self.current_shell} on {system}")

        try:
            if system == "windows":
                # Windows doesn't support real process suspension
                # Write Ctrl+Z character to stdin
                if self.current_process.stdin:
                    self.current_process.stdin.write('\x1a')
                    self.current_process.stdin.flush()
                    logger.info("Wrote Ctrl+Z character to stdin on Windows")
            else:
                try:
                    # Send SIGTSTP to process group on Unix
                    os.killpg(os.getpgid(self.current_process.pid), signal.SIGTSTP)
                    logger.info("Sent SIGTSTP to process group")
                except Exception as e:
                    logger.error(f"Failed to send SIGTSTP: {e}")
                    # Fallback to writing Ctrl+Z to stdin
                    if self.current_process.stdin:
                        self.current_process.stdin.write('\x1a')
                        self.current_process.stdin.flush()

            return True

        except Exception as e:
            logger.error(f"Failed to send suspend signal: {e}")
            return False

    def cleanup_process(self):
        """Cleanup current subprocess and its output thread."""
        self.running = False
        process = self.current_process

        if process:
            try:
                # Kill all child processes first
                child_processes = self._get_all_child_processes(process.pid)
                for child in child_processes:
                    try:
                        child.terminate()
                        try:
                            child.wait(timeout=2)
                        except psutil.TimeoutExpired:
                            child.kill()
                    except (psutil.NoSuchProcess, psutil.AccessDenied):
                        pass

                # Now terminate the main process
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

        thread = self.output_thread
        if thread and thread.is_alive():
            thread.join(timeout=2)