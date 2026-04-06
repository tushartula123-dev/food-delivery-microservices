from sqlalchemy.orm import Session
from database import SessionLocal, engine
import models

def seed():
    db = SessionLocal()
    # Resetting tables for fresh start
    models.Base.metadata.drop_all(bind=engine)
    models.Base.metadata.create_all(bind=engine)

    pune_restaurants = [
        {"name": "Goodluck Cafe", "area": "Deccan", "cuisine": "Irani/Bun Maska", "rating": 4.5},
        {"name": "Vaishali", "area": "FC Road", "cuisine": "South Indian", "rating": 4.7},
        {"name": "Bedekar Misal", "area": "Narayan Peth", "cuisine": "Maharashtrian", "rating": 4.6},
        {"name": "1 BHK Superbar", "area": "Baner", "cuisine": "Continental", "rating": 4.4},
        {"name": "Blue Nile", "area": "Camp", "cuisine": "Biryani", "rating": 4.3},
        {"name": "Durvankur Thali", "area": "Sadashiv Peth", "cuisine": "Thali", "rating": 4.5}
    ]

    for res_data in pune_restaurants:
        res = models.Restaurant(**res_data)
        db.add(res)
        db.commit()
        db.refresh(res)
        
        # Add a sample menu item for each
        item = models.MenuItem(
            name=f"Special {res_data['cuisine']} Dish",
            price=250,
            description="Famous local taste of Pune",
            restaurant_id=res.id
        )
        db.add(item)
    
    db.commit()
    print("✅ Pune Restaurants and Menu added successfully!")

if __name__ == "__main__":
    seed()
