from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey
from database import Base

# --- 🗄️ MODELS ---
class Restaurant(Base):
    __tablename__ = "restaurants"
    id = Column(Integer, primary_key=True, index=True)
    merchant_id = Column(Integer, index=True)
    name = Column(String, index=True)
    address = Column(String)
    phone_number = Column(String, nullable=True) # NEW FIELD
    is_open = Column(Boolean, default=True)          
    auto_accept = Column(Boolean, default=False)
    max_active_orders = Column(Integer, default=10)
    max_queue_length = Column(Integer, default=5)

class MenuItem(Base):
    __tablename__ = "menu_items"
    id = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(Integer, index=True)
    name = Column(String)
    price = Column(Float)
    description = Column(String, nullable=True)
    is_available = Column(Boolean, default=True)    
    image_url = Column(String, nullable=True)
    is_veg = Column(Boolean, default=True)
    max_active_orders = Column(Integer, nullable=True)
    max_queue_length = Column(Integer, nullable=True)