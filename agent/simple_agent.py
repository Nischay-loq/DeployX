import socketio
import subprocess
import platform
import asyncio
import sys
import os
import time
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DeployXAgent:
    def __init__(self, server_url="http://localhost:8000", agent_id=None):
        self.server_url = server_url
        self.agent_id = agent_id or f"agent_{platform.node()}_{int(time.time())}"
        self.sio = socketio.AsyncClient()
        self.shell_process = None
        self.shell_type = None
        self.running = True
        
        # Detect available shells
        self.available_shells = self.detect_shells()
        logger.info(f"Detected shells: {self.available_shells}")
        
        # Setup event handlers
        self.setup_handlers()

    def detect_shells(self):
        """Detect available shells on the system"""
        shells = []
        
        if platform.system().lower() == "windows":
            # Check for Windows shells
            if self.check_command_exists("cmd"):
                shells.append("cmd")
            if self.check_command_exists("powershell"):
                shells.append("powershell")
            if self.check_command_exists("pwsh"):
                shells.append("pwsh")
        else:
            # Check for Unix shells
            for shell in ["bash", "sh", "zsh", "fish"]:
                if self.check_command_exists(shell):
                    shells.append(shell)
        
        return shells if shells else ["cmd"]  # Default to cmd if nothing found

    def check_command_exists(self, command):
        """Check if a command exists on the system"""
        try:
            if platform.system().lower() == "windows":
                result = subprocess.run(["where", command], 
                                      capture_output=True, text=True, timeout=5)
                return result.returncode == 0
            else:
                result = subprocess.run(["which", command], 
                                      capture_output=True, text=True, timeout=5)
                return result.returncode == 0
        except:
            return False

    def setup_handlers(self):
        """Setup socket event handlers"""
        
        @self.sio.event
        async def connect():
            logger.info("Connected to server")
            # Register this agent with available shells
            await self.sio.emit('agent_register', {
                'agent_id': self.agent_id,
                'shells': self.available_shells
            })
            logger.info(f"Registered agent {self.agent_id} with shells {self.available_shells}")

        @self.sio.event
        async def disconnect():
            logger.info("Disconnected from server")
            self.running = False

        @self.sio.event
        async def start_shell(data):
            """Start a shell session"""
            try:
                shell_type = data.get('shell', 'cmd')
                logger.info(f"Starting shell: {shell_type}")
                
                if self.shell_process:
                    logger.info("Stopping existing shell")
                    self.stop_shell()
                
                self.shell_type = shell_type
                
                # Start the shell process
                if platform.system().lower() == "windows":
                    if shell_type == "powershell":
                        self.shell_process = subprocess.Popen(
                            ["powershell", "-NoExit", "-Command", "-"],
                            stdin=subprocess.PIPE,
                            stdout=subprocess.PIPE,
                            stderr=subprocess.STDOUT,
                            text=True,
                            bufsize=0,
                            universal_newlines=True
                        )
                    elif shell_type == "pwsh":
                        self.shell_process = subprocess.Popen(
                            ["pwsh", "-NoExit", "-Command", "-"],
                            stdin=subprocess.PIPE,
                            stdout=subprocess.PIPE,
                            stderr=subprocess.STDOUT,
                            text=True,
                            bufsize=0,
                            universal_newlines=True
                        )
                    else:  # cmd
                        self.shell_process = subprocess.Popen(
                            ["cmd"],
                            stdin=subprocess.PIPE,
                            stdout=subprocess.PIPE,
                            stderr=subprocess.STDOUT,
                            text=True,
                            bufsize=0,
                            universal_newlines=True
                        )
                else:
                    # Unix shells
                    self.shell_process = subprocess.Popen(
                        [shell_type],
                        stdin=subprocess.PIPE,
                        stdout=subprocess.PIPE,
                        stderr=subprocess.STDOUT,
                        text=True,
                        bufsize=0,
                        universal_newlines=True
                    )
                
                await self.sio.emit('shell_started', {
                    'shell': shell_type,
                    'status': 'success'
                })
                
                # Start reading output in background
                asyncio.create_task(self.read_shell_output())
                
            except Exception as e:
                logger.error(f"Error starting shell: {e}")
                await self.sio.emit('shell_error', {
                    'error': str(e)
                })

        @self.sio.event 
        async def stop_shell(data):
            """Stop the current shell session"""
            try:
                logger.info("Stopping shell")
                self.stop_shell()
                await self.sio.emit('shell_stopped', {'status': 'success'})
            except Exception as e:
                logger.error(f"Error stopping shell: {e}")
                await self.sio.emit('shell_error', {'error': str(e)})

        @self.sio.event
        async def shell_input(data):
            """Handle input to the shell"""
            try:
                if not self.shell_process:
                    await self.sio.emit('shell_output', {
                        'output': 'No shell session active\n'
                    })
                    return
                
                input_data = data.get('input', '')
                logger.info(f"Shell input: {repr(input_data)}")
                
                # Send input to shell
                self.shell_process.stdin.write(input_data)
                self.shell_process.stdin.flush()
                
            except Exception as e:
                logger.error(f"Error sending shell input: {e}")
                await self.sio.emit('shell_error', {'error': str(e)})

    def stop_shell(self):
        """Stop the current shell process"""
        if self.shell_process:
            try:
                self.shell_process.terminate()
                self.shell_process.wait(timeout=5)
            except:
                try:
                    self.shell_process.kill()
                except:
                    pass
            finally:
                self.shell_process = None
                self.shell_type = None

    async def read_shell_output(self):
        """Read output from shell and send to frontend"""
        while self.shell_process and self.shell_process.poll() is None:
            try:
                # Read a character at a time to get real-time output
                char = self.shell_process.stdout.read(1)
                if char:
                    await self.sio.emit('shell_output', {
                        'output': char
                    })
                else:
                    await asyncio.sleep(0.01)
            except Exception as e:
                logger.error(f"Error reading shell output: {e}")
                break
        
        # Shell process ended
        if self.shell_process:
            self.shell_process = None
            await self.sio.emit('shell_stopped', {'status': 'ended'})

    async def connect(self):
        """Connect to the server"""
        try:
            await self.sio.connect(self.server_url)
            logger.info(f"Connected to {self.server_url}")
            return True
        except Exception as e:
            logger.error(f"Failed to connect: {e}")
            return False

    async def disconnect(self):
        """Disconnect from server"""
        self.stop_shell()
        await self.sio.disconnect()

    async def run(self):
        """Main run loop"""
        if await self.connect():
            try:
                while self.running:
                    await asyncio.sleep(1)
            except KeyboardInterrupt:
                logger.info("Received interrupt signal")
            finally:
                await self.disconnect()
        else:
            logger.error("Failed to connect to server")

async def main():
    agent = DeployXAgent()
    await agent.run()

if __name__ == "__main__":
    asyncio.run(main())