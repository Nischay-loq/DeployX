"""All Socket.IO event handlers (agents + frontends)."""
import logging
from datetime import datetime

from app.sockets.server import sio
from app.sockets.manager import conn_manager
from app.auth.database import get_db
from app.Devices import crud as device_crud
from app.agents import schemas as agent_schemas
from app.command_deployment.executor import command_executor
from app.grouping.models import Device

logger = logging.getLogger(__name__)


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
        execution_id = data.get('execution_id')
        is_group_execution = data.get('group_execution', False)

        if cmd_id:
            # For group executions, just append output without status change
            if not is_group_execution:
                await command_executor.handle_command_output(cmd_id, output)
            else:
                # For group executions, update queue with output only (don't change status)
                from app.command_deployment.queue import command_queue
                if command_queue:
                    cmd = command_queue.get_command(cmd_id)
                    if cmd:
                        # Just append output, don't update status (it's already RUNNING)
                        command_queue.update_command_status(cmd_id, cmd.status, output=output)

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
        execution_id = data.get('execution_id')
        is_group_execution = data.get('group_execution', False)
        is_destructive = data.get('is_destructive', False)
        backup_id = data.get('backup_id')
        backup_created = data.get('backup_created', False)
        display_command = data.get('display_command')  # Get better command name from agent

        logger.info(f"deployment_command_completed received - command_id: {cmd_id}, success: {success}, "
                    f"execution_id: {execution_id}, group_execution: {is_group_execution}, "
                    f"is_destructive: {is_destructive}, backup_id: {backup_id}, display_command: {display_command}")

        if cmd_id:
            # Check if this is a group execution
            if is_group_execution and execution_id:
                # For group executions, cmd_id is the queue command ID
                # Update the group execution tracker
                agent_id = conn_manager.get_agent_by_sid(sid)
                logger.info(f"This is a GROUP execution - agent: {agent_id}, execution_id: {execution_id}")
                if agent_id:
                    from app.grouping.command_executor import group_command_executor
                    await group_command_executor.handle_device_command_completion(
                        execution_id, agent_id, success, final_output, error
                    )
                    logger.info(f"Handled group execution completion for agent {agent_id} in execution {execution_id}")
                else:
                    logger.error(f"Could not get agent_id from sid: {sid}")
            else:
                # Handle individual agent command
                logger.info(f"This is an INDIVIDUAL agent command")
                await command_executor.handle_command_completion(
                    cmd_id, success, final_output, error,
                    backup_id=backup_id, is_destructive=is_destructive, backup_created=backup_created,
                    display_command=display_command
                )

            # Emit completion event to frontend
            await sio.emit('deployment_command_completed', {
                'command_id': cmd_id,
                'success': success,
                'output': final_output,
                'error': error,
                'execution_id': execution_id,
                'group_execution': is_group_execution,
                'is_destructive': is_destructive,
                'backup_id': backup_id,
                'backup_created': backup_created,
                'display_command': display_command  # Send display command to frontend
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

            # Find and update existing result instead of creating a new one
            from app.files.models import FileDeploymentResult
            existing_result = db.query(FileDeploymentResult).filter(
                FileDeploymentResult.deployment_id == deployment_id,
                FileDeploymentResult.device_id == device.id,
                FileDeploymentResult.file_id == file_id
            ).first()

            if existing_result:
                # Update existing result
                existing_result.status = status
                existing_result.message = result_message
                existing_result.path_created = path_created
                if not success:
                    existing_result.error_details = error
                if status == "success":
                    existing_result.deployed_at = datetime.utcnow()
                db.commit()
                logger.info(f"Updated existing deployment result for device {device.id}, file {file_id}")
            else:
                # Create new result if not found (shouldn't happen normally)
                logger.warning(f"No existing result found, creating new one for device {device.id}, file {file_id}")
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

        # Forward status to all connected clients
        await sio.emit('software_deployment_update', data)

    except Exception as e:
        logger.error(f"Error handling software installation status: {e}", exc_info=True)

@sio.event
async def software_download_progress(sid, data):
    """Handle software download progress updates from agent"""
    try:
        logger.debug(f"Software download progress: {data}")
        # Forward to clients for real-time updates
        await sio.emit('software_download_progress', data)
    except Exception as e:
        logger.error(f"Error handling software download progress: {e}")
