from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    refresh_token: Optional[str] = None
    user: Optional[dict] = None

class UserOut(BaseModel):
    id: int
    username: str
    email: EmailStr
    created_at: datetime
    
    model_config = {"from_attributes": True}