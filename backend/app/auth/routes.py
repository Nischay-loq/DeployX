from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from datetime import datetime
import jwt
import requests
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
    # Validate username format
    if not user.username or len(user.username.strip()) < 3:
        raise HTTPException(status_code=400, detail="Username must be at least 3 characters long")
    if len(user.username) > 50:
        raise HTTPException(status_code=400, detail="Username must not exceed 50 characters")
    if not user.username.replace('_', '').isalnum():
        raise HTTPException(status_code=400, detail="Username can only contain letters, numbers, and underscores")
    
    # Validate email format (additional validation beyond Pydantic)
    if not user.email or len(user.email.strip()) == 0:
        raise HTTPException(status_code=400, detail="Email address is required")
    
    # Validate password strength
    if not user.password or len(user.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long")
    if len(user.password) > 128:
        raise HTTPException(status_code=400, detail="Password must not exceed 128 characters")
    
    # Check if email is already registered
    existing_email = db.query(models.User).filter(models.User.email == user.email).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="This email address is already registered. Please use a different email or try signing in.")
    
    # Check if username is already taken
    existing_username = db.query(models.User).filter(models.User.username == user.username).first()
    if existing_username:
        raise HTTPException(status_code=400, detail="This username is already taken. Please choose a different username.")

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
    # Validate OTP format
    if not request.otp or len(request.otp.strip()) == 0:
        raise HTTPException(status_code=400, detail="Verification code is required")
    if len(request.otp) != 6:
        raise HTTPException(status_code=400, detail="Verification code must be exactly 6 digits")
    if not request.otp.isdigit():
        raise HTTPException(status_code=400, detail="Verification code must contain only numbers")
    
    # Get pending signup data
    pending_data = signup_pending_store.get(request.email)
    if not pending_data:
        raise HTTPException(status_code=400, detail="No pending signup found for this email. Please start the signup process again.")
    
    # Verify OTP
    if pending_data["otp"] != request.otp:
        raise HTTPException(status_code=400, detail="Invalid verification code. Please check the code sent to your email and try again.")
    
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
    # Validate username format
    if not user.username or len(user.username.strip()) < 3:
        raise HTTPException(status_code=400, detail="Username must be at least 3 characters long")
    if len(user.username) > 50:
        raise HTTPException(status_code=400, detail="Username must not exceed 50 characters")
    if not user.username.replace('_', '').isalnum():
        raise HTTPException(status_code=400, detail="Username can only contain letters, numbers, and underscores")
    
    # Validate email format (additional validation beyond Pydantic)
    if not user.email or len(user.email.strip()) == 0:
        raise HTTPException(status_code=400, detail="Email address is required")
    
    # Validate password strength
    if not user.password or len(user.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long")
    if len(user.password) > 128:
        raise HTTPException(status_code=400, detail="Password must not exceed 128 characters")
    
    # Check if email is already registered
    existing_email = db.query(models.User).filter(models.User.email == user.email).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="This email address is already registered. Please use a different email or try signing in.")
    
    # Check if username is already taken
    existing_username = db.query(models.User).filter(models.User.username == user.username).first()
    if existing_username:
        raise HTTPException(status_code=400, detail="This username is already taken. Please choose a different username.")

    # Create user directly (no OTP verification)
    hashed_pw = utils.hash_password(user.password)
    new_user = models.User(username=user.username, email=user.email, password=hashed_pw)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/signup-with-otp", response_model=schemas.UserOut)
