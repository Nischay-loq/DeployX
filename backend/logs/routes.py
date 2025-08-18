from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from .models import Log
from .schemas import LogResponse
from auth.database import get_db

router = APIRouter(prefix="/logs", tags=["Logs"])

@router.get("/", response_model=list[LogResponse])
def get_logs(
    deployment_id: int = None,
    device_id: int = None,
    log_type: str = None,
    start: str = None,
    end: str = None,
    db: Session = Depends(get_db)
):
    query = db.query(Log)
    if deployment_id: query = query.filter(Log.deployment_id == deployment_id)
    if device_id: query = query.filter(Log.device_id == device_id)
    if log_type: query = query.filter(Log.log_type == log_type)
    if start: query = query.filter(Log.timestamp >= start)
    if end: query = query.filter(Log.timestamp <= end)
    return query.order_by(Log.timestamp.desc()).all()