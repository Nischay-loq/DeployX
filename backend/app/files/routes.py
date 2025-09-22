from fastapi import APIRouter, File, UploadFile, HTTPException, Depends, Form
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import uuid
import shutil
from datetime import datetime
from pydantic import BaseModel
from app.auth.database import get_db
from app.auth import models
import asyncio
import json

router = APIRouter(prefix="/files", tags=["Files"])

# Pydantic models for request/response
class FileResponse(BaseModel):
    file_id: str
    filename: str
    size: int
    upload_date: datetime
    status: str

class DeploymentRequest(BaseModel):
    files: List[dict]  # List of file objects with id and name
    destination_path: str
    deployment_mode: str  # 'agents' or 'groups'
    targets: List[str]  # List of agent IDs or group IDs

class DeploymentResponse(BaseModel):
    deployment_id: str
    status: str
    message: str

# File storage configuration
UPLOAD_DIRECTORY = "uploads"
if not os.path.exists(UPLOAD_DIRECTORY):
    os.makedirs(UPLOAD_DIRECTORY)

# In-memory storage for deployment tracking (in production, use database)
active_deployments = {}

@router.post("/upload", response_model=FileResponse)
async def upload_file(
    file: UploadFile = File(...),
    source: Optional[str] = Form(None),
    drive_file_id: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Upload a file to the server
    """
    try:
        # Generate unique file ID
        file_id = str(uuid.uuid4())
        
        # Create safe filename
        safe_filename = f"{file_id}_{file.filename}"
        file_path = os.path.join(UPLOAD_DIRECTORY, safe_filename)
        
        # Save file to disk
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Get file size
        file_size = os.path.getsize(file_path)
        
        # TODO: Store file metadata in database
        # For now, we'll return the file info
        
        return FileResponse(
            file_id=file_id,
            filename=file.filename,
            size=file_size,
            upload_date=datetime.utcnow(),
            status="uploaded"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")

@router.get("/list")
async def list_files(db: Session = Depends(get_db)):
    """
    List all uploaded files
    """
    try:
        files = []
        if os.path.exists(UPLOAD_DIRECTORY):
            for filename in os.listdir(UPLOAD_DIRECTORY):
                file_path = os.path.join(UPLOAD_DIRECTORY, filename)
                if os.path.isfile(file_path):
                    # Extract original filename (remove UUID prefix)
                    original_name = "_".join(filename.split("_")[1:])
                    file_stat = os.stat(file_path)
                    
                    files.append({
                        "file_id": filename.split("_")[0],
                        "filename": original_name,
                        "size": file_stat.st_size,
                        "upload_date": datetime.fromtimestamp(file_stat.st_mtime),
                        "status": "uploaded"
                    })
        
        return {"files": files}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list files: {str(e)}")

@router.delete("/delete/{file_id}")
async def delete_file(file_id: str, db: Session = Depends(get_db)):
    """
    Delete a specific file
    """
    try:
        # Find file with matching ID
        for filename in os.listdir(UPLOAD_DIRECTORY):
            if filename.startswith(f"{file_id}_"):
                file_path = os.path.join(UPLOAD_DIRECTORY, filename)
                os.remove(file_path)
                return {"message": "File deleted successfully"}
        
        raise HTTPException(status_code=404, detail="File not found")
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete file: {str(e)}")

@router.post("/deploy", response_model=DeploymentResponse)
async def deploy_files(
    deployment_request: DeploymentRequest,
    db: Session = Depends(get_db)
):
    """
    Deploy files to selected agents or groups
    """
    try:
        # Generate deployment ID
        deployment_id = str(uuid.uuid4())
        
        # Validate files exist
        file_paths = {}
        for file_info in deployment_request.files:
            file_id = file_info["id"]
            found = False
            
            for filename in os.listdir(UPLOAD_DIRECTORY):
                if filename.startswith(f"{file_id}_"):
                    file_paths[file_id] = {
                        "path": os.path.join(UPLOAD_DIRECTORY, filename),
                        "name": file_info["name"]
                    }
                    found = True
                    break
            
            if not found:
                raise HTTPException(status_code=404, detail=f"File not found: {file_info['name']}")
        
        # Get target agents
        target_agents = []
        if deployment_request.deployment_mode == "agents":
            # Fetch specific agents
            for agent_id in deployment_request.targets:
                agent = db.query(models.Device).filter(models.Device.id == agent_id).first()
                if agent:
                    target_agents.append(agent)
        else:
            # Fetch agents from groups
            for group_id in deployment_request.targets:
                # TODO: Implement group-based agent fetching
                # For now, assume we have a method to get agents by group
                pass
        
        # Initialize deployment tracking
        active_deployments[deployment_id] = {
            "status": "in_progress",
            "files": deployment_request.files,
            "target_agents": [{"id": agent.id, "name": agent.name} for agent in target_agents],
            "destination_path": deployment_request.destination_path,
            "progress": {},
            "results": [],
            "start_time": datetime.utcnow()
        }
        
        # Start deployment process asynchronously
        asyncio.create_task(execute_deployment(deployment_id, file_paths, target_agents, deployment_request.destination_path))
        
        return DeploymentResponse(
            deployment_id=deployment_id,
            status="started",
            message=f"Deployment started for {len(deployment_request.files)} files to {len(target_agents)} agents"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Deployment failed: {str(e)}")

@router.get("/deployments/{deployment_id}/status")
async def get_deployment_status(deployment_id: str):
    """
    Get the status of a specific deployment
    """
    if deployment_id not in active_deployments:
        raise HTTPException(status_code=404, detail="Deployment not found")
    
    deployment = active_deployments[deployment_id]
    
    return {
        "deployment_id": deployment_id,
        "status": deployment["status"],
        "progress": deployment["progress"],
        "results": deployment["results"],
        "start_time": deployment["start_time"],
        "files": deployment["files"],
        "target_agents": deployment["target_agents"]
    }

@router.get("/deployments/history")
async def get_deployment_history(limit: int = 50):
    """
    Get recent deployment history
    """
    # Sort deployments by start time (most recent first)
    sorted_deployments = sorted(
        active_deployments.items(),
        key=lambda x: x[1]["start_time"],
        reverse=True
    )
    
    history = []
    for deployment_id, deployment in sorted_deployments[:limit]:
        history.append({
            "deployment_id": deployment_id,
            "status": deployment["status"],
            "start_time": deployment["start_time"],
            "file_count": len(deployment["files"]),
            "target_count": len(deployment["target_agents"]),
            "success_count": len([r for r in deployment["results"] if r.get("status") == "success"]),
            "failed_count": len([r for r in deployment["results"] if r.get("status") == "failed"])
        })
    
    return {"deployments": history}

async def execute_deployment(deployment_id: str, file_paths: dict, target_agents: list, destination_path: str):
    """
    Execute the actual deployment process
    """
    try:
        deployment = active_deployments[deployment_id]
        
        for agent in target_agents:
            agent_id = str(agent.id)
            
            # Initialize progress for this agent
            deployment["progress"][agent_id] = {
                "status": "in_progress",
                "percentage": 0
            }
            
            try:
                # Simulate file transfer process
                # In a real implementation, this would:
                # 1. Connect to the agent via socket/API
                # 2. Send file data in chunks
                # 3. Monitor transfer progress
                # 4. Handle errors and retries
                
                for i in range(0, 101, 10):
                    await asyncio.sleep(0.5)  # Simulate transfer time
                    deployment["progress"][agent_id]["percentage"] = i
                
                # Mark as successful
                deployment["progress"][agent_id]["status"] = "success"
                deployment["results"].append({
                    "target_id": agent_id,
                    "target_name": agent.name,
                    "status": "success",
                    "message": f"Successfully deployed {len(file_paths)} files",
                    "timestamp": datetime.utcnow().isoformat()
                })
                
            except Exception as e:
                # Mark as failed
                deployment["progress"][agent_id]["status"] = "failed"
                deployment["results"].append({
                    "target_id": agent_id,
                    "target_name": agent.name,
                    "status": "failed",
                    "message": "Deployment failed",
                    "error": str(e),
                    "timestamp": datetime.utcnow().isoformat()
                })
        
        # Mark deployment as completed
        deployment["status"] = "completed"
        
    except Exception as e:
        # Mark deployment as failed
        active_deployments[deployment_id]["status"] = "failed"
        print(f"Deployment {deployment_id} failed: {str(e)}")

# Helper function to clean up old deployments (run periodically)
async def cleanup_old_deployments():
    """
    Remove deployment records older than 24 hours
    """
    cutoff_time = datetime.utcnow().timestamp() - (24 * 60 * 60)  # 24 hours ago
    
    to_remove = []
    for deployment_id, deployment in active_deployments.items():
        if deployment["start_time"].timestamp() < cutoff_time:
            to_remove.append(deployment_id)
    
    for deployment_id in to_remove:
        del active_deployments[deployment_id]