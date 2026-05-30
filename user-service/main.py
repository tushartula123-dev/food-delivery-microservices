from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import jwt
import datetime
import bcrypt
import threading
import json
import redis
import requests
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# --- IMPORTS FROM MODULAR FILES ---
from database import engine, get_db, Base
from models import User, AddressBook
from schemas import (
    UserRegister, StaffRegister, StaffUpdate, UserLogin, 
    WalletUpdate, AddressCreate, UserProfileUpdate, RoleType
)

# --- 🔴 REDIS SETUP ---
try:
    redis_client = redis.Redis(host='localhost', port=6379, decode_responses=True)
    redis_client.ping()
    print("✅ Redis connected in User Service")
except Exception as e:
    print(f"⚠️ Redis not available: {e}")
    redis_client = None

# --- 🔐 JWT CONFIGURATION ---
SECRET_KEY = "pune_food_super_secret"  
ALGORITHM = "HS256"

security = HTTPBearer()

# Create Tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="User & Auth Service")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# --- 🎧 KAFKA CONSUMER ---
kafka_consumer = None

def start_kafka_consumer():
    global kafka_consumer
    print("🚀 Background Kafka Consumer Started in User Service!")
    try:
        from kafka import KafkaConsumer
        from database import SessionLocal
        
        kafka_consumer = KafkaConsumer(
            'food_delivery_orders',
            bootstrap_servers=['localhost:9092'],
            value_deserializer=lambda m: json.loads(m.decode('utf-8')),
            group_id='user_service_group',
            enable_auto_commit=False
        )
        for message in kafka_consumer:
            try:
                data = message.value
                if data.get("event") == "ORDER_CANCELLED":
                    user_id = data.get("user_id")
                    refund_amount = float(data.get("refund_amount", 0.0))
                    db = SessionLocal()
                    try:
                        user = db.query(User).filter(User.id == user_id).with_for_update().first()
                        if user:
                            user.wallet_balance += refund_amount
                            db.commit()
                            print(f"💸 SUCCESS: Refunded ₹{refund_amount} to User ID {user_id}")
                    except Exception as e:
                        print(f"❌ DB Error during refund: {e}")
                        db.rollback()
                    finally:
                        db.close()
                elif data.get("event") == "MERCHANT_PAYOUT":
                    merchant_id = data.get("merchant_id")
                    payout_amount = float(data.get("amount", 0.0))
                    db = SessionLocal()
                    try:
                        merchant = db.query(User).filter(User.id == merchant_id).with_for_update().first()
                        if merchant:
                            merchant.wallet_balance += payout_amount
                            db.commit()
                            print(f"💰 SUCCESS: Transferred ₹{payout_amount} to Merchant ID {merchant_id}")
                    except Exception as e:
                        print(f"❌ DB Error during merchant payout: {e}")
                        db.rollback()
                    finally:
                        db.close()
                kafka_consumer.commit()
            except Exception as e:
                print(f"⚠️ Error processing message: {e}")
                continue
    except Exception as e:
        print(f"⚠️ Kafka Consumer Error: {e}")

@app.on_event("startup")
def startup_event():
    threading.Thread(target=start_kafka_consumer, daemon=True).start()

@app.on_event("shutdown")
def shutdown_event():
    global kafka_consumer
    if kafka_consumer:
        kafka_consumer.close()
        print("🛑 Kafka consumer closed gracefully")

