from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session, joinedload
import models, database
from typing import List

app = FastAPI(title="Restaurant Service - PuneFood Express")

# --- 1. CORS Setup ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database Tables Create Karna
models.Base.metadata.create_all(bind=database.engine)

# --- API Endpoints ---

@app.get("/")
def status():
    return {
        "service": "Pune Restaurant Service", 
        "status": "Online",
        "city": "Pune"
    }

# Get all restaurants with their menu items
@app.get("/restaurants")
def get_restaurants(area: str = None, db: Session = Depends(database.get_db)):
    query = db.query(models.Restaurant).options(joinedload(models.Restaurant.items))
    if area:
        query = query.filter(models.Restaurant.area.ilike(f"%{area}%"))
    return query.all()

# Get details of a single restaurant
@app.get("/restaurants/{res_id}")
def get_restaurant_detail(res_id: int, db: Session = Depends(database.get_db)):
    restaurant = db.query(models.Restaurant).options(joinedload(models.Restaurant.items)).filter(models.Restaurant.id == res_id).first()
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    return restaurant

# Get menu for a specific restaurant
@app.get("/menu/{res_id}")
def get_menu(res_id: int, db: Session = Depends(database.get_db)):
    menu = db.query(models.MenuItem).filter(models.MenuItem.restaurant_id == res_id).all()
    if not menu:
        raise HTTPException(status_code=404, detail="No menu found for this restaurant")
    return menu