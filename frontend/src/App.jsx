import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Utensils, Star, MapPin, Search, ShoppingCart, X } from 'lucide-react';

function App() {
  const [restaurants, setRestaurants] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    // Backend se data fetch karna
    axios.get('http://127.0.0.1:8002/restaurants')
      .then(res => setRestaurants(res.data))
      .catch(err => console.error("Error fetching data:", err));
  }, []);

  // Filter Logic: Name, Area ya Cuisine ke base par search
  const filteredRestaurants = restaurants.filter(res => 
    res.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    res.area.toLowerCase().includes(searchTerm.toLowerCase()) ||
    res.cuisine.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Cart mein item add karne ka function
  const addToCart = (item, restaurantName) => {
    setCart([...cart, { ...item, restaurantName }]);
    setIsCartOpen(true); // Item add hote hi cart khul jayega
  };

  const totalPrice = cart.reduce((total, item) => total + item.price, 0);

  return (
    <div style={{ backgroundColor: '#f9fafb', minHeight: '100vh', padding: '20px', fontFamily: 'system-ui' }}>
      
      {/* --- Navigation / Header --- */}
      <header style={{ textAlign: 'center', marginBottom: '40px', position: 'relative' }}>
        <h1 style={{ color: '#be123c', fontSize: '2.8rem', marginBottom: '10px' }}>Pune Food Express 🥘</h1>
        <p style={{ color: '#4b5563', fontSize: '1.1rem' }}>Bringing Pune's Best to your Doorstep</p>
        
        {/* Cart Icon Button */}
        <button 
          onClick={() => setIsCartOpen(true)}
          style={{ position: 'fixed', top: '20px', right: '20px', backgroundColor: '#be123c', color: 'white', border: 'none', borderRadius: '50%', width: '60px', height: '60px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', zIndex: 100, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <ShoppingCart size={24} />
          {cart.length > 0 && <span style={{ position: 'absolute', top: '0', right: '0', backgroundColor: 'black', borderRadius: '50%', padding: '2px 8px', fontSize: '0.8rem' }}>{cart.length}</span>}
        </button>
      </header>

      {/* --- Search Bar --- */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '40px' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '600px' }}>
          <Search style={{ position: 'absolute', left: '15px', top: '12px', color: '#9ca3af' }} size={20} />
          <input 
            type="text" 
            placeholder="Search for restaurants, areas (e.g. Baner) or food..." 
            style={{ width: '100%', padding: '12px 12px 12px 45px', borderRadius: '30px', border: '2px solid #e5e7eb', fontSize: '1rem', outline: 'none', transition: 'border-color 0.3s' }}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* --- Restaurant Grid --- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '25px', maxWidth: '1200px', margin: '0 auto' }}>
        {filteredRestaurants.map(res => (
          <div key={res.id} style={{ backgroundColor: 'white', borderRadius: '15px', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '1px solid #e5e7eb' }}>
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 'bold' }}>{res.name}</h2>
                <span style={{ backgroundColor: '#fef3c7', color: '#92400e', padding: '4px 8px', borderRadius: '6px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}>
                  {res.rating} <Star size={14} fill="#92400e" />
                </span>
              </div>
              
              <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <p style={{ color: '#4b5563', margin: '0', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem' }}>
                  <Utensils size={16} color="#be123c" /> {res.cuisine}
                </p>
                <p style={{ color: '#6b7280', margin: '0', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
                  <MapPin size={16} color="#be123c" /> {res.area}
                </p>
              </div>

              {/* Menu Items logic */}
              <div style={{ marginTop: '20px', backgroundColor: '#fff1f2', padding: '12px', borderRadius: '10px' }}>
                {res.items && res.items.length > 0 ? (
                  res.items.map(item => (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <p style={{ margin: 0, fontWeight: '600', fontSize: '0.9rem' }}>{item.name}</p>
                        <p style={{ margin: 0, color: '#be123c', fontWeight: 'bold' }}>₹{item.price}</p>
                      </div>
                      <button 
                        onClick={() => addToCart(item, res.name)}
                        style={{ backgroundColor: 'white', border: '1px solid #be123c', color: '#be123c', padding: '5px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                        Add +
                      </button>
                    </div>
                  ))
                ) : <p style={{ fontSize: '0.8rem' }}>Loading menu...</p>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* --- Side Cart Drawer --- */}
      {isCartOpen && (
        <div style={{ position: 'fixed', top: 0, right: 0, width: '350px', height: '100vh', backgroundColor: 'white', boxShadow: '-5px 0 15px rgba(0,0,0,0.1)', zIndex: 200, padding: '30px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
            <h2 style={{ margin: 0 }}>Your Cart 🛒</h2>
            <X size={24} style={{ cursor: 'pointer' }} onClick={() => setIsCartOpen(false)} />
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {cart.length === 0 ? (
              <p style={{ color: '#9ca3af', textAlign: 'center', marginTop: '50px' }}>Your cart is empty.</p>
            ) : (
              cart.map((item, index) => (
                <div key={index} style={{ marginBottom: '15px', borderBottom: '1px solid #f3f4f6', paddingBottom: '10px' }}>
                  <p style={{ margin: 0, fontWeight: 'bold' }}>{item.name}</p>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#6b7280' }}>from {item.restaurantName}</p>
                  <p style={{ margin: 0, color: '#be123c', fontWeight: 'bold' }}>₹{item.price}</p>
                </div>
              ))
            )}
          </div>

          <div style={{ marginTop: '20px', borderTop: '2px solid #f3f4f6', paddingTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '20px' }}>
              <span>Total:</span>
              <span>₹{totalPrice}</span>
            </div>
            <button 
              disabled={cart.length === 0}
              style={{ width: '100%', padding: '15px', backgroundColor: cart.length === 0 ? '#9ca3af' : '#be123c', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem' }}>
              Checkout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;