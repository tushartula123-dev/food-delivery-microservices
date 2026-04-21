from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from pydantic import BaseModel
import redis
import json
import requests
import jwt 

from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# --- 🚀 FASTAPI APP SETUP ---
app = FastAPI(title="Independent Restaurant Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

security = HTTPBearer()
SECRET_KEY = "pune_food_super_secret"  
ALGORITHM = "HS256"

# --- 🐘 DATABASE SETUP ---
SQLALCHEMY_DATABASE_URL = "postgresql://postgres:1234@localhost:5433/restaurant_db"
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# --- 🔴 REDIS SETUP (For Speed & Fallback) ---
try:
    redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
    redis_client.ping()
    print("✅ Redis Cache Linked!")
except Exception:
    redis_client = None

def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()

# --- 🛡️ TOKEN VERIFIER ---
def verify_token(token: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(token.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        return payload 
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or Expired Token")

# --- 🗄️ MODELS ---
class Restaurant(Base):
    __tablename__ = "restaurants"
    id = Column(Integer, primary_key=True, index=True)
    merchant_id = Column(Integer, index=True)
    name = Column(String, index=True)
    address = Column(String)

class MenuItem(Base):
    __tablename__ = "menu_items"
    id = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(Integer, index=True)
    name = Column(String)
    price = Column(Float)
    description = Column(String, nullable=True)
    is_available = Column(Boolean, default=True)

Base.metadata.create_all(bind=engine)

# --- 📝 SCHEMAS ---
class RestaurantCreate(BaseModel):
    merchant_id: int
    name: str
    address: str

class MenuItemCreate(BaseModel):
    name: str
    price: float
    description: str | None = None
    is_available: bool = True

class MenuItemUpdate(BaseModel):
    name: str | None = None
    price: float | None = None
    is_veg: bool | None = None

# --- 🍽️ RESTAURANT APIS (The Core) ---

@app.get("/restaurants")
def get_all_restaurants(db: Session = Depends(get_db)):
    # 🟢 Ye API kabhi Port 8001 ko call nahi karegi (Pure Independence)
    restaurants = db.query(Restaurant).all()
    result = []
    for r in restaurants:
        items = db.query(MenuItem).filter(MenuItem.restaurant_id == r.id).all()
        result.append({
            "id": r.id, "merchant_id": r.merchant_id, "name": r.name, "address": r.address,
            "items": [{"id": i.id, "name": i.name, "price": i.price, "is_veg": i.description == "Veg"} for i in items]
        })
    return result

@app.get("/restaurants/merchant/{merchant_id}")
def get_merchant_restaurants(merchant_id: int, db: Session = Depends(get_db)):
    # 🟢 Merchant apna data hamesha dekh payega, bhale hi User Service down ho.
    restaurants = db.query(Restaurant).filter(Restaurant.merchant_id == merchant_id).all()
    result = []
    for r in restaurants:
        items = db.query(MenuItem).filter(MenuItem.restaurant_id == r.id).all()
        result.append({
            "id": r.id, "merchant_id": r.merchant_id, "name": r.name, "address": r.address,
            "items": [{"id": i.id, "name": i.name, "price": i.price, "is_veg": i.description == "Veg"} for i in items]
        })
    return result

@app.post("/restaurants")
def create_restaurant(rest: RestaurantCreate, db: Session = Depends(get_db), token: HTTPAuthorizationCredentials = Depends(security)):
    if not rest.name or rest.name.strip() in ["", "string"]:
        raise HTTPException(status_code=400, detail="Name required!")
    
    # 🛡️ SMART FALLBACK CHECK
    cache_key = f"verified_merchant_{rest.merchant_id}"
    is_verified = False

    if redis_client and redis_client.get(cache_key) == "true":
        is_verified = True
        print("🚀 Verified via Redis (Independent Mode)")

    if not is_verified:
        try:
            # Sirf tabhi call karenge jab Redis khali ho
            user_service_url = f"http://localhost:8001/users/{rest.merchant_id}"
            headers = {"Authorization": f"Bearer {token.credentials}"}
            response = requests.get(user_service_url, headers=headers, timeout=2) # 2 sec timeout
            
            if response.status_code == 200:
                user_data = response.json()
                if user_data.get("role") == "Merchant":
                    is_verified = True
                    if redis_client: redis_client.setex(cache_key, 86400, "true")
                else:
                    raise HTTPException(status_code=400, detail="Not a Merchant!")
            else:
                raise HTTPException(status_code=400, detail="Merchant verification failed.")
        except requests.exceptions.RequestException:
            # 🚨 Agar User Service down hai aur Redis mein bhi nahi hai
            raise HTTPException(status_code=503, detail="User Service is down & No cache found. Try later.")

    new_rest = Restaurant(merchant_id=rest.merchant_id, name=rest.name, address=rest.address)
    db.add(new_rest)
    db.commit()
    db.refresh(new_rest)
    return new_rest

# --- 🍔 MENU APIS (Smart & Secure) ---

@app.post("/restaurants/{restaurant_id}/menu")
def add_menu_item(restaurant_id: int, item: MenuItemCreate, db: Session = Depends(get_db), payload: dict = Depends(verify_token)):
    res = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    if not res: raise HTTPException(status_code=404, detail="Restaurant not found")
    if int(payload.get("sub")) != res.merchant_id:
        raise HTTPException(status_code=403, detail="Not your restaurant!")

    new_item = MenuItem(restaurant_id=restaurant_id, name=item.name.strip(), price=item.price, description=item.description)
    db.add(new_item)
    db.commit()
    if redis_client: redis_client.delete(f"menu_{restaurant_id}")
    return new_item

@app.get("/restaurants/{restaurant_id}/menu")
def get_menu(restaurant_id: int, db: Session = Depends(get_db)):
    cache_key = f"menu_{restaurant_id}"
    if redis_client:
        cached = redis_client.get(cache_key)
        if cached: return json.loads(cached)

    items = db.query(MenuItem).filter(MenuItem.restaurant_id == restaurant_id).all()
    menu_data = [{"id": i.id, "name": i.name, "price": i.price, "description": i.description, "is_veg": i.description == "Veg"} for i in items]
    if redis_client: redis_client.setex(cache_key, 60, json.dumps(menu_data))
    return menu_data

@app.put("/restaurants/items/{item_id}")
def update_menu_item(item_id: int, item_data: MenuItemUpdate, db: Session = Depends(get_db), payload: dict = Depends(verify_token)):
    db_item = db.query(MenuItem).filter(MenuItem.id == item_id).first()
    if not db_item: raise HTTPException(status_code=404, detail="Item not found")
        
    res = db.query(Restaurant).filter(Restaurant.id == db_item.restaurant_id).first()
    if int(payload.get("sub")) != res.merchant_id:
        raise HTTPException(status_code=403, detail="Unauthorized!")

    # 🔥 SMART UPDATE
    if item_data.name and item_data.name.strip() not in ["", "string"]:
        db_item.name = item_data.name.strip()
    if item_data.price and item_data.price > 0:
        db_item.price = item_data.price
    if item_data.is_veg is not None:
        db_item.description = "Veg" if item_data.is_veg else "Non-Veg"
        
    db.commit()
    if redis_client: redis_client.delete(f"menu_{db_item.restaurant_id}")
    return {"msg": "Updated successfully"}

@app.delete("/restaurants/items/{item_id}")
def delete_menu_item(item_id: int, db: Session = Depends(get_db), payload: dict = Depends(verify_token)):
    db_item = db.query(MenuItem).filter(MenuItem.id == item_id).first()
    if not db_item: raise HTTPException(status_code=404, detail="Item not found")
        
    res = db_item.restaurant_id
    parent_res = db.query(Restaurant).filter(Restaurant.id == res).first()
    if int(payload.get("sub")) != parent_res.merchant_id:
        raise HTTPException(status_code=403, detail="Unauthorized delete!")
    
    db.delete(db_item)
    db.commit()
    if redis_client: redis_client.delete(f"menu_{res}")
    return {"msg": "Deleted by owner"}

@app.delete("/reset-database")
def reset_database(db: Session = Depends(get_db)):
    db.query(MenuItem).delete()
    db.query(Restaurant).delete()
    db.commit()
    if redis_client: redis_client.flushdb()
    return {"message": "Database Reset!"}