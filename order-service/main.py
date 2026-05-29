from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from pydantic import BaseModel
from datetime import datetime
import json
import requests
from kafka import KafkaProducer
from typing import Dict, List, Optional
import random
import redis
import asyncio
import jwt
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# --- 🚀 FASTAPI APP SETUP ---
app = FastAPI(title="Order Service")

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
SQLALCHEMY_DATABASE_URL = "postgresql://postgres:1234@localhost:5432/order_db"
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- 🗄️ DATABASE MODELS ---
class Order(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    restaurant_id = Column(Integer, index=True)
    merchant_id = Column(Integer, index=True)
    rider_id = Column(Integer, index=True, nullable=True)
    total_amount = Column(Float)
    status = Column(String, default="Pending_Acceptance")
    address = Column(String, nullable=True)
    items_summary = Column(String, nullable=True) 
    special_instructions = Column(String, nullable=True) 
    payment_method = Column(String, default="Wallet") 
    created_at = Column(DateTime, default=datetime.utcnow)

class OrderItem(Base):
    __tablename__ = "order_items"
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    menu_item_id = Column(Integer, index=True)
    quantity = Column(Integer, default=1)

Base.metadata.create_all(bind=engine)

# --- 📝 SCHEMAS ---
class CartItemInput(BaseModel):
    item_id: int
    quantity: int

class OrderCreatePayload(BaseModel):
    user_id: int
    restaurant_id: int
    merchant_id: int
    total_amount: float
    address: str
    items_summary: str = "Standard Meal"
    special_instructions: str = ""
    payment_method: str = "Wallet"
    item_ids: List[int] = []
    cart_items: List[CartItemInput] = [] # Proper Quantity Support

# --- 📡 WEBSOCKET MANAGER ---
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, channel: str):
        await websocket.accept()
        if channel not in self.active_connections:
            self.active_connections[channel] = []
        self.active_connections[channel].append(websocket)

    def disconnect(self, websocket: WebSocket, channel: str):
        if channel in self.active_connections:
            self.active_connections[channel].remove(websocket)

    async def broadcast(self, message: str, channel: str):
        if channel in self.active_connections:
            for connection in self.active_connections[channel]:
                try:
                    await connection.send_text(message)
                except Exception:
                    pass

manager = ConnectionManager()

# --- 🔴 REDIS SETUP ---
try:
    redis_client = redis.Redis(host='localhost', port=6379, decode_responses=True)
    redis_client.ping()
    print("✅ Redis connected in Order Service")
except Exception as e:
    print(f"⚠️ Redis not available: {e}")
    redis_client = None

# --- 📦 KAFKA PRODUCER ---
try:
    producer = KafkaProducer(
        bootstrap_servers=['localhost:9092'],
        value_serializer=lambda v: json.dumps(v).encode('utf-8')
    )
except Exception as e:
    producer = None

# --- 🔐 OTP HELPER FUNCTIONS ---
def generate_otp() -> str:
    return f"{random.randint(1000, 9999)}"

def store_delivery_otp(order_id: int, otp: str, ttl_seconds: int = 600):
    if redis_client:
        redis_client.setex(f"otp:delivery:{order_id}", ttl_seconds, otp)
        redis_client.setex(f"otp:resend_count:{order_id}", ttl_seconds, 0)

def get_delivery_otp(order_id: int):
    return redis_client.get(f"otp:delivery:{order_id}") if redis_client else None

def delete_delivery_otp(order_id: int):
    if redis_client:
        redis_client.delete(f"otp:delivery:{order_id}")
        redis_client.delete(f"otp:resend_count:{order_id}")

def store_pickup_otp(order_id: int, otp: str, ttl_seconds: int = 600):
    if redis_client:
        redis_client.setex(f"otp:pickup:{order_id}", ttl_seconds, otp)

def get_pickup_otp(order_id: int):
    return redis_client.get(f"otp:pickup:{order_id}") if redis_client else None

def delete_pickup_otp(order_id: int):
    if redis_client:
        redis_client.delete(f"otp:pickup:{order_id}")