# --- 🛡️ TOKEN VERIFIER ---
def verify_user_token(token: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(token.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        if redis_client and redis_client.get(f"blacklist:{payload.get('sub')}"):
            raise HTTPException(status_code=401, detail="Session revoked by Admin. Please login again.")
        payload["token"] = token.credentials
        return payload 
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expire ho gaya hai. Wapas login karo!")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Asli Token laao bhai, ye fake hai!")

# --- Helpers for Signals ---
def notify_staff_revoked(staff_id: int):
    try:
        requests.post(f"http://localhost:8003/broadcast/revoke-staff?staff_id={staff_id}", timeout=1)
    except Exception as e:
        print(f"Failed to notify order service (Revoke): {e}")

# NEW: Helper for transfer (does not ban user)
def notify_staff_transferred(staff_id: int):
    try:
        requests.post(f"http://localhost:8003/broadcast/transfer-staff?staff_id={staff_id}", timeout=1)
    except Exception as e:
        print(f"Failed to notify order service (Transfer): {e}")

# --- 🚀 AUTHENTICATION APIS ---
@app.post("/register")
def register(user: UserRegister, db: Session = Depends(get_db)):
    if user.role == RoleType.staff:
        raise HTTPException(status_code=403, detail="Security Block: Staff cannot self-register. Merchant must create staff accounts from their dashboard.")
    if not user.phone_number or user.phone_number.strip() == "":
        raise HTTPException(status_code=400, detail="Phone number blank nahi ho sakta bhai!")
    if len(user.phone_number.strip()) < 10:
        raise HTTPException(status_code=400, detail="Phone number kam se kam 10 digits ka hona chahiye!")
    existing_phone = db.query(User).filter(User.phone_number == user.phone_number.strip()).first()
    if existing_phone:
        raise HTTPException(status_code=400, detail="Phone number already registered")
    if user.role == RoleType.rider and (not user.vehicle_number or user.vehicle_number.strip() == ""):
        raise HTTPException(status_code=400, detail="Vehicle number is mandatory for Riders!")
    if user.role != RoleType.rider:
        user.vehicle_number = None
    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    bonus = 500.0 if user.role == RoleType.customer else 0.0
    hashed_password = bcrypt.hashpw(user.password.encode('utf-8'), bcrypt.gensalt())
    new_user = User(
        name=user.name, 
        email=user.email, 
        password=hashed_password.decode('utf-8'),
        role=user.role.value,  
        wallet_balance=bonus, 
        phone_number=user.phone_number.strip(),  
        vehicle_number=user.vehicle_number,
        employer_id=None
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"msg": f"{user.role.value} created successfully", "user_id": new_user.id}

@app.post("/login")
def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if not db_user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not bcrypt.checkpw(user.password.encode('utf-8'), db_user.password.encode('utf-8')):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    payload = {
        "sub": str(db_user.id),       
        "role": db_user.role,
        "employer_id": db_user.employer_id, 
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=24) 
    }
    encoded_token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    response = {
        "token": encoded_token, 
        "user_id": db_user.id, 
        "user_name": db_user.name, 
        "role": db_user.role,
        "employer_id": db_user.employer_id,
        "wallet_balance": db_user.wallet_balance
    }
    if db_user.role == "Staff" and db_user.restaurant_id:
        response["restaurant_id"] = db_user.restaurant_id
    return response

