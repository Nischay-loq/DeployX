"""Socket.IO server instance for the DeployX backend."""
import socketio

from app.config import get_cors_origins

sio = socketio.AsyncServer(
    cors_allowed_origins=get_cors_origins(),
    logger=False,
    engineio_logger=False,
    async_mode='asgi',
    ping_timeout=60,  # 60 second timeout for better stability
    ping_interval=25  # 25 second ping interval
)