# --- 🚦 UNIFIED QUEUE & LIMIT HELPERS (QUANTITY AWARE) ---
def get_restaurant_limits(res_id: int):
    try:
        resp = requests.get(f"http://localhost:8002/restaurants/{res_id}/capacity", timeout=2)
        if resp.status_code == 200:
            data = resp.json()
            return data.get("max_active_orders", 10), data.get("max_queue_length", 5)
    except:
        pass
    return 10, 5

def get_item_capacity(item_id: int):
    try:
        resp = requests.get(f"http://localhost:8002/restaurants/items/{item_id}/capacity", timeout=2)
        if resp.status_code == 200:
            data = resp.json()
            return data.get("max_active_orders"), data.get("max_queue_length")
    except:
        pass
    return None, None

def check_availability_for_new_order(item_counts: dict):
    """Checks if items have space in their ACTIVE + QUEUE limits, strictly checking requested quantity"""
    item_errors = []
    if not redis_client: return item_errors
    
    for item_id, req_qty in item_counts.items():
        max_act, max_q = get_item_capacity(item_id)
        if max_act is not None:
            act = int(redis_client.get(f"item:{item_id}:active_count") or 0)
            q_cnt = int(redis_client.get(f"item:{item_id}:queue_count") or 0)
            total_allowed = max_act + (max_q or 0)
            if (act + q_cnt + req_qty) > total_allowed:
                available_now = max(0, total_allowed - (act + q_cnt))
                item_errors.append(f"Not enough capacity for Item #{item_id}. You requested {req_qty}, but only {available_now} slots are open.")
    return item_errors

def release_active_slots(restaurant_id: int, order_id: int, db: Session):
    """Releases ACTIVE slots scaling by quantity"""
    if not redis_client: return
    active_key = f"res:{restaurant_id}:active_count"
    current_active = int(redis_client.get(active_key) or 0)
    if current_active > 0:
        redis_client.decr(active_key) # Restaurant tracks Orders, so decrement by 1
    
    order_items = db.query(OrderItem).filter(OrderItem.order_id == order_id).all()
    for oi in order_items:
        item_active_key = f"item:{oi.menu_item_id}:active_count"
        curr_item_act = int(redis_client.get(item_active_key) or 0)
        if curr_item_act >= oi.quantity:
            redis_client.decrby(item_active_key, oi.quantity)
        else:
            redis_client.set(item_active_key, 0) # Fallback safety
    
    # Try to promote the queue now that space is free
    promote_restaurant_queue(restaurant_id, db)

def release_queue_slots(restaurant_id: int, order_id: int, db: Session):
    """Releases QUEUE slots cleanly scaling by quantity"""
    if not redis_client: return
    queue_key = f"res:{restaurant_id}:queue"
    redis_client.lrem(queue_key, 0, order_id)
    
    order_items = db.query(OrderItem).filter(OrderItem.order_id == order_id).all()
    for oi in order_items:
        item_q_key = f"item:{oi.menu_item_id}:queue_count"
        curr_item_q = int(redis_client.get(item_q_key) or 0)
        if curr_item_q >= oi.quantity:
            redis_client.decrby(item_q_key, oi.quantity)
        else:
            redis_client.set(item_q_key, 0)

