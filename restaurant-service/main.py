from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
import redis
import json
import requests
import jwt
import os
import shutil
import uuid
from datetime import datetime
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# --- IMPORTS FROM MODULAR FILES ---
from database import engine, get_db, Base
from models import Restaurant, MenuItem
from schemas import (
    RestaurantCreate, RestaurantSettingsUpdate, CapacityUpdate,
    MenuItemCreate, MenuItemUpdate
)

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

# Create Tables
Base.metadata.create_all(bind=engine)

# --- 🔴 REDIS SETUP ---
try:
    redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
    redis_client.ping()
    print("✅ Redis Cache Linked!")
except Exception:
    redis_client = None

# --- 📁 IMAGE UPLOAD ---
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# --- 🛡️ TOKEN VERIFIER ---
def verify_token(token: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(token.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        if redis_client and redis_client.get(f"blacklist:{payload.get('sub')}"):
            raise HTTPException(status_code=401, detail="Session revoked. Please login again.")
        payload["token"] = token.credentials
        return payload 
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or Expired Token")

# --- Helper to broadcast menu refresh ---
def broadcast_menu_refresh():
    try:
        requests.post("http://localhost:8003/broadcast/refresh-menu", timeout=1)
    except Exception as e:
        print(f"Failed to broadcast menu refresh: {e}")

# --- 🖼️ IMAGE UPLOAD ---
@app.post("/upload-image")
async def upload_image(file: UploadFile = File(...), payload: dict = Depends(verify_token)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(400, "Only image files allowed")
    ext = file.filename.split(".")[-1]
    filename = f"{datetime.now().timestamp()}_{uuid.uuid4().hex}.{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    image_url = f"http://localhost:8002/uploads/{filename}"
    return {"image_url": image_url}

# --- 🍽️ RESTAURANT APIS ---
@app.get("/restaurants")
def get_all_restaurants(db: Session = Depends(get_db)):
    if redis_client:
        cached = redis_client.get("all_restaurants_cache")
        if cached: return json.loads(cached)
    restaurants = db.query(Restaurant).all()
    result = []
    for r in restaurants:
        items = db.query(MenuItem).filter(MenuItem.restaurant_id == r.id).all()
        result.append({
            "id": r.id, "merchant_id": r.merchant_id, "name": r.name, 
            "address": r.address, "phone_number": r.phone_number, # ADDED
            "is_open": r.is_open, "auto_accept": r.auto_accept,
            "items": [{
                "id": i.id, "name": i.name, "price": i.price,
                "is_veg": i.is_veg, "description": i.description, "image_url": i.image_url,
                "is_available": i.is_available,
                "max_active_orders": i.max_active_orders,
                "max_queue_length": i.max_queue_length
            } for i in items]
        })
    if redis_client: redis_client.setex("all_restaurants_cache", 60, json.dumps(result))
    return result

@app.get("/restaurants/merchant/{merchant_id}")
def get_merchant_restaurants(merchant_id: int, db: Session = Depends(get_db)):
    restaurants = db.query(Restaurant).filter(Restaurant.merchant_id == merchant_id).all()
    result = []
    for r in restaurants:
        items = db.query(MenuItem).filter(MenuItem.restaurant_id == r.id).all()
        result.append({
            "id": r.id, "merchant_id": r.merchant_id, "name": r.name, 
            "address": r.address, "phone_number": r.phone_number, # ADDED
            "is_open": r.is_open, "auto_accept": r.auto_accept,
            "items": [{
                "id": i.id, "name": i.name, "price": i.price,
                "is_veg": i.is_veg, "description": i.description, "image_url": i.image_url,
                "is_available": i.is_available,
                "max_active_orders": i.max_active_orders,
                "max_queue_length": i.max_queue_length
            } for i in items]
        })
    return result

@app.get("/restaurants/{restaurant_id}")
def get_restaurant(restaurant_id: int, db: Session = Depends(get_db)):
    restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    items = db.query(MenuItem).filter(MenuItem.restaurant_id == restaurant_id).all()
    return {
        "id": restaurant.id,
        "merchant_id": restaurant.merchant_id,
        "name": restaurant.name,
        "address": restaurant.address,
        "phone_number": restaurant.phone_number, # ADDED
        "is_open": restaurant.is_open,
        "auto_accept": restaurant.auto_accept,
        "items": [{
            "id": i.id, "name": i.name, "price": i.price,
            "is_veg": i.is_veg, "description": i.description,
            "image_url": i.image_url, "is_available": i.is_available,
            "max_active_orders": i.max_active_orders,
            "max_queue_length": i.max_queue_length
        } for i in items]
    }

# --- CAPACITY ENDPOINTS ---
@app.get("/restaurants/{restaurant_id}/capacity")
def get_restaurant_capacity(restaurant_id: int, db: Session = Depends(get_db)):
    restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    active_count = 0
    queue_length = 0
    if redis_client:
        active_key = f"res:{restaurant_id}:active_count"
        queue_key = f"res:{restaurant_id}:queue"
        active_count = int(redis_client.get(active_key) or 0)
        queue_length = redis_client.llen(queue_key)
    return {
        "max_active_orders": restaurant.max_active_orders,
        "max_queue_length": restaurant.max_queue_length,
        "current_active_count": active_count,
        "current_queue_length": queue_length
    }

@app.put("/restaurants/{restaurant_id}/capacity")
def update_restaurant_capacity(restaurant_id: int, capacity: CapacityUpdate, db: Session = Depends(get_db), payload: dict = Depends(verify_token)):
    restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    if int(payload.get("sub")) != restaurant.merchant_id:
        raise HTTPException(status_code=403, detail="Not authorized to update capacity.")
    if capacity.max_active_orders is not None:
        if capacity.max_active_orders < 1:
            raise HTTPException(status_code=400, detail="max_active_orders must be at least 1")
        restaurant.max_active_orders = capacity.max_active_orders
    if capacity.max_queue_length is not None:
        if capacity.max_queue_length < 0:
            raise HTTPException(status_code=400, detail="max_queue_length cannot be negative")
        restaurant.max_queue_length = capacity.max_queue_length
    db.commit()
    broadcast_menu_refresh()
    return {"msg": "Capacity updated", "max_active_orders": restaurant.max_active_orders, "max_queue_length": restaurant.max_queue_length}

# --- PER‑ITEM CAPACITY ENDPOINTS ---
@app.get("/restaurants/items/{item_id}/capacity")
def get_item_capacity(item_id: int, db: Session = Depends(get_db)):
    item = db.query(MenuItem).filter(MenuItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    active_count = 0
    queue_length = 0
    if redis_client:
        active_key = f"item:{item_id}:active_count"
        queue_key = f"item:{item_id}:queue_count"
        active_count = int(redis_client.get(active_key) or 0)
        queue_length = int(redis_client.get(queue_key) or 0)
    return {
        "max_active_orders": item.max_active_orders,
        "max_queue_length": item.max_queue_length,
        "current_active_count": active_count,
        "current_queue_length": queue_length,
        "is_available": item.is_available
    }

@app.put("/restaurants/items/{item_id}/capacity")
def update_item_capacity(item_id: int, capacity: CapacityUpdate, db: Session = Depends(get_db), payload: dict = Depends(verify_token)):
    item = db.query(MenuItem).filter(MenuItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    restaurant = db.query(Restaurant).filter(Restaurant.id == item.restaurant_id).first()
    if int(payload.get("sub")) != restaurant.merchant_id:
        raise HTTPException(status_code=403, detail="Only the merchant can update item capacity.")
    if capacity.max_active_orders is not None:
        if capacity.max_active_orders < 1:
            raise HTTPException(status_code=400, detail="max_active_orders must be at least 1")
        item.max_active_orders = capacity.max_active_orders
    if capacity.max_queue_length is not None:
        if capacity.max_queue_length < 0:
            raise HTTPException(status_code=400, detail="max_queue_length cannot be negative")
        item.max_queue_length = capacity.max_queue_length
    db.commit()
    broadcast_menu_refresh()
    return {"msg": "Item capacity updated", "max_active_orders": item.max_active_orders, "max_queue_length": item.max_queue_length}

# --- RESTAURANT CREATE & SETTINGS ---
@app.post("/restaurants")
def create_restaurant(rest: RestaurantCreate, db: Session = Depends(get_db), payload: dict = Depends(verify_token)):
    if int(payload.get("sub")) != rest.merchant_id:
        raise HTTPException(403, "Merchant verification failed")
    if not rest.name or rest.name.strip() in ["", "string"]:
        raise HTTPException(400, "Name required")
    cache_key = f"verified_merchant_{rest.merchant_id}"
    is_verified = False
    if redis_client and redis_client.get(cache_key) == "true":
        is_verified = True
    if not is_verified:
        try:
            user_service_url = f"http://localhost:8001/users/{rest.merchant_id}"
            headers = {"Authorization": f"Bearer {payload['token']}"}
            response = requests.get(user_service_url, headers=headers, timeout=2)
            if response.status_code == 200:
                user_data = response.json()
                if user_data.get("role") == "Merchant":
                    is_verified = True
                    if redis_client: redis_client.setex(cache_key, 86400, "true")
                else:
                    raise HTTPException(400, "Not a Merchant")
            else:
                raise HTTPException(400, "Merchant verification failed")
        except requests.exceptions.RequestException:
            raise HTTPException(503, "User Service down & No cache")
            
    new_rest = Restaurant(
        merchant_id=rest.merchant_id, 
        name=rest.name, 
        address=rest.address, 
        phone_number=rest.phone_number, # ADDED
        is_open=True, 
        auto_accept=False
    )
    db.add(new_rest)
    db.commit()
    db.refresh(new_rest)
    if redis_client: 
        redis_client.delete("all_restaurants_cache")
        redis_client.set(f"res:{new_rest.id}:auto_accept", "false")
    broadcast_menu_refresh()
    return new_rest

@app.patch("/restaurants/{restaurant_id}/settings")
def update_restaurant_settings(restaurant_id: int, settings: RestaurantSettingsUpdate, db: Session = Depends(get_db), payload: dict = Depends(verify_token)):
    restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    if not restaurant:
        raise HTTPException(404, "Restaurant not found")
    user_role = payload.get("role")
    user_id = int(payload.get("sub"))
    employer_id = payload.get("employer_id")
    
    is_authorized = False
    if user_role == "Merchant" and user_id == restaurant.merchant_id:
        is_authorized = True
    elif user_role == "Staff" and employer_id == restaurant.merchant_id:
        is_authorized = True
        
    if not is_authorized:
        raise HTTPException(403, "Not authorized to update settings for this restaurant")
        
    changed = False
    if settings.is_open is not None:
        restaurant.is_open = settings.is_open
        changed = True
    if settings.auto_accept is not None:
        restaurant.auto_accept = settings.auto_accept
        if redis_client:
            redis_client.set(f"res:{restaurant_id}:auto_accept", "true" if settings.auto_accept else "false")
        changed = True
        
    # NEW EDIT LOGIC (Address & Phone strictly by Merchant)
    if settings.address is not None or settings.phone_number is not None:
        if user_role != "Merchant":
            raise HTTPException(403, "Only the Merchant can update restaurant profile details")
        if settings.address is not None:
            restaurant.address = settings.address.strip()
            changed = True
        if settings.phone_number is not None:
            restaurant.phone_number = settings.phone_number.strip()
            changed = True
            
    db.commit()
    if redis_client:
        redis_client.delete("all_restaurants_cache")
    if changed:
        broadcast_menu_refresh()
    return {
        "msg": "Settings updated", 
        "is_open": restaurant.is_open, 
        "auto_accept": restaurant.auto_accept,
        "address": restaurant.address,
        "phone_number": restaurant.phone_number
    }

# --- 🍔 MENU APIS ---
@app.post("/restaurants/{restaurant_id}/menu")
def add_menu_item(restaurant_id: int, item: MenuItemCreate, db: Session = Depends(get_db), payload: dict = Depends(verify_token)):
    res = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    if not res:
        raise HTTPException(404, "Restaurant not found")
    if item.price <= 0:
        raise HTTPException(400, "Price must be > 0")
    if int(payload.get("sub")) != res.merchant_id:
        raise HTTPException(403, "Not your restaurant")
    new_item = MenuItem(
        restaurant_id=restaurant_id, name=item.name.strip(), price=item.price,
        description=item.description, image_url=item.image_url, is_veg=item.is_veg,
        is_available=item.is_available,
        max_active_orders=None, max_queue_length=None
    )
    db.add(new_item)
    db.commit()
    if redis_client:
        redis_client.delete(f"menu_{restaurant_id}")
        redis_client.delete("all_restaurants_cache")
    broadcast_menu_refresh()
    return new_item

@app.get("/restaurants/{restaurant_id}/menu")
def get_menu(restaurant_id: int, db: Session = Depends(get_db)):
    res_exists = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    if not res_exists:
        raise HTTPException(404, "Restaurant not found")
    cache_key = f"menu_{restaurant_id}"
    if redis_client:
        cached = redis_client.get(cache_key)
        if cached: return json.loads(cached)
    items = db.query(MenuItem).filter(MenuItem.restaurant_id == restaurant_id).all()
    menu_data = [{
        "id": i.id, "name": i.name, "price": i.price,
        "description": i.description, "is_veg": i.is_veg,
        "image_url": i.image_url, "is_available": i.is_available,
        "max_active_orders": i.max_active_orders,
        "max_queue_length": i.max_queue_length
    } for i in items]
    if redis_client: redis_client.setex(cache_key, 60, json.dumps(menu_data))
    return menu_data

@app.put("/restaurants/items/{item_id}")
def update_menu_item(item_id: int, item_data: MenuItemUpdate, db: Session = Depends(get_db), payload: dict = Depends(verify_token)):
    db_item = db.query(MenuItem).filter(MenuItem.id == item_id).first()
    if not db_item:
        raise HTTPException(404, "Item not found")
    res = db.query(Restaurant).filter(Restaurant.id == db_item.restaurant_id).first()
    user_role = payload.get("role")
    user_id = int(payload.get("sub"))
    employer_id = payload.get("employer_id")
    if not (user_id == res.merchant_id or (user_role == "Staff" and employer_id == res.merchant_id)):
        raise HTTPException(403, "Unauthorized")
    if item_data.price is not None:
        if item_data.price <= 0:
            raise HTTPException(400, "Invalid price")
        db_item.price = item_data.price
    if item_data.name and item_data.name.strip() not in ["", "string"]:
        db_item.name = item_data.name.strip()
    if item_data.description is not None:
        db_item.description = item_data.description.strip()
    if item_data.is_veg is not None:
        db_item.is_veg = item_data.is_veg
    if item_data.is_available is not None:
        db_item.is_available = item_data.is_available
    if item_data.image_url is not None:
        db_item.image_url = item_data.image_url
    if item_data.max_active_orders is not None:
        db_item.max_active_orders = item_data.max_active_orders
    if item_data.max_queue_length is not None:
        db_item.max_queue_length = item_data.max_queue_length
    db.commit()
    if redis_client:
        redis_client.delete(f"menu_{db_item.restaurant_id}")
        redis_client.delete("all_restaurants_cache")
    broadcast_menu_refresh()
    return {"msg": "Updated"}

@app.delete("/restaurants/items/{item_id}")
def delete_menu_item(item_id: int, db: Session = Depends(get_db), payload: dict = Depends(verify_token)):
    db_item = db.query(MenuItem).filter(MenuItem.id == item_id).first()
    if not db_item:
        raise HTTPException(404, "Item not found")
    res = db.query(Restaurant).filter(Restaurant.id == db_item.restaurant_id).first()
    if int(payload.get("sub")) != res.merchant_id:
        raise HTTPException(403, "Unauthorized delete")
    db.delete(db_item)
    db.commit()
    if redis_client:
        redis_client.delete(f"menu_{db_item.restaurant_id}")
        redis_client.delete("all_restaurants_cache")
    broadcast_menu_refresh()
    return {"msg": "Deleted"}