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
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration from environment variables
def get_cors_origins():
    """Get CORS allowed origins from environment variables"""
    environment = os.getenv('ENVIRONMENT', 'development')
    
    if environment == 'development':
        return [
            os.getenv('DEV_FRONTEND_URL', 'http://localhost:5173'),
            os.getenv('FRONTEND_LOCAL_URL', 'http://localhost:5173'),
            "http://127.0.0.1:5173",
            os.getenv('FRONTEND_ALT_URL', 'http://localhost:3000'),
            "http://127.0.0.1:3000",
            os.getenv('DEV_BACKEND_URL', 'http://localhost:8000'),
            "http://127.0.0.1:8000",
        ]
    else:
        return [
            os.getenv('FRONTEND_URL', 'https://deployxsystem.vercel.app'),
            os.getenv('FRONTEND_LOCAL_URL', 'http://localhost:5173'),
            "http://127.0.0.1:5173",
            os.getenv('FRONTEND_ALT_URL', 'http://localhost:3000'),
            "http://127.0.0.1:3000",
            os.getenv('DEV_BACKEND_URL', 'http://localhost:8000'),
            "http://127.0.0.1:8000",
            "https://accounts.google.com",
            "https://accounts.google.com/gsi",
        ]

from app.grouping.route import router as groups_router
from app.Devices.routes import router as devices_router
from app.Deployments.routes import router as deployments_router
from app.software.routes import router as software_router
from app.files.routes import router as files_router
from app.agents.routes import router as agents_router
from app.auth import routes
from app.auth.database import engine, get_db, Base
from app.command_deployment.routes import router as deployment_router
from app.dashboard.routes import router as dashboard_router
from app.command_deployment.executor import command_executor
from app.grouping import models as grouping_models  # Import grouping models
from app.Deployments import models as deployment_models  # Import deployment models
from app.software import models as software_models  # Import software models
from app.files import models as file_models  # Import file models
from app.auth.database import get_db
from app.agents import crud as agent_crud, schemas as agent_schemas
from app.agents import schemas as agent_schemas, crud as agent_crud
from app.Devices import crud as device_crud
from app.grouping.models import Device

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

sio = socketio.AsyncServer(
    cors_allowed_origins=get_cors_origins(),
    logger=False,
    engineio_logger=False,
    async_mode='asgi',
    ping_timeout=60,  # 60 second timeout for better stability
    ping_interval=25  # 25 second ping interval
)

Base.metadata.create_all(bind=engine)

# Create FastAPI app
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

# Log CORS origins for debugging
logger.info(f"CORS allowed origins: {get_cors_origins()}")

app.include_router(routes.router)
app.include_router(groups_router)
app.include_router(devices_router)
app.include_router(agents_router)
app.include_router(deployment_router)
app.include_router(deployments_router)
app.include_router(software_router)
app.include_router(files_router)
app.include_router(dashboard_router)

# Health check endpoint
@app.get("/health")
def health_check():
    return {"status": "healthy", "message": "Backend is running"}

@app.get("/test/deployments")
def test_deployments():
    """Test endpoint for deployments without authentication"""
    return [
        {
            "id": 1,
            "deployment_name": "Test Deployment",
            "status": "completed",
            "started_at": "2024-01-01T00:00:00",
            "ended_at": "2024-01-01T01:00:00",
            "device_count": 3
        }
    ]

@app.get("/test/devices")
def test_devices():
    """Test endpoint for devices without authentication"""
    return [
        {
            "id": 1,
            "name": "Web Server 01",
            "ip_address": "192.168.1.10",
            "status": "online",
            "os_type": "Ubuntu 20.04",
            "last_seen": "2024-01-15T10:30:00Z",
            "groups": ["Web Servers", "Production"],
            "cpu_usage": 45,
            "memory_usage": 60,
            "disk_usage": 25
        },
        {
            "id": 2,
            "name": "Database Server",
            "ip_address": "192.168.1.20",
            "status": "online",
            "os_type": "CentOS 8",
            "last_seen": "2024-01-15T10:29:00Z",
            "groups": ["Database Servers"],
            "cpu_usage": 30,
            "memory_usage": 80,
            "disk_usage": 55
        },
        {
            "id": 3,
            "name": "App Server 02",
            "ip_address": "192.168.1.30",
            "status": "offline",
            "os_type": "Windows Server 2019",
            "last_seen": "2024-01-15T09:15:00Z",
            "groups": ["Application Servers"],
            "cpu_usage": 0,
            "memory_usage": 0,
            "disk_usage": 40
        },
        {
            "id": 4,
            "name": "Load Balancer",
            "ip_address": "192.168.1.5",
            "status": "online",
            "os_type": "nginx",
            "last_seen": "2024-01-15T10:31:00Z",
            "groups": ["Load Balancers", "Production"],
            "cpu_usage": 15,
            "memory_usage": 25,
            "disk_usage": 10
        },
        {
            "id": 5,
            "name": "Backup Server",
            "ip_address": "192.168.1.40",
            "status": "maintenance",
            "os_type": "Ubuntu 22.04",
            "last_seen": "2024-01-15T08:45:00Z",
            "groups": ["Backup Servers"],
            "cpu_usage": 5,
            "memory_usage": 35,
            "disk_usage": 85
        }
    ]

