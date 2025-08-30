"""Socket.IO event handlers for DeployX agent."""
import logging
import time
from typing import Any, Callable, Dict
from agent.core.shell_manager import ShellManager

logger = logging.getLogger(__name__)

class SocketEventHandler:
    def __init__(self, shell_manager: ShellManager, connection=None):
        """Initialize the socket event handler.
        
        Args:
            shell_manager: Instance of ShellManager to handle shell operations
            connection: Instance of ConnectionManager for socket communication
        """
        self.shell_manager = shell_manager
        self._connection = connection

    async def handle_connect(self):
        """Handle socket connection event."""
        logger.info("Connected to backend server")

    async def handle_disconnect(self):
        """Handle socket disconnection event."""
        logger.info("Disconnected from backend server")
        await self.shell_manager.cleanup_all_sessions()

    async def handle_connect_error(self, data: Dict[str, Any]):
        """Handle connection error event."""
        logger.error(f"Connection error: {data}")

    async def handle_registration_success(self, data: Dict[str, Any]):
        """Handle successful registration event."""
        logger.info(f"Successfully registered with backend as {data['agent_id']}")

    async def handle_registration_error(self, data: Dict[str, Any]):
        """Handle registration error event."""
        logger.error(f"Registration failed: {data.get('error', 'Unknown error')}")

    async def handle_start_shell_request(self, data: Dict[str, Any]):
        """Handle request to start a shell with session ID."""
        try:
            logger.info(f"Handling start shell request with data: {data}")
            shell_name = data.get('shell', 'cmd')
            session_id = data.get('session_id')
            
            if not session_id:
                session_id = f"{shell_name}_{int(time.time() * 1000)}"
                logger.warning(f"No session_id provided, generated: {session_id}")
            
            success = await self.start_shell_with_response(shell_name, session_id)
            
            if not success:
                error_msg = f"Failed to start shell {shell_name} for session {session_id}"
                logger.error(error_msg)
                if self._connection and self._connection.connected:
                    await self._connection.emit('error', {'message': error_msg})
        except Exception as e:
            error_msg = f"Error handling start shell request: {str(e)}"
            logger.exception(error_msg)
            if self._connection and self._connection.connected:
                await self._connection.emit('error', {'message': error_msg})

    async def handle_command_input(self, data: Dict[str, Any]):
        """Handle incoming command input with session ID."""
        session_id = data.get('session_id')
        command = data.get('command', '')
        
        if not session_id:
            logger.error("No session_id provided for command input")
            return
        
        if command in ['\u0003', '^C', '\x03']:  # Ctrl+C variants
            await self.shell_manager.send_interrupt(session_id)
        elif command in ['\u001A', '^Z', '\x1A']:  # Ctrl+Z variants
            await self.shell_manager.send_suspend(session_id)
        else:
            await self.shell_manager.execute_command(session_id, command)

    async def handle_stop_shell_request(self, data: Dict[str, Any]):
        """Handle request to stop a shell session."""
        try:
            session_id = data.get('session_id')
            logger.info(f"Handling stop shell request for session: {session_id}")
            
            if not session_id:
                logger.error("No session_id provided for stop shell request")
                return
            
            success = await self.shell_manager.stop_shell(session_id)
            
            if success:
                logger.info(f"Shell session {session_id} stopped successfully")
                if self._connection and self._connection.connected:
                    await self._connection.emit('shell_stopped', {'session_id': session_id})
            else:
                error_msg = f"Failed to stop shell session {session_id}"
                logger.error(error_msg)
                if self._connection and self._connection.connected:
                    await self._connection.emit('error', {'message': error_msg})
        except Exception as e:
            error_msg = f"Error handling stop shell request: {str(e)}"
            logger.exception(error_msg)
            if self._connection and self._connection.connected:
                await self._connection.emit('error', {'message': error_msg})

    async def handle_get_shells(self, data: Dict[str, Any]):
        """Handle request for available shells."""
        logger.info("Received request for available shells")
        from agent.utils.shell_detector import detect_shells
        shells = detect_shells()
        return list(shells.keys())

    async def start_shell_with_response(self, shell_name: str, session_id: str) -> bool:
        """Start a shell with session ID and handle response."""
        logger.info(f"Starting shell {shell_name} for session {session_id}")
        
        # Get available shells
        from agent.utils.shell_detector import detect_shells
        shells = detect_shells()
        
        if shell_name not in shells:
            logger.error(f"Shell {shell_name} not found in available shells: {list(shells.keys())}")
            return False
            
        shell_path = shells[shell_name]
        logger.info(f"Found shell path: {shell_path}")
        
        # Define callback for shell output
        async def output_callback(output: str, session_id: str):
            logger.debug(f"Shell output for session {session_id}: {output}")
            if self._connection and self._connection.connected:
                await self._connection.emit('command_output', {
                    'output': output,
                    'session_id': session_id
                })
        
        # Start the shell
        success = await self.shell_manager.start_shell(session_id, shell_name, shell_path, output_callback)
        
        if success:
            logger.info(f"Shell {shell_name} started successfully for session {session_id}")
            if self._connection and self._connection.connected:
                await self._connection.emit('shell_started', {
                    'shell': shell_name,
                    'session_id': session_id
                })
                logger.info(f"Sent shell_started event to frontend for session {session_id}")
            return True
        else:
            logger.error(f"Failed to start shell {shell_name} for session {session_id}")
            return False

    def get_handlers(self) -> Dict[str, Callable]:
        """Get all event handlers.
        
        Returns:
            Dictionary mapping event names to their handler functions
        """
        return {
            'connect': self.handle_connect,
            'disconnect': self.handle_disconnect,
            'connect_error': self.handle_connect_error,
            'registration_success': self.handle_registration_success,
            'registration_error': self.handle_registration_error,
            'start_shell_request': self.handle_start_shell_request,
            'stop_shell_request': self.handle_stop_shell_request,
            'command_input': self.handle_command_input,
            'get_shells': self.handle_get_shells
        }
