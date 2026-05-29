import bcrypt
from main import SessionLocal, User

db = SessionLocal()
users = db.query(User).all()
for user in users:
    if not user.password.startswith('$2b$'):
        hashed = bcrypt.hashpw(user.password.encode('utf-8'), bcrypt.gensalt())
        user.password = hashed.decode('utf-8')
        print(f"✓ Migrated {user.email}")
db.commit()
db.close()
print("Migration complete.")
