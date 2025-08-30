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
from app.grouping.route import router as groups_router
from app.Devices.routes import router as devices_router
from app.auth import routes, models
from app.auth.database import engine

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Create Socket.IO server with better configuration for multiple clients
sio = socketio.AsyncServer(
    cors_allowed_origins="*",
    logger=False,  # Disable verbose socket.io logging
    engineio_logger=False,  # Disable verbose engine.io logging
    async_mode='asgi',
    ping_timeout=60,
    ping_interval=25,
    max_http_buffer_size=10**8,  # 100MB for large outputs
    allow_upgrades=True,
    transports=['websocket', 'polling']  # Allow both transports
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


# Routes are already included above

# Store connected agents and frontends
class ConnectionManager:
    def __init__(self):
        self.agents: Dict[str, dict] = {}  # agent_id -> {sid, shells, connected_at, shell_sessions}
        self.frontends: Set[str] = set()  # Set of frontend session IDs
        self.agent_frontend_mapping: Dict[str, str] = {}  # agent_id -> frontend_sid
        self.sid_to_agent: Dict[str, str] = {}  # sid -> agent_id for reverse lookup
        self.sid_to_type: Dict[str, str] = {}  # sid -> 'agent' or 'frontend'
        self.shell_sessions: Dict[str, dict] = {}  # session_id -> {agent_id, shell, frontend_sid, status}
    
    def add_agent(self, agent_id: str, sid: str, shells: List[str]):
        """Add a new agent connection"""
        self.agents[agent_id] = {
            'sid': sid,
            'shells': shells,
            'connected_at': datetime.now(),
            'shell_sessions': {}  # session_id -> session_info
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
                # Clean up all shell sessions for this agent
                sessions_to_remove = []
                for session_id, session_info in self.shell_sessions.items():
                    if session_info['agent_id'] == agent_id:
                        sessions_to_remove.append(session_id)
                
                for session_id in sessions_to_remove:
                    self.remove_shell_session(session_id)
                
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
    
    def add_shell_session(self, session_id: str, agent_id: str, shell: str, frontend_sid: str):
        """Add a new shell session"""
        self.shell_sessions[session_id] = {
            'agent_id': agent_id,
            'shell': shell,
            'frontend_sid': frontend_sid,
            'status': 'starting',
            'created_at': datetime.now()
        }
        
        # Also track in agent's shell_sessions
        if agent_id in self.agents:
            self.agents[agent_id]['shell_sessions'][session_id] = {
                'shell': shell,
                'status': 'starting',
                'created_at': datetime.now()
            }
        
        logger.info(f"Added shell session {session_id}: agent={agent_id}, shell={shell}")
    
    def update_shell_session_status(self, session_id: str, status: str):
        """Update shell session status"""
        if session_id in self.shell_sessions:
            self.shell_sessions[session_id]['status'] = status
            
            # Update in agent's tracking too
            agent_id = self.shell_sessions[session_id]['agent_id']
            if agent_id in self.agents and session_id in self.agents[agent_id]['shell_sessions']:
                self.agents[agent_id]['shell_sessions'][session_id]['status'] = status
            
            logger.info(f"Updated shell session {session_id} status to {status}")
    
    def remove_shell_session(self, session_id: str):
        """Remove a shell session"""
        if session_id in self.shell_sessions:
            session_info = self.shell_sessions[session_id]
            agent_id = session_info['agent_id']
            
            # Remove from main tracking
            del self.shell_sessions[session_id]
            
            # Remove from agent's tracking
            if agent_id in self.agents and session_id in self.agents[agent_id]['shell_sessions']:
                del self.agents[agent_id]['shell_sessions'][session_id]
            
            logger.info(f"Removed shell session {session_id}")
            return session_info
        return None
    
    def get_shell_session(self, session_id: str) -> dict:
        """Get shell session info"""
        return self.shell_sessions.get(session_id)
    
    def get_agent_shell_sessions(self, agent_id: str) -> Dict[str, dict]:
        """Get all shell sessions for an agent"""
        if agent_id in self.agents:
            return self.agents[agent_id]['shell_sessions']
        return {}

# Initialize connection manager
conn_manager = ConnectionManager()

@sio.event
async def connect(sid, environ, auth):
    """Handle new socket connections"""
    client_origin = environ.get('HTTP_ORIGIN', 'unknown')
    user_agent = environ.get('HTTP_USER_AGENT', 'unknown')
    logger.info(f"New connection: {sid} from {client_origin} (User-Agent: {user_agent[:50]}...)")
    logger.info(f"Current connections: {len(conn_manager.agents)} agents, {len(conn_manager.frontends)} frontends")

@sio.event
async def disconnect(sid):
    """Handle socket disconnections"""
    try:
        logger.info(f"Client {sid} disconnecting...")
        connection_type, agent_id = conn_manager.remove_connection(sid)
        
        if connection_type == 'agent':
            logger.info(f"Agent {agent_id} disconnected")
            # Notify all frontends about agent disconnection with a small delay
            await asyncio.sleep(0.1)  # Small delay to prevent race conditions
            await sio.emit('agents_list', conn_manager.get_agent_list())
        elif connection_type == 'frontend':
            logger.info(f"Frontend {sid} disconnected")
        else:
            logger.info(f"Unknown connection type disconnected: {sid}")
            
        logger.info(f"Remaining connections: {len(conn_manager.agents)} agents, {len(conn_manager.frontends)} frontends")
    except Exception as e:
        logger.error(f"Error handling disconnect for {sid}: {e}")

@sio.event
async def get_shells(sid, data):
    """Get available shells for a specific agent"""
    try:
        # Register this connection as a frontend if not already registered
        if sid not in conn_manager.sid_to_type:
            conn_manager.add_frontend(sid)
            logger.info(f"Frontend {sid} registered via get_shells request")
        
        # Check if the requesting client is a frontend
        if sid not in conn_manager.frontends:
            logger.warning(f"Ignoring shells request from non-frontend {sid}")
            return
        
        # Handle both formats: direct agent_id string or {agent_id: string}
        if isinstance(data, dict):
            agent_id = data.get('agent_id')
        else:
            agent_id = data
            
        logger.info(f"Shell list request for agent {agent_id} from frontend {sid}")
        shells = conn_manager.get_agent_shells(agent_id)
        
        if not shells:
            logger.warning(f"No shells found for agent {agent_id}")
            await sio.emit('shells_list', [], room=sid)
            return
            
        await sio.emit('shells_list', shells, room=sid)
        logger.info(f"Sent shell list to {sid}: {shells}")
    except Exception as e:
        logger.error(f"Error getting shells for agent {agent_id}: {e}")
        await sio.emit('error', {'message': f'Error getting shells: {str(e)}'}, room=sid)

@sio.event
async def frontend_register(sid, data):
    """Handle frontend registration"""
    try:
        logger.info(f"Frontend registration request from {sid}: {data}")
        
        # Register this connection as a frontend
        conn_manager.add_frontend(sid)
        
        # Confirm registration to the frontend
        await sio.emit('registration_success', {'client_type': 'frontend'}, room=sid)
        logger.info(f"Frontend {sid} registered successfully")
        
    except Exception as e:
        logger.error(f"Error registering frontend: {e}")
        await sio.emit('registration_error', {'error': str(e)}, room=sid)

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
        # Register this connection as a frontend if not already registered
        if sid not in conn_manager.sid_to_type:
            conn_manager.add_frontend(sid)
            logger.info(f"Frontend {sid} registered via get_agents request")
        
        agent_list = conn_manager.get_agent_list()
        await sio.emit('agents_list', agent_list, room=sid)
        logger.info(f"Sent agent list to frontend {sid}: {agent_list}")
    except Exception as e:
        logger.error(f"Error getting agents: {e}")


@sio.event
async def start_shell(sid, data):
    """Request agent to start a specific shell with session ID"""
    try:
        agent_id = data.get('agent_id')
        shell = data.get('shell', 'cmd')
        session_id = data.get('session_id')
        
        if not session_id:
            session_id = f"{agent_id}_{shell}_{int(datetime.now().timestamp() * 1000)}"
        
        logger.info(f"Shell start request: agent={agent_id}, shell={shell}, session={session_id}, frontend={sid}")
        
        agent_sid = conn_manager.get_agent_sid(agent_id)
        if agent_sid:
            # Add shell session tracking
            conn_manager.add_shell_session(session_id, agent_id, shell, sid)
            
            # Map this agent to this frontend for future communications
            conn_manager.map_agent_to_frontend(agent_id, sid)
            
            # Forward request to agent with session ID
            await sio.emit('start_shell_request', {
                'shell': shell, 
                'session_id': session_id
            }, room=agent_sid)
            logger.info(f"Forwarded start_shell request to agent {agent_id} (sid: {agent_sid}) with session {session_id}")
        else:
            error_msg = f'Agent {agent_id} not found or not connected'
            logger.error(error_msg)
            await sio.emit('error', {'message': error_msg}, room=sid)
    except Exception as e:
        logger.error(f"Error starting shell: {e}")
        await sio.emit('error', {'message': f'Error starting shell: {str(e)}'}, room=sid)

@sio.event
async def stop_shell(sid, data):
    """Request agent to stop a specific shell session"""
    try:
        agent_id = data.get('agent_id')
        session_id = data.get('session_id')
        
        logger.info(f"Shell stop request: agent={agent_id}, session={session_id}, frontend={sid}")
        
        # Get session info
        session_info = conn_manager.get_shell_session(session_id)
        if not session_info:
            error_msg = f'Shell session {session_id} not found'
            logger.error(error_msg)
            await sio.emit('error', {'message': error_msg}, room=sid)
            return
        
        agent_sid = conn_manager.get_agent_sid(agent_id)
        if agent_sid:
            # Forward request to agent
            await sio.emit('stop_shell_request', {
                'session_id': session_id
            }, room=agent_sid)
            logger.info(f"Forwarded stop_shell request to agent {agent_id} for session {session_id}")
            
            # Remove session tracking
            conn_manager.remove_shell_session(session_id)
        else:
            error_msg = f'Agent {agent_id} not found or not connected'
            logger.error(error_msg)
            await sio.emit('error', {'message': error_msg}, room=sid)
    except Exception as e:
        logger.error(f"Error stopping shell: {e}")
        await sio.emit('error', {'message': f'Error stopping shell: {str(e)}'}, room=sid)

@sio.event
async def command_input(sid, data):
    """Forward command input from frontend to agent with session ID"""
    try:
        agent_id = data.get('agent_id')
        session_id = data.get('session_id')
        command = data.get('command')
        
        logger.debug(f"Command input: agent={agent_id}, session={session_id}, command={repr(command)}, frontend={sid}")
        
        # Verify session exists
        session_info = conn_manager.get_shell_session(session_id)
        if not session_info:
            error_msg = f'Shell session {session_id} not found'
            logger.error(error_msg)
            await sio.emit('error', {'message': error_msg}, room=sid)
            return
        
        agent_sid = conn_manager.get_agent_sid(agent_id)
        if agent_sid:
            await sio.emit('command_input', {
                'command': command,
                'session_id': session_id
            }, room=agent_sid)
            logger.debug(f"Forwarded command to agent {agent_id} session {session_id}")
        else:
            error_msg = f'Agent {agent_id} not found or not connected'
            logger.error(error_msg)
            await sio.emit('error', {'message': error_msg}, room=sid)
    except Exception as e:
        logger.error(f"Error forwarding command: {e}")

@sio.event
async def command_output(sid, data):
    """Forward command output from agent to frontend with session ID"""
    try:
        # Find which agent this is from
        agent_id = conn_manager.get_agent_by_sid(sid)
        session_id = data.get('session_id')
        
        if agent_id and session_id:
            # Get session info to find the correct frontend
            session_info = conn_manager.get_shell_session(session_id)
            if session_info:
                frontend_sid = session_info['frontend_sid']
                output = data.get('output', '')
                await sio.emit('command_output', {
                    'output': output,
                    'session_id': session_id
                }, room=frontend_sid)
                # Don't log every character, too verbose
                # logger.debug(f"Forwarded output from agent {agent_id} session {session_id} to frontend {frontend_sid}")
            else:
                logger.warning(f"Shell session {session_id} not found")
        else:
            logger.warning(f"Received output from unknown agent (sid: {sid}) or missing session_id")
    except Exception as e:
        logger.error(f"Error forwarding output: {e}")

@sio.event
async def shell_started(sid, data):
    """Handle shell started confirmation from agent"""
    try:
        # Find which agent this is from
        agent_id = conn_manager.get_agent_by_sid(sid)
        session_id = data.get('session_id')
        shell = data.get('shell')
        
        if agent_id and session_id:
            # Update session status
            conn_manager.update_shell_session_status(session_id, 'running')
            
            # Get session info to find the correct frontend
            session_info = conn_manager.get_shell_session(session_id)
            if session_info:
                frontend_sid = session_info['frontend_sid']
                await sio.emit('shell_started', {
                    'shell': shell,
                    'session_id': session_id
                }, room=frontend_sid)
                logger.info(f"Shell {shell} started on agent {agent_id} session {session_id}, notified frontend {frontend_sid}")
            else:
                logger.warning(f"Shell session {session_id} not found")
        else:
            logger.warning(f"Received shell_started from unknown agent (sid: {sid}) or missing session_id")
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

# Mount Socket.IO app
socket_app = socketio.ASGIApp(sio, app)

app.mount("/", socket_app)  # Mount Socket.IO app at the root

def start():
    """Start the backend server."""
    logger.info("Starting Remote Command Execution Backend...")
    logger.info("Backend will be available at: http://localhost:8000")
    logger.info("Socket.IO endpoint: ws://localhost:8000/socket.io/")