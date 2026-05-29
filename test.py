import requests

try:
    login = requests.post("http://localhost:8001/login", json={"email": "m@m.com", "password": "password123"})
    if login.status_code == 200:
        token = login.json()["token"]
        print("Logged in")
        res = requests.get("http://localhost:8002/restaurants/merchant/2")
        print(res.json())
    else:
        print(f"Login failed: {login.text}")
except Exception as e:
    print(e)
