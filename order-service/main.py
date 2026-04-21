from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from datetime import datetime
import json
import requests  # 🔥 NAYA: API call maarne ke liye
from kafka import KafkaProducer
from typing import Dict, List

# --- 🚀 FASTAPI APP SETUP ---
app = FastAPI(title="Order Service")

# --- 🌐 CORS SETTINGS ---
app.add_middleware(
    CORSMiddleware, 
    allow_origins=["*"], 
    allow_credentials=True, 
    allow_methods=["*"], 
    allow_headers=["*"]
)

# --- 🐘 DATABASE SETUP (PostgreSQL 16) ---
SQLALCHEMY_DATABASE_URL = "postgresql://postgres:1234@localhost:5433/order_db"

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# DB Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- 🗄️ DATABASE MODEL ---
class Order(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    restaurant_id = Column(Integer, index=True)
    rider_id = Column(Integer, index=True, nullable=True)
    total_amount = Column(Float)
    status = Column(String, default="Pending")
    address = Column(String, nullable=True) 
    items_summary = Column(String, nullable=True) # exact items ordered
    created_at = Column(DateTime, default=datetime.utcnow)

# Create tables in Postgres DB
Base.metadata.create_all(bind=engine)

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
                try: await connection.send_text(message)
                except Exception: pass

manager = ConnectionManager()

# --- 📦 KAFKA PRODUCER ---
try:
    producer = KafkaProducer(
        bootstrap_servers=['localhost:9092'], 
        value_serializer=lambda v: json.dumps(v).encode('utf-8')
    )
except Exception as e:
    producer = None

@app.websocket("/ws/{channel}")
async def websocket_endpoint(websocket: WebSocket, channel: str):
    await manager.connect(websocket, channel)
    try:
        while True: await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, channel)

# --- 🛒 ORDER ENDPOINTS ---

@app.post("/orders")
async def create_order(order: dict, db: Session = Depends(get_db)):
    try:
        new_order = Order(
            user_id=order.get('user_id'),
            restaurant_id=order.get('restaurant_id'),
            total_amount=order.get('total_amount'),
            address=order.get('address'), 
            items_summary=order.get('items_summary', 'Standard Meal'), 
            status="Pending"
        )
        db.add(new_order)
        db.commit()
        db.refresh(new_order)

        # 🔥 NAYA (MASTER PLAN): Invisible API Call to User Service to save address
        if order.get('address') and order.get('user_id'):
            try:
                requests.post(
                    f"http://localhost:8001/users/{order.get('user_id')}/address", 
                    json={"address": order.get('address')},
                    timeout=2 # Fast timeout taaki order delay na ho
                )
            except Exception:
                pass # Agar User Service down bhi ho, toh order fail nahi hona chahiye

        await manager.broadcast(f"🛎️ New Order #{new_order.id} received!", f"merchant_{new_order.restaurant_id}")

        if producer:
            producer.send('food_delivery_orders', {
                "order_id": new_order.id, 
                "restaurant_id": new_order.restaurant_id,
                "address": new_order.address
            })
        return new_order
    except Exception as e:
        raise HTTPException(status_code=500, detail="Backend crash while creating order")

@app.get("/orders/user/{user_id}")
def get_user_orders(user_id: int, db: Session = Depends(get_db)):
    return db.query(Order).filter(Order.user_id == user_id).order_by(Order.id.desc()).all()

@app.get("/orders/restaurant/{restaurant_id}")
def get_restaurant_orders(restaurant_id: int, db: Session = Depends(get_db)):
    return db.query(Order).filter(Order.restaurant_id == restaurant_id).order_by(Order.id.desc()).all()

@app.get("/orders/available/")
def get_available(db: Session = Depends(get_db)):
    return db.query(Order).filter(Order.status == "Ready", Order.rider_id == None).all()

@app.get("/orders/rider/{rider_id}")
def get_rider_orders(rider_id: int, db: Session = Depends(get_db)):
    return db.query(Order).filter(Order.rider_id == rider_id).order_by(Order.id.desc()).all()

@app.patch("/orders/{order_id}/claim")
async def claim(order_id: int, rider_id: int, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order: raise HTTPException(status_code=404, detail="Order not found")
    
    if order.rider_id is not None:
        raise HTTPException(status_code=400, detail="Oops! Someone else just grabbed this order.")
    
    order.rider_id = rider_id
    order.status = "Picked Up"
    db.commit()

    await manager.broadcast(f"🛵 Rider picked up your Order #{order.id}!", f"customer_{order.user_id}")
    await manager.broadcast("REFRESH_DATA", "riders") 
    return {"status": "ok"}

@app.patch("/orders/{order_id}/status")
async def update_status(order_id: int, status: str, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order: raise HTTPException(status_code=404, detail="Order not found")
    
    order.status = status
    db.commit()

    if status == "Ready":
        await manager.broadcast(f"📦 Order #{order.id} is ready for pickup!", "riders")
        
    await manager.broadcast(f"✨ Update: Your order is {status}", f"customer_{order.user_id}")
    await manager.broadcast("REFRESH_DATA", f"merchant_{order.restaurant_id}")
    return {"status": "ok"}