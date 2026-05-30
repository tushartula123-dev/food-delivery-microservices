from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from database import Base
from datetime import datetime

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