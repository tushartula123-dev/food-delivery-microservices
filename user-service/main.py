from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from pydantic import BaseModel
from enum import Enum
import jwt
import datetime

from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# --- 🗄️ DATABASE SETUP (POSTGRESQL) ---
SQLALCHEMY_DATABASE_URL = "postgresql://postgres:1234@localhost:5433/user_db"

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# --- 🔐 JWT CONFIGURATION ---
SECRET_KEY = "pune_food_super_secret"  
ALGORITHM = "HS256"

security = HTTPBearer()

# --- 🏗️ DB MODELS ---
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    email = Column(String, unique=True, index=True)
    password = Column(String) 
    role = Column(String) 
    wallet_balance = Column(Float, default=0.0)
    phone_number = Column(String, nullable=False, default="Not Provided") 
    vehicle_number = Column(String, nullable=True)

# 🔥 NAYA: Invisible Address Book Model
class AddressBook(Base):
    __tablename__ = "address_book"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    address_text = Column(String)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="User & Auth Service")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()

# --- 🛡️ THE NEW SECURITY GUARD (Token Decoder) ---
def verify_user_token(token: HTTPAuthorizationCredentials = Depends(security)):
    try:
        # Token ko open/decode karke payload nikal rahe hain
        payload = jwt.decode(token.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        return payload  # Iske andar humara "sub" (user_id) aur "role" chhipa hai
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expire ho gaya hai. Wapas login karo!")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Asli Token laao bhai, ye fake hai!")

# --- 🔒 ROLE ENUMERATION ---
class RoleType(str, Enum):
    customer = "Customer"
    merchant = "Merchant"
    rider = "Rider"

# --- 📝 SCHEMAS ---
class UserRegister(BaseModel):
    name: str
    email: str
    password: str
    role: RoleType  
    phone_number: str
    vehicle_number: str | None = None

class UserLogin(BaseModel):
    email: str
    password: str

class WalletUpdate(BaseModel):
    amount: float

# 🔥 NAYA: Schema for Address Endpoint
class AddressCreate(BaseModel):
    address: str

# --- 🚀 AUTHENTICATION APIS ---
@app.post("/register")
def register(user: UserRegister, db: Session = Depends(get_db)):
    if not user.phone_number or user.phone_number.strip() == "":
        raise HTTPException(status_code=400, detail="Phone number blank nahi ho sakta bhai!")
        
    if len(user.phone_number.strip()) < 10:
        raise HTTPException(status_code=400, detail="Phone number kam se kam 10 digits ka hona chahiye!")

    if user.role == RoleType.rider and (not user.vehicle_number or user.vehicle_number.strip() == ""):
        raise HTTPException(status_code=400, detail="Vehicle number is mandatory for Riders!")
    
    if user.role != RoleType.rider:
        user.vehicle_number = None

    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    bonus = 500.0 if user.role == RoleType.customer else 0.0
    
    new_user = User(
        name=user.name, 
        email=user.email, 
        password=user.password, 
        role=user.role.value,  
        wallet_balance=bonus, 
        phone_number=user.phone_number.strip(),  
        vehicle_number=user.vehicle_number
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"msg": f"{user.role.value} created successfully", "user_id": new_user.id}

@app.post("/login")
def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email, User.password == user.password).first()
    if not db_user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    payload = {
        "sub": str(db_user.id),       
        "role": db_user.role,         
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=24) 
    }
    encoded_token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

    return {
        "token": encoded_token, 
        "user_id": db_user.id, 
        "user_name": db_user.name, 
        "role": db_user.role,
        "wallet_balance": db_user.wallet_balance
    }

# --- 💰 PROTECTED WALLET APIS (Strict Authorization Added) ---

@app.get("/users/{user_id}")
def get_user(user_id: int, db: Session = Depends(get_db), payload: dict = Depends(verify_user_token)):
    # 🔥 FIX: STRICT AUTHORIZATION HATA DIYA taaki Customer Rider ka naam dekh sake (No 403 error)
    user = db.query(User).filter(User.id == user_id).first()
    if not user: raise HTTPException(status_code=404)
    return user

@app.post("/users/{user_id}/wallet/topup")
def topup_wallet(user_id: int, topup: WalletUpdate, db: Session = Depends(get_db), payload: dict = Depends(verify_user_token)):
    # 🔥 AUTHORIZATION CHECK
    if int(payload.get("sub")) != user_id:
        raise HTTPException(status_code=403, detail="Chori pakdi gayi! Apne hi wallet mein paise daal sakte ho!")

    user = db.query(User).filter(User.id == user_id).first()
    if not user: raise HTTPException(status_code=404, detail="User not found")
    user.wallet_balance += topup.amount
    db.commit()
    return {"msg": "Topup successful", "balance": user.wallet_balance}

@app.post("/users/{user_id}/wallet/deduct")
def deduct_wallet(user_id: int, deduct: WalletUpdate, db: Session = Depends(get_db), payload: dict = Depends(verify_user_token)):
    # 🔥 AUTHORIZATION CHECK
    if int(payload.get("sub")) != user_id:
        raise HTTPException(status_code=403, detail="Error")

    user = db.query(User).filter(User.id == user_id).first()
    if not user: raise HTTPException(status_code=404, detail="User not found")
    
    if user.wallet_balance < deduct.amount:
        raise HTTPException(status_code=400, detail="Insufficient Wallet Balance!")
    user.wallet_balance -= deduct.amount
    db.commit()
    return {"msg": "Deduction successful", "balance": user.wallet_balance}

# --- 📍 NAYA: INVISIBLE ADDRESS APIS ---
@app.post("/users/{user_id}/address")
def save_address(user_id: int, addr: AddressCreate, db: Session = Depends(get_db)):
    # Duplicate check taaki DB na bhare
    existing = db.query(AddressBook).filter(AddressBook.user_id == user_id, AddressBook.address_text == addr.address).first()
    if not existing:
        new_addr = AddressBook(user_id=user_id, address_text=addr.address)
        db.add(new_addr)
        db.commit()
    return {"msg": "Address saved invisibly!"}

@app.get("/users/{user_id}/addresses")
def get_addresses(user_id: int, db: Session = Depends(get_db)):
    addresses = db.query(AddressBook).filter(AddressBook.user_id == user_id).all()
    return [addr.address_text for addr in addresses]