@app.get("/test/groups")
def test_groups():
    """Test endpoint for groups without authentication"""
    return [
        {
            "id": 1,
            "name": "Web Servers",
            "description": "Production web servers",
            "device_ids": [1, 2],
            "created_at": "2024-01-01T00:00:00",
            "updated_at": "2024-01-01T00:00:00"
        },
        {
            "id": 2,
            "name": "Database Servers",
            "description": "Database cluster nodes",
            "device_ids": [3],
            "created_at": "2024-01-01T00:00:00",
            "updated_at": "2024-01-01T00:00:00"
        }
    ]

@app.options("/{path:path}")
async def options_handler(path: str):
    from fastapi import Response
    return Response(
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Max-Age": "86400",
        }
    )

class ConnectionManager:
    def __init__(self):
        self.agents: Dict[str, dict] = {}
        self.frontends: Set[str] = set()
        self.agent_frontend_mapping: Dict[str, str] = {}
        self.sid_to_agent: Dict[str, str] = {}
        self.sid_to_type: Dict[str, str] = {}
    
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
        agent_data = self.agents.get(agent_id, {})
        return agent_data.get('shells', [])
    
    def get_agent_sid(self, agent_id: str) -> str:
        """Get socket ID for an agent"""
        return self.agents.get(agent_id, {}).get('sid')
    
    def is_agent_connected(self, agent_id: str) -> bool:
        """Check if agent is truly connected and responsive"""
        agent_data = self.agents.get(agent_id)
        if not agent_data:
            return False
        
        # Check if connection is recent (within last 30 seconds)
        from datetime import datetime, timedelta
        last_seen = agent_data.get('last_heartbeat', agent_data.get('connected_at'))
        if last_seen and isinstance(last_seen, datetime):
            time_diff = datetime.now() - last_seen
            return time_diff.total_seconds() < 30
        
        return True  # Default to true if no timestamp available
    
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

conn_manager = ConnectionManager()

# Helper function to get Socket.IO components
def get_socketio_components():
    """Get Socket.IO server and connection manager instances"""
    return sio, conn_manager

# Helper function to get and send agent list
async def _update_and_send_agent_list(sid=None):
    """Helper to fetch agents from devices table, update status, and emit to frontends."""
    db = next(get_db())
    try:
        db_devices = db.query(Device).filter(Device.agent_id.isnot(None)).all()
        online_agent_ids = set(conn_manager.get_agent_list())
        
        agents_with_status = []
        for device in db_devices:
            agent_info = {
                'id': device.id,
                'agent_id': device.agent_id,
                'machine_id': device.machine_id,
                'hostname': device.device_name,
                'os': device.os,
                'os_version': device.os_version,
                'os_release': device.os_release,
                'processor': device.processor,
                'python_version': device.python_version,
                'cpu_count': device.cpu_count,
                'memory_total': device.memory_total,
                'memory_available': device.memory_available,
                'disk_total': device.disk_total,
                'disk_free': device.disk_free,
                'shells': device.shells,
                'status': 'online' if device.agent_id in online_agent_ids else 'offline',
                'last_seen': device.last_seen.isoformat() if device.last_seen else None,
                'updated_at': device.updated_at.isoformat() if device.updated_at else None,
                'system_info': device.system_info
            }
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

command_executor.set_socketio(sio, conn_manager)

