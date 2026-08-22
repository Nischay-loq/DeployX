"""DeployX backend - FastAPI application entrypoint."""
import logging

import socketio
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Load environment variables before importing app modules (DB URL, SMTP, ...)
load_dotenv()

from app.config import get_cors_origins
from app.auth import routes
from app.auth.database import engine, Base
from app.grouping.route import router as groups_router
from app.Devices.routes import router as devices_router
from app.Deployments.routes import router as deployments_router
from app.software.routes import router as software_router
from app.files.routes import router as files_router
from app.agents.routes import router as agents_router
from app.command_deployment.routes import router as deployment_router
from app.dashboard.routes import router as dashboard_router
from app.schedule.routes import router as schedule_router
from app.logs.routes import router as logs_router
from app.activation.routes import router as activation_router
from app.agent_updates.routes import router as agent_updates_router
from app.agent_setup.routes import router as agent_setup_router

# Import models so Base.metadata knows every table before create_all
from app.grouping import models as grouping_models  # noqa: F401
from app.Deployments import models as deployment_models  # noqa: F401
from app.software import models as software_models  # noqa: F401
from app.files import models as file_models  # noqa: F401
from app.schedule import models as schedule_models  # noqa: F401
from app.activation import models as activation_models  # noqa: F401

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Remote Command Execution Backend")

# Add CORS middleware BEFORE including routers
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH"],
    allow_headers=[
        "*",
        "Authorization",
        "Content-Type",
        "X-Requested-With",
        "Accept",
        "Origin",
        "Access-Control-Request-Method",
        "Access-Control-Request-Headers",
    ],
    expose_headers=["*"],
)
logger.info(f"CORS allowed origins: {get_cors_origins()}")

for router in (
    routes.router,
    groups_router,
    devices_router,
    agents_router,
    deployment_router,
    deployments_router,
    software_router,
    files_router,
    dashboard_router,
    schedule_router,
    logs_router,
    activation_router,
    agent_updates_router,
    agent_setup_router,
):
    app.include_router(router)


@app.get("/health")
def health_check():
    return {"status": "healthy", "message": "Backend is running"}


@app.get("/")
async def root():
    return {"message": "Remote Terminal Server with Real CMD Running (Socket.IO)"}


# Importing this package creates the Socket.IO server, the connection manager,
# and registers all @sio.event handlers.
from app.sockets import sio, conn_manager, get_socketio_components  # noqa: E402,F401
from app.sockets import handlers  # noqa: E402,F401

# Wire command executors to Socket.IO
from app.command_deployment.executor import command_executor  # noqa: E402
from app.grouping.command_executor import group_command_executor  # noqa: E402

command_executor.set_socketio(sio, conn_manager)
group_command_executor.set_socketio(sio, conn_manager)


@app.on_event("startup")
async def startup_event():
    """Initialize services on application startup"""
    try:
        from app.schedule.scheduler import task_scheduler
        from app.auth.database import SessionLocal

        # Start the task scheduler
        task_scheduler.start()
        logger.info("Task scheduler started")

        # Load existing scheduled tasks
        db = SessionLocal()
        try:
            task_scheduler.load_existing_tasks(db)
            logger.info("Loaded existing scheduled tasks")
        finally:
            db.close()

    except Exception as e:
        logger.error(f"Error during startup: {e}", exc_info=True)


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on application shutdown"""
    try:
        from app.schedule.scheduler import task_scheduler

        # Shutdown the task scheduler
        task_scheduler.shutdown()
        logger.info("Task scheduler stopped")

    except Exception as e:
        logger.error(f"Error during shutdown: {e}", exc_info=True)


socket_app = socketio.ASGIApp(sio, app)


def start():
    """Start the backend server."""
    logger.info("Starting Remote Command Execution Backend...")
    logger.info("Backend will be available at: https://deployx-server.onrender.com")
    logger.info("Socket.IO endpoint: wss://deployx-server.onrender.com/socket.io/")