def promote_restaurant_queue(restaurant_id: int, db: Session):
    """Promotes order from queue only if BOTH restaurant and ALL items have required slots"""
    if not redis_client: return
    queue_key = f"res:{restaurant_id}:queue"
    active_key = f"res:{restaurant_id}:active_count"
    max_active, _ = get_restaurant_limits(restaurant_id)

    while (int(redis_client.get(active_key) or 0)) < max_active:
        next_order_id_bytes = redis_client.lindex(queue_key, 0)
        if not next_order_id_bytes:
            break # Queue is empty
        
        order_id = int(next_order_id_bytes)
        order = db.query(Order).filter(Order.id == order_id).first()
        if not order or order.status != "Queued":
            redis_client.lpop(queue_key) # Clean ghost orders
            continue

        order_items = db.query(OrderItem).filter(OrderItem.order_id == order.id).all()
        
        # Check if requested quantities for ALL items fit in the active slots
        can_accept = True
        for oi in order_items:
            max_act, _ = get_item_capacity(oi.menu_item_id)
            if max_act is not None:
                act = int(redis_client.get(f"item:{oi.menu_item_id}:active_count") or 0)
                if (act + oi.quantity) > max_act:
                    can_accept = False
                    break
        
        if not can_accept:
            break # Block queue processing until dish station is fully free

        # Everything is clear, PROMOTE!
        redis_client.lpop(queue_key)
        redis_client.incr(active_key)
        
        for oi in order_items:
            item_q_key = f"item:{oi.menu_item_id}:queue_count"
            curr_q = int(redis_client.get(item_q_key) or 0)
            if curr_q >= oi.quantity:
                redis_client.decrby(item_q_key, oi.quantity)
            else:
                redis_client.set(item_q_key, 0)
                
            redis_client.incrby(f"item:{oi.menu_item_id}:active_count", oi.quantity)
        
        is_auto_accept = redis_client.get(f"res:{restaurant_id}:auto_accept") == "true"
        order.status = "Preparing" if is_auto_accept else "Pending_Acceptance"
        db.commit()

        asyncio.create_task(manager.broadcast(f"🛎️ Order #{order.id} moved from queue! Accept now.", f"merchant_{restaurant_id}"))
        asyncio.create_task(manager.broadcast(f"✨ Your order #{order.id} is now being reviewed by the restaurant!", f"customer_{order.user_id}"))

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

# --- 🛒 WEBSOCKET ENDPOINT ---
@app.websocket("/ws/{channel}")
async def websocket_endpoint(websocket: WebSocket, channel: str):
    await manager.connect(websocket, channel)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, channel)

# --- 🆕 BROADCAST REVOKE STAFF ---
@app.post("/broadcast/revoke-staff")
async def broadcast_revoke_staff(staff_id: int):
    await manager.broadcast("STAFF_REVOKED", f"staff_{staff_id}")
    return {"ok": True}

# --- 🆕 BROADCAST REFRESH MENU ---
@app.post("/broadcast/refresh-menu")
async def broadcast_refresh_menu():
    await manager.broadcast("REFRESH_MENU", "menu_update")
    return {"ok": True}

