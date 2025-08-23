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
            if command == '\u0003':  # Ctrl+C
                logger.info("Received Ctrl+C signal")
                if platform.system().lower() == "windows":
                    try:
                        self.current_process.send_signal(signal.CTRL_C_EVENT)
                    except:
                        self.current_process.terminate()
                else:
                    try:
                        os.killpg(os.getpgid(self.current_process.pid), signal.SIGINT)
                    except:
                        self.current_process.terminate()
                return True

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

    async def send_interrupt(self):
        """Send interrupt signal to the current process."""
        if not self.current_process or self.current_process.poll() is not None:
            return False

        system = platform.system().lower()
        logger.info(f"Attempting to send interrupt signal to {self.current_shell} on {system}")

        try:
            if system == "windows":
                try:
                    # Try CTRL_BREAK_EVENT first (more reliable for subprocesses)
                    self.current_process.send_signal(signal.CTRL_BREAK_EVENT)
                    logger.info("Sent CTRL_BREAK_EVENT to process")
                    
                    # If process terminated, we'll handle that in the output monitoring
                    await asyncio.sleep(0.5)
                    if self.current_process.poll() is not None:
                        logger.info("Process terminated after interrupt")
                except Exception as e:
                    logger.error(f"Failed to send CTRL_BREAK_EVENT: {e}")
                    # Fallback to termination
                    self.current_process.terminate()
            else:
                try:
                    # Send SIGINT to the process group
                    os.killpg(os.getpgid(self.current_process.pid), signal.SIGINT)
                    logger.info("Sent SIGINT to process group")
                    await asyncio.sleep(0.5)
                except Exception as e:
                    logger.error(f"Failed to send SIGINT: {e}")
                    self.current_process.terminate()

            # Write a newline to get fresh prompt
            if self.current_process and self.current_process.stdin:
                self.current_process.stdin.write('\r\n')
                self.current_process.stdin.flush()
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
                # Just write ^Z and a new line for visual feedback
                if self.current_process.stdin:
                    self.current_process.stdin.write('^Z\r\n')
                    self.current_process.stdin.flush()
                    logger.info("Wrote ^Z on Windows (no real suspension)")
            else:
                try:
                    # Send SIGTSTP to process group on Unix
                    os.killpg(os.getpgid(self.current_process.pid), signal.SIGTSTP)
                    logger.info("Sent SIGTSTP to process group")
                except Exception as e:
                    logger.error(f"Failed to send SIGTSTP: {e}")
                    # Write a new line to get a fresh prompt
                    if self.current_process.stdin:
                        self.current_process.stdin.write('\r\n')
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