@sio.event
async def connect(sid, environ, auth):
    """Handle new socket connections"""
    client_origin = environ.get('HTTP_ORIGIN', 'unknown')
    logger.info(f"Client {sid} connected from {client_origin}")

@sio.event
async def join_room(sid, data):
    """Handle agent joining its room for targeted messages"""
    try:
        room = data.get('room')
        if room:
            await sio.enter_room(sid, room)
            logger.info(f"[OK] Session {sid} joined room: {room}")
            # Verify the agent is in the room
            logger.info(f"[VERIFY] Rooms for sid {sid}: {sio.rooms(sid)}")
            return {'status': 'success', 'room': room}
        else:
            logger.error(f"No room specified in join_room request from {sid}")
            return {'status': 'error', 'message': 'No room specified'}
    except Exception as e:
        logger.error(f"Error joining room for sid {sid}: {e}")
        return {'status': 'error', 'message': str(e)}

@sio.event
async def disconnect(sid):
    """Handle socket disconnections"""
    try:
        connection_type, agent_id = conn_manager.remove_connection(sid)
        
        if connection_type == 'agent' and agent_id:
            db = next(get_db())
            try:
                device = device_crud.update_device_status(db, agent_id, "offline")
                logger.info(f"Agent {agent_id} status updated to offline in devices table.")
                
                if device:
                    await sio.emit('device_status_changed', {
                        'agent_id': device.agent_id,
                        'device_name': device.device_name,
                        'status': 'offline',
                        'last_seen': device.last_seen.isoformat() if device.last_seen else None,
                        'ip_address': device.ip_address
                    })
                    logger.info(f"Broadcasted offline status for agent {device.agent_id}")
            finally:
                db.close()

            await _update_and_send_agent_list()
            
        elif connection_type == 'frontend':
            logger.info(f"Frontend {sid} disconnected")
            
    except Exception as e:
        logger.error(f"Error handling disconnect for sid {sid}: {e}")

@sio.event
async def get_shells(sid, agent_id):
    """Get available shells for a specific agent"""
    try:
        if sid not in conn_manager.frontends:
            logger.warning(f"Ignoring shells request from disconnected frontend {sid}")
            return
            
        logger.info(f"Shell list request for agent {agent_id} from {sid}")
        
        if agent_id not in conn_manager.agents:
            logger.error(f"Agent {agent_id} not found in connected agents")
            logger.info(f"Available agents: {list(conn_manager.agents.keys())}")
            await sio.emit('shells_list', [], room=sid)
            return
            
        shells = conn_manager.get_agent_shells(agent_id)
        logger.info(f"Found shells for {agent_id}: {shells}")
        
        if not shells:
            logger.warning(f"No shells found for agent {agent_id}")
            db = next(get_db())
            try:
                device = device_crud.get_device_by_agent_id(db, agent_id)
                if device and device.shells:
                    shells = device.shells
                    logger.info(f"Retrieved shells from database: {shells}")
            finally:
                db.close()
        
        await sio.emit('shells_list', shells or [], room=sid)
        logger.info(f"Sent shell list to {sid}: {shells}")
    except Exception as e:
        logger.error(f"Error getting shells for agent {agent_id}: {e}")
        await sio.emit('error', {'message': f'Error getting shells: {str(e)}'}, room=sid)

@sio.event
async def agent_register(sid, data):
    """Handle agent registration"""
    try:
        logger.info(f"Agent registration request from {sid} with data: {data}")
        
        reg_data = agent_schemas.DeviceRegistrationRequest(**data)
        
        db = next(get_db())
        try:
            device = device_crud.register_or_update_device(db, reg_data)
            logger.info(f"Agent {device.agent_id} registered/updated in devices table.")
            
            # FORCE MAC ADDRESS EXTRACTION (failsafe)
            if not device.mac_address and reg_data.system_info:
                mac_from_sysinfo = reg_data.system_info.get('mac_address')
                if mac_from_sysinfo and mac_from_sysinfo != '00:00:00:00:00:00':
                    device.mac_address = mac_from_sysinfo
                    db.commit()
                    logger.info(f"Force extracted MAC address for {device.agent_id}: {mac_from_sysinfo}")
            
        finally:
            db.close()
            
        conn_manager.add_agent(reg_data.agent_id, sid, reg_data.shells)
        
        # IMPORTANT: Join the agent to its own room for targeted messages
        await sio.enter_room(sid, reg_data.agent_id)
        logger.info(f"[AUTO-JOIN] Added agent {reg_data.agent_id} to room {reg_data.agent_id}")
        logger.info(f"[VERIFY] Rooms for sid {sid}: {sio.rooms(sid)}")
        
        await sio.emit('device_status_changed', {
            'agent_id': device.agent_id,
            'device_name': device.device_name,
            'status': 'online',
            'last_seen': device.last_seen.isoformat() if device.last_seen else None,
            'ip_address': device.ip_address
        })
        logger.info(f"Broadcasted online status for agent {device.agent_id}")
        
        await _update_and_send_agent_list()
        
        await sio.emit('registration_success', {'agent_id': reg_data.agent_id}, room=sid)
        logger.info(f"Agent {reg_data.agent_id} registered successfully via socket.")
        
    except Exception as e:
        logger.error(f"Error registering agent: {e}")
        await sio.emit('registration_error', {'message': str(e)}, room=sid)
        
    except Exception as e:
        logger.error(f"Error registering agent: {e}")
        await sio.emit('registration_error', {'message': str(e)}, room=sid)

