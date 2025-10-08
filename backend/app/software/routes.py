from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .schemas import SoftwareCreate, SoftwareUpdate, SoftwareResponse, SoftwareListResponse
from .models import Software
from app.auth.database import get_db, User
from app.auth.utils import get_current_user

router = APIRouter(prefix="/software", tags=["Software"])

@router.get("/", response_model=List[SoftwareListResponse])
def get_all_software(
    skip: int = 0,
    limit: int = 100,
    category: str = None,
    db: Session = Depends(get_db)
):
    """Get all available software"""
    query = db.query(Software).filter(Software.is_active == True)
    
    if category:
        query = query.filter(Software.category == category)
    
    software_list = query.offset(skip).limit(limit).all()
    return software_list

@router.get("/{software_id}", response_model=SoftwareResponse)
def get_software(software_id: int, db: Session = Depends(get_db)):
    """Get specific software details"""
    software = db.query(Software).filter(Software.id == software_id).first()
    if not software:
        raise HTTPException(status_code=404, detail="Software not found")
    return software

@router.post("/", response_model=SoftwareResponse)
def create_software(
    software: SoftwareCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create new software entry (admin only)"""
    db_software = Software(**software.model_dump())
    db.add(db_software)
    db.commit()
    db.refresh(db_software)
    return db_software

@router.put("/{software_id}", response_model=SoftwareResponse)
def update_software(
    software_id: int,
    software: SoftwareUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update software entry (admin only)"""
    db_software = db.query(Software).filter(Software.id == software_id).first()
    if not db_software:
        raise HTTPException(status_code=404, detail="Software not found")
    
    update_data = software.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_software, field, value)
    
    db.commit()
    db.refresh(db_software)
    return db_software

@router.delete("/{software_id}")
def delete_software(
    software_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Soft delete software (admin only)"""
    db_software = db.query(Software).filter(Software.id == software_id).first()
    if not db_software:
        raise HTTPException(status_code=404, detail="Software not found")
    
    db_software.is_active = False
    db.commit()
    return {"message": "Software deleted successfully"}

@router.get("/categories/list")
def get_categories(db: Session = Depends(get_db)):
    """Get all unique software categories"""
    categories = db.query(Software.category).distinct().all()
    return [cat[0] for cat in categories if cat[0]]
