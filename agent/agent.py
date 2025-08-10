import socketio
import asyncio
import subprocess
import threading
import platform
import shutil
import logging
import sys
import os
import signal
import time
from typing import Optional, List
import queue

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class RemoteAgent:
    def __init__(self, server_url: str = "http://localhost:8000", agent_id: str = None):
        self.server_url = server_url
        self.agent_id = agent_id or f"agent_{platform.node()}_{int(time.time())}"
        self.sio = socketio.AsyncClient(
            logger=True, 
            engineio_logger=True,
            reconnection=True,
            reconnection_attempts=5,
            reconnection_delay=1
        )
        self.current_process: Optional[subprocess.Popen] = None
        self.current_shell = None
        self.output_thread = None
        self.running = False
        self.connected = False
        
        # Setup event handlers
        self.setup_handlers()
        
        # Detect available shells
        self.available_shells = self.detect_shells()
        logger.info(f"Agent {self.agent_id} detected shells: {self.available_shells}")
    
    def detect_shells(self) -> List[str]:
        """Detect available shells on the system"""
        shells = []
        system = platform.system().lower()
        
        if system == "windows":
            # Check for Windows shells
            if shutil.which("cmd"):
                shells.append("cmd")
            if shutil.which("powershell"):
                shells.append("powershell")
            if shutil.which("pwsh"):  # PowerShell Core
                shells.append("pwsh")
        else:
            # Unix-like systems
            if shutil.which("bash"):
                shells.append("bash")
            if shutil.which("sh"):
                shells.append("sh")
            if shutil.which("zsh"):
                shells.append("zsh")
            if shutil.which("fish"):
                shells.append("fish")
        
        # Ensure we have at least one shell
        if not shells:
            if system == "windows":
                shells.append("cmd")  # Default on Windows
            else:
                shells.append("sh")   # Default on Unix
        
        return shells
    
    def setup_handlers(self):
        """Setup Socket.IO event handlers"""
        
        @self.sio.event
        async def connect():
            logger.info(f"Connected to backend server at {self.server_url}")
            self.connected = True
            # Register with the backend
            await self.register_agent()
        
        @self.sio.event
        async def disconnect():
            logger.info("Disconnected from backend server")
            self.connected = False
            self.cleanup_process()
        
        @self.sio.event
        async def connect_error(data):
            logger.error(f"Connection error: {data}")
        
        @self.sio.event
        async def registration_success(data):
            logger.info(f"Successfully registered with backend as {data['agent_id']}")
        
        @self.sio.event
        async def registration_error(data):
            logger.error(f"Registration failed: {data.get('error', 'Unknown error')}")
        
        @self.sio.event
        async def start_shell_request(data):
            shell = data.get('shell', 'cmd')
            logger.info(f"Received request to start shell: {shell}")
            await self.start_shell(shell)
        
        @self.sio.event
        async def command_input(data):
            command = data.get('command', '')
            await self.execute_command(command)
    
    async def register_agent(self):
        """Register this agent with the backend"""
        try:
            await self.sio.emit('agent_register', {
                'agent_id': self.agent_id,
                'shells': self.available_shells
            })
        except Exception as e:
            logger.error(f"Failed to register agent: {e}")
    
    async def start_shell(self, shell: str):
        """Start a shell subprocess"""
        try:
            self.cleanup_process()
            
            # Configure shell commands for better interactivity
            if shell == "cmd":
                cmd = ["cmd.exe", "/Q"]  # /Q disables echo
            elif shell == "powershell":
                cmd = ["powershell.exe", "-NoLogo", "-NoProfile"]
            elif shell == "pwsh":
                cmd = ["pwsh.exe", "-NoLogo", "-NoProfile"]
            elif shell == "bash":
                cmd = ["bash", "--login", "-i"]  # Interactive login shell
            elif shell == "sh":
                cmd = ["sh", "-i"]
            elif shell == "zsh":
                cmd = ["zsh", "-i"]
            elif shell == "fish":
                cmd = ["fish", "-i"]
            else:
                if platform.system().lower() == "windows":
                    cmd = ["cmd.exe", "/Q"]
                else:
                    cmd = ["bash", "-i"]
            
            logger.info(f"Starting shell process: {' '.join(cmd)}")
            
            # Set environment for better output
            env = os.environ.copy()
            env['PYTHONUNBUFFERED'] = '1'
            env['TERM'] = 'xterm-256color'
            
            if platform.system().lower() == "windows":
                self.current_process = subprocess.Popen(
                    cmd,
                    stdin=subprocess.PIPE,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    text=True,
                    bufsize=0,
                    env=env,
                    creationflags=subprocess.CREATE_NEW_PROCESS_GROUP
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
            
            self.current_shell = shell
            self.running = True
            
            # Start output monitoring
            self.output_thread = threading.Thread(target=self.monitor_output, daemon=True)
            self.output_thread.start()
            
            await self.sio.emit('shell_started', {'shell': shell})
            logger.info(f"Shell {shell} started successfully")
            
        except Exception as e:
            logger.error(f"Failed to start shell {shell}: {e}")
            if self.connected:
                await self.sio.emit('command_output', {
                    'output': f"\r\nError starting shell {shell}: {str(e)}\r\n"
                })
    
    def monitor_output(self):
        """Monitor subprocess output in a separate thread"""
        try:
            while self.running and self.current_process and self.current_process.poll() is None:
                try:
                    # Read larger chunks instead of single characters
                    if platform.system().lower() != "windows":
                        import select
                        ready, _, _ = select.select([self.current_process.stdout], [], [], 0.1)
                        if ready:
                            # Read available data in chunks
                            data = self.current_process.stdout.read(4096)
                            if not data:
                                continue
                        else:
                            time.sleep(0.01)
                            continue
                    else:
                        # Windows - read in chunks with timeout
                        try:
                            data = os.read(self.current_process.stdout.fileno(), 4096)
                            if isinstance(data, bytes):
                                data = data.decode('utf-8', errors='replace')
                        except OSError:
                            time.sleep(0.01)
                            continue
                    
                    if data:
                        # Send complete chunks to maintain formatting
                        if self.connected:
                            try:
                                loop = asyncio.new_event_loop()
                                asyncio.set_event_loop(loop)
                                loop.run_until_complete(
                                    self.sio.emit('command_output', {'output': data})
                                )
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
                if self.connected:
                    try:
                        exit_code = self.current_process.returncode
                        exit_message = f"\r\n[Process exited with code {exit_code}]\r\n"
                        loop = asyncio.new_event_loop()
                        asyncio.set_event_loop(loop)
                        loop.run_until_complete(
                            self.sio.emit('command_output', {'output': exit_message})
                        )
                        loop.close()
                    except Exception as e:
                        logger.error(f"Failed to send exit message: {e}")

    # Also update the execute_command method:
    async def execute_command(self, command: str):
        """Execute command in the current shell"""
        if not self.current_process or self.current_process.poll() is not None:
            if self.connected:
                await self.sio.emit('command_output', {
                    'output': "\r\nNo active shell. Please start a shell first.\r\n"
                })
            return

        try:
            # Handle Ctrl+C (interrupt signal)
            if command == '\u0003':
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
                return

            # Write command to subprocess stdin
            if self.current_process.stdin:
                self.current_process.stdin.write(command)
                self.current_process.stdin.flush()
                logger.debug(f"Sent command to shell: {repr(command)}")

        except BrokenPipeError:
            logger.error("Shell process has terminated")
            if self.connected:
                await self.sio.emit('command_output', {
                    'output': "\r\nShell process has terminated. Please start a new shell.\r\n"
                })
        except Exception as e:
            logger.error(f"Error executing command: {e}")
            if self.connected:
                await self.sio.emit('command_output', {
                    'output': f"\r\nError executing command: {str(e)}\r\n"
                })
    
    def cleanup_process(self):
        """Cleanup current subprocess"""
        self.running = False
        
        if self.current_process:
            try:
                logger.info("Terminating current shell process")
                
                if platform.system().lower() == "windows":
                    # Terminate Windows process group
                    self.current_process.terminate()
                else:
                    # Terminate Unix process group
                    try:
                        os.killpg(os.getpgid(self.current_process.pid), signal.SIGTERM)
                    except:
                        self.current_process.terminate()
                
                # Wait for process to terminate
                try:
                    self.current_process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    logger.warning("Process didn't terminate gracefully, forcing kill")
                    if platform.system().lower() == "windows":
                        self.current_process.kill()
                    else:
                        try:
                            os.killpg(os.getpgid(self.current_process.pid), signal.SIGKILL)
                        except:
                            self.current_process.kill()
                
            except Exception as e:
                logger.error(f"Error cleaning up process: {e}")
            finally:
                self.current_process = None
                self.current_shell = None
        
        # Wait for output thread to finish
        if self.output_thread and self.output_thread.is_alive():
            self.output_thread.join(timeout=2)
    
    async def connect(self):
        """Connect to the backend server"""
        try:
            logger.info(f"Attempting to connect to {self.server_url}")
            await self.sio.connect(self.server_url, wait_timeout=10)
            logger.info("Successfully connected to backend")
        except Exception as e:
            logger.error(f"Failed to connect to backend: {e}")
            raise
    
    async def disconnect(self):
        """Disconnect from the backend server"""
        try:
            self.cleanup_process()
            await self.sio.disconnect()
            logger.info("Disconnected from backend")
        except Exception as e:
            logger.error(f"Error during disconnect: {e}")
    
    async def run(self):
        """Main run loop for the agent"""
        try:
            await self.connect()
            
            # Keep the agent running
            while True:
                await asyncio.sleep(1)
                
        except KeyboardInterrupt:
            logger.info("Received interrupt signal, shutting down...")
        except Exception as e:
            logger.error(f"Agent error: {e}")
        finally:
            await self.disconnect()


async def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Remote Command Execution Agent")
    parser.add_argument(
        "--server", 
        default="http://localhost:8000", 
        help="Backend server URL (default: http://localhost:8000)"
    )
    parser.add_argument(
        "--agent-id", 
        help="Custom agent ID (default: auto-generated)"
    )
    
    args = parser.parse_args()
    
    # Create and run agent
    agent = RemoteAgent(server_url=args.server, agent_id=args.agent_id)
    
    try:
        await agent.run()
    except Exception as e:
        logger.error(f"Failed to run agent: {e}")
        sys.exit(1)


if __name__ == "__main__":
    if platform.system().lower() == "windows":
        # Set up Windows event loop policy
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    
    asyncio.run(main())