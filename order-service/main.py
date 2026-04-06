from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import models, database
from pydantic import BaseModel
from typing import List

app = FastAPI(title="Order Service - PuneFood Express")

# --- 1. CORS Setup (React Connection Fix) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Tables automatically create karna (SQLite orders.db)
models.Base.metadata.create_all(bind=database.engine)

# --- 2. Request Schemas ---
class OrderCreate(BaseModel):
    user_id: int
    restaurant_id: int
    total_amount: float

# --- 3. API Endpoints ---

@app.get("/")
def status():
    return {"service": "Order Service", "status": "Online", "database": "SQLite"}

# Endpoint: Naya Order Place karna
@app.post("/orders")
def place_order(order_data: OrderCreate, db: Session = Depends(database.get_db)):
    try:
        new_order = models.Order(
            user_id=order_data.user_id,
            restaurant_id=order_data.restaurant_id,
            total_amount=order_data.total_amount,
            status="Confirmed"
        )
        db.add(new_order)
        db.commit()
        db.refresh(new_order)
        return {"message": "Order placed successfully", "order_id": new_order.id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Endpoint: Kisi specific user ki Order History nikalna
@app.get("/orders/user/{user_id}")
def get_user_orders(user_id: int, db: Session = Depends(database.get_db)):
    orders = db.query(models.Order).filter(models.Order.user_id == user_id).order_by(models.Order.created_at.desc()).all()
    if not orders:
        return [] # Khali list bhejo agar koi order na ho
    return orders

# Endpoint: Order ka status update karne ke liye (Future Admin use)
@app.patch("/orders/{order_id}/status")
def update_order_status(order_id: int, status: str, db: Session = Depends(database.get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    order.status = status
    db.commit()
    return {"message": f"Order status updated to {status}"}