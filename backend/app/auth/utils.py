from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
import os
import random
import smtplib
from email.message import EmailMessage
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from .database import get_db
from . import models

SECRET_KEY = "your-secret-key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7
RESET_TOKEN_EXPIRE_MINUTES = int(os.environ.get("PASSWORD_RESET_TOKEN_MINUTES", "30"))
FRONTEND_RESET_URL = os.environ.get("FRONTEND_RESET_URL", "http://localhost:5173/reset-password")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
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

def send_otp_email(to_email: str, otp: str):
    msg = EmailMessage()
    msg.set_content(f"Your OTP for signup is: {otp}")
    msg["Subject"] = "Verify your Email"
    msg["From"] = "parthshikhare21@gmail.com"
    msg["To"] = to_email

    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as smtp:
        smtp.login("parthshikhare21@gmail.com", "hjav tipn ucog mmyy")
        smtp.send_message(msg)

def send_email(to_email: str, subject: str, html_content: str):
    """Generic email sending function"""
    msg = EmailMessage()
    msg.set_content(html_content, subtype='html')
    msg["Subject"] = subject
    msg["From"] = "parthshikhare21@gmail.com"
    msg["To"] = to_email

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as smtp:
            smtp.login("parthshikhare21@gmail.com", "hjav tipn ucog mmyy")
            smtp.send_message(msg)
        print(f"Email sent successfully to {to_email}")
    except Exception as e:
        print(f"Failed to send email to {to_email}: {e}")
        # For development, continue without failing
        pass

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
    except JWTError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Reset link has expired or is invalid")

def build_password_reset_link(token: str) -> str:
    base_url = FRONTEND_RESET_URL.rstrip('/')
    if '?' in base_url:
        # Assume consumer provided query placeholder
        return f"{base_url}&token={token}"
    return f"{base_url}?token={token}"

def send_password_reset_email(to_email: str, reset_link: str):
    msg = EmailMessage()
    msg.set_content(
        f"Hello,\n\n"
        f"We received a request to reset the password for your DeployX account. "
        f"If you made this request, click the link below to choose a new password:\n\n"
        f"{reset_link}\n\n"
        f"This link will expire in {RESET_TOKEN_EXPIRE_MINUTES} minutes. "
        f"If you didn't request a password reset, you can safely ignore this email.\n\n"
        f"— The DeployX Team"
    )
    msg["Subject"] = "DeployX Password Reset"
    msg["From"] = "parthshikhare21@gmail.com"
    msg["To"] = to_email

    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as smtp:
        smtp.login("parthshikhare21@gmail.com", "hjav tipn ucog mmyy")
        smtp.send_message(msg)

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
    user = db.query(models.User).filter(models.User.username == username).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user