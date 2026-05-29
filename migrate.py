# migration.py (inside user-service folder)
import bcrypt
from main import SessionLocal, User

db = SessionLocal()
for user in db.query(User).all():
    if not user.password.startswith('$2b$'):
        hashed = bcrypt.hashpw(user.password.encode('utf-8'), bcrypt.gensalt())
        user.password = hashed.decode('utf-8')
        db.add(user)
        print(f"Migrated {user.email}")
db.commit()
db.close()