# --- 🆕 CREATE ORDER ---
@app.post("/orders")
async def create_order(order: OrderCreatePayload, request: Request, db: Session = Depends(get_db), payload: dict = Depends(verify_token)):
    if not redis_client:
        raise HTTPException(status_code=503, detail="Redis unavailable, ordering paused.")
    idempotency_key = request.headers.get("X-Idempotency-Key")
    if idempotency_key:
        if redis_client.get(f"idempotent:{idempotency_key}"):
            raise HTTPException(status_code=409, detail="Duplicate request detected")
        redis_client.setex(f"idempotent:{idempotency_key}", 300, "1")
    if int(payload.get("sub")) != order.user_id:
        raise HTTPException(status_code=403, detail="Token user mismatch")
    
    # Calculate accurate Item Counts based on Quantity
    item_counts = {}
    if order.cart_items:
        for ci in order.cart_items:
            item_counts[ci.item_id] = item_counts.get(ci.item_id, 0) + ci.quantity
    else:
        # Fallback if frontend cart_items is missing
        for item_id in order.item_ids:
            item_counts[item_id] = item_counts.get(item_id, 0) + 1

    res_id = order.restaurant_id
    active_key = f"res:{res_id}:active_count"
    queue_key = f"res:{res_id}:queue"
    max_active, max_queue = get_restaurant_limits(res_id)
    active_count = int(redis_client.get(active_key) or 0)
    queue_count = redis_client.llen(queue_key)
    
    # 1. Reject if restaurant itself is completely full
    if active_count >= max_active and queue_count >= max_queue:
        raise HTTPException(status_code=429, detail="Restaurant is experiencing high volume. Cannot accept orders right now.")
    
    # 2. Reject if any item is out of stock considering requested quantities
    item_errors = check_availability_for_new_order(item_counts)
    if item_errors:
        raise HTTPException(status_code=400, detail="; ".join(item_errors))
    
    # 3. Determine if this order should go to Queue
    is_queued = False
    if active_count >= max_active:
        is_queued = True
    else:
        # Check if all quantities fit in the currently active slots for the items
        for item_id, req_qty in item_counts.items():
            max_act, _ = get_item_capacity(item_id)
            if max_act is not None:
                act = int(redis_client.get(f"item:{item_id}:active_count") or 0)
                if (act + req_qty) > max_act:
                    is_queued = True
                    break
    
    is_auto_accept = redis_client.get(f"res:{res_id}:auto_accept") == "true"
    initial_status = "Queued" if is_queued else ("Preparing" if is_auto_accept else "Pending_Acceptance")
    
    if order.payment_method == "Wallet":
        deduct_url = f"http://localhost:8001/users/{order.user_id}/wallet/deduct"
        deduct_resp = requests.post(deduct_url, json={"amount": order.total_amount}, headers={"Authorization": f"Bearer {payload['token']}"}, timeout=5)
        if deduct_resp.status_code != 200:
            raise HTTPException(status_code=400, detail="Wallet deduction failed")
    
    try:
        new_order = Order(
            user_id=order.user_id,
            restaurant_id=order.restaurant_id,
            merchant_id=order.merchant_id,
            total_amount=order.total_amount,
            address=order.address,
            items_summary=order.items_summary,
            special_instructions=order.special_instructions,
            payment_method=order.payment_method,
            status=initial_status
        )
        db.add(new_order)
        db.flush()
        for item_id, qty in item_counts.items():
            db.add(OrderItem(order_id=new_order.id, menu_item_id=item_id, quantity=qty))
        db.commit()
        db.refresh(new_order)
    except Exception as e:
        if order.payment_method == "Wallet":
            try:
                requests.post(
                    f"http://localhost:8001/users/{order.user_id}/wallet/topup",
                    json={"amount": order.total_amount},
                    headers={"Authorization": f"Bearer {payload['token']}"},
                    timeout=5
                )
            except Exception:
                pass
        raise HTTPException(status_code=500, detail=f"Order creation failed: {str(e)}")
    
    if order.address and order.user_id:
        try:
            requests.post(
                f"http://localhost:8001/users/{order.user_id}/address",
                json={"address": order.address},
                headers={"Authorization": f"Bearer {payload['token']}"},
                timeout=2
            )
        except Exception:
            pass
    
    delivery_otp = generate_otp()
    store_delivery_otp(new_order.id, delivery_otp)
    
    # Safely apply updates to Redis tracking correctly by quantity
    if initial_status == "Queued":
        redis_client.rpush(queue_key, new_order.id)
        for item_id, qty in item_counts.items():
            if get_item_capacity(item_id)[0] is not None:
                redis_client.incrby(f"item:{item_id}:queue_count", qty)
        await manager.broadcast(f"⏳ Order #{new_order.id} is queued. Waiting for kitchen space.", f"customer_{order.user_id}")
    elif initial_status == "Preparing":
        redis_client.incr(active_key)
        for item_id, qty in item_counts.items():
            if get_item_capacity(item_id)[0] is not None:
                redis_client.incrby(f"item:{item_id}:active_count", qty)
        await manager.broadcast(f"👨‍🍳 Auto-Accepted New Order #{new_order.id}! Start preparing.", f"merchant_{res_id}")
    else:
        redis_client.incr(active_key)
        for item_id, qty in item_counts.items():
            if get_item_capacity(item_id)[0] is not None:
                redis_client.incrby(f"item:{item_id}:active_count", qty)
        await manager.broadcast(f"🛎️ New Order #{new_order.id} received!", f"merchant_{res_id}")
    
    if producer:
        producer.send('food_delivery_orders', {
            "event": "ORDER_PLACED",
            "order_id": new_order.id,
            "restaurant_id": new_order.restaurant_id,
            "amount": new_order.total_amount,
            "address": new_order.address,
            "delivery_otp": delivery_otp
        })
    
    await manager.broadcast(f"🔐 Your delivery OTP for order #{new_order.id}: {delivery_otp}", f"customer_{order.user_id}")
    return new_order

