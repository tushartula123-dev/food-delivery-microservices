# Food Delivery Microservices Project
+-----------------------+          +-----------------------+
|     USER SERVICE      |          |       user_db         |
|     (Port 8001)       | <------> |     (PostgreSQL)      |
| [Auth, Wallet, Profile] |          | [Users, Address Book] |
+-----------------------+          +-----------------------+
           ^
           | (API Call / JWT)
           v
+-----------------------+          +-----------------------+
|  RESTAURANT SERVICE   |          |    restaurant_db      |
|     (Port 8002)       | <------> | (PostgreSQL + Redis)  |
| [Menu, Rest. Profile] |          | [Rest, Menu Items]    |
+-----------------------+          +-----------------------+
           ^
           | (Kafka / API)
           v
+-----------------------+          +-----------------------+
|     ORDER SERVICE     |          |       order_db        |
|     (Port 8003)       | <------> |     (PostgreSQL)      |
| [Checkout, Tracking]  |          |  [Orders, History]    |
+-----------------------+          +-----------------------+