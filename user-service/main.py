from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from pydantic import BaseModel
from typing import Optional

# --- 🗄️ DB SETUP ---
SQLALCHEMY_DATABASE_URL = "sqlite:///./users.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# --- 🏗️ THE NEW "DYNAMIC" MODEL ---
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    email = Column(String, unique=True, index=True)
    password = Column(String)
    role = Column(String) # 'customer', 'merchant', 'rider'
    
    # 🔥 NEW: Zomato Style Columns
    wallet_balance = Column(Float, default=0.0) 
    phone_number = Column(String, nullable=True)  # Rider Profile
    vehicle_number = Column(String, nullable=True) # Rider Profile

Base.metadata.create_all(bind=engine)

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()

# --- 📝 SCHEMAS ---
class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    role: str
    phone_number: Optional[str] = None
    vehicle_number: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

# --- 🚀 ENDPOINTS ---
@app.post("/register")
def register(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user: 
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Signup Bonus Logic: Customer gets ₹500, others get ₹0
    initial_balance = 500.0 if user.role == 'customer' else 0.0
    
    new_user = User(
        name=user.name, 
        email=user.email, 
        password=user.password, 
        role=user.role,
        phone_number=user.phone_number, 
        vehicle_number=user.vehicle_number,
        wallet_balance=initial_balance
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"msg": "User created", "user_id": new_user.id}

@app.post("/login")
def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email, User.password == user.password).first()
    if not db_user: 
        raise HTTPException(status_code=400, detail="Invalid credentials")
    return {
        "user_id": db_user.id, 
        "user_name": db_user.name, 
        "role": db_user.role,
        "wallet_balance": db_user.wallet_balance
    }

# Fetch Real Profile for Tracking/Dashboard
@app.get("/users/{user_id}")
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user: 
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "id": user.id, 
        "name": user.name, 
        "role": user.role,
        "wallet_balance": user.wallet_balance,
        "phone_number": user.phone_number, 
        "vehicle_number": user.vehicle_number
    }

# Wallet Top-up API
@app.post("/users/{user_id}/wallet/topup")
def topup_wallet(user_id: int, payload: dict, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user: 
        raise HTTPException(status_code=404, detail="User not found")
    
    amount = float(payload.get("amount", 0.0))
    user.wallet_balance += amount
    db.commit()
    return {"new_balance": user.wallet_balance}

# Wallet Deduct API (For Checkout)
@app.post("/users/{user_id}/wallet/deduct")
def deduct_wallet(user_id: int, payload: dict, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    deduct_amount = float(payload.get("amount", 0.0))
    
    if user.wallet_balance < deduct_amount:
        raise HTTPException(status_code=400, detail="Insufficient PuneFood Wallet Balance!")
        
    user.wallet_balance -= deduct_amount
    db.commit()
    return {"new_balance": user.wallet_balance}