# --- ❌ CANCEL ORDER ---
@app.patch("/orders/{order_id}/cancel")
async def cancel_order(order_id: int, user_id: int, db: Session = Depends(get_db), payload: dict = Depends(verify_token)):
    if int(payload.get("sub")) != user_id:
        raise HTTPException(status_code=403, detail="Token user mismatch")
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order or order.user_id != user_id:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status not in ["Queued", "Pending_Acceptance"]:
        raise HTTPException(status_code=400, detail="Cannot cancel order once preparation starts.")
    
    old_status = order.status
    order.status = "Cancelled"
    db.commit()
    res_id = order.restaurant_id
    
    if old_status == "Queued":
        release_queue_slots(res_id, order.id, db)
    elif old_status == "Pending_Acceptance":
        release_active_slots(res_id, order.id, db)

    if order.payment_method == "Wallet" and producer:
        producer.send('food_delivery_orders', {
            "event": "ORDER_CANCELLED",
            "order_id": order.id,
            "user_id": order.user_id,
            "refund_amount": order.total_amount
        })
    await manager.broadcast(f"🚫 Order #{order.id} cancelled.", f"customer_{order.user_id}")
    await manager.broadcast("REFRESH_DATA", f"merchant_{res_id}")
    return {"msg": "Order cancelled successfully." + (" Refund initiated." if order.payment_method == "Wallet" else "")}

