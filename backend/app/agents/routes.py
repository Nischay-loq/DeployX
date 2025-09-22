"""FastAPI routes for agent management."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List
from app.auth.database import get_db
from . import crud, schemas

router = APIRouter(
    prefix="/api/agents",
    tags=["agents"]
)

@router.get("/", response_model=schemas.AgentListResponse)
def get_agents(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    """Get list of all agents."""
    agents = crud.get_agents(db, skip=skip, limit=limit)
    total = len(agents)  # For large datasets, you might want to add a count query
    return schemas.AgentListResponse(agents=agents, total=total)

@router.get("/online", response_model=List[schemas.AgentResponse])
def get_online_agents(db: Session = Depends(get_db)):
    """Get list of online agents."""
    agents = crud.get_online_agents(db)
    return agents

@router.get("/{agent_id}", response_model=schemas.AgentResponse)
def get_agent(agent_id: str, db: Session = Depends(get_db)):
    """Get specific agent by ID."""
    agent = crud.get_agent(db, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent

@router.put("/{agent_id}", response_model=schemas.AgentResponse)
def update_agent(
    agent_id: str,
    agent_update: schemas.AgentUpdate,
    db: Session = Depends(get_db)
):
    """Update agent information."""
    agent = crud.update_agent(db, agent_id, agent_update)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent

@router.put("/{agent_id}/status")
def update_agent_status(
    agent_id: str,
    status: str = Query(..., regex="^(online|offline|disconnected)$"),
    db: Session = Depends(get_db)
):
    """Update agent status."""
    agent = crud.update_agent_status(db, agent_id, status)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return {"message": f"Agent {agent_id} status updated to {status}"}

@router.delete("/{agent_id}")
def delete_agent(agent_id: str, db: Session = Depends(get_db)):
    """Delete an agent."""
    success = crud.delete_agent(db, agent_id)
    if not success:
        raise HTTPException(status_code=404, detail="Agent not found")
    return {"message": f"Agent {agent_id} deleted successfully"}