from pydantic import BaseModel

# --- 📝 SCHEMAS ---
class RestaurantCreate(BaseModel):
    merchant_id: int
    name: str
    address: str
    phone_number: str | None = None # NEW FIELD

class RestaurantSettingsUpdate(BaseModel):
    is_open: bool | None = None
    auto_accept: bool | None = None
    address: str | None = None       # NEW FIELD
    phone_number: str | None = None  # NEW FIELD

class CapacityUpdate(BaseModel):
    max_active_orders: int | None = None
    max_queue_length: int | None = None

class MenuItemCreate(BaseModel):
    name: str
    price: float
    description: str | None = None
    is_available: bool = True
    image_url: str | None = None
    is_veg: bool = True

class MenuItemUpdate(BaseModel):
    name: str | None = None
    price: float | None = None
    is_veg: bool | None = None
    is_available: bool | None = None        
    image_url: str | None = None 
    description: str | None = None
    max_active_orders: int | None = None
    max_queue_length: int | None = None