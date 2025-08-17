from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import socketio
import os
from grouping.route import router as groups_router
from Devices.routes import router as devices_router

from command_executor import RealCMDExecutor
from auth import routes, models
from auth.database import engine

models.Base.metadata.create_all(bind=engine)

app = FastAPI()
app.include_router(routes.router)
app.include_router(groups_router)
app.include_router(devices_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Socket.IO server
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins=["http://localhost:5173", "http://localhost:8000"],
    logger=True,
    engineio_logger=True
)

client_executors = {}
agent_shells_map = {}

@sio.event
async def connect(sid, environ):
    print(f"Client {sid} connected")
    executor = RealCMDExecutor()
    client_executors[sid] = executor
    current_path = executor.get_current_path()
    await sio.emit('terminal_message', {
        "type": "path_update",
        "data": current_path
    }, room=sid)

@sio.event
async def disconnect(sid):
    print(f"Client {sid} disconnected")
    if sid in client_executors:
        client_executors[sid].cleanup()
        del client_executors[sid]

@sio.event
async def agent_shells(sid, data):
    print("Shells received from agent:", data)
    agent_id = data["agent_id"]
    shells = data["shells"]
    agent_shells_map[agent_id] = shells
    await sio.emit("available_shells", {"shells": shells})

@sio.event
async def terminal_command(sid, data):
    if sid not in client_executors:
        await sio.emit('terminal_message', {
            "type": "error",
            "data": "No executor available"
        }, room=sid)
        return
    executor = client_executors[sid]
    try:
        message_type = data.get("type")
        command_data = data.get("data", "")
        if message_type == "command":
            if command_data.strip() == "clear":
                await sio.emit('terminal_message', {
                    "type": "clear",
                    "data": ""
                }, room=sid)
            else:
                async for output in executor.execute_command(command_data):
                    await sio.emit('terminal_message', {
                        "type": "output",
                        "data": output
                    }, room=sid)
                updated_path = executor.get_current_path()
                await sio.emit('terminal_message', {
                    "type": "path_update",
                    "data": updated_path
                }, room=sid)
        elif message_type == "input":
            async for output in executor.send_input(command_data):
                await sio.emit('terminal_message', {
                    "type": "output",
                    "data": output
                }, room=sid)
        elif message_type == "interrupt":
            executor.interrupt()
            await sio.emit('terminal_message', {
                "type": "output",
                "data": "^C\n"
            }, room=sid)
    except Exception as e:
        await sio.emit('terminal_message', {
            "type": "error",
            "data": f"Command error: {str(e)}"
        }, room=sid)

@app.get("/")
async def root():
    return {"message": "Remote Terminal Server with Real CMD Running (Socket.IO)"}

@app.get("/health")
async def health():
    return {"status": "healthy", "cwd": os.getcwd()}

# Wrap FastAPI in Socket.IO ASGI App
socket_app = socketio.ASGIApp(sio, app)