@sio.event
async def frontend_register(sid, data):
    """Handle frontend registration"""
    try:
        logger.info(f"Frontend registration request from {sid}")
        conn_manager.add_frontend(sid)
        
        await _update_and_send_agent_list(sid=sid)
        
    except Exception as e:
        logger.error(f"Error registering frontend: {e}")

@sio.event
async def get_agents(sid):
    """Get list of connected agents"""
    try:
        await _update_and_send_agent_list(sid=sid)
    except Exception as e:
        logger.error(f"Error getting agents: {e}")

@sio.event
async def agent_heartbeat(sid, data):
    """Handle agent heartbeat to update last_seen and keep status online"""
    try:
        agent_id = data.get('agent_id') if isinstance(data, dict) else None
        
        if not agent_id:
            agent_id = conn_manager.get_agent_by_sid(sid)
        
        if agent_id:
            # Update last heartbeat timestamp in connection manager
            if agent_id in conn_manager.agents:
                conn_manager.agents[agent_id]['last_heartbeat'] = datetime.now()
            
            db = next(get_db())
            try:
                device_crud.update_device_last_seen(db, agent_id)
                logger.debug(f"Heartbeat received from agent {agent_id}")
            finally:
                db.close()
    except Exception as e:
        logger.error(f"Error handling heartbeat: {e}")

@sio.event
async def start_shell(sid, data):
    """Request agent to start a specific shell"""
    try:
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
        
        conn_manager.map_agent_to_frontend(agent_id, sid)
        
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
        agent_id = conn_manager.get_agent_by_sid(sid)
        
        if agent_id:
            frontend_sid = conn_manager.get_frontend_for_agent(agent_id)
            if frontend_sid:
                output = data.get('output', '')
                await sio.emit('command_output', output, room=frontend_sid)
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
            
            await sio.emit('deployment_command_completed', {
                'command_id': cmd_id,
                'success': success,
                'output': final_output,
                'error': error
            })
    except Exception as e:
        logger.error(f"Error handling deployment command completion: {e}")

@sio.event
async def file_transfer_result(sid, data):
    """Handle file transfer result from agent"""
    try:
        deployment_id = data.get('deployment_id')
        file_id = data.get('file_id')
        success = data.get('success', False)
        message = data.get('message', '')
        error = data.get('error', '')
        path_created = data.get('path_created', False)
        file_path = data.get('file_path', '')
        
        logger.info(f"File transfer result - deployment: {deployment_id}, file: {file_id}, success: {success}")
        
        agent_id = conn_manager.get_agent_by_sid(sid)
        
        if not agent_id:
            logger.error(f"Could not find agent for sid {sid}")
            return
        
        from app.auth.database import get_db
        from app.files import crud
        from app.grouping.models import Device
        
        db = next(get_db())
        try:
            device = db.query(Device).filter(Device.agent_id == agent_id).first()
            
            if not device:
                logger.error(f"Could not find device for agent {agent_id}")
                return
            
            status = "success" if success else "error"
            result_message = message if success else error
            
            crud.create_deployment_result(
                db, 
                deployment_id, 
                device.id, 
                file_id, 
                status,
                result_message,
                path_created=path_created,
                error_details=error if not success else None
            )
            
            logger.info(f"Updated deployment result for device {device.id}")
            
            # Notify all frontends about the file transfer result
            try:
                await sio.emit('file_transfer_update', {
                    'deployment_id': deployment_id,
                    'device_id': device.id,
                    'device_name': device.device_name,
                    'file_id': file_id,
                    'success': success,
                    'message': result_message,
                    'path_created': path_created
                })
            except Exception as emit_error:
                logger.error(f"Failed to emit file transfer update: {emit_error}")
            
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"Error handling file transfer result: {e}")
        logger.exception(e)

