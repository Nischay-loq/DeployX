import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from typing import Dict

app = FastAPI()

ui_connections: Dict[str, WebSocket] = {}
agent_connections: Dict[str, WebSocket] = {}

@app.websocket("/ws/ui/{agent_id}")
async def websocket_ui_endpoint(websocket: WebSocket, agent_id: str):
    await websocket.accept()
    ui_connections[agent_id] = websocket
    try:
        while True:
            data = await websocket.receive_json()
            if agent_id in agent_connections:
                await agent_connections[agent_id].send_json(data)
            else:
                await websocket.send_json({"type": "output", "payload": f"Agent {agent_id} is not connected."})
    except WebSocketDisconnect:
        del ui_connections[agent_id]

@app.websocket("/ws/agent/{agent_id}")
async def websocket_agent_endpoint(websocket: WebSocket, agent_id: str):
    await websocket.accept()
    agent_connections[agent_id] = websocket
    try:
        while True:
            data = await websocket.receive_json()
            if data.get("type") == "output":
                if agent_id in ui_connections:
                    await ui_connections[agent_id].send_json(data)
    except WebSocketDisconnect:
        del agent_connections[agent_id]