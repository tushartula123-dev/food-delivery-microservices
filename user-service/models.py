from sqlalchemy import Column, Integer, String, Float
from database import Base

# --- 🏗️ DB MODELS ---
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    email = Column(String, unique=True, index=True)
    password = Column(String) 
    role = Column(String) 
    wallet_balance = Column(Float, default=0.0)
    phone_number = Column(String, nullable=False, unique=True)
    vehicle_number = Column(String, nullable=True)
    employer_id = Column(Integer, nullable=True)
    restaurant_id = Column(Integer, nullable=True)

class AddressBook(Base):
    __tablename__ = "address_book"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    address_text = Column(String)