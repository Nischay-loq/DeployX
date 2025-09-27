from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from . import models, schemas, utils
from .database import get_db

router = APIRouter(prefix="/auth", tags=["Auth"])

# In-memory OTP store (temp solution)
otp_store = {}

# ----------- OTP Request Schemas -------------
class EmailRequest(BaseModel):
    email: EmailStr

class OTPVerifyRequest(BaseModel):
    email: EmailStr
    otp: str

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
    return {"access_token": access_token, "token_type": "bearer"}

# ----------- OTP Routes -----------------------
@router.post("/send-otp")
def send_otp(request: EmailRequest):
    email = request.email
    otp = utils.generate_otp()

    try:
        utils.send_otp_email(email, otp)
        otp_store[email] = otp
        return {"msg": f"OTP sent to {email}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send OTP: {str(e)}")

@router.post("/verify-otp")
def verify_otp(request: OTPVerifyRequest):
    if otp_store.get(request.email) == request.otp:
        return {"msg": "OTP verified"}
    raise HTTPException(status_code=400, detail="Invalid OTP")

# ----------- PASSWORD RESET ROUTES ---------------------
@router.post("/forgot-password")
def forgot_password(request: schemas.ForgotPasswordRequest, db: Session = Depends(get_db)):
    # Check if email exists
    user = db.query(models.User).filter(models.User.email == request.email).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="Email not registered")
    
    # Generate reset token
    reset_token = utils.generate_reset_token()
    
    # Set expiry time (15 minutes)
    expires_at = datetime.utcnow() + timedelta(minutes=15)
    
    # Save token to database
    reset_token_record = models.PasswordResetToken(
        token=reset_token,
        user_id=user.id,
        expires_at=expires_at
    )
    db.add(reset_token_record)
    db.commit()
    
    # Send reset email
    email_sent = utils.send_password_reset_email(
        to_email=user.email,
        username=user.username,
        reset_token=reset_token
    )
    
    if not email_sent:
        # If email fails, remove the token from database
        db.delete(reset_token_record)
        db.commit()
        raise HTTPException(status_code=500, detail="Failed to send reset email")
    
    return {"message": "Password reset instructions sent to your email"}

@router.post("/reset-password")
def reset_password(request: schemas.ResetPasswordRequest, db: Session = Depends(get_db)):
    # Find the reset token
    reset_token_record = db.query(models.PasswordResetToken).filter(
        models.PasswordResetToken.token == request.token,
        models.PasswordResetToken.used == 0,
        models.PasswordResetToken.expires_at > datetime.utcnow()
    ).first()
    
    if not reset_token_record:
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    
    # Get the user
    user = db.query(models.User).filter(models.User.id == reset_token_record.user_id).first()
    if not user:
        raise HTTPException(status_code=400, detail="User not found")
    
    # Update password
    hashed_password = utils.hash_password(request.new_password)
    user.password = hashed_password
    
    # Mark token as used
    reset_token_record.used = 1
    
    # Commit changes
    db.commit()
    
    return {"message": "Password reset successfully"}
