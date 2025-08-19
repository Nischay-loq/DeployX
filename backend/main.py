from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import socketio
import asyncio
import logging
from typing import Dict, List, Set
import uuid
from datetime import datetime
import uvicorn
import os
from grouping.route import router as groups_router
from Devices.routes import router as devices_router
from auth import routes, models
from auth.database import engine

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Create Socket.IO server with better configuration
sio = socketio.AsyncServer(
    cors_allowed_origins="*",
    logger=False,  # Disable verbose socket.io logging
    engineio_logger=False,  # Disable verbose engine.io logging
    async_mode='asgi',
    ping_timeout=60,
    ping_interval=25
)

models.Base.metadata.create_all(bind=engine)

# Create FastAPI app
app = FastAPI(title="Remote Command Execution Backend")
app.include_router(routes.router)
app.include_router(groups_router)
app.include_router(devices_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],  # You can also restrict headers if needed
)


#including all routes in main 
app.include_router(groups_router)
app.include_router(devices_router)

# Store connected agents and frontends
class ConnectionManager:
    def __init__(self):
        self.agents: Dict[str, dict] = {}  # agent_id -> {sid, shells, connected_at}
        self.frontends: Set[str] = set()  # Set of frontend session IDs
        self.agent_frontend_mapping: Dict[str, str] = {}  # agent_id -> frontend_sid
        self.sid_to_agent: Dict[str, str] = {}  # sid -> agent_id for reverse lookup
        self.sid_to_type: Dict[str, str] = {}  # sid -> 'agent' or 'frontend'
    
    def add_agent(self, agent_id: str, sid: str, shells: List[str]):
        """Add a new agent connection"""
        self.agents[agent_id] = {
            'sid': sid,
            'shells': shells,
            'connected_at': datetime.now()
        }
        self.sid_to_agent[sid] = agent_id
        self.sid_to_type[sid] = 'agent'
        logger.info(f"Agent {agent_id} connected (sid: {sid}) with shells: {shells}")
    
    def add_frontend(self, sid: str):
        """Add a frontend connection"""
        self.frontends.add(sid)
        self.sid_to_type[sid] = 'frontend'
        logger.info(f"Frontend connected (sid: {sid})")
    
    def remove_connection(self, sid: str):
        """Remove a connection by session ID"""
        connection_type = self.sid_to_type.get(sid)
        
        if connection_type == 'agent':
            agent_id = self.sid_to_agent.get(sid)
            if agent_id:
                # Clean up agent
                if sid in self.sid_to_agent:
                    del self.sid_to_agent[sid]
                if agent_id in self.agents:
                    del self.agents[agent_id]
                if agent_id in self.agent_frontend_mapping:
                    del self.agent_frontend_mapping[agent_id]
                logger.info(f"Agent {agent_id} disconnected (sid: {sid})")
                return 'agent', agent_id
                
        elif connection_type == 'frontend':
            # Clean up frontend
            self.frontends.discard(sid)
            # Remove any agent mappings for this frontend
            to_remove = [agent_id for agent_id, frontend_sid in self.agent_frontend_mapping.items() if frontend_sid == sid]
            for agent_id in to_remove:
                del self.agent_frontend_mapping[agent_id]
            logger.info(f"Frontend disconnected (sid: {sid})")
            return 'frontend', None
        
        # Clean up tracking
        if sid in self.sid_to_type:
            del self.sid_to_type[sid]
            
        return None, None
    
    def get_agent_list(self) -> List[str]:
        """Get list of connected agent IDs"""
        return list(self.agents.keys())
    
    def get_agent_shells(self, agent_id: str) -> List[str]:
        """Get available shells for an agent"""
        return self.agents.get(agent_id, {}).get('shells', [])
    
    def get_agent_sid(self, agent_id: str) -> str:
        """Get socket ID for an agent"""
        return self.agents.get(agent_id, {}).get('sid')
    
    def get_agent_by_sid(self, sid: str) -> str:
        """Get agent ID by session ID"""
        return self.sid_to_agent.get(sid)
    
    def map_agent_to_frontend(self, agent_id: str, frontend_sid: str):
        """Map an agent to a frontend for communication"""
        self.agent_frontend_mapping[agent_id] = frontend_sid
        logger.info(f"Mapped agent {agent_id} to frontend {frontend_sid}")
    
    def get_frontend_for_agent(self, agent_id: str) -> str:
        """Get the frontend SID mapped to an agent"""
        return self.agent_frontend_mapping.get(agent_id)

