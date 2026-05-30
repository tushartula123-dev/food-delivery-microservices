from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import and_
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import requests
import jwt
import redis
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# --- IMPORTS FROM MODULAR FILES ---
from database import engine, get_db, Base, SessionLocal
from models import Order

app = FastAPI(title="PuneFood Analytics & Dashboard Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SECRET_KEY = "pune_food_super_secret"
ALGORITHM = "HS256"
security = HTTPBearer()

# Create Tables (though usually Order Service creates it, safe to keep)
Base.metadata.create_all(bind=engine)

# --- 🔴 REDIS SETUP (for token blacklist) ---
try:
    redis_client = redis.Redis(host='localhost', port=6379, decode_responses=True)
    redis_client.ping()
    print("✅ Redis connected in Analytics Service")
except Exception as e:
    print(f"⚠️ Redis not available: {e}")
    redis_client = None

# --- 🛡️ TOKEN VERIFIER (with Redis blacklist) ---
def verify_token(token: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(token.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        # 🔥 INSTANT REVOCATION CHECK
        if redis_client and redis_client.get(f"blacklist:{payload.get('sub')}"):
            raise HTTPException(status_code=401, detail="Session revoked. Please login again.")
        return payload
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or Expired Token")

# --- 🧠 TIME-SERIES HELPER ---
def get_time_filters():
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    yesterday_start = today_start - timedelta(days=1)
    week_start = today_start - timedelta(days=today_start.weekday())
    month_start = today_start.replace(day=1)
    year_start = today_start.replace(month=1, day=1)
    return today_start, yesterday_start, week_start, month_start, year_start

def calculate_stats(db: Session, filter_condition, is_rider=False):
    today, yesterday, week, month, year = get_time_filters()
    valid_statuses = ["Delivered"] if is_rider else ["Picked Up", "Delivered"]
    base_query = db.query(Order).filter(filter_condition, Order.status.in_(valid_statuses))
    def get_revenue(query):
        orders = query.all()
        if is_rider:
            return float(len(orders) * 40.0)
        else:
            return sum([float(o.total_amount - 40.0) for o in orders])
    total_rev = get_revenue(base_query)
    today_rev = get_revenue(base_query.filter(Order.created_at >= today))
    yesterday_rev = get_revenue(base_query.filter(and_(Order.created_at >= yesterday, Order.created_at < today)))
    week_rev = get_revenue(base_query.filter(Order.created_at >= week))
    month_rev = get_revenue(base_query.filter(Order.created_at >= month))
    year_rev = get_revenue(base_query.filter(Order.created_at >= year))
    return {
        "total_orders_completed": base_query.count(),
        "earnings": {
            "lifetime": total_rev,
            "today": today_rev,
            "yesterday": yesterday_rev,
            "this_week": week_rev,
            "this_month": month_rev,
            "this_year": year_rev
        }
    }

# --- 🌐 ANALYTICS ENDPOINTS (with authorization) ---
@app.get("/analytics/restaurant/{restaurant_id}")
def get_restaurant_stats(restaurant_id: int, payload: dict = Depends(verify_token)):
    """Only merchant who owns this restaurant OR staff of that merchant can view"""
    try:
        res = requests.get(f"http://localhost:8002/restaurants/{restaurant_id}", timeout=2)
        res.raise_for_status()
        restaurant = res.json()
        merchant_id = restaurant.get("merchant_id")
    except Exception:
        raise HTTPException(status_code=503, detail="Could not fetch restaurant details")
    user_role = payload.get("role")
    user_id = int(payload.get("sub"))
    employer_id = payload.get("employer_id")
    if not ((user_role == "Merchant" and user_id == merchant_id) or (user_role == "Staff" and employer_id == merchant_id)):
        raise HTTPException(status_code=403, detail="Not authorized to view this restaurant's stats")
    db = SessionLocal()
    try:
        condition = (Order.restaurant_id == restaurant_id)
        return calculate_stats(db, condition)
    finally:
        db.close()

@app.get("/analytics/merchant/{merchant_id}")
def get_merchant_aggregated_stats(merchant_id: int, payload: dict = Depends(verify_token)):
    """Only the merchant themselves can view their aggregated stats"""
    user_id = int(payload.get("sub"))
    user_role = payload.get("role")
    if not (user_role == "Merchant" and user_id == merchant_id):
        raise HTTPException(status_code=403, detail="Not authorized to view this merchant's stats")
    db = SessionLocal()
    try:
        res = requests.get(f"http://localhost:8002/restaurants/merchant/{merchant_id}", timeout=2)
        res.raise_for_status()
        restaurants = res.json()
        res_ids = [r["id"] for r in restaurants]
        if not res_ids:
            return {"total_orders_completed": 0, "earnings": {"lifetime": 0, "today": 0, "yesterday": 0, "this_week": 0, "this_month": 0, "this_year": 0}}
        condition = Order.restaurant_id.in_(res_ids)
        return calculate_stats(db, condition)
    except Exception:
        raise HTTPException(status_code=503, detail="Could not fetch restaurants for this merchant.")
    finally:
        db.close()

@app.get("/analytics/rider/{rider_id}")
def get_rider_stats(rider_id: int, payload: dict = Depends(verify_token)):
    """Only the rider themselves can view their stats"""
    user_id = int(payload.get("sub"))
    if user_id != rider_id:
        raise HTTPException(status_code=403, detail="Not authorized to view this rider's stats")
    db = SessionLocal()
    try:
        condition = (Order.rider_id == rider_id)
        return calculate_stats(db, condition, is_rider=True)
    finally:
        db.close()