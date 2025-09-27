from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
import random
import smtplib
import uuid
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

SECRET_KEY = "your-secret-key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Email configuration - use environment variables in production
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "465"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "parthshikhare21@gmail.com")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "hjav tipn ucog mmyy")
FROM_EMAIL = os.getenv("FROM_EMAIL", "deployx.support@mydomain.com")
FROM_NAME = os.getenv("FROM_NAME", "DeployX Support")
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://mydomain.com")

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

def generate_reset_token():
    """Generate a secure UUID token for password reset"""
    return str(uuid.uuid4())

def send_otp_email(to_email: str, otp: str):
    msg = EmailMessage()
    msg.set_content(f"Your OTP for signup is: {otp}")
    msg["Subject"] = "Verify your Email"
    msg["From"] = FROM_EMAIL
    msg["To"] = to_email

    with smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT) as smtp:
        smtp.login(SMTP_USERNAME, SMTP_PASSWORD)
        smtp.send_message(msg)

def send_password_reset_email(to_email: str, username: str, reset_token: str):
    """Send password reset email with professional HTML template"""
    
    # Create the reset URL using environment variable
    reset_url = f"{FRONTEND_URL}/reset-password/{reset_token}"
    
    # HTML email template
    html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your DeployX Password</title>
        <style>
            body {{
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f8f9fa;
            }}
            .container {{
                background-color: #ffffff;
                border-radius: 8px;
                padding: 40px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            }}
            .header {{
                text-align: center;
                margin-bottom: 30px;
            }}
            .logo {{
                font-size: 24px;
                font-weight: bold;
                color: #007bff;
                margin-bottom: 10px;
            }}
            .title {{
                font-size: 20px;
                color: #333;
                margin-bottom: 20px;
            }}
            .content {{
                margin-bottom: 30px;
            }}
            .button {{
                display: inline-block;
                background-color: #007bff;
                color: #ffffff;
                text-decoration: none;
                padding: 12px 30px;
                border-radius: 6px;
                font-weight: 500;
                text-align: center;
                margin: 20px 0;
            }}
            .button:hover {{
                background-color: #0056b3;
            }}
            .footer {{
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #e9ecef;
                font-size: 14px;
                color: #6c757d;
                text-align: center;
            }}
            .warning {{
                background-color: #fff3cd;
                border: 1px solid #ffeaa7;
                border-radius: 4px;
                padding: 15px;
                margin: 20px 0;
                color: #856404;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">DeployX</div>
                <h1 class="title">Reset Your Password</h1>
            </div>
            
            <div class="content">
                <p>Hello <strong>{username}</strong>,</p>
                
                <p>Your DeployX password can be reset by clicking the button below.</p>
                
                <p>If you did not request a new password, please ignore this email.</p>
                
                <div style="text-align: center;">
                    <a href="{reset_url}" class="button">Reset Password</a>
                </div>
                
                <div class="warning">
                    <strong>Security Notice:</strong> This link will expire in 15 minutes for your security.
                </div>
                
                <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #007bff;">{reset_url}</p>
            </div>
            
            <div class="footer">
                <p>This email was sent from DeployX Support</p>
                <p>If you have any questions, please contact us at {FROM_EMAIL}</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    # Create message
    msg = MIMEMultipart('alternative')
    msg['Subject'] = "Reset Your DeployX Password"
    msg['From'] = f"{FROM_NAME} <{FROM_EMAIL}>"
    msg['To'] = to_email
    
    # Add HTML content
    html_part = MIMEText(html_content, 'html')
    msg.attach(html_part)
    
    # Send email
    try:
        with smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT) as smtp:
            smtp.login(SMTP_USERNAME, SMTP_PASSWORD)
            smtp.send_message(msg)
        return True
    except Exception as e:
        print(f"Failed to send password reset email: {e}")
        return False