# --- 💰 PROTECTED USER APIS ---
@app.get("/users/{user_id}")
def get_user(user_id: int, db: Session = Depends(get_db), payload: dict = Depends(verify_user_token)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user: raise HTTPException(status_code=404)
    user_data = {
        "id": user.id,
        "name": user.name,
        "role": user.role,
        "employer_id": user.employer_id,
        "restaurant_id": user.restaurant_id
    }
    user_data["email"] = user.email
    user_data["phone_number"] = user.phone_number
    user_data["vehicle_number"] = user.vehicle_number
    
    if int(payload.get("sub")) == user_id:
        user_data["wallet_balance"] = user.wallet_balance
    return user_data

@app.put("/users/{user_id}/profile")
def update_user_profile(user_id: int, profile: UserProfileUpdate, db: Session = Depends(get_db), payload: dict = Depends(verify_user_token)):
    if int(payload.get("sub")) != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to edit this profile")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if profile.phone_number is not None:
        if len(profile.phone_number.strip()) < 10:
            raise HTTPException(status_code=400, detail="Invalid phone number format")
        existing = db.query(User).filter(User.phone_number == profile.phone_number.strip(), User.id != user_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Phone number already registered to another account")
        user.phone_number = profile.phone_number.strip()
        
    if profile.vehicle_number is not None and user.role == "Rider":
        user.vehicle_number = profile.vehicle_number.strip().upper()
        
    db.commit()
    return {"msg": "Profile updated successfully"}

@app.post("/users/{user_id}/wallet/topup")
def topup_wallet(user_id: int, topup: WalletUpdate, db: Session = Depends(get_db), payload: dict = Depends(verify_user_token)):
    if int(payload.get("sub")) != user_id:
        raise HTTPException(status_code=403, detail="Chori pakdi gayi! Apne hi wallet mein paise daal sakte ho!")
    if topup.amount <= 0:
        raise HTTPException(status_code=400, detail="Nice try! Amount must be strictly greater than zero.")
    user = db.query(User).filter(User.id == user_id).with_for_update().first()
    if not user: raise HTTPException(status_code=404, detail="User not found")
    user.wallet_balance += topup.amount
    db.commit()
    return {"msg": "Topup successful", "balance": user.wallet_balance}

@app.post("/users/{user_id}/wallet/deduct")
def deduct_wallet(user_id: int, deduct: WalletUpdate, db: Session = Depends(get_db), payload: dict = Depends(verify_user_token)):
    if int(payload.get("sub")) != user_id:
        raise HTTPException(status_code=403, detail="Authorization Error: Cannot access this wallet!")
    if deduct.amount <= 0:
        raise HTTPException(status_code=400, detail="Invalid deduction amount!")
    user = db.query(User).filter(User.id == user_id).with_for_update().first()
    if not user: raise HTTPException(status_code=404, detail="User not found")
    if user.wallet_balance < deduct.amount:
        raise HTTPException(status_code=400, detail="Insufficient Wallet Balance!")
    user.wallet_balance -= deduct.amount
    db.commit()
    return {"msg": "Deduction successful", "balance": user.wallet_balance}

# --- 📍 ADDRESS APIS ---
@app.post("/users/{user_id}/address")
def save_address(user_id: int, addr: AddressCreate, db: Session = Depends(get_db), payload: dict = Depends(verify_user_token)):
    if int(payload.get("sub")) != user_id:
        raise HTTPException(status_code=403, detail="Access denied!")
    existing = db.query(AddressBook).filter(AddressBook.user_id == user_id, AddressBook.address_text == addr.address).first()
    if not existing:
        new_addr = AddressBook(user_id=user_id, address_text=addr.address)
        db.add(new_addr)
        db.commit()
    return {"msg": "Address saved securely!"}

@app.get("/users/{user_id}/addresses")
def get_addresses(user_id: int, db: Session = Depends(get_db), payload: dict = Depends(verify_user_token)):
    if int(payload.get("sub")) != user_id:
        raise HTTPException(status_code=403, detail="Access denied!")
    addresses = db.query(AddressBook).filter(AddressBook.user_id == user_id).all()
    return [addr.address_text for addr in addresses]

@app.put("/users/{user_id}/address/{address_id}")
def update_address(user_id: int, address_id: int, addr: AddressCreate, db: Session = Depends(get_db), payload: dict = Depends(verify_user_token)):
    if int(payload.get("sub")) != user_id:
        raise HTTPException(status_code=403, detail="Access denied!")
    address = db.query(AddressBook).filter(AddressBook.id == address_id, AddressBook.user_id == user_id).first()
    if not address:
        raise HTTPException(status_code=404, detail="Address not found")
    address.address_text = addr.address
    db.commit()
    return {"msg": "Address updated"}

@app.delete("/users/{user_id}/address/{address_id}")
def delete_address(user_id: int, address_id: int, db: Session = Depends(get_db), payload: dict = Depends(verify_user_token)):
    if int(payload.get("sub")) != user_id:
        raise HTTPException(status_code=403, detail="Access denied!")
    address = db.query(AddressBook).filter(AddressBook.id == address_id, AddressBook.user_id == user_id).first()
    if not address:
        raise HTTPException(status_code=404, detail="Address not found")
    db.delete(address)
    db.commit()
    return {"msg": "Address deleted"}

# --- 👥 STAFF MANAGEMENT APIS ---
@app.post("/merchant/{merchant_id}/staff")
def create_merchant_staff(merchant_id: int, staff_data: StaffRegister, db: Session = Depends(get_db), payload: dict = Depends(verify_user_token)):
    if int(payload.get("sub")) != merchant_id or payload.get("role") != "Merchant":
        raise HTTPException(status_code=403, detail="Strictly restricted: Only the owning Merchant can create staff accounts.")
    existing_user = db.query(User).filter(User.email == staff_data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already linked to another account.")
    hashed_password = bcrypt.hashpw(staff_data.password.encode('utf-8'), bcrypt.gensalt())
    new_staff = User(
        name=staff_data.name,
        email=staff_data.email,
        password=hashed_password.decode('utf-8'),
        role="Staff",
        wallet_balance=0.0,
        phone_number=staff_data.phone_number.strip(),
        vehicle_number=None,
        employer_id=merchant_id,
        restaurant_id=staff_data.restaurant_id
    )
    db.add(new_staff)
    db.commit()
    db.refresh(new_staff)
    return {"msg": f"Staff account for {new_staff.name} created securely.", "staff_id": new_staff.id}

@app.get("/merchant/{merchant_id}/staff")
def get_merchant_staff(merchant_id: int, db: Session = Depends(get_db), payload: dict = Depends(verify_user_token)):
    if int(payload.get("sub")) != merchant_id or payload.get("role") != "Merchant":
        raise HTTPException(status_code=403, detail="Only the Merchant can view their staff.")
    staff_members = db.query(User).filter(User.employer_id == merchant_id, User.role == "Staff").all()
    return [{"id": s.id, "name": s.name, "email": s.email, "phone_number": s.phone_number, "restaurant_id": s.restaurant_id} for s in staff_members]

@app.put("/merchant/{merchant_id}/staff/{staff_id}")
def update_merchant_staff(merchant_id: int, staff_id: int, staff_data: StaffUpdate, db: Session = Depends(get_db), payload: dict = Depends(verify_user_token)):
    if int(payload.get("sub")) != merchant_id or payload.get("role") != "Merchant":
        raise HTTPException(status_code=403, detail="Only the Merchant can manage staff.")
    staff = db.query(User).filter(User.id == staff_id, User.employer_id == merchant_id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found.")
    
    old_restaurant_id = staff.restaurant_id

    if staff_data.name is not None:
        staff.name = staff_data.name
    if staff_data.email is not None:
        existing = db.query(User).filter(User.email == staff_data.email, User.id != staff_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already used by another user.")
        staff.email = staff_data.email
    if staff_data.password is not None:
        hashed = bcrypt.hashpw(staff_data.password.encode('utf-8'), bcrypt.gensalt())
        staff.password = hashed.decode('utf-8')
    if staff_data.phone_number is not None:
        staff.phone_number = staff_data.phone_number.strip()
    if staff_data.restaurant_id is not None:
        staff.restaurant_id = staff_data.restaurant_id
    
    db.commit()

    # THE FIX: Only notify transfer, DO NOT blacklist the token for restaurant switch
    if staff_data.restaurant_id is not None and staff_data.restaurant_id != old_restaurant_id:
        notify_staff_transferred(staff.id)

    return {"msg": f"Staff {staff.name} updated successfully."}

@app.delete("/merchant/{merchant_id}/staff/{staff_id}")
def revoke_staff_access(merchant_id: int, staff_id: int, db: Session = Depends(get_db), payload: dict = Depends(verify_user_token)):
    if int(payload.get("sub")) != merchant_id or payload.get("role") != "Merchant":
        raise HTTPException(status_code=403, detail="Only the Merchant can manage staff.")
    staff = db.query(User).filter(User.id == staff_id, User.employer_id == merchant_id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found or already revoked.")
    db.delete(staff)
    db.commit()
    # Deletion should definitely blacklist the token
    if redis_client:
        redis_client.setex(f"blacklist:{staff_id}", 86400, "revoked")
    notify_staff_revoked(staff_id)
    return {"msg": f"Access strictly revoked for {staff.name}. They can no longer access the restaurant dashboard."}