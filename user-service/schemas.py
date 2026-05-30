from pydantic import BaseModel
from enum import Enum

# --- 🔒 ROLE ENUMERATION ---
class RoleType(str, Enum):
    customer = "Customer"
    merchant = "Merchant"
    rider = "Rider"
    staff = "Staff" 

# --- 📝 SCHEMAS ---
class UserRegister(BaseModel):
    name: str
    email: str
    password: str
    role: RoleType  
    phone_number: str
    vehicle_number: str | None = None

class StaffRegister(BaseModel):
    name: str
    email: str
    password: str
    phone_number: str
    restaurant_id: int

class StaffUpdate(BaseModel):
    name: str | None = None
    email: str | None = None
    password: str | None = None
    phone_number: str | None = None
    restaurant_id: int | None = None

class UserLogin(BaseModel):
    email: str
    password: str

class WalletUpdate(BaseModel):
    amount: float

class AddressCreate(BaseModel):
    address: str

class UserProfileUpdate(BaseModel):
    phone_number: str | None = None
    vehicle_number: str | None = None