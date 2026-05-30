from pydantic import BaseModel
from typing import List

# --- 📝 SCHEMAS ---
class CartItemInput(BaseModel):
    item_id: int
    quantity: int

class OrderCreatePayload(BaseModel):
    user_id: int
    restaurant_id: int
    merchant_id: int
    total_amount: float
    address: str
    items_summary: str = "Standard Meal"
    special_instructions: str = ""
    payment_method: str = "Wallet"
    item_ids: List[int] = []
    cart_items: List[CartItemInput] = [] # Proper Quantity Support