# Initialize connection manager
conn_manager = ConnectionManager()

@sio.event
async def connect(sid, environ, auth):
    """Handle new socket connections"""
    client_origin = environ.get('HTTP_ORIGIN', 'unknown')
    logger.info(f"Client {sid} connected from {client_origin}")

@sio.event
async def disconnect(sid):
    """Handle socket disconnections"""
    try:
        connection_type, agent_id = conn_manager.remove_connection(sid)
        
        if connection_type == 'agent':
            # Notify all frontends about agent disconnection with a small delay
            await asyncio.sleep(0.1)  # Small delay to prevent race conditions
            await sio.emit('agents_list', conn_manager.get_agent_list())
        elif connection_type == 'frontend':
            logger.info(f"Frontend {sid} disconnected")
    except Exception as e:
        logger.error(f"Error handling disconnect: {e}")

@sio.event
async def get_shells(sid, agent_id):
    """Get available shells for a specific agent"""
    try:
        # Check if the requesting client is still connected
        if sid not in conn_manager.frontends:
            logger.warning(f"Ignoring shells request from disconnected frontend {sid}")
            return
            
        logger.info(f"Shell list request for agent {agent_id} from {sid}")
        shells = conn_manager.get_agent_shells(agent_id)
        await sio.emit('shells_list', list(shells.keys()), room=sid)
        logger.info(f"Sent shell list to {sid}: {shells}")
    except Exception as e:
        logger.error(f"Error getting shells for agent {agent_id}: {e}")

@sio.event
async def agent_register(sid, data):
    """Handle agent registration"""
    try:
        agent_id = data.get('agent_id', f'agent_{sid[:8]}')
        shells = data.get('shells', ['cmd'])
        
        logger.info(f"Agent registration request: {agent_id} with shells {shells}")
        
        conn_manager.add_agent(agent_id, sid, shells)
        
        # Notify all frontends about new agent
        await sio.emit('agents_list', conn_manager.get_agent_list())
        
        # Confirm registration to the agent
        await sio.emit('registration_success', {'agent_id': agent_id}, room=sid)
        logger.info(f"Agent {agent_id} registered successfully")
        
    except Exception as e:
        logger.error(f"Error registering agent: {e}")
        await sio.emit('registration_error', {'error': str(e)}, room=sid)

@sio.event
async def frontend_register(sid, data):
    """Handle frontend registration"""
    try:
        logger.info(f"Frontend registration request from {sid}")
        conn_manager.add_frontend(sid)
        
        # Send current agent list to the new frontend
        agent_list = conn_manager.get_agent_list()
        await sio.emit('agents_list', agent_list, room=sid)
        logger.info(f"Sent agent list to frontend {sid}: {agent_list}")
        
    except Exception as e:
        logger.error(f"Error registering frontend: {e}")

@sio.event
async def get_agents(sid):
    """Get list of connected agents"""
    try:
        agent_list = conn_manager.get_agent_list()
        await sio.emit('agents_list', agent_list, room=sid)
        logger.info(f"Sent agent list to {sid}: {agent_list}")
    except Exception as e:
        logger.error(f"Error getting agents: {e}")


@sio.event
async def start_shell(sid, data):
    """Request agent to start a specific shell"""
    try:
        agent_id = data.get('agent_id')
        shell = data.get('shell', 'cmd')
        
        logger.info(f"Shell start request: agent={agent_id}, shell={shell}, frontend={sid}")
        
        agent_sid = conn_manager.get_agent_sid(agent_id)
        if agent_sid:
            # Map this agent to this frontend for future communications
            conn_manager.map_agent_to_frontend(agent_id, sid)
            
            # Forward request to agent
            await sio.emit('start_shell_request', {'shell': shell}, room=agent_sid)
            logger.info(f"Forwarded start_shell request to agent {agent_id} (sid: {agent_sid})")
        else:
            error_msg = f'Agent {agent_id} not found or not connected'
            logger.error(error_msg)
            await sio.emit('error', {'message': error_msg}, room=sid)
    except Exception as e:
        logger.error(f"Error starting shell: {e}")
        await sio.emit('error', {'message': f'Error starting shell: {str(e)}'}, room=sid)

