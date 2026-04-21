from kafka import KafkaConsumer
import json
import time

print("⏳ Starting Rider Notification Listener...")
time.sleep(2) # Thoda wait kar lete hain taaki Kafka properly connect ho jaye

try:
    consumer = KafkaConsumer(
        'new_orders',
        bootstrap_servers=['localhost:9092'],
        auto_offset_reset='latest',
        value_deserializer=lambda m: json.loads(m.decode('utf-8'))
    )

    print("🎧 Rider Service is ON! Listening for New Orders on Kafka...")

    for message in consumer:
        order_data = message.value
        print("\n" + "🔥"*25)
        print(f"🚀 DING DING! Notification Received from Kafka!")
        print(f"📦 Order ID: #{order_data['order_id']}")
        print(f"💰 Amount: ₹{order_data['total_amount']}")
        print(f"📍 Restaurant ID: {order_data['restaurant_id']}")
        print("🔥"*25 + "\n")

except Exception as e:
    print(f"❌ Cannot connect to Kafka. Error: {e}")
    print("👉 Make sure Zookeeper (2181) and Kafka Broker (9092) are running!")