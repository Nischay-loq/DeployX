from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from datetime import datetime
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
