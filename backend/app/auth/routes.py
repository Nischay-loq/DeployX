from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from datetime import datetime
from . import models, schemas, utils
from .database import get_db

router = APIRouter(prefix="/auth", tags=["Auth"])

# In-memory OTP store (temp solution) - stores {email: {"otp": code, "purpose": "signup"|"reset", "user_data": {...}}}
otp_store = {}

# Temporary user data store for signup process
signup_pending_store = {}

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

class PasswordResetLinkRequest(BaseModel):
    email: EmailStr

class PasswordResetConfirmRequest(BaseModel):
    token: str
    new_password: str

# ----------- AUTH ROUTES ---------------------
@router.post("/signup-request")
def signup_request(user: schemas.UserCreate, db: Session = Depends(get_db)):
    """
    Step 1: Validate user data and send OTP (don't create user yet)
    """
    # Check if user data already exists
    if db.query(models.User).filter(models.User.email == user.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if db.query(models.User).filter(models.User.username == user.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")

    # Generate and send OTP
    otp = utils.generate_otp()
    
    try:
        utils.send_otp_email(user.email, otp)
        
        # Store user data temporarily along with OTP
        signup_pending_store[user.email] = {
            "otp": otp,
            "username": user.username,
            "email": user.email,
            "password": user.password,  # Will be hashed when user is created
            "timestamp": datetime.utcnow(),
            "purpose": "signup"
        }
        
        return {"msg": f"OTP sent to {user.email}. Please verify to complete signup."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send OTP: {str(e)}")

@router.post("/signup-complete", response_model=schemas.UserOut)
def signup_complete(request: schemas.OTPVerifyRequest, db: Session = Depends(get_db)):
    """
    Step 2: Verify OTP and create user account
    """
    # Get pending signup data
    pending_data = signup_pending_store.get(request.email)
    if not pending_data:
        raise HTTPException(status_code=400, detail="No pending signup found. Please start signup process again.")
    
    # Verify OTP
    if pending_data["otp"] != request.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    # Check if OTP is expired (optional: 10 minutes expiry)
    if (datetime.utcnow() - pending_data["timestamp"]).total_seconds() > 600:  # 10 minutes
        signup_pending_store.pop(request.email, None)
        raise HTTPException(status_code=400, detail="OTP expired. Please start signup process again.")
    
    # Double-check user doesn't exist (race condition protection)
    if db.query(models.User).filter(models.User.email == request.email).first():
        signup_pending_store.pop(request.email, None)
        raise HTTPException(status_code=400, detail="Email already registered")
    if db.query(models.User).filter(models.User.username == pending_data["username"]).first():
        signup_pending_store.pop(request.email, None)
        raise HTTPException(status_code=400, detail="Username already taken")

    # Create user account
    hashed_pw = utils.hash_password(pending_data["password"])
    new_user = models.User(
        username=pending_data["username"], 
        email=pending_data["email"], 
        password=hashed_pw
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Clear pending data
    signup_pending_store.pop(request.email, None)
    
    return new_user

@router.post("/signup", response_model=schemas.UserOut)
def signup(user: schemas.UserCreate, db: Session = Depends(get_db)):
    """
    Legacy endpoint for direct signup (no OTP) - kept for backward compatibility
    """
    # Check if user data already exists
    if db.query(models.User).filter(models.User.email == user.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if db.query(models.User).filter(models.User.username == user.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")

    # Create user directly (no OTP verification)
    hashed_pw = utils.hash_password(user.password)
    new_user = models.User(username=user.username, email=user.email, password=hashed_pw)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/signup-with-otp", response_model=schemas.UserOut)
def signup_with_otp(user: schemas.UserCreateWithOTP, db: Session = Depends(get_db)):
    # Verify OTP first
    stored_data = otp_store.get(user.email)
    if not stored_data or stored_data["otp"] != user.otp or stored_data["purpose"] != "signup":
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
    
    # Check if user data already exists
    if db.query(models.User).filter(models.User.email == user.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if db.query(models.User).filter(models.User.username == user.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")

    # Create user after OTP verification
    hashed_pw = utils.hash_password(user.password)
    new_user = models.User(username=user.username, email=user.email, password=hashed_pw)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Clear OTP after successful signup
    otp_store.pop(user.email, None)
    
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

# Development only - Get OTP for testing
@router.get("/get-otp/{email}")
def get_otp_for_testing(email: str):
    """Development endpoint to get OTP for testing. Remove in production."""
    stored_data = otp_store.get(email)
    if stored_data:
        return {"email": email, "otp": stored_data["otp"], "purpose": stored_data["purpose"]}
    raise HTTPException(status_code=404, detail="No OTP found for this email")

# Development only - Get pending signup data
@router.get("/get-pending-signup/{email}")
def get_pending_signup_for_testing(email: str):
    """Development endpoint to get pending signup data for testing. Remove in production."""
    pending_data = signup_pending_store.get(email)
    if pending_data:
        return {
            "email": email, 
            "otp": pending_data["otp"], 
            "username": pending_data["username"],
            "purpose": pending_data["purpose"]
        }
    raise HTTPException(status_code=404, detail="No pending signup found for this email")

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

@router.post("/password-reset-request")
def password_reset_request(request: PasswordResetLinkRequest, db: Session = Depends(get_db)):
    # Always respond with success message to prevent email enumeration attacks
    generic_response = {"msg": "If an account exists for this email, a reset link has been sent."}

    user = db.query(models.User).filter(models.User.email == request.email).first()
    if not user:
        return generic_response

    try:
        token = utils.create_password_reset_token(request.email)
        reset_link = utils.build_password_reset_link(token)
        utils.send_password_reset_email(request.email, reset_link)
        return generic_response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send password reset email: {str(e)}")

@router.get("/password-reset-validate")
def password_reset_validate(token: str):
    email = utils.verify_password_reset_token(token)
    return {"email": email}

@router.post("/password-reset-confirm")
def password_reset_confirm(request: PasswordResetConfirmRequest, db: Session = Depends(get_db)):
    email = utils.verify_password_reset_token(request.token)
    db_user = db.query(models.User).filter(models.User.email == email).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    db_user.password = utils.hash_password(request.new_password)
    db.commit()

    return {"msg": "Password reset successfully"}

@router.get("/me")
def get_current_user_info(current_user: models.User = Depends(utils.get_current_user)):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "created_at": current_user.created_at
    }