# --- ❌ REJECT ORDER ---
@app.patch("/orders/{order_id}/reject")
async def reject_order(order_id: int, db: Session = Depends(get_db), payload: dict = Depends(verify_token)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    user_role = payload.get("role")
    user_id = int(payload.get("sub"))
    employer_id = payload.get("employer_id")
    if not ((user_role == "Merchant" and user_id == order.merchant_id) or (user_role == "Staff" and employer_id == order.merchant_id)):
        raise HTTPException(status_code=403, detail="Not authorized to reject this order")
    if order.status not in ["Queued", "Pending_Acceptance"]:
        raise HTTPException(status_code=400, detail="Cannot reject order once preparation starts.")
    
    old_status = order.status
    order.status = "Cancelled_by_Merchant"
    db.commit()
    res_id = order.restaurant_id

    if old_status == "Queued":
        release_queue_slots(res_id, order.id, db)
    elif old_status == "Pending_Acceptance":
        release_active_slots(res_id, order.id, db)

    if order.payment_method == "Wallet" and producer:
        producer.send('food_delivery_orders', {
            "event": "ORDER_CANCELLED",
            "order_id": order.id,
            "user_id": order.user_id,
            "refund_amount": order.total_amount
        })
    await manager.broadcast(f"🚫 Sorry, the restaurant had to reject your order #{order.id}.", f"customer_{order.user_id}")
    await manager.broadcast("REFRESH_DATA", f"merchant_{res_id}")
    return {"msg": "Order rejected successfully." + (" Refund initiated." if order.payment_method == "Wallet" else "")}

# --- 🔁 RESEND DELIVERY OTP ---
@app.post("/orders/{order_id}/resend-otp")
async def resend_delivery_otp(order_id: int, db: Session = Depends(get_db), payload: dict = Depends(verify_token)):
    if not redis_client:
        raise HTTPException(status_code=503, detail="Redis unavailable")
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if int(payload.get("sub")) != order.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to request OTP for this order")
    count_key = f"otp:resend_count:{order_id}"
    count = redis_client.get(count_key)
    if count and int(count) >= 10:
        raise HTTPException(status_code=429, detail="Resend limit reached (10 times). Contact support.")
    lock_key = f"otp:resend_lock:{order_id}"
    if redis_client.exists(lock_key):
        raise HTTPException(status_code=429, detail="Please wait 5 seconds before resending.")
    new_otp = generate_otp()
    redis_client.setex(f"otp:delivery:{order_id}", 600, new_otp)
    redis_client.incr(count_key)
    redis_client.setex(lock_key, 5, "1")   
    await manager.broadcast(f"🔐 Your NEW delivery OTP for order #{order.id}: {new_otp}", f"customer_{order.user_id}")
    return {"msg": "New OTP sent"}

# --- ✅ VERIFY DELIVERY OTP ---
@app.post("/orders/{order_id}/verify-delivery")
async def verify_delivery_otp(order_id: int, otp: str, db: Session = Depends(get_db), payload: dict = Depends(verify_token)):
    if not redis_client:
        raise HTTPException(status_code=503, detail="Redis unavailable")
    rider_id = int(payload.get("sub"))
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.rider_id != rider_id:
        raise HTTPException(status_code=403, detail="You are not assigned to this order")
    cached_otp = get_delivery_otp(order_id)
    if not cached_otp:
        raise HTTPException(status_code=400, detail="OTP expired or already used")
    fail_key = f"otp:fail:{order_id}"
    fails = redis_client.incr(fail_key)
    redis_client.expire(fail_key, 600)
    if fails > 10:
        raise HTTPException(status_code=429, detail="Too many failed attempts. Order locked temporarily.")
    if cached_otp != otp:
        raise HTTPException(status_code=401, detail="Invalid OTP")
    
    delete_delivery_otp(order_id)
    order.status = "Delivered"
    db.commit()
    
    try:
        requests.post(
            f"http://localhost:8001/users/{rider_id}/wallet/topup",
            json={"amount": 40},
            headers={"Authorization": f"Bearer {payload['token']}"},
            timeout=2
        )
    except Exception:
        pass
    if producer:
        producer.send('food_delivery_orders', {
            "event": "ORDER_DELIVERED",
            "order_id": order.id,
            "rider_id": order.rider_id,
            "payout": 40.0
        })
    await manager.broadcast(f"✅ Order #{order.id} delivered!", f"customer_{order.user_id}")
    await manager.broadcast("REFRESH_DATA", f"merchant_{order.restaurant_id}")
    await manager.broadcast("REFRESH_DATA", "riders")
    return {"msg": "Delivery confirmed"}

# --- 🔄 STATUS UPDATES ---
@app.patch("/orders/{order_id}/status")
async def update_status(order_id: int, status: str, db: Session = Depends(get_db), payload: dict = Depends(verify_token)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    user_role = payload.get("role")
    user_id = int(payload.get("sub"))
    employer_id = payload.get("employer_id")
    if not ((user_role == "Merchant" and user_id == order.merchant_id) or (user_role == "Staff" and employer_id == order.merchant_id)):
        raise HTTPException(status_code=403, detail="Not authorized to update order status")
    
    old_status = order.status
    order.status = status
    db.commit()

    if status == "Ready" and old_status in ["Pending_Acceptance", "Preparing"]:
        release_active_slots(order.restaurant_id, order_id, db)
        if redis_client:
            pickup_otp = generate_otp()
            store_pickup_otp(order_id, pickup_otp)
            await manager.broadcast(f"📦 Pickup OTP for Order #{order_id}: {pickup_otp}", f"merchant_{order.restaurant_id}")
        await manager.broadcast(f"📦 Order #{order.id} is ready for pickup!", "riders")
    
    await manager.broadcast(f"✨ Update: Your order is {status}", f"customer_{order.user_id}")
    await manager.broadcast("REFRESH_DATA", f"merchant_{order.restaurant_id}")
    return {"status": "ok"}

# --- 🛵 VERIFY PICKUP OTP ---
@app.post("/orders/{order_id}/verify-pickup")
async def verify_pickup_otp(order_id: int, otp: str, db: Session = Depends(get_db), payload: dict = Depends(verify_token)):
    if not redis_client:
        raise HTTPException(status_code=503, detail="Redis unavailable")
    rider_id = int(payload.get("sub"))
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.rider_id != rider_id:
        raise HTTPException(status_code=403, detail="You are not assigned to this order")
    cached_otp = get_pickup_otp(order_id)
    if not cached_otp:
        raise HTTPException(status_code=400, detail="Pickup OTP expired or not generated")
    if cached_otp != otp:
        raise HTTPException(status_code=401, detail="Invalid pickup OTP")
    if order.status != "Ready":
        raise HTTPException(status_code=400, detail="Order not ready for pickup")
    
    order.status = "Picked Up"
    db.commit()
    delete_pickup_otp(order_id)
    
    if producer:
        try:
            producer.send('food_delivery_orders', {
                "event": "MERCHANT_PAYOUT",
                "merchant_id": order.merchant_id,
                "amount": order.total_amount - 40.0 
            })
        except Exception:
            pass
    await manager.broadcast(f"🛵 Rider picked up your Order #{order.id}!", f"customer_{order.user_id}")
    await manager.broadcast("REFRESH_DATA", "riders")
    await manager.broadcast("REFRESH_DATA", f"merchant_{order.restaurant_id}")
    return {"msg": "Pickup confirmed"}

# --- 🔁 RESEND PICKUP OTP ---
@app.post("/orders/{order_id}/resend-pickup-otp")
async def resend_pickup_otp(order_id: int, db: Session = Depends(get_db), payload: dict = Depends(verify_token)):
    if not redis_client:
        raise HTTPException(status_code=503, detail="Redis unavailable")
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status != "Ready":
        raise HTTPException(status_code=400, detail="Pickup OTP can only be resent for orders that are Ready")
    user_role = payload.get("role")
    user_id = int(payload.get("sub"))
    employer_id = payload.get("employer_id")
    if not ((user_role == "Merchant" and user_id == order.merchant_id) or (user_role == "Staff" and employer_id == order.merchant_id)):
        raise HTTPException(status_code=403, detail="Not authorized to resend pickup OTP")
    new_otp = generate_otp()
    store_pickup_otp(order_id, new_otp)
    await manager.broadcast(f"📦 New Pickup OTP for Order #{order_id}: {new_otp}", f"merchant_{order.restaurant_id}")
    return {"msg": "New pickup OTP sent"}

# --- 🧾 AUTHORIZED QUERY ENDPOINTS ---
@app.get("/orders/user/{user_id}")
def get_user_orders(user_id: int, db: Session = Depends(get_db), payload: dict = Depends(verify_token)):
    if int(payload.get("sub")) != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    return db.query(Order).filter(Order.user_id == user_id).order_by(Order.id.desc()).all()

@app.get("/orders/restaurant/{restaurant_id}")
def get_restaurant_orders(restaurant_id: int, db: Session = Depends(get_db), payload: dict = Depends(verify_token)):
    try:
        res = requests.get(f"http://localhost:8002/restaurants/{restaurant_id}", timeout=2)
        res.raise_for_status()
        restaurant = res.json()
        merchant_id = restaurant.get("merchant_id")
    except Exception:
        raise HTTPException(status_code=503, detail="Could not fetch restaurant info")
    user_role = payload.get("role")
    user_id = int(payload.get("sub"))
    employer_id = payload.get("employer_id")
    if not ((user_role == "Merchant" and user_id == merchant_id) or (user_role == "Staff" and employer_id == merchant_id)):
        raise HTTPException(status_code=403, detail="Not authorized to view orders of this restaurant")
    return db.query(Order).filter(Order.restaurant_id == restaurant_id).order_by(Order.id.desc()).all()

@app.get("/orders/available/")
def get_available(db: Session = Depends(get_db)):
    return db.query(Order).filter(Order.status == "Ready", Order.rider_id == None).all()

@app.get("/orders/rider/{rider_id}")
def get_rider_orders(rider_id: int, db: Session = Depends(get_db), payload: dict = Depends(verify_token)):
    if int(payload.get("sub")) != rider_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    return db.query(Order).filter(Order.rider_id == rider_id).order_by(Order.id.desc()).all()

@app.patch("/orders/{order_id}/claim")
async def claim(order_id: int, rider_id: int, db: Session = Depends(get_db), payload: dict = Depends(verify_token)):
    if int(payload.get("sub")) != rider_id:
        raise HTTPException(status_code=403, detail="Token rider mismatch")
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.rider_id is not None:
        raise HTTPException(status_code=400, detail="Oops! Someone else just grabbed this order.")
    order.rider_id = rider_id
    db.commit()
    await manager.broadcast(f"🛵 Rider {rider_id} claimed Order #{order.id}!", f"merchant_{order.restaurant_id}")
    await manager.broadcast("REFRESH_DATA", "riders")
    return {"status": "ok"}