@sio.event
async def execute_deployment_command(sid, data):
    """Handle execute deployment command request from frontend or internal system"""
    try:
        # This could be called by frontend directly or by the executor
        # For now, let's just handle the agent's response to a deployment command
        pass
    except Exception as e:
        logger.error(f"Error handling execute deployment command: {e}")

@sio.event
async def software_installation_status(sid, data):
    """Handle software installation status updates from agent"""
    try:
        deployment_id = data.get('deployment_id')
        device_id = data.get('device_id')
        status = data.get('status')
        progress = data.get('progress', 0)
        message = data.get('message', '')
        error = data.get('error')
        
        logger.info(f"Software installation status - Deployment: {deployment_id}, Device: {device_id}, Status: {status}, Progress: {progress}%")
        
        # Update database
        db = next(get_db())
        try:
            from app.Deployments.models import DeploymentTarget
            
            target = db.query(DeploymentTarget).filter(
                DeploymentTarget.deployment_id == deployment_id,
                DeploymentTarget.device_id == device_id
            ).first()
            
            if target:
                target.progress_percent = progress
                
                if status == 'completed':
                    target.status = 'success'
                    target.completed_at = datetime.utcnow()
                elif status == 'failed':
                    target.status = 'failed'
                    target.error_message = error or message
                    target.completed_at = datetime.utcnow()
                elif status in ['in_progress', 'downloading', 'installing']:
                    target.status = 'in_progress'
                    if not target.started_at:
                        target.started_at = datetime.utcnow()
                
                db.commit()
                logger.info(f"Updated deployment target {target.id} status to {target.status}")
                
                # Update overall deployment status when a device completes or fails
                if status in ['completed', 'failed']:
                    from app.Deployments.routes import update_deployment_status
                    update_deployment_status(deployment_id, db)
                    
        finally:
            db.close()
        
        # Forward status to all connected frontends
        await sio.emit('software_deployment_update', data, room='frontends')
        
    except Exception as e:
        logger.error(f"Error handling software installation status: {e}", exc_info=True)

@sio.event
async def software_download_progress(sid, data):
    """Handle software download progress updates from agent"""
    try:
        logger.debug(f"Software download progress: {data}")
        # Forward to frontends for real-time updates
        await sio.emit('software_download_progress', data, room='frontends')
    except Exception as e:
        logger.error(f"Error handling software download progress: {e}")

# Get agents endpoint (REST API alternative)
@app.get("/api/agents")
async def get_agents_rest():
    db = next(get_db())
    try:
        db_devices = db.query(Device).filter(Device.agent_id.isnot(None)).all()
        online_agent_ids = set(conn_manager.get_agent_list())
        
        agents_info = {}
        for device in db_devices:
            if device.agent_id:
                connection_info = conn_manager.agents.get(device.agent_id, {})
                agents_info[device.agent_id] = {
                    "device_name": device.device_name,
                    "ip_address": device.ip_address,
                    "mac_address": device.mac_address,
                    "os": device.os,
                    "status": "online" if device.agent_id in online_agent_ids else "offline",
                    "shells": device.shells or connection_info.get("shells", []),
                    "connected_at": connection_info.get("connected_at", "").isoformat() if connection_info.get("connected_at") else None,
                    "last_seen": device.last_seen.isoformat() if device.last_seen else None,
                    "system_info": device.system_info
                }
        return {"agents": agents_info}
    finally:
        db.close()


@app.get("/")
async def root():
    return {"message": "Remote Terminal Server with Real CMD Running (Socket.IO)"}

socket_app = socketio.ASGIApp(sio, app)

def start():
    """Start the backend server."""
    logger.info("Starting Remote Command Execution Backend...")
    logger.info("Backend will be available at: https://deployx-server.onrender.com")
    logger.info("Socket.IO endpoint: wss://deployx-server.onrender.com/socket.io/")