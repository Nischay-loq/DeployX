"""CRUD operations for agent management."""
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from . import models, schemas
from datetime import datetime

def get_agent(db: Session, agent_id: str) -> Optional[models.Agent]:
    """Get agent by agent_id."""
    return db.query(models.Agent).filter(models.Agent.agent_id == agent_id).first()

def get_agent_by_machine_id(db: Session, machine_id: str) -> Optional[models.Agent]:
    """Get agent by machine_id."""
    return db.query(models.Agent).filter(models.Agent.machine_id == machine_id).first()

def get_agents(db: Session, skip: int = 0, limit: int = 100) -> List[models.Agent]:
    """Get list of agents with pagination."""
    return db.query(models.Agent).offset(skip).limit(limit).all()

def get_online_agents(db: Session) -> List[models.Agent]:
    """Get list of online agents."""
    return db.query(models.Agent).filter(models.Agent.status == "online").all()

def create_agent(db: Session, agent: schemas.AgentCreate) -> models.Agent:
    """Create a new agent."""
    db_agent = models.Agent(**agent.model_dump())
    db_agent.status = "online"  # New agents are considered online when registered
    db.add(db_agent)
    db.commit()
    db.refresh(db_agent)
    return db_agent

def update_agent(db: Session, agent_id: str, agent_update: schemas.AgentUpdate) -> Optional[models.Agent]:
    """Update agent information."""
    db_agent = get_agent(db, agent_id)
    if db_agent:
        update_data = agent_update.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_agent, field, value)
        db_agent.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(db_agent)
    return db_agent

def update_agent_status(db: Session, agent_id: str, status: str) -> Optional[models.Agent]:
    """Update agent status."""
    db_agent = get_agent(db, agent_id)
    if db_agent:
        db_agent.status = status
        db_agent.last_seen = datetime.utcnow()
        db_agent.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(db_agent)
    return db_agent

def update_agent_last_seen(db: Session, agent_id: str) -> Optional[models.Agent]:
    """Update agent last seen timestamp."""
    db_agent = get_agent(db, agent_id)
    if db_agent:
        db_agent.last_seen = datetime.utcnow()
        db_agent.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(db_agent)
    return db_agent

def delete_agent(db: Session, agent_id: str) -> bool:
    """Delete an agent."""
    db_agent = get_agent(db, agent_id)
    if db_agent:
        db.delete(db_agent)
        db.commit()
        return True
    return False

def register_or_update_agent(db: Session, registration: schemas.AgentRegistrationRequest) -> models.Agent:
    """Register a new agent or update existing one."""
    # First try to find by agent_id
    existing_agent = get_agent(db, registration.agent_id)
    
    if existing_agent:
        # Update existing agent
        update_data = {
            "hostname": registration.hostname,
            "os": registration.os,
            "shells": registration.shells,
            "status": "online",
            "system_info": registration.system_info,
            "last_seen": datetime.utcnow()
        }
        
        # Update system info fields if available
        sys_info = registration.system_info
        if sys_info:
            update_data.update({
                "os_version": sys_info.get("os_version"),
                "os_release": sys_info.get("os_release"),
                "architecture": sys_info.get("architecture"),
                "processor": sys_info.get("processor"),
                "python_version": sys_info.get("python_version"),
                "cpu_count": sys_info.get("cpu_count"),
                "memory_total": sys_info.get("memory_total"),
                "memory_available": sys_info.get("memory_available"),
                "disk_total": sys_info.get("disk_total"),
                "disk_free": sys_info.get("disk_free"),
            })
        
        for field, value in update_data.items():
            if value is not None:
                setattr(existing_agent, field, value)
        
        existing_agent.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(existing_agent)
        return existing_agent
    else:
        # Check if there's an agent with the same machine_id but different agent_id
        machine_agent = get_agent_by_machine_id(db, registration.machine_id)
        if machine_agent:
            # Update the existing agent with new agent_id and info
            machine_agent.agent_id = registration.agent_id
            machine_agent.hostname = registration.hostname
            machine_agent.os = registration.os
            machine_agent.shells = registration.shells
            machine_agent.status = "online"
            machine_agent.system_info = registration.system_info
            machine_agent.last_seen = datetime.utcnow()
            machine_agent.updated_at = datetime.utcnow()
            
            # Update system info fields if available
            sys_info = registration.system_info
            if sys_info:
                machine_agent.os_version = sys_info.get("os_version")
                machine_agent.os_release = sys_info.get("os_release")
                machine_agent.architecture = sys_info.get("architecture")
                machine_agent.processor = sys_info.get("processor")
                machine_agent.python_version = sys_info.get("python_version")
                machine_agent.cpu_count = sys_info.get("cpu_count")
                machine_agent.memory_total = sys_info.get("memory_total")
                machine_agent.memory_available = sys_info.get("memory_available")
                machine_agent.disk_total = sys_info.get("disk_total")
                machine_agent.disk_free = sys_info.get("disk_free")
            
            db.commit()
            db.refresh(machine_agent)
            return machine_agent
        else:
            # Create new agent
            agent_data = {
                "agent_id": registration.agent_id,
                "machine_id": registration.machine_id,
                "hostname": registration.hostname,
                "os": registration.os,
                "shells": registration.shells,
                "status": "online",
                "system_info": registration.system_info
            }
            
            # Add system info fields if available
            sys_info = registration.system_info
            if sys_info:
                agent_data.update({
                    "os_version": sys_info.get("os_version"),
                    "os_release": sys_info.get("os_release"),
                    "architecture": sys_info.get("architecture"),
                    "processor": sys_info.get("processor"),
                    "python_version": sys_info.get("python_version"),
                    "cpu_count": sys_info.get("cpu_count"),
                    "memory_total": sys_info.get("memory_total"),
                    "memory_available": sys_info.get("memory_available"),
                    "disk_total": sys_info.get("disk_total"),
                    "disk_free": sys_info.get("disk_free"),
                })
            
            db_agent = models.Agent(**agent_data)
            db.add(db_agent)
            db.commit()
            db.refresh(db_agent)
            return db_agent