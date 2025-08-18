from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
import random
import smtplib
from email.message import EmailMessage

SECRET_KEY = "your-secret-key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
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