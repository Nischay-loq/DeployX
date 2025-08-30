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
from typing import Dict, Optional, Callable

logger = logging.getLogger(__name__)

class ShellSession:
    """Represents a single shell session."""
    def __init__(self, session_id: str, shell_name: str, shell_path: str):
        self.session_id = session_id
        self.shell_name = shell_name
        self.shell_path = shell_path
        self.process: Optional[subprocess.Popen] = None
        self.output_thread: Optional[threading.Thread] = None
        self.running = False
        self.output_callback: Optional[Callable] = None
        self.created_at = time.time()

class ShellManager:
    def __init__(self):
        self.sessions: Dict[str, ShellSession] = {}  # session_id -> ShellSession

    async def start_shell(self, session_id: str, shell_name: str, shell_path: str, output_callback):
        """Start a shell subprocess for a specific session."""
        try:
            logger.info(f"Starting shell session {session_id}: {shell_name} with path {shell_path}")
            
            # Check if session already exists
            if session_id in self.sessions:
                logger.warning(f"Session {session_id} already exists, stopping it first")
                await self.stop_shell(session_id)
            
            if not os.path.exists(shell_path):
                logger.error(f"Shell executable not found at path: {shell_path}")
                return False

            # Create new session
            session = ShellSession(session_id, shell_name, shell_path)
            session.output_callback = output_callback
            
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
            
            logger.info(f"Prepared command for session {session_id}: {cmd}")

            system = platform.system().lower()
            if system == "windows":
                startup_info = subprocess.STARTUPINFO()
                startup_info.dwFlags |= subprocess.STARTF_USESHOWWINDOW
                startup_info.wShowWindow = subprocess.SW_HIDE
                
                session.process = subprocess.Popen(
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
                session.process = subprocess.Popen(
                    cmd,
                    stdin=subprocess.PIPE,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    text=True,
                    bufsize=0,
                    env=env,
                    preexec_fn=os.setsid
                )

            session.running = True

            # Start output thread for this session
            session.output_thread = threading.Thread(
                target=self._monitor_session_output, 
                args=(session,), 
                daemon=True
            )
            session.output_thread.start()

            # Verify shell is running and responsive
            if session.process.poll() is not None:
                logger.error(f"Shell process for session {session_id} terminated immediately with code {session.process.returncode}")
                return False
                
            # Give the shell a moment to initialize
            await asyncio.sleep(0.5)
            
            # Store the session
            self.sessions[session_id] = session
                
            logger.info(f"Shell session {session_id} ({shell_name}) started successfully")
            return True

        except Exception as e:
            logger.error(f"Failed to start shell session {session_id} ({shell_name}): {e}")
            return False

    def _monitor_session_output(self, session: ShellSession):
        """Monitor subprocess output for a specific session in a separate thread."""
        try:
            while session.running and session.process and session.process.poll() is None:
                try:
                    # Handle non-Windows systems with select
                    if platform.system().lower() != "windows":
                        import select
                        ready, _, _ = select.select([session.process.stdout], [], [], 0.1)
                        if ready:
                            data = session.process.stdout.read(4096)
                            if not data:
                                time.sleep(0.01)
                                continue
                        else:
                            time.sleep(0.01)
                            continue
                    # Handle Windows systems
                    else:
                        try:
                            data = os.read(session.process.stdout.fileno(), 4096)
                            if isinstance(data, bytes):
                                data = data.decode('utf-8', errors='replace')
                        except OSError:
                            time.sleep(0.01)
                            continue
                    
                    if data:
                        try:
                            if session.output_callback:
                                loop = asyncio.new_event_loop()
                                asyncio.set_event_loop(loop)
                                loop.run_until_complete(session.output_callback(data, session.session_id))
                                loop.close()
                        except Exception as e:
                            logger.error(f"Failed to send output for session {session.session_id}: {e}")

                    elif session.process.poll() is not None:
                        break
                    else:
                        time.sleep(0.01)

                except Exception as e:
                    logger.error(f"Error reading output for session {session.session_id}: {e}")
                    break

        except Exception as e:
            logger.error(f"Output monitoring error for session {session.session_id}: {e}")
        finally:
            if session.process and session.process.poll() is not None:
                try:
                    exit_code = session.process.returncode
                    exit_message = f"\r\n[Process exited with code {exit_code}]\r\n"
                    if session.output_callback:
                        loop = asyncio.new_event_loop()
                        asyncio.set_event_loop(loop)
                        loop.run_until_complete(session.output_callback(exit_message, session.session_id))
                        loop.close()
                except Exception as e:
                    logger.error(f"Failed to send exit message for session {session.session_id}: {e}")

    async def stop_shell(self, session_id: str) -> bool:
        """Stop a specific shell session."""
        if session_id not in self.sessions:
            logger.warning(f"Session {session_id} not found")
            return False
        
        session = self.sessions[session_id]
        logger.info(f"Stopping shell session {session_id}")
        
        try:
            session.running = False
            await self._cleanup_session(session)
            del self.sessions[session_id]
            logger.info(f"Shell session {session_id} stopped successfully")
            return True
        except Exception as e:
            logger.error(f"Error stopping shell session {session_id}: {e}")
            return False

    async def execute_command(self, session_id: str, command: str) -> bool:
        """Execute command in a specific shell session."""
        if session_id not in self.sessions:
            logger.error(f"Session {session_id} not found")
            return False
        
        session = self.sessions[session_id]
        
        if not session.process:
            logger.error(f"No shell process exists for session {session_id}")
            return False

        if session.process.poll() is not None:
            logger.error(f"Shell process for session {session_id} has terminated with code {session.process.returncode}")
            return False

        try:
            # Handle special control characters
            if command == '\u0003' or command.strip() == '^C':  # Ctrl+C
                logger.info(f"Received Ctrl+C signal for session {session_id}")
                return await self.send_interrupt(session_id)
            elif command == '\u001a' or command.strip() == '^Z':  # Ctrl+Z
                logger.info(f"Received Ctrl+Z signal for session {session_id}")
                return await self.send_suspend(session_id)

            # Handle standard input - don't add extra newline if command already ends with one
            if session.process.stdin:
                if not command.endswith('\n') and not command.endswith('\r\n'):
                    command += '\n'
                session.process.stdin.write(command)
                session.process.stdin.flush()
                logger.debug(f"Sent command to shell session {session_id}: {repr(command)}")
                return True

            return False
            
        except OSError as e:
            logger.error(f"OS error during command execution for session {session_id}: {e}")
            return False
        except Exception as e:
            logger.error(f"Failed to execute command for session {session_id}: {e}")
            return False

    async def send_interrupt(self, session_id: str) -> bool:
        """Send interrupt signal to a specific shell session."""
        if session_id not in self.sessions:
            return False
        
        session = self.sessions[session_id]
        if not session.process or session.process.poll() is not None:
            return False

        system = platform.system().lower()
        logger.info(f"Attempting to send interrupt signal to session {session_id} ({session.shell_name}) on {system}")

        try:
            if system == "windows":
                # Get all child processes first
                child_processes = self._get_all_child_processes(session.process.pid)
                logger.info(f"Found {len(child_processes)} child processes for session {session_id}")
                
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
                    session.process.send_signal(signal.CTRL_C_EVENT)
                    logger.info(f"Sent CTRL_C_EVENT to shell process for session {session_id}")
                    await asyncio.sleep(0.2)
                    
                    # If shell is still running, try CTRL_BREAK_EVENT
                    if session.process.poll() is None:
                        session.process.send_signal(signal.CTRL_BREAK_EVENT)
                        logger.info(f"Sent CTRL_BREAK_EVENT to shell process for session {session_id}")
                        await asyncio.sleep(0.3)
                    
                except Exception as e:
                    logger.error(f"Failed to send interrupt signals to shell session {session_id}: {e}")
                    # Last resort - write Ctrl+C directly to stdin
                    try:
                        if session.process.stdin:
                            session.process.stdin.write('\x03')
                            session.process.stdin.flush()
                            logger.info(f"Wrote Ctrl+C character to shell stdin for session {session_id}")
                    except:
                        pass
            else:
                # Unix/Linux handling
                try:
                    # Get all child processes
                    child_processes = self._get_all_child_processes(session.process.pid)
                    logger.info(f"Found {len(child_processes)} child processes for session {session_id}")
                    
                    # Send SIGINT to all child processes
                    for child in child_processes:
                        try:
                            logger.info(f"Sending SIGINT to child process: {child.name()} (PID: {child.pid})")
                            child.send_signal(signal.SIGINT)
                        except (psutil.NoSuchProcess, psutil.AccessDenied) as e:
                            logger.warning(f"Could not send SIGINT to child process {child.pid}: {e}")
                    
                    # Send SIGINT to the process group
                    os.killpg(os.getpgid(session.process.pid), signal.SIGINT)
                    logger.info(f"Sent SIGINT to process group for session {session_id}")
                    await asyncio.sleep(0.5)
                except Exception as e:
                    logger.error(f"Failed to send SIGINT for session {session_id}: {e}")
                    # Fallback to writing Ctrl+C to stdin
                    try:
                        if session.process.stdin:
                            session.process.stdin.write('\x03')
                            session.process.stdin.flush()
                    except:
                        pass

            return True

        except Exception as e:
            logger.error(f"Failed to send interrupt signal for session {session_id}: {e}")
            return False

    async def send_suspend(self, session_id: str) -> bool:
        """Send suspend signal (Ctrl+Z) to a specific shell session."""
        if session_id not in self.sessions:
            return False
        
        session = self.sessions[session_id]
        if not session.process or session.process.poll() is not None:
            return False

        system = platform.system().lower()
        logger.info(f"Attempting to send suspend signal to session {session_id} ({session.shell_name}) on {system}")

        try:
            if system == "windows":
                # Windows doesn't support real process suspension
                # Write Ctrl+Z character to stdin
                if session.process.stdin:
                    session.process.stdin.write('\x1a')
                    session.process.stdin.flush()
                    logger.info(f"Wrote Ctrl+Z character to stdin on Windows for session {session_id}")
            else:
                try:
                    # Send SIGTSTP to process group on Unix
                    os.killpg(os.getpgid(session.process.pid), signal.SIGTSTP)
                    logger.info(f"Sent SIGTSTP to process group for session {session_id}")
                except Exception as e:
                    logger.error(f"Failed to send SIGTSTP for session {session_id}: {e}")
                    # Fallback to writing Ctrl+Z to stdin
                    if session.process.stdin:
                        session.process.stdin.write('\x1a')
                        session.process.stdin.flush()

            return True

        except Exception as e:
            logger.error(f"Failed to send suspend signal for session {session_id}: {e}")
            return False

    async def get_sessions(self) -> Dict[str, dict]:
        """Get information about all active sessions."""
        sessions_info = {}
        for session_id, session in self.sessions.items():
            sessions_info[session_id] = {
                'shell_name': session.shell_name,
                'shell_path': session.shell_path,
                'running': session.running,
                'created_at': session.created_at,
                'process_id': session.process.pid if session.process else None,
                'process_status': 'running' if session.process and session.process.poll() is None else 'stopped'
            }
        return sessions_info

    async def cleanup_all_sessions(self):
        """Cleanup all shell sessions."""
        logger.info("Cleaning up all shell sessions")
        session_ids = list(self.sessions.keys())
        for session_id in session_ids:
            await self.stop_shell(session_id)

    async def _cleanup_session(self, session: ShellSession):
        """Cleanup a specific shell session and its output thread."""
        session.running = False
        process = session.process

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
                    logger.warning(f"Process for session {session.session_id} didn't terminate gracefully, forcing kill")
                    if system == "windows":
                        process.kill()
                    else:
                        try:
                            os.killpg(os.getpgid(process.pid), signal.SIGKILL)
                        except Exception:
                            process.kill()

            except Exception as e:
                logger.error(f"Error cleaning up process for session {session.session_id}: {e}")
            finally:
                session.process = None

        thread = session.output_thread
        if thread and thread.is_alive():
            thread.join(timeout=2)

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

    # Legacy methods for backward compatibility (will be deprecated)
    async def execute_command_legacy(self, command: str):
        """Execute command in the first available session (backward compatibility)."""
        if not self.sessions:
            logger.error("No shell sessions available")
            return False
        
        # Use the first available session
        session_id = next(iter(self.sessions))
        return await self.execute_command(session_id, command)

    async def start_shell_legacy(self, shell_name: str, shell_path: str, output_callback):
        """Start a shell subprocess using provided path (backward compatibility)."""
        # Generate a legacy session ID
        session_id = f"legacy_{shell_name}_{int(time.time() * 1000)}"
        return await self.start_shell(session_id, shell_name, shell_path, output_callback)

    def cleanup_process(self):
        """Cleanup current subprocess and its output thread (backward compatibility)."""
        # This method is kept for backward compatibility but now cleans up all sessions
        asyncio.create_task(self.cleanup_all_sessions())