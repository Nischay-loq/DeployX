from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str = Field(..., max_length=200, description="Password must be less than 200 characters")

class UserCreateWithOTP(BaseModel):
    username: str
    email: EmailStr
    password: str = Field(..., max_length=200, description="Password must be less than 200 characters")
    otp: str

class UserLogin(BaseModel):
    username: str
    password: str = Field(..., max_length=200, description="Password must be less than 200 characters")

class OTPVerifyRequest(BaseModel):
    email: EmailStr
    otp: str

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