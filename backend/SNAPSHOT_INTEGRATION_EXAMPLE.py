"""
Example Backend Integration for Snapshot/Rollback System

This file demonstrates how the backend should integrate with the agent's
snapshot and rollback system.
"""

# Example 1: Execute a single command with automatic snapshot
async def execute_single_command(socketio, agent_id, command):
    """Execute a single command with automatic snapshot creation."""
    
    command_id = generate_unique_id()
    
    # Send command to agent
    await socketio.emit('execute_deployment_command', {
        'command_id': command_id,
        'command': command,
        'shell': 'cmd'  # or 'bash', 'powershell', etc.
    }, room=agent_id)
    
    # Wait for completion event
    # Listen for: 'deployment_command_completed'
    
    # Store the snapshot_id from the response for potential rollback


# Example 2: Execute a batch of commands with persistent context
async def execute_batch_commands(socketio, agent_id, commands):
    """Execute a batch of commands in persistent shell context."""
    
    batch_id = generate_unique_id()
    
    # Send batch to agent
    await socketio.emit('execute_batch_persistent', {
        'batch_id': batch_id,
        'commands': commands,
        'shell': 'bash',
        'stop_on_failure': True  # Stop if any command fails
    }, room=agent_id)
    
    # Wait for completion event
    # Listen for: 'batch_execution_completed'
    
    # Store the batch_id and snapshot_ids for potential rollback


# Example 3: Rollback a single command
async def rollback_command(socketio, agent_id, snapshot_id):
    """Rollback a single command using its snapshot ID."""
    
    # Request rollback
    await socketio.emit('rollback_command', {
        'snapshot_id': snapshot_id
    }, room=agent_id)
    
    # Wait for result
    # Listen for: 'rollback_result'


# Example 4: Rollback an entire batch
async def rollback_batch(socketio, agent_id, batch_id):
    """Rollback an entire batch of commands."""
    
    # Request batch rollback
    await socketio.emit('rollback_batch', {
        'batch_id': batch_id
    }, room=agent_id)
    
    # Wait for result
    # Listen for: 'batch_rollback_result'


# Example 5: Get snapshot information
async def get_snapshot_info(socketio, agent_id, snapshot_id):
    """Get information about a snapshot."""
    
    await socketio.emit('get_snapshot_info', {
        'snapshot_id': snapshot_id
    }, room=agent_id)
    
    # Wait for result
    # Listen for: 'snapshot_info_result'


# Example 6: List all snapshots
async def list_all_snapshots(socketio, agent_id):
    """List all available snapshots."""
    
    await socketio.emit('list_snapshots', {}, room=agent_id)
    
    # Wait for result
    # Listen for: 'snapshots_list_result'


# Example 7: Complete deployment workflow with rollback capability
async def deploy_with_rollback(socketio, agent_id, deployment_commands):
    """
    Complete deployment workflow with automatic rollback on failure.
    """
    
    batch_id = generate_unique_id()
    snapshot_ids = []
    
    try:
        # Execute deployment commands
        await socketio.emit('execute_batch_persistent', {
            'batch_id': batch_id,
            'commands': deployment_commands,
            'shell': 'bash',
            'stop_on_failure': True
        }, room=agent_id)
        
        # Wait for completion
        result = await wait_for_event('batch_execution_completed', batch_id)
        
        if not result['success']:
            # Deployment failed, rollback
            print(f"Deployment failed: {result['error']}")
            print("Initiating rollback...")
            
            await socketio.emit('rollback_batch', {
                'batch_id': batch_id
            }, room=agent_id)
            
            # Wait for rollback completion
            rollback_result = await wait_for_event('batch_rollback_result', batch_id)
            
            if rollback_result['success']:
                print("Rollback completed successfully")
                return False, "Deployment failed, changes rolled back"
            else:
                print("Rollback failed!")
                return False, "Deployment failed, rollback also failed"
        else:
            print("Deployment completed successfully")
            
            # Optional: Cleanup snapshots immediately after successful deployment
            # await cleanup_batch_snapshots(socketio, agent_id, batch_id)
            
            return True, "Deployment successful"
            
    except Exception as e:
        print(f"Error during deployment: {e}")
        # Attempt rollback even on exception
        try:
            await socketio.emit('rollback_batch', {'batch_id': batch_id}, room=agent_id)
        except:
            pass
        return False, str(e)


