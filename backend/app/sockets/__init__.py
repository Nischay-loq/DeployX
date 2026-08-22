"""Socket.IO layer: server instance, connection manager, and event handlers.

Importing this package constructs the AsyncServer, the ConnectionManager,
and registers every @sio.event handler.
"""
from app.sockets.server import sio
from app.sockets.manager import ConnectionManager, conn_manager
from app.sockets import handlers  # noqa: F401 - registers @sio.event handlers on import


def get_socketio_components():
    """Get Socket.IO server and connection manager instances"""
    return sio, conn_manager
