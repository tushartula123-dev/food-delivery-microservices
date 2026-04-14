from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from pydantic import BaseModel
from typing import List

# --- 🗄️ DATABASE SETUP ---
SQLALCHEMY_DATABASE_URL = "sqlite:///./restaurants.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# --- 🏗️ DB MODELS ---
class Restaurant(Base):
    __tablename__ = "restaurants"
    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, index=True) # 🔥 Links to Merchant's User ID
    name = Column(String)
    rating = Column(Float, default=4.0)
    
    # Relationship to fetch items automatically
    items = relationship("MenuItem", back_populates="restaurant")

class MenuItem(Base):
    __tablename__ = "menu_items"
    id = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id"))
    name = Column(String)
    price = Column(Float)
    is_veg = Column(Boolean, default=True) # 🔥 Veg/Non-Veg Flag
    
    restaurant = relationship("Restaurant", back_populates="items")

Base.metadata.create_all(bind=engine)

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()

# --- 📝 SCHEMAS ---
class ItemCreate(BaseModel):
    name: str
    price: float
    is_veg: bool = True

class RestaurantCreate(BaseModel):
    owner_id: int
    name: str

# --- 🚀 APIS FOR CUSTOMERS ---
@app.get("/restaurants")
def get_all_restaurants(db: Session = Depends(get_db)):
    rest_db = db.query(Restaurant).all()
    result = []
    for r in rest_db:
        result.append({
            "id": r.id, 
            "name": r.name, 
            "rating": r.rating,
            "items": [{"id": i.id, "name": i.name, "price": i.price, "is_veg": i.is_veg} for i in r.items]
        })
    return result

# --- 👨‍🍳 APIS FOR MERCHANTS ---
@app.get("/restaurants/merchant/{owner_id}")
def get_merchant_restaurants(owner_id: int, db: Session = Depends(get_db)):
    return db.query(Restaurant).filter(Restaurant.owner_id == owner_id).all()

@app.post("/restaurants")
def create_restaurant(res: RestaurantCreate, db: Session = Depends(get_db)):
    new_res = Restaurant(owner_id=res.owner_id, name=res.name)
    db.add(new_res)
    db.commit()
    db.refresh(new_res)
    return new_res

@app.post("/restaurants/{res_id}/items")
def add_item(res_id: int, item: ItemCreate, db: Session = Depends(get_db)):
    new_item = MenuItem(restaurant_id=res_id, name=item.name, price=item.price, is_veg=item.is_veg)
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return {"msg": "Item Added", "item": new_item.name}

# --- 🎁 PRESENTATION HACK: AUTOMATIC SEEDER ---
# Ye function automatically dummy data daal dega taaki pehli baar app khali na dikhe
@app.on_event("startup")
def seed_data():
    db = SessionLocal()
    if db.query(Restaurant).count() == 0:
        # Dummy Restaurants
        r1 = Restaurant(owner_id=1, name="Goodluck Cafe (Deccan)", rating=4.5)
        r2 = Restaurant(owner_id=1, name="Vaishali (FC Road)", rating=4.8)
        db.add(r1)
        db.add(r2)
        db.commit()
        
        # Dummy Menu Items
        db.add(MenuItem(restaurant_id=r1.id, name="Bun Maska", price=60, is_veg=True))
        db.add(MenuItem(restaurant_id=r1.id, name="Keema Pav", price=150, is_veg=False))
        db.add(MenuItem(restaurant_id=r2.id, name="SPDP (Special)", price=120, is_veg=True))
        db.add(MenuItem(restaurant_id=r2.id, name="Veg Cutlet", price=90, is_veg=True))
        db.add(MenuItem(restaurant_id=r2.id, name="Filter Coffee", price=50, is_veg=True))
        db.commit()
    db.close()