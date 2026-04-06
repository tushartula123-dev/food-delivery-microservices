from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
import models, database

app = FastAPI(title="User Service - Food Delivery App")

# 1. Security Configurations
SECRET_KEY = "tushar_mca_99.83_percentile_secret" # Yeh token generate karne ke liye hai
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 # Token 1 ghante tak valid rahega

# 2. Password Hashing Setup
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# 3. Database Tables Create Karna
models.Base.metadata.create_all(bind=database.engine)

# --- Helper Functions ---
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# --- API Endpoints ---

@app.get("/")
def home():
    return {
        "status": "User Service is Online", 
        "database": "Connected",
        "system": "Ubuntu Pentium 4GB"
    }

# Endpoint 1: User Registration
@app.post("/register")
def register_user(name: str, email: str, password: str, db: Session = Depends(database.get_db)):
    # Check if user already exists
    user_exists = db.query(models.User).filter(models.User.email == email).first()
    if user_exists:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash password and save to DB
    new_user = models.User(
        full_name=name, 
        email=email, 
        hashed_password=pwd_context.hash(password)
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"message": "User created successfully", "user_id": new_user.id}

# Endpoint 2: User Login (JWT Generation)
@app.post("/login")
def login_user(email: str, password: str, db: Session = Depends(database.get_db)):
    # Check if user exists in DB
    user = db.query(models.User).filter(models.User.email == email).first()
    
    # Verify user and password
    if not user or not pwd_context.verify(password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Create JWT Token
    access_token = create_access_token(data={"sub": user.email})
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user_name": user.full_name
    }