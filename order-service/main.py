from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import Column, Integer, String, Float, DateTime
from sqlalchemy.orm import Session
from datetime import datetime
from pydantic import BaseModel
import database
import json
from kafka import KafkaProducer
from typing import Dict, List

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
database.Base.metadata.create_all(bind=database.engine)

class Order(database.Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    restaurant_id = Column(Integer, index=True)
    rider_id = Column(Integer, index=True, nullable=True)
    total_amount = Column(Float)
    status = Column(String, default="Pending")
    created_at = Column(DateTime, default=datetime.utcnow)

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
    async def connect(self, websocket: WebSocket, channel: str):
        await websocket.accept()
        if channel not in self.active_connections: self.active_connections[channel] = []
        self.active_connections[channel].append(websocket)
    def disconnect(self, websocket: WebSocket, channel: str):
        if channel in self.active_connections: self.active_connections[channel].remove(websocket)
    async def broadcast(self, message: str, channel: str):
        if channel in self.active_connections:
            for connection in self.active_connections[channel]:
                try: await connection.send_text(message)
                except: pass

manager = ConnectionManager()
try:
    producer = KafkaProducer(bootstrap_servers=['localhost:9092'], value_serializer=lambda v: json.dumps(v).encode('utf-8'))
except:
    producer = None

@app.websocket("/ws/{channel}")
async def websocket_endpoint(websocket: WebSocket, channel: str):
    await manager.connect(websocket, channel)
    try:
        while True: await websocket.receive_text()
    except WebSocketDisconnect: manager.disconnect(websocket, channel)

@app.post("/orders")
async def create_order(order: dict, db: Session = Depends(database.get_db)):
    new_order = Order(**order, status="Pending")
    db.add(new_order)
    db.commit()
    db.refresh(new_order)
    if producer:
        producer.send('food_delivery_orders', {"order_id": new_order.id, "restaurant_id": new_order.restaurant_id})
    await manager.broadcast(f"🛎️ New Order #{new_order.id}", f"merchant_{new_order.restaurant_id}")
    return new_order

@app.get("/orders/user/{user_id}")
def get_user_orders(user_id: int, db: Session = Depends(database.get_db)):
    return db.query(Order).filter(Order.user_id == user_id).order_by(Order.id.desc()).all()

@app.get("/orders/restaurant/{restaurant_id}")
def get_restaurant_orders(restaurant_id: int, db: Session = Depends(database.get_db)):
    return db.query(Order).filter(Order.restaurant_id == restaurant_id).order_by(Order.id.desc()).all()

@app.get("/orders/available/")
def get_available(db: Session = Depends(database.get_db)):
    return db.query(Order).filter(Order.status == "Ready", Order.rider_id == None).all()

@app.get("/orders/rider/{rider_id}")
def get_rider_orders(rider_id: int, db: Session = Depends(database.get_db)):
    # 🚀 RIDER KO SIRF ACTIVE ORDERS DIKHE (Jo Delivered nahi hue)
    return db.query(Order).filter(Order.rider_id == rider_id, Order.status != "Delivered").all()

@app.patch("/orders/{order_id}/claim")
async def claim(order_id: int, rider_id: int, db: Session = Depends(database.get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    order.rider_id, order.status = rider_id, "Out for Delivery"
    db.commit()
    await manager.broadcast(f"🛵 Order #{order.id} is Out for Delivery!", f"customer_{order.user_id}")
    return {"status": "ok"}

@app.patch("/orders/{order_id}/status")
async def update_status(order_id: int, status: str, db: Session = Depends(database.get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    order.status = status
    db.commit()
    if status == "Ready": await manager.broadcast(f"📦 Order Ready!", "riders")
    await manager.broadcast(f"✨ Status: {status}", f"customer_{order.user_id}")
    return {"status": "ok"}
