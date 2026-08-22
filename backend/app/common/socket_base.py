"""Shared plumbing for Socket.IO command executors."""
import asyncio
import logging
from typing import Optional

logger = logging.getLogger(__name__)


class SocketExecutorBase:
    """Base class for executors that drive agents over a shared Socket.IO server.

    Holds the Socket.IO server + connection manager wiring and the common
    agent-connectivity checks used before dispatching commands.
    """

    def __init__(self):
        self.sio = None
        self.conn_manager = None

    def set_socketio(self, sio, conn_manager):
        """Set the Socket.IO server and connection manager instances."""
        self.sio = sio
        self.conn_manager = conn_manager

    def is_ready(self) -> bool:
        """True when both Socket.IO and the connection manager are wired up."""
        return bool(self.sio and self.conn_manager)

    def get_agent_sid(self, agent_id: str) -> Optional[str]:
        """Return the socket session ID for an agent, or None if unknown."""
        if not self.conn_manager:
            return None
        return self.conn_manager.get_agent_sid(agent_id)

    def agent_is_connected(self, agent_id: str) -> bool:
        """True when the agent has a session and responded to a recent heartbeat."""
        if not self.conn_manager:
            return False
        if not self.get_agent_sid(agent_id):
            return False
        checker = getattr(self.conn_manager, 'is_agent_connected', None)
        return True if checker is None else checker(agent_id)

    def log_unavailable_agent(self, agent_id: str):
        """Log an unreachable agent together with the currently connected ones."""
        available = self.conn_manager.get_agent_list() if self.conn_manager else []
        logger.error(f"Agent {agent_id} not connected. Available agents: {available}")

    async def emit_to_room(self, event: str, payload: dict, room: str):
        """Emit an event to a specific room (usually an agent SID)."""
        await self.sio.emit(event, payload, room=room)
