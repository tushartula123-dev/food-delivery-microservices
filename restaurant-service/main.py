from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import database, models
import redis
import json

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

models.Base.metadata.create_all(bind=database.engine)

# 🚀 REDIS CONNECTION SETUP
try:
    redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
except Exception as e:
    print("Redis connection failed:", e)

@app.get("/restaurants")
def get_restaurants(db: Session = Depends(database.get_db)):
    # 1. Pehle Redis Cache mein check karo
    cached_menu = redis_client.get("pune_restaurants_menu")
    if cached_menu:
        print("⚡ Data served from REDIS CACHE!")
        return json.loads(cached_menu)
    
    # 2. Agar Cache mein nahi hai, toh Database se lo
    print("🐢 Data served from DATABASE (Caching it now...)")
    restaurants = db.query(models.Restaurant).all()
    
    result = []
    for r in restaurants:
        items = db.query(models.MenuItem).filter(models.MenuItem.restaurant_id == r.id).all()
        result.append({
            "id": r.id, "name": r.name, "rating": r.rating,
            "items": [{"id": i.id, "name": i.name, "price": i.price} for i in items]
        })
    
    # 3. Agli baar ke liye Redis mein Cache save kar do (1 hour ke liye)
    redis_client.setex("pune_restaurants_menu", 3600, json.dumps(result))
    
    return result
