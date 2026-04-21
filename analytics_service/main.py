from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from kafka import KafkaConsumer
from sqlalchemy import create_engine, text # 🔥 NAYA: Database se purana data laane ke liye
import json
import threading

app = FastAPI(title="PuneFood Analytics & Dashboard Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 🐘 DATABASE SETUP (Sirf History nikalne ke liye) ---
SQLALCHEMY_DATABASE_URL = "postgresql://postgres:1234@localhost:5433/order_db"
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# --- 🏦 THE LEDGERS (Live Khatabooks) ---
merchant_stats = {} 
rider_stats = {}    

# 🔥 NAYA FUNCTION: Server start hote hi purani kamayi load karega
def load_historical_data():
    print("\n" + "⏳"*10 + " LOADING HISTORY " + "⏳"*10)
    try:
        with engine.connect() as conn:
            # 1. Purane Merchant Orders ka hisaab nikalo
            orders = conn.execute(text("SELECT restaurant_id, COUNT(id), SUM(total_amount) FROM orders GROUP BY restaurant_id")).fetchall()
            for row in orders:
                if row[0] is not None:
                    res_id = str(row[0])
                    merchant_stats[res_id] = {"orders": row[1], "revenue": float(row[2] or 0.0)}
            
            # 2. Purane Rider Deliveries ka hisaab nikalo
            deliveries = conn.execute(text("SELECT rider_id, COUNT(id) FROM orders WHERE status='Delivered' AND rider_id IS NOT NULL GROUP BY rider_id")).fetchall()
            for row in deliveries:
                rider_id = str(row[0])
                # Hum maante hain ki per delivery ₹40 milte hain
                rider_stats[rider_id] = {"deliveries": row[1], "earnings": float(row[1] * 40.0)}
                
        print("✅ PURANA DATA SUCCESSFUL LOAD HO GAYA!")
    except Exception as e:
        print(f"⚠️ History Load Error: {e}")
    print("⏳"*27 + "\n")

def start_smart_cashier():
    print("\n" + "🏦"*20)
    print("🚀 SMART CASHIER (KAFKA CONSUMER) ONLINE!")
    print("🎧 Listening to topic: 'food_delivery_orders' for LIVE updates...")
    print("🏦"*20 + "\n")
    
    try:
        consumer = KafkaConsumer(
            'food_delivery_orders',
            bootstrap_servers=['localhost:9092'],
            value_deserializer=lambda m: json.loads(m.decode('utf-8')),
            auto_offset_reset='latest'
        )
        
        for message in consumer:
            data = message.value
            event_type = data.get("event")
            
            # 👨‍🍳 KHEL 1: MERCHANT KI KAMAYI (Live)
            if event_type == "ORDER_PLACED":
                res_id = str(data.get("restaurant_id"))
                amount = float(data.get("amount", 350.0))
                
                if res_id not in merchant_stats:
                    merchant_stats[res_id] = {"orders": 0, "revenue": 0.0}
                
                merchant_stats[res_id]["orders"] += 1
                merchant_stats[res_id]["revenue"] += amount
                
                print(f"📈 [MERCHANT] Res-{res_id} got a new order! Total Revenue: ₹{merchant_stats[res_id]['revenue']}")

            # 🛵 KHEL 2: RIDER KI KAMAYI (Live)
            elif event_type == "ORDER_DELIVERED":
                rider_id = str(data.get("rider_id"))
                payout = float(data.get("payout", 40.0))
                
                if rider_id not in rider_stats:
                    rider_stats[rider_id] = {"deliveries": 0, "earnings": 0.0}
                
                rider_stats[rider_id]["deliveries"] += 1
                rider_stats[rider_id]["earnings"] += payout
                
                print(f"💸 [RIDER] Rider-{rider_id} completed delivery! Total Earnings: ₹{rider_stats[rider_id]['earnings']}")
            
    except Exception as e:
        print(f"⚠️ KAFKA ERROR: {e}")

# API Start hote hi pehle history load karo, fir Kafka listener chalu karo
@app.on_event("startup")
def startup_event():
    load_historical_data() # Pehle purana data copy karo
    threading.Thread(target=start_smart_cashier, daemon=True).start() # Fir live counting shuru karo

# --- 🌐 REST APIs ---

@app.get("/analytics/merchant/{res_id}")
def get_merchant_stats(res_id: str):
    return merchant_stats.get(res_id, {"orders": 0, "revenue": 0.0})

@app.get("/analytics/rider/{rider_id}")
def get_rider_stats(rider_id: str):
    return rider_stats.get(rider_id, {"deliveries": 0, "earnings": 0.0})