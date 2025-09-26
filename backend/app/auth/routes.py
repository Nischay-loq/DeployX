from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from datetime import datetime
from . import models, schemas, utils
from .database import get_db

router = APIRouter(prefix="/auth", tags=["Auth"])

# In-memory OTP store (temp solution) - stores {email: {"otp": code, "purpose": "signup"|"reset"}}
otp_store = {}

# ----------- OTP Request Schemas -------------
class EmailRequest(BaseModel):
    email: EmailStr
    purpose: str = "signup"  # "signup" or "reset"

class OTPVerifyRequest(BaseModel):
    email: EmailStr
    otp: str

class GoogleAuthRequest(BaseModel):
    token: str  # Google OAuth token

class PasswordResetRequest(BaseModel):
    email: EmailStr
    otp: str
    new_password: str

# ----------- AUTH ROUTES ---------------------
@router.post("/signup", response_model=schemas.UserOut)
def signup(user: schemas.UserCreate, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.email == user.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if db.query(models.User).filter(models.User.username == user.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")

    hashed_pw = utils.hash_password(user.password)
    new_user = models.User(username=user.username, email=user.email, password=hashed_pw)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/login", response_model=schemas.Token)
def login(user: schemas.UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.username == user.username).first()

    if not db_user or not utils.verify_password(user.password, db_user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    db_user.last_login = datetime.utcnow()
    db.commit()

    access_token = utils.create_access_token(data={"sub": db_user.username})
    refresh_token = utils.create_refresh_token(data={"sub": db_user.username, "user_id": db_user.id})
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "id": db_user.id,
            "username": db_user.username,
            "email": db_user.email
        }
    }

# ----------- OTP Routes -----------------------
@router.post("/send-otp")
def send_otp(request: EmailRequest):
    email = request.email
    purpose = request.purpose
    otp = utils.generate_otp()

    try:
        utils.send_otp_email(email, otp)
        otp_store[email] = {"otp": otp, "purpose": purpose}
        return {"msg": f"OTP sent to {email}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send OTP: {str(e)}")

@router.post("/verify-otp")
def verify_otp(request: OTPVerifyRequest):
    stored_data = otp_store.get(request.email)
    if stored_data and stored_data["otp"] == request.otp:
        return {"msg": "OTP verified", "purpose": stored_data["purpose"]}
    raise HTTPException(status_code=400, detail="Invalid OTP")

@router.post("/google-auth", response_model=schemas.Token)
def google_auth(request: GoogleAuthRequest, db: Session = Depends(get_db)):
    try:
        # In a real implementation, you would verify the Google token here
        # For now, we'll create a mock implementation
        # You would use google.auth.transport.requests and google.oauth2.id_token
        
        # Mock Google user info (in real implementation, extract from token)
        google_user = {
            "email": "user@gmail.com",
            "name": "Google User",
            "sub": "google_user_id_123"
        }
        
        # Check if user exists
        db_user = db.query(models.User).filter(models.User.email == google_user["email"]).first()
        
        if not db_user:
            # Create new user
            username = google_user["email"].split("@")[0]
            # Ensure username is unique
            counter = 1
            original_username = username
            while db.query(models.User).filter(models.User.username == username).first():
                username = f"{original_username}_{counter}"
                counter += 1
            
            db_user = models.User(
                username=username,
                email=google_user["email"],
                password=utils.hash_password("google_oauth_user")  # Placeholder password
            )
            db.add(db_user)
            db.commit()
            db.refresh(db_user)
        
        # Update last login
        db_user.last_login = datetime.utcnow()
        db.commit()
        
        # Create access token
        access_token = utils.create_access_token(data={"sub": db_user.username})
        return {"access_token": access_token, "token_type": "bearer"}
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Google authentication failed: {str(e)}")

# Refresh token request schema
class RefreshTokenRequest(BaseModel):
    refresh_token: str

@router.post("/refresh", response_model=schemas.Token)
def refresh_token(request: RefreshTokenRequest, db: Session = Depends(get_db)):
    try:
        # Verify refresh token
        username = utils.verify_token(request.refresh_token, token_type="refresh", raise_exception=False)
        
        if not username:
            raise HTTPException(status_code=401, detail="Invalid refresh token")
        
        # Verify user still exists
        db_user = db.query(models.User).filter(models.User.username == username).first()
        if not db_user:
            raise HTTPException(status_code=401, detail="User not found")
        
        # Generate new access token
        new_access_token = utils.create_access_token(data={"sub": username})
        
        return {
            "access_token": new_access_token,
            "token_type": "bearer"
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail="Token refresh failed")

@router.post("/reset-password")
def reset_password(request: PasswordResetRequest, db: Session = Depends(get_db)):
    # Verify OTP first
    stored_data = otp_store.get(request.email)
    if not stored_data or stored_data["otp"] != request.otp or stored_data["purpose"] != "reset":
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    # Find user by email
    db_user = db.query(models.User).filter(models.User.email == request.email).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update password
    db_user.password = utils.hash_password(request.new_password)
    db.commit()
    
    # Clear OTP after successful reset
    otp_store.pop(request.email, None)
    
    return {"msg": "Password reset successfully"}

@router.get("/me")
def get_current_user_info(current_user: models.User = Depends(utils.get_current_user)):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "created_at": current_user.created_at
    }
