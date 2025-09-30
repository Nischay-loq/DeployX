"""WebSocket connection handling for DeployX agent."""

import socketio
import logging
from typing import Optional, Dict, Any, Callable
from agent.utils.machine_id import generate_agent_id, get_system_info

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self, server_url: str, agent_id: str = None):
        """Initialize the connection manager.
        
        Args:
            server_url: URL of the backend server
            agent_id: Unique identifier for this agent. If not provided, generates one based on machine ID.
        """
        self.server_url = server_url
        if agent_id is None:
            agent_id = generate_agent_id()
        self.agent_id = agent_id
        self.machine_id = None  # Will be set when system info is retrieved
        self.system_info = None  # Will be set when system info is retrieved
        self.sio = socketio.AsyncClient(
            logger=False,  # Reduce logging noise
            engineio_logger=False,
            reconnection=True,
            reconnection_attempts=0,  # Infinite reconnection attempts
            reconnection_delay=1,  # Fast reconnection
            reconnection_delay_max=5,  # Max 5 second delay
            randomization_factor=0,  # No randomization for consistent reconnection
            ping_interval=25,  # Keep connection alive
            ping_timeout=60  # Long ping timeout
        )
        self.connected = False
        self._event_handlers: Dict[str, Callable] = {}
        
        # Get system information on initialization
        self._initialize_system_info()
        
        # Register built-in event handlers
        @self.sio.event
        async def connect():
            logger.info("Socket.IO connected")
            self.connected = True
            
        @self.sio.event
        async def connect_error(data):
            logger.error(f"Connection error: {data}")
            self.connected = False
            
        @self.sio.event
        async def disconnect():
            logger.warning("Socket.IO disconnected")
            self.connected = False

    def _initialize_system_info(self):
        """Retrieve and store system information."""
        self.system_info = get_system_info()
        self.machine_id = self.system_info.get("machine_id")
        logger.info(f"System info initialized. Machine ID: {self.machine_id}")

    def register_handler(self, event: str, handler: Callable):
        """Register a handler for a socket.io event."""
        @self.sio.on(event)
        async def wrapper(data=None):
            try:
                if data is None:
                    data = {}
                logger.info(f"Handling event {event} with data: {data}")
                result = await handler(data)
                # If handler returns a value, emit acknowledgment
                if result is not None:
                    ack_event = f"{event}_ack"
                    await self.emit(ack_event, {
                        'status': 'success' if result else 'error',
                        'agent_id': self.agent_id,
                        'data': result
                    })
                logger.info(f"Finished handling event {event}")
            except Exception as e:
                logger.error(f"Error in handler for {event}: {e}")
                # Send error acknowledgment
                await self.emit(f"{event}_ack", {
                    'status': 'error',
                    'agent_id': self.agent_id,
                    'error': str(e)
                })
        self._event_handlers[event] = wrapper

    async def connect(self):
        """Connect to the backend server."""
        try:
            logger.info(f"Attempting to connect to {self.server_url}")
            await self.sio.connect(self.server_url, wait_timeout=None)  # No timeout
            self.connected = True
            logger.info("Successfully connected to backend")
            return True
        except Exception as e:
            logger.error(f"Failed to connect to backend: {e}")
            self.connected = False
            return False

    async def disconnect(self):
        """Disconnect from the backend server."""
        try:
            if self.connected:
                await self.sio.disconnect()
                self.connected = False
                logger.info("Disconnected from backend")
                return True
            return False
        except Exception as e:
            logger.error(f"Error during disconnect: {e}")
            return False

    async def emit(self, event: str, data: Optional[Dict[str, Any]] = None, expect_ack: bool = False):
        """Emit an event to the server.
        
        Args:
            event: Event name to emit
            data: Data to send with the event
            expect_ack: Whether to wait for acknowledgment
        """
        if not self.connected:
            logger.error(f"Cannot emit {event}: not connected")
            return False

        try:
            if data is None:
                data = {}
                
            # Always include agent_id in emitted data
            if isinstance(data, dict):
                data['agent_id'] = self.agent_id

            if expect_ack:
                logger.debug(f"Emitting {event} with ack: {data}")
                try:
                    response = await self.sio.emit(event, data, callback=True)
                    logger.debug(f"Received ack for {event}: {response}")
                    return response
                except Exception as e:
                    logger.error(f"Failed to get acknowledgment for {event}: {e}")
                    return False
            else:
                logger.debug(f"Emitting {event}: {data}")
                await self.sio.emit(event, data)
                return True
                
        except Exception as e:
            logger.error(f"Failed to emit {event}: {e}")
            return False

    async def register_agent(self, shells: Dict[str, str]):
        """Register this agent with the backend."""
        try:
            # Ensure system info is loaded
            if not self.system_info:
                self._initialize_system_info()

            # Debug shell detection
            logger.info(f"Shells parameter type: {type(shells)}")
            logger.info(f"Shells content: {shells}")
            
            if not shells:
                logger.warning("No shells detected! Trying to re-detect...")
                from agent.utils.shell_detector import detect_shells
                shells = detect_shells()
                logger.info(f"Re-detected shells: {shells}")

            registration_data = {
                'agent_id': self.agent_id,
                'machine_id': self.machine_id,
                'hostname': self.system_info.get('hostname'),
                'os': self.system_info.get('os'),
                'shells': list(shells.keys()),
                'system_info': self.system_info
            }
            logger.info(f"Registering agent with shells: {list(shells.keys())}")
            logger.info(f"Full registration data: {registration_data}")
            await self.emit('agent_register', registration_data)
            return True
        except Exception as e:
            logger.error(f"Failed to register agent: {e}")
            return False