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
from app.agents.routes import router as agents_router
from app.auth import routes, models
from app.agents import models as agent_models, crud as agent_crud, schemas as agent_schemas
from app.auth.database import engine, get_db
from app.command_deployment.routes import router as deployment_router
from app.command_deployment.executor import command_executor
from app.auth.database import get_db
from app.agents import crud as agent_crud, schemas as agent_schemas

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
agent_models.Base.metadata.create_all(bind=engine)

# Create FastAPI app
app = FastAPI(title="Remote Command Execution Backend")
app.include_router(routes.router)
app.include_router(groups_router)
app.include_router(devices_router)
app.include_router(agents_router)
app.include_router(deployment_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],  # You can also restrict headers if needed
)

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
        connection_type = self.sid_to_type.pop(sid, None)
        
        if connection_type == 'agent':
            agent_id = self.sid_to_agent.pop(sid, None)
            if agent_id:
                self.agents.pop(agent_id, None)
                self.agent_frontend_mapping.pop(agent_id, None)
                logger.info(f"Agent {agent_id} disconnected (sid: {sid})")
                return 'agent', agent_id
                
        elif connection_type == 'frontend':
            self.frontends.discard(sid)
            to_remove = [agent_id for agent_id, frontend_sid in self.agent_frontend_mapping.items() if frontend_sid == sid]
            for agent_id in to_remove:
                del self.agent_frontend_mapping[agent_id]
            logger.info(f"Frontend disconnected (sid: {sid})")
            return 'frontend', None
            
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

# Helper function to get and send agent list
async def _update_and_send_agent_list(sid=None):
    """Helper to fetch agents from DB, update status, and emit to frontends."""
    db = next(get_db())
    try:
        db_agents = agent_crud.get_agents(db, limit=1000)
        online_agent_ids = set(conn_manager.get_agent_list())
        
        agents_with_status = []
        for agent in db_agents:
            # Use from_orm to convert SQLAlchemy model to Pydantic model
            agent_pydantic = agent_schemas.AgentResponse.from_orm(agent)
            agent_info = agent_pydantic.model_dump(mode='json')  # Use JSON mode for datetime serialization
            agent_info['status'] = 'online' if agent.agent_id in online_agent_ids else 'offline'
            agents_with_status.append(agent_info)

        target = sid if sid else None
        if target:
            await sio.emit('agents_list', agents_with_status, room=target)
            logger.info(f"Sent full agent list to frontend {sid}")
        else:
            await sio.emit('agents_list', agents_with_status)
            logger.info("Sent full agent list to all frontends")
            
    except Exception as e:
        logger.error(f"Error in _update_and_send_agent_list: {e}")
    finally:
        db.close()

# Set up command executor with socket.io and connection manager
command_executor.set_socketio(sio, conn_manager)

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
        
        if connection_type == 'agent' and agent_id:
            # Update agent status in the database to 'offline'
            db = next(get_db())
            try:
                agent_crud.update_agent_status(db, agent_id, "offline")
                logger.info(f"Agent {agent_id} status updated to offline in database.")
            finally:
                db.close()

            # Notify all frontends about agent list change
            await _update_and_send_agent_list()
            
        elif connection_type == 'frontend':
            logger.info(f"Frontend {sid} disconnected")
            
    except Exception as e:
        logger.error(f"Error handling disconnect for sid {sid}: {e}")

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
async def agent_register(sid, data):
    """Handle agent registration"""
    try:
        logger.info(f"Agent registration request from {sid} with data: {data}")
        
        # Validate data
        reg_data = agent_schemas.AgentRegistrationRequest(**data)
        
        # Use a database session
        db = next(get_db())
        try:
            agent = agent_crud.register_or_update_agent(db, reg_data)
            logger.info(f"Agent {agent.agent_id} registered/updated in database.")
        finally:
            db.close()
            
        conn_manager.add_agent(reg_data.agent_id, sid, reg_data.shells)
        
        # Notify all frontends about the updated agent list
        await _update_and_send_agent_list()
        
        # Confirm registration to the agent
        await sio.emit('registration_success', {'agent_id': reg_data.agent_id}, room=sid)
        logger.info(f"Agent {reg_data.agent_id} registered successfully via socket.")
        
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
        await _update_and_send_agent_list(sid=sid)
        
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
        # Validate input data
        if not isinstance(data, dict):
            raise ValueError("Invalid data format - expected dictionary")
        
        agent_id = data.get('agent_id')
        shell = data.get('shell', 'cmd')
        
        if not agent_id:
            raise ValueError("Missing required field: agent_id")
        
        if not isinstance(shell, str) or not shell.strip():
            raise ValueError("Invalid shell parameter")
        
        logger.info(f"Shell start request: agent={agent_id}, shell={shell}, frontend={sid}")
        
        agent_sid = conn_manager.get_agent_sid(agent_id)
        if not agent_sid:
            raise ValueError(f'Agent {agent_id} not found or not connected')
        
        # Map this agent to this frontend for future communications
        conn_manager.map_agent_to_frontend(agent_id, sid)
        
        # Forward request to agent
        await sio.emit('start_shell_request', {'shell': shell}, room=agent_sid)
        logger.info(f"Forwarded start_shell request to agent {agent_id} (sid: {agent_sid})")
        
    except ValueError as ve:
        logger.warning(f"Validation error in start_shell: {ve}")
        await sio.emit('error', {'message': str(ve), 'type': 'validation_error'}, room=sid)
    except Exception as e:
        logger.error(f"Error starting shell: {e}")
        await sio.emit('error', {'message': f'Error starting shell: {str(e)}', 'type': 'server_error'}, room=sid)