def signup_with_otp(user: schemas.UserCreateWithOTP, db: Session = Depends(get_db)):
    # Validate OTP format
    if not user.otp or len(user.otp.strip()) == 0:
        raise HTTPException(status_code=400, detail="Verification code is required")
    if len(user.otp) != 6:
        raise HTTPException(status_code=400, detail="Verification code must be exactly 6 digits")
    if not user.otp.isdigit():
        raise HTTPException(status_code=400, detail="Verification code must contain only numbers")
    
    # Validate username format
    if not user.username or len(user.username.strip()) < 3:
        raise HTTPException(status_code=400, detail="Username must be at least 3 characters long")
    if len(user.username) > 50:
        raise HTTPException(status_code=400, detail="Username must not exceed 50 characters")
    if not user.username.replace('_', '').isalnum():
        raise HTTPException(status_code=400, detail="Username can only contain letters, numbers, and underscores")
    
    # Validate email format
    if not user.email or len(user.email.strip()) == 0:
        raise HTTPException(status_code=400, detail="Email address is required")
    
    # Validate password strength
    if not user.password or len(user.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long")
    if len(user.password) > 128:
        raise HTTPException(status_code=400, detail="Password must not exceed 128 characters")
    
    # Verify OTP
    stored_data = otp_store.get(user.email)
    if not stored_data or stored_data["otp"] != user.otp or stored_data["purpose"] != "signup":
        raise HTTPException(status_code=400, detail="Invalid verification code. Please check the code sent to your email and try again.")
    
    # Check if email is already registered
    existing_email = db.query(models.User).filter(models.User.email == user.email).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="This email address is already registered. Please use a different email or try signing in.")
    
    # Check if username is already taken
    existing_username = db.query(models.User).filter(models.User.username == user.username).first()
    if existing_username:
        raise HTTPException(status_code=400, detail="This username is already taken. Please choose a different username.")

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
    # Basic input validation - only check if fields are provided
    if not user.username or len(user.username.strip()) == 0:
        raise HTTPException(status_code=400, detail="Username or email is required")
    if not user.password or len(user.password.strip()) == 0:
        raise HTTPException(status_code=400, detail="Password is required")
    
    # Try to find user by username or email
    db_user = db.query(models.User).filter(
        (models.User.username == user.username.strip()) | (models.User.email == user.username.strip())
    ).first()

    # Check if user exists and password is correct - only show generic error
    if not db_user or not utils.verify_password(user.password, db_user.password):
        raise HTTPException(status_code=401, detail="Incorrect username/email or password. Please check your credentials and try again.")

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
def send_otp(request: EmailRequest, db: Session = Depends(get_db)):
    # Validate email format
    if not request.email or len(request.email.strip()) == 0:
        raise HTTPException(status_code=400, detail="Email address is required")
    
    # Validate purpose
    if request.purpose not in ["signup", "reset"]:
        raise HTTPException(status_code=400, detail="Invalid purpose. Must be 'signup' or 'reset'")
    
    # For password reset, check if email exists
    if request.purpose == "reset":
        user = db.query(models.User).filter(models.User.email == request.email).first()
        if not user:
            raise HTTPException(status_code=404, detail="No account found with this email address. Please check your email or create a new account.")
    
    email = request.email
    purpose = request.purpose
    otp = utils.generate_otp()

    try:
        utils.send_otp_email(email, otp)
        otp_store[email] = {"otp": otp, "purpose": purpose}
        return {"msg": f"Verification code sent to {email}. Please check your inbox."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send verification code: {str(e)}")

@router.post("/verify-otp")
def verify_otp(request: OTPVerifyRequest):
    # Validate email format
    if not request.email or len(request.email.strip()) == 0:
        raise HTTPException(status_code=400, detail="Email address is required")
    
    # Validate OTP format
    if not request.otp or len(request.otp.strip()) == 0:
        raise HTTPException(status_code=400, detail="Verification code is required")
    if len(request.otp) != 6:
        raise HTTPException(status_code=400, detail="Verification code must be exactly 6 digits")
    if not request.otp.isdigit():
        raise HTTPException(status_code=400, detail="Verification code must contain only numbers")
    
    stored_data = otp_store.get(request.email)
    if stored_data and stored_data["otp"] == request.otp:
        return {"msg": "Verification code verified successfully", "purpose": stored_data["purpose"]}
    raise HTTPException(status_code=400, detail="Invalid verification code. Please check the code sent to your email and try again.")

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
        # Verify Google ID token
        google_user = verify_google_token(request.token)
        
        if not google_user:
            raise HTTPException(status_code=400, detail="Invalid Google token")
        
        # Check if user exists
        db_user = db.query(models.User).filter(models.User.email == google_user["email"]).first()
        
        if not db_user:
            # Create new user with real Google info
            username = google_user.get("name", google_user["email"].split("@")[0])
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
        
        # Create access and refresh tokens
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
    # Validate OTP format
    if not request.otp or len(request.otp.strip()) == 0:
        raise HTTPException(status_code=400, detail="Verification code is required")
    if len(request.otp) != 6:
        raise HTTPException(status_code=400, detail="Verification code must be exactly 6 digits")
    if not request.otp.isdigit():
        raise HTTPException(status_code=400, detail="Verification code must contain only numbers")
    
    # Validate email format
    if not request.email or len(request.email.strip()) == 0:
        raise HTTPException(status_code=400, detail="Email address is required")
    
    # Validate new password
    if not request.new_password or len(request.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters long")
    if len(request.new_password) > 128:
        raise HTTPException(status_code=400, detail="New password must not exceed 128 characters")
    
    # Verify OTP
    stored_data = otp_store.get(request.email)
    if not stored_data or stored_data["otp"] != request.otp or stored_data["purpose"] != "reset":
        raise HTTPException(status_code=400, detail="Invalid verification code. Please check the code sent to your email and try again.")
    
    # Find user by email
    db_user = db.query(models.User).filter(models.User.email == request.email).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="No account found with this email address. Please check your email or create a new account.")
    
    # Check if new password is same as old password
    if utils.verify_password(request.new_password, db_user.password):
        raise HTTPException(status_code=400, detail="New password cannot be the same as your current password. Please choose a different password.")
    
    # Update password
    db_user.password = utils.hash_password(request.new_password)
    db.commit()
    
    # Clear OTP after successful reset
    otp_store.pop(request.email, None)
    
    return {"msg": "Password reset successfully! You can now sign in with your new password."}

@router.post("/password-reset-request")
def password_reset_request(request: PasswordResetLinkRequest, db: Session = Depends(get_db)):
    # Validate email format
    if not request.email or len(request.email.strip()) == 0:
        raise HTTPException(status_code=400, detail="Email address is required")
    
    # Check if email exists in our system
    user = db.query(models.User).filter(models.User.email == request.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="No account found with this email address. Please check your email or create a new account.")

    try:
        token = utils.create_password_reset_token(request.email)
        reset_link = utils.build_password_reset_link(token)
        utils.send_password_reset_email(request.email, reset_link)
        return {"msg": "Password reset link has been sent to your email address. Please check your inbox and follow the instructions."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send password reset email: {str(e)}")

@router.get("/password-reset-validate")
def password_reset_validate(token: str):
    email = utils.verify_password_reset_token(token)
    return {"email": email}

@router.post("/password-reset-confirm")
def password_reset_confirm(request: PasswordResetConfirmRequest, db: Session = Depends(get_db)):
    # Validate new password
    if not request.new_password or len(request.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters long")
    if len(request.new_password) > 128:
        raise HTTPException(status_code=400, detail="New password must not exceed 128 characters")
    
    # Verify token and get email
    try:
        email = utils.verify_password_reset_token(request.token)
    except HTTPException as e:
        if "expired" in str(e.detail).lower():
            raise HTTPException(status_code=400, detail="Password reset link has expired. Please request a new one.")
        else:
            raise HTTPException(status_code=400, detail="Invalid or malformed reset link. Please request a new password reset.")
    
    # Find user
    db_user = db.query(models.User).filter(models.User.email == email).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Account not found. The user may have been deleted.")

    # Check if new password is same as old password
    if utils.verify_password(request.new_password, db_user.password):
        raise HTTPException(status_code=400, detail="New password cannot be the same as your current password. Please choose a different password.")

    # Update password
    db_user.password = utils.hash_password(request.new_password)
    db.commit()

    return {"msg": "Password reset successfully! You can now sign in with your new password."}

def verify_google_token(token: str):
    """Verify Google ID token and extract user info"""
    try:
        # Verify the token with Google's public keys
        # This is a simplified verification - in production, you should use Google's official library
        response = requests.get(f"https://oauth2.googleapis.com/tokeninfo?id_token={token}")
        
        if response.status_code != 200:
            return None
            
        token_info = response.json()
        
        # Verify the token is for our application
        expected_client_id = "301868766960-n563prdnpkudkp6jg0pugpt6ati0fciq.apps.googleusercontent.com"
        if token_info.get("aud") != expected_client_id:
            return None
            
        # Extract user information
        return {
            "email": token_info.get("email"),
            "name": token_info.get("name"),
            "given_name": token_info.get("given_name"),
            "family_name": token_info.get("family_name"),
            "picture": token_info.get("picture"),
            "sub": token_info.get("sub")
        }
        
    except Exception as e:
        print(f"Error verifying Google token: {e}")
        return None

@router.get("/me")
def get_current_user_info(current_user: models.User = Depends(utils.get_current_user)):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "created_at": current_user.created_at
    }

# ----------- PROFILE MANAGEMENT ROUTES ---------------------

class UpdateUsernameRequest(BaseModel):
    new_username: str

class UpdatePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class UpdateEmailRequest(BaseModel):
    new_email: EmailStr
    password: str

class VerifyEmailChangeRequest(BaseModel):
    token: str

@router.put("/update-username")
def update_username(
    request: UpdateUsernameRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(utils.get_current_user)
):
    """Update user's username"""
    try:
        # Validate new username
        if not request.new_username or len(request.new_username.strip()) < 3:
            raise HTTPException(
                status_code=400,
                detail="Username must be at least 3 characters long"
            )
        
        # Check if username already exists
        existing_user = db.query(models.User).filter(
            models.User.username == request.new_username.strip(),
            models.User.id != current_user.id
        ).first()
        
        if existing_user:
            raise HTTPException(
                status_code=400,
                detail="Username already exists"
            )
        
        # Update username
        current_user.username = request.new_username.strip()
        db.commit()
        db.refresh(current_user)
        
        return {
            "status": "success",
            "message": "Username updated successfully",
            "new_username": current_user.username
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update username: {str(e)}"
        )

@router.put("/change-password")
def change_password(
    request: UpdatePasswordRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(utils.get_current_user)
):
    """Change user's password with current password verification"""
    try:
        # Verify current password
        if not utils.verify_password(request.current_password, current_user.hashed_password):
            raise HTTPException(
                status_code=400,
                detail="Current password is incorrect"
            )
        
        # Validate new password
        if len(request.new_password) < 6:
            raise HTTPException(
                status_code=400,
                detail="New password must be at least 6 characters long"
            )
        
        # Update password
        current_user.hashed_password = utils.get_password_hash(request.new_password)
        db.commit()
        
        return {
            "status": "success",
            "message": "Password changed successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to change password: {str(e)}"
        )

@router.post("/request-email-change")
def request_email_change(
    request: UpdateEmailRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(utils.get_current_user)
):
    """Request email change - sends verification to new email"""
    try:
        # Verify password
        if not utils.verify_password(request.password, current_user.hashed_password):
            raise HTTPException(
                status_code=400,
                detail="Password is incorrect"
            )
        
        # Check if new email already exists
        existing_user = db.query(models.User).filter(
            models.User.email == request.new_email,
            models.User.id != current_user.id
        ).first()
        
        if existing_user:
            raise HTTPException(
                status_code=400,
                detail="Email already in use"
            )
        
        # Generate verification token
        import secrets
        token = secrets.token_urlsafe(32)
        
        # Store email change request (in production, use database)
        email_change_requests = getattr(request_email_change, 'requests', {})
        email_change_requests[token] = {
            "user_id": current_user.id,
            "new_email": request.new_email,
            "created_at": datetime.utcnow(),
            "expires_at": datetime.utcnow().timestamp() + 3600  # 1 hour
        }
        request_email_change.requests = email_change_requests
        
        # Send verification email
        verification_link = f"http://localhost:5173/verify-email-change?token={token}"
        
        try:
            utils.send_email(
                to_email=request.new_email,
                subject="Verify your new email address - DeployX",
                html_content=f"""
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #1f2937;">Verify Your New Email Address</h2>
                    <p>Hello {current_user.username},</p>
                    <p>You requested to change your email address to: <strong>{request.new_email}</strong></p>
                    <p>To complete this change, please click the button below:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{verification_link}" 
                           style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                                  color: white; 
                                  padding: 12px 30px; 
                                  text-decoration: none; 
                                  border-radius: 8px; 
                                  display: inline-block;
                                  font-weight: bold;">
                            Verify New Email
                        </a>
                    </div>
                    <p style="color: #6b7280; font-size: 14px;">
                        This link will expire in 1 hour. If you didn't request this change, please ignore this email.
                    </p>
                    <p style="color: #6b7280; font-size: 14px;">
                        If the button doesn't work, copy and paste this link into your browser:<br>
                        <a href="{verification_link}">{verification_link}</a>
                    </p>
                </div>
                """
            )
        except Exception as e:
            print(f"Failed to send email: {e}")
            # For development, we'll continue without sending email
            pass
        
        return {
            "status": "success",
            "message": f"Verification email sent to {request.new_email}. Please check your inbox.",
            "verification_token": token  # For development only
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to request email change: {str(e)}"
        )

@router.post("/verify-email-change")
def verify_email_change(
    request: VerifyEmailChangeRequest,
    db: Session = Depends(get_db)
):
    """Verify email change using token from email"""
    try:
        # Get email change requests
        email_change_requests = getattr(request_email_change, 'requests', {})
        
        if request.token not in email_change_requests:
            raise HTTPException(
                status_code=400,
                detail="Invalid or expired verification token"
            )
        
        change_request = email_change_requests[request.token]
        
        # Check if token is expired
        if datetime.utcnow().timestamp() > change_request["expires_at"]:
            del email_change_requests[request.token]
            raise HTTPException(
                status_code=400,
                detail="Verification token has expired"
            )
        
        # Get user and update email
        user = db.query(models.User).filter(models.User.id == change_request["user_id"]).first()
        if not user:
            raise HTTPException(
                status_code=404,
                detail="User not found"
            )
        
        # Update email
        old_email = user.email
        user.email = change_request["new_email"]
        db.commit()
        db.refresh(user)
        
        # Clean up the request
        del email_change_requests[request.token]
        
        return {
            "status": "success",
            "message": "Email address updated successfully",
            "old_email": old_email,
            "new_email": user.email
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to verify email change: {str(e)}"
        )
