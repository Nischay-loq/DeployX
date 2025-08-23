"""WebSocket connection handling for DeployX agent."""
import socketio
import logging
from typing import Optional, Dict, Any, Callable

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self, server_url: str, agent_id: str):
        """Initialize the connection manager.
        
        Args:
            server_url: URL of the backend server
            agent_id: Unique identifier for this agent
        """
        self.server_url = server_url
        self.agent_id = agent_id
        self.sio = socketio.AsyncClient(
            logger=True,
            engineio_logger=True,
            reconnection=True,
            reconnection_attempts=5,
            reconnection_delay=10
        )
        self.connected = False
        self._event_handlers: Dict[str, Callable] = {}
        
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

    def register_handler(self, event: str, handler: Callable):
        """Register a handler for a socket.io event."""
        @self.sio.on(event)
        async def wrapper(data):
            try:
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
            await self.sio.connect(self.server_url, wait_timeout=10)
            self.connected = True
            logger.info("Successfully connected to backend")
            return True
        except Exception as e:
            logger.error(f"Failed to connect to backend: {e}")
            return False

    async def disconnect(self):
        """Disconnect from the backend server."""
        try:
            await self.sio.disconnect()
            self.connected = False
            logger.info("Disconnected from backend")
            return True
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
            registration_data = {
                'agent_id': self.agent_id,
                'shells': list(shells.keys())  # Send only shell names
            }
            logger.info(f"Registering agent with data: {registration_data}")
            await self.emit('agent_register', registration_data)
            return True
        except Exception as e:
            logger.error(f"Failed to register agent: {e}")
            return False