@sio.event
async def stop_shell(sid, data):
    """Request agent to stop current shell"""
    try:
        agent_id = data.get('agent_id')
        logger.info(f"Shell stop request: agent={agent_id}, frontend={sid}")

        agent_sid = conn_manager.get_agent_sid(agent_id)
        if agent_sid:
            await sio.emit('stop_shell_request', {}, room=agent_sid)
            logger.info(f"Forwarded stop_shell request to agent {agent_id} (sid: {agent_sid})")
        else:
            error_msg = f'Agent {agent_id} not found or not connected'
            logger.error(error_msg)
            await sio.emit('error', {'message': error_msg}, room=sid)
    except Exception as e:
        logger.error(f"Error stopping shell: {e}")
        await sio.emit('error', {'message': f'Error stopping shell: {str(e)}'}, room=sid)

@sio.event
async def command_input(sid, data):
    """Forward command input from frontend to agent"""
    try:
        # Validate input data
        if not isinstance(data, dict):
            raise ValueError("Invalid data format - expected dictionary")
        
        agent_id = data.get('agent_id')
        command = data.get('command')
        
        if not agent_id:
            raise ValueError("Missing required field: agent_id")
        
        if command is None:
            raise ValueError("Missing required field: command")
        
        if not isinstance(command, str):
            raise ValueError("Command must be a string")
        
        logger.debug(f"Command input: agent={agent_id}, command={repr(command)}, frontend={sid}")
        
        agent_sid = conn_manager.get_agent_sid(agent_id)
        if not agent_sid:
            raise ValueError(f'Agent {agent_id} not found or not connected')
        
        await sio.emit('command_input', {'command': command}, room=agent_sid)
        logger.debug(f"Forwarded command to agent {agent_id}")
        
    except ValueError as ve:
        logger.warning(f"Validation error in command_input: {ve}")
        await sio.emit('error', {'message': str(ve), 'type': 'validation_error'}, room=sid)
    except Exception as e:
        logger.error(f"Error forwarding command: {e}")
        await sio.emit('error', {'message': f'Error forwarding command: {str(e)}', 'type': 'server_error'}, room=sid)

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

@sio.event
async def shell_stopped(sid, data):
    """Handle shell stopped notification from agent"""
    try:
        agent_id = conn_manager.get_agent_by_sid(sid)
        if agent_id:
            frontend_sid = conn_manager.get_frontend_for_agent(agent_id)
            if frontend_sid:
                await sio.emit('shell_stopped', data or {}, room=frontend_sid)
                logger.info(f"Shell stopped on agent {agent_id}, notified frontend {frontend_sid}")
            else:
                logger.warning(f"No frontend mapped for agent {agent_id}")
        else:
            logger.warning(f"Received shell_stopped from unknown agent (sid: {sid})")
    except Exception as e:
        logger.error(f"Error handling shell stopped: {e}")

@sio.event
async def deployment_command_output(sid, data):
    """Handle output from deployment command execution"""
    try:
        cmd_id = data.get('command_id')
        output = data.get('output', '')
        
        if cmd_id:
            await command_executor.handle_command_output(cmd_id, output)
            
            # Forward to all frontends for real-time updates
            await sio.emit('deployment_command_output', {
                'command_id': cmd_id,
                'output': output
            })
    except Exception as e:
        logger.error(f"Error handling deployment command output: {e}")

@sio.event
async def deployment_command_completed(sid, data):
    """Handle deployment command completion notification from agent"""
    try:
        cmd_id = data.get('command_id')
        success = data.get('success', False)
        final_output = data.get('output', '')
        error = data.get('error', '')
        
        if cmd_id:
            await command_executor.handle_command_completion(
                cmd_id, success, final_output, error
            )
            
            # Notify all frontends
            await sio.emit('deployment_command_completed', {
                'command_id': cmd_id,
                'success': success,
                'output': final_output,
                'error': error
            })
    except Exception as e:
        logger.error(f"Error handling deployment command completion: {e}")

@sio.event
async def execute_deployment_command(sid, data):
    """Handle execute deployment command request from frontend or internal system"""
    try:
        # This could be called by frontend directly or by the executor
        # For now, let's just handle the agent's response to a deployment command
        pass
    except Exception as e:
        logger.error(f"Error handling execute deployment command: {e}")

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

# This was the original mounting point, but it's better to mount at the root
# to align with standard practices and simplify client connection URLs.
# app.mount("/socket.io", socket_app)

def start():
    """Start the backend server."""
    logger.info("Starting Remote Command Execution Backend...")
    logger.info("Backend will be available at: http://localhost:8000")
    logger.info("Socket.IO endpoint: ws://localhost:8000/socket.io/")