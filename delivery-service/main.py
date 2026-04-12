from fastapi import FastAPI
import threading, json
from kafka import KafkaConsumer

app = FastAPI()

def kafka_listener():
    consumer = KafkaConsumer(
        'food_delivery_orders',
        bootstrap_servers=['localhost:9092'],
        value_deserializer=lambda m: json.loads(m.decode('utf-8'))
    )
    print("🎧 KAFKA CONSUMER STARTED: Listening for new orders...")
    for message in consumer:
        order = message.value
        print(f"🔥 [KAFKA EVENT] New Order Alert! ID: {order['order_id']} from Restaurant: {order['restaurant_id']}")

@app.on_event("startup")
async def startup():
    threading.Thread(target=kafka_listener, daemon=True).start()

@app.get("/")
def read_root(): return {"status": "Delivery Service Alive"}
