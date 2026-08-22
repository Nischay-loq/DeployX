from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
import os
import random
import logging
import smtplib
from email.message import EmailMessage
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from .database import get_db, User

logger = logging.getLogger(__name__)

# Get JWT secret from environment variable
SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "your-secret-key-here")
ALGORITHM = os.environ.get("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days
REFRESH_TOKEN_EXPIRE_DAYS = 30  # 30 days
RESET_TOKEN_EXPIRE_MINUTES = int(os.environ.get("PASSWORD_RESET_TOKEN_MINUTES", "30"))
EMAIL_CHANGE_TOKEN_EXPIRE_MINUTES = 30  # 30 minutes for email change verification
FRONTEND_RESET_URL = os.environ.get("FRONTEND_RESET_URL", "http://localhost:5173/reset-password")

# SMTP configuration (set SMTP_EMAIL / SMTP_PASSWORD in the environment)
SMTP_HOST = os.environ.get("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "465"))
SMTP_EMAIL = os.environ.get("SMTP_EMAIL", "")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

def hash_password(password: str) -> str:
    # Bcrypt has a limitation of 72 bytes for passwords.
    # Safely truncate the password's bytes to 72 and decode back to a string 
    # to prevent the ValueError.
    password_bytes = password.encode('utf-8')
    if len(password_bytes) > 72:
        # Truncate the bytes and decode, ignoring any partial multi-byte character
        password = password_bytes[:72].decode('utf-8', errors='ignore') 
    
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    # Apply the same safe truncation logic during verification for consistency.
    password_bytes = plain_password.encode('utf-8')
    if len(password_bytes) > 72:
        # Truncate the bytes and decode, ignoring any partial multi-byte character
        plain_password = password_bytes[:72].decode('utf-8', errors='ignore')
        
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def create_refresh_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS))
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def generate_otp():
    return str(random.randint(100000, 999999))

def _build_message(to_email: str, subject: str, body: str, html: bool = False) -> EmailMessage:
    msg = EmailMessage()
    msg.set_content(body, subtype='html' if html else 'plain')
    msg["Subject"] = subject
    msg["From"] = SMTP_EMAIL
    msg["To"] = to_email
    return msg

def send_email_message(msg: EmailMessage) -> bool:
    """Send an EmailMessage via the configured SMTP server. Returns success."""
    if not SMTP_EMAIL or not SMTP_PASSWORD:
        logger.error("SMTP_EMAIL/SMTP_PASSWORD not configured - cannot send email")
        return False
    try:
        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT) as smtp:
            smtp.login(SMTP_EMAIL, SMTP_PASSWORD)
            smtp.send_message(msg)
        logger.info(f"Email sent successfully to {msg['To']}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {msg['To']}: {e}")
        return False

def send_otp_email(to_email: str, otp: str):
    """Send a signup OTP email."""
    return send_email_message(_build_message(
        to_email,
        "Verify your Email",
        f"Your OTP for signup is: {otp}"
    ))

def send_email(to_email: str, subject: str, html_content: str):
    """Generic HTML email sending function"""
    return send_email_message(_build_message(to_email, subject, html_content, html=True))

def create_password_reset_token(email: str, expires_minutes: int = RESET_TOKEN_EXPIRE_MINUTES) -> str:
    to_encode = {
        "sub": email,
        "type": "password_reset"
    }
    expire = datetime.utcnow() + timedelta(minutes=expires_minutes)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def verify_password_reset_token(token: str) -> str:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        if payload.get("type") != "password_reset":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid reset token")

        email = payload.get("sub")
        if not email:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid reset token")

        return email
    except JWTError as e:
        logger.warning(f"Password reset token verification failed: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Reset link has expired or is invalid")

def create_email_change_token(user_id: int, new_email: str, expires_minutes: int = EMAIL_CHANGE_TOKEN_EXPIRE_MINUTES) -> str:
    """Create JWT token for email change verification"""
    to_encode = {
        "user_id": user_id,
        "new_email": new_email,
        "type": "email_change"
    }
    expire = datetime.utcnow() + timedelta(minutes=expires_minutes)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def verify_email_change_token(token: str) -> tuple:
    """Verify email change token and return (user_id, new_email)"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        if payload.get("type") != "email_change":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid verification token")

        user_id = payload.get("user_id")
        new_email = payload.get("new_email")
        
        if not user_id or not new_email:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid verification token")

        return user_id, new_email
    except JWTError as e:
        logger.warning(f"Email change token verification failed: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Verification link has expired or is invalid")

def build_password_reset_link(token: str) -> str:
    """Build password reset link using environment-aware frontend URL"""
    environment = os.environ.get("ENVIRONMENT", "production")
    if environment == "development":
        base_url = os.environ.get("FRONTEND_LOCAL_URL", "http://localhost:5173")
    else:
        base_url = os.environ.get("FRONTEND_URL", "http://localhost:5173")
    
    # Remove trailing slash
    base_url = base_url.rstrip('/')
    
    # Check if we need to use existing query params
    if '?' in base_url:
        return f"{base_url}&token={token}"
    return f"{base_url}/reset-password?token={token}"

def send_password_reset_email(to_email: str, reset_link: str):
    """Send the password reset email."""
    return send_email_message(_build_message(
        to_email,
        "DeployX Password Reset",
        f"Hello,\n\n"
        f"We received a request to reset the password for your DeployX account. "
        f"If you made this request, click the link below to choose a new password:\n\n"
        f"{reset_link}\n\n"
        f"This link will expire in {RESET_TOKEN_EXPIRE_MINUTES} minutes. "
        f"If you didn't request a password reset, you can safely ignore this email.\n\n"
        f"— The DeployX Team"
    ))

def verify_token(token: str, token_type: str = "access", raise_exception: bool = True):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        token_type_from_payload: str = payload.get("type", "access")
        
        if username is None:
            if raise_exception:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Could not validate credentials",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            return None
            
        # For refresh tokens, check that the token type matches
        if token_type == "refresh" and token_type_from_payload != "refresh":
            if raise_exception:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token type",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            return None
            
        return username
    except JWTError:
        if raise_exception:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return None

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    username = verify_token(credentials.credentials)
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user