@sio.event
async def command_input(sid, data):
    """Forward command input from frontend to agent"""
    try:
        agent_id = data.get('agent_id')
        command = data.get('command')
        
        logger.debug(f"Command input: agent={agent_id}, command={repr(command)}, frontend={sid}")
        
        agent_sid = conn_manager.get_agent_sid(agent_id)
        if agent_sid:
            await sio.emit('command_input', {'command': command}, room=agent_sid)
            logger.debug(f"Forwarded command to agent {agent_id}")
        else:
            error_msg = f'Agent {agent_id} not found or not connected'
            logger.error(error_msg)
            await sio.emit('error', {'message': error_msg}, room=sid)
    except Exception as e:
        logger.error(f"Error forwarding command: {e}")

@sio.event
async def command_output(sid, data):
    """Forward command output from agent to frontend"""
    try:
        # Find which agent this is from
        agent_id = conn_manager.get_agent_by_sid(sid)
        
        if agent_id:
            frontend_sid = conn_manager.get_frontend_for_agent(agent_id)
            if frontend_sid:
                output = data.get('output', '')
                await sio.emit('command_output', output, room=frontend_sid)
                # Don't log every character, too verbose
                # logger.debug(f"Forwarded output from agent {agent_id} to frontend {frontend_sid}")
            else:
                logger.warning(f"No frontend mapped for agent {agent_id}")
        else:
            logger.warning(f"Received output from unknown agent (sid: {sid})")
    except Exception as e:
        logger.error(f"Error forwarding output: {e}")

@sio.event
async def shell_started(sid, data):
    """Handle shell started confirmation from agent"""
    try:
        # Find which agent this is from
        agent_id = conn_manager.get_agent_by_sid(sid)
        
        if agent_id:
            frontend_sid = conn_manager.get_frontend_for_agent(agent_id)
            if frontend_sid:
                shell = data.get('shell')
                await sio.emit('shell_started', shell, room=frontend_sid)
                logger.info(f"Shell {shell} started on agent {agent_id}, notified frontend {frontend_sid}")
            else:
                logger.warning(f"No frontend mapped for agent {agent_id}")
        else:
            logger.warning(f"Received shell_started from unknown agent (sid: {sid})")
    except Exception as e:
        logger.error(f"Error handling shell started: {e}")

# Health check endpoint
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "agents_connected": len(conn_manager.agents),
        "frontends_connected": len(conn_manager.frontends),
        "timestamp": datetime.now().isoformat()
    }

# Get agents endpoint (REST API alternative)
@app.get("/api/agents")
async def get_agents_rest():
    agents_info = {}
    for agent_id, info in conn_manager.agents.items():
        agents_info[agent_id] = {
            "shells": info["shells"],
            "connected_at": info["connected_at"].isoformat()
        }
    return {"agents": agents_info}


@app.get("/")
async def root():
    return {"message": "Remote Terminal Server with Real CMD Running (Socket.IO)"}

@app.get("/health")
async def health():
    return {"status": "healthy", "cwd": os.getcwd()}

# Mount Socket.IO app
socket_app = socketio.ASGIApp(sio, app)

if __name__ == "__main__":
    logger.info("Starting Remote Command Execution Backend...")
    logger.info("Backend will be available at: https://deployx-server.onrender.com")
    logger.info("Socket.IO endpoint: wss://deployx-server.onrender.com/socket.io/")
    
    uvicorn.run(
        socket_app,
        host="0.0.0.0",
        port=8000,
        log_level="warning",  # Reduce uvicorn logging noise
        access_log=False  # Disable access logs
    )