# Example 8: Backend event handlers
def setup_snapshot_event_handlers(socketio):
    """Setup event handlers for snapshot/rollback events."""
    
    @socketio.on('rollback_status')
    async def handle_rollback_status(sid, data):
        """Handle rollback status updates."""
        snapshot_id = data.get('snapshot_id')
        status = data.get('status')
        message = data.get('message')
        
        print(f"Rollback {snapshot_id}: {status} - {message}")
        
        # Update database, notify user, etc.
    
    @socketio.on('rollback_result')
    async def handle_rollback_result(sid, data):
        """Handle rollback completion."""
        snapshot_id = data.get('snapshot_id')
        success = data.get('success')
        message = data.get('message')
        
        print(f"Rollback {snapshot_id} completed: {success}")
        
        # Update deployment status in database
        # Notify user of rollback result
    
    @socketio.on('batch_rollback_result')
    async def handle_batch_rollback_result(sid, data):
        """Handle batch rollback completion."""
        batch_id = data.get('batch_id')
        success = data.get('success')
        
        print(f"Batch rollback {batch_id}: {success}")
        
        # Update deployment status
    
    @socketio.on('snapshot_info_result')
    async def handle_snapshot_info(sid, data):
        """Handle snapshot information response."""
        if data.get('success'):
            info = data.get('info')
            print(f"Snapshot info: {info}")
        else:
            print(f"Error getting snapshot info: {data.get('error')}")
    
    @socketio.on('snapshots_list_result')
    async def handle_snapshots_list(sid, data):
        """Handle list snapshots response."""
        if data.get('success'):
            snapshots = data.get('snapshots', [])
            batches = data.get('batches', [])
            print(f"Found {len(snapshots)} snapshots and {len(batches)} batches")
        else:
            print(f"Error listing snapshots: {data.get('error')}")


# Example 9: Database models for tracking snapshots
"""
Example database models (using SQLAlchemy or similar ORM):

class CommandExecution(Base):
    __tablename__ = 'command_executions'
    
    id = Column(Integer, primary_key=True)
    command_id = Column(String, unique=True)
    agent_id = Column(String)
    command = Column(String)
    snapshot_id = Column(String)  # Store for rollback
    success = Column(Boolean)
    output = Column(Text)
    executed_at = Column(DateTime, default=datetime.utcnow)


class BatchExecution(Base):
    __tablename__ = 'batch_executions'
    
    id = Column(Integer, primary_key=True)
    batch_id = Column(String, unique=True)
    agent_id = Column(String)
    total_commands = Column(Integer)
    successful_commands = Column(Integer)
    failed_commands = Column(Integer)
    snapshot_ids = Column(JSON)  # Store array of snapshot IDs
    can_rollback = Column(Boolean, default=True)
    rolled_back = Column(Boolean, default=False)
    executed_at = Column(DateTime, default=datetime.utcnow)
"""


# Example 10: API endpoints for rollback
"""
Example FastAPI endpoints:

@router.post("/deployments/{deployment_id}/rollback")
async def rollback_deployment(
    deployment_id: str,
    db: Session = Depends(get_db),
    socketio: AsyncServer = Depends(get_socketio)
):
    '''Rollback a deployment.'''
    
    # Get deployment from database
    deployment = db.query(Deployment).filter(Deployment.id == deployment_id).first()
    
    if not deployment:
        raise HTTPException(status_code=404, detail="Deployment not found")
    
    if not deployment.can_rollback:
        raise HTTPException(status_code=400, detail="Deployment cannot be rolled back")
    
    if deployment.rolled_back:
        raise HTTPException(status_code=400, detail="Deployment already rolled back")
    
    # Request rollback from agent
    await socketio.emit('rollback_batch', {
        'batch_id': deployment.batch_id
    }, room=deployment.agent_id)
    
    # Mark as rollback in progress
    deployment.rollback_status = 'in_progress'
    db.commit()
    
    return {
        "message": "Rollback initiated",
        "deployment_id": deployment_id,
        "batch_id": deployment.batch_id
    }


@router.get("/deployments/{deployment_id}/snapshots")
async def get_deployment_snapshots(
    deployment_id: str,
    db: Session = Depends(get_db),
    socketio: AsyncServer = Depends(get_socketio)
):
    '''Get snapshots for a deployment.'''
    
    deployment = db.query(Deployment).filter(Deployment.id == deployment_id).first()
    
    if not deployment:
        raise HTTPException(status_code=404, detail="Deployment not found")
    
    # Request snapshot info from agent
    await socketio.emit('get_batch_snapshots', {
        'batch_id': deployment.batch_id
    }, room=deployment.agent_id)
    
    # Wait for response (using event queue or similar)
    # Return snapshot information
"""


# Utility function
def generate_unique_id():
    """Generate a unique ID for commands/batches."""
    import uuid
    return str(uuid.uuid4())


async def wait_for_event(event_name, identifier, timeout=30):
    """
    Wait for a specific event from the agent.
    
    This is a placeholder - implement based on your event handling system.
    Could use asyncio.Queue, asyncio.Event, or similar.
    """
    pass
