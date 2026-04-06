import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Utensils, Star, MapPin, Search, ShoppingCart, X, User, Lock, Mail, ClipboardList, LogOut, Home } from 'lucide-react';

function App() {
  // --- States ---
  const [restaurants, setRestaurants] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isOrdered, setIsOrdered] = useState(false);
  
  // Auth & View States
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [user, setUser] = useState(null);
  const [userId, setUserId] = useState(null);
  const [view, setView] = useState('home'); // 'home' ya 'orders'
  const [orders, setOrders] = useState([]);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });

  // --- Effects ---
  useEffect(() => {
    if (isLoggedIn && view === 'home') {
      axios.get('http://127.0.0.1:8002/restaurants')
        .then(res => setRestaurants(res.data))
        .catch(err => console.error("Error fetching restaurants:", err));
    }
    if (isLoggedIn && view === 'orders') {
      fetchOrders();
    }
  }, [isLoggedIn, view]);

  // --- Functions ---
  const fetchOrders = async () => {
    try {
      const res = await axios.get(`http://127.0.0.1:8003/orders/user/${userId || 1}`);
      setOrders(res.data);
    } catch (err) {
      console.error("Error fetching orders:", err);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      if (showRegister) {
        const res = await axios.post('http://127.0.0.1:8001/register', formData);
        alert(res.data.message);
        setShowRegister(false);
      } else {
        const res = await axios.post('http://127.0.0.1:8001/login', {
          email: formData.email,
          password: formData.password
        });
        setUser(res.data.user_name);
        setUserId(res.data.user_id || 1);
        setIsLoggedIn(true);
      }
    } catch (err) {
      alert("Auth Failed! Check Backend (8001)");
    }
  };

  const addToCart = (item, resId, resName) => {
    if (cart.length > 0 && cart[0].restaurantId !== resId) {
      alert(`Ek baar mein ek hi restaurant se order karein! (${cart[0].restaurantName})`);
      return;
    }
    setCart([...cart, { ...item, restaurantId: resId, restaurantName: resName }]);
    setIsCartOpen(true);
  };

  const handleCheckout = async () => {
    try {
      const orderData = {
        user_id: userId || 1,
        restaurant_id: cart[0].restaurantId,
        total_amount: cart.reduce((sum, i) => sum + i.price, 0)
      };
      await axios.post('http://127.0.0.1:8003/orders', orderData);
      setIsOrdered(true);
      setCart([]);
      setIsCartOpen(false);
      setTimeout(() => setIsOrdered(false), 3000);
    } catch (err) {
      alert("Order Failed! Check Order Service (8003)");
    }
  };

  const filteredRestaurants = restaurants.filter(res => 
    res.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    res.area.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- UI: Login View ---
  if (!isLoggedIn) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f3f4f6', fontFamily: 'sans-serif' }}>
        <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '15px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', width: '350px' }}>
          <h2 style={{ textAlign: 'center', color: '#be123c' }}>PuneFood Express</h2>
          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
            {showRegister && <input type="text" placeholder="Name" required onChange={e => setFormData({...formData, name: e.target.value})} style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }} />}
            <input type="email" placeholder="Email" required onChange={e => setFormData({...formData, email: e.target.value})} style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }} />
            <input type="password" placeholder="Password" required onChange={e => setFormData({...formData, password: e.target.value})} style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }} />
            <button type="submit" style={{ backgroundColor: '#be123c', color: 'white', padding: '12px', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>{showRegister ? 'Register' : 'Login'}</button>
          </form>
          <p onClick={() => setShowRegister(!showRegister)} style={{ textAlign: 'center', marginTop: '15px', cursor: 'pointer', color: '#666' }}>{showRegister ? 'Login instead' : 'New user? Register'}</p>
        </div>
      </div>
    );
  }

  // --- UI: Main Dashboard ---
  return (
    <div style={{ backgroundColor: '#f9fafb', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      {/* Navbar */}
      <nav style={{ backgroundColor: 'white', padding: '15px 50px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
        <h2 style={{ color: '#be123c', margin: 0, cursor: 'pointer' }} onClick={() => setView('home')}>PuneFood Express 🥘</h2>
        <div style={{ display: 'flex', gap: '25px', alignItems: 'center' }}>
          <div onClick={() => setView('home')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', color: view === 'home' ? '#be123c' : '#555' }}><Home size={20}/> Home</div>
          <div onClick={() => setView('orders')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', color: view === 'orders' ? '#be123c' : '#555' }}><ClipboardList size={20}/> My Orders</div>
          <div onClick={() => setIsLoggedIn(false)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', color: '#555' }}><LogOut size={20}/> Logout</div>
          <button onClick={() => setIsCartOpen(true)} style={{ backgroundColor: '#be123c', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '20px', cursor: 'pointer', position: 'relative' }}>
            <ShoppingCart size={18} /> {cart.length > 0 && <span style={{ position: 'absolute', top: '-5px', right: '-5px', background: 'black', borderRadius: '50%', padding: '2px 6px', fontSize: '10px' }}>{cart.length}</span>}
          </button>
        </div>
      </nav>

      <div style={{ padding: '30px 50px' }}>
        {view === 'home' ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '30px' }}>
              <input type="text" placeholder="Search for food or areas..." onChange={e => setSearchTerm(e.target.value)} style={{ width: '400px', padding: '12px 20px', borderRadius: '25px', border: '1px solid #ddd', outline: 'none' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '25px' }}>
              {filteredRestaurants.map(res => (
                <div key={res.id} style={{ backgroundColor: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><h3>{res.name}</h3> <span style={{ color: '#f59e0b' }}>{res.rating} ⭐</span></div>
                  <p style={{ color: '#666', fontSize: '14px' }}>{res.area} | {res.cuisine}</p>
                  <div style={{ marginTop: '15px', borderTop: '1px solid #eee', paddingTop: '10px' }}>
                    {res.items?.map(item => (
                      <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span>{item.name} - ₹{item.price}</span>
                        <button onClick={() => addToCart(item, res.id, res.name)} style={{ color: '#be123c', border: '1px solid #be123c', background: 'none', borderRadius: '5px', cursor: 'pointer', padding: '2px 8px' }}>Add +</button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div style={{ maxWidth: '800px', margin: '0 auto', backgroundColor: 'white', padding: '30px', borderRadius: '15px' }}>
            <h2>My Order History 📜</h2>
            {orders.length === 0 ? <p>No orders yet. Go eat something!</p> : (
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
                    <th style={{ padding: '10px' }}>Order ID</th>
                    <th>Status</th>
                    <th>Total Amount</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '15px 10px' }}>#{o.id}</td>
                      <td><span style={{ color: 'green', fontWeight: 'bold' }}>{o.status}</span></td>
                      <td>₹{o.total_amount}</td>
                      <td style={{ color: '#666', fontSize: '13px' }}>{new Date(o.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Cart Sidebar */}
      {isCartOpen && (
        <div style={{ position: 'fixed', top: 0, right: 0, width: '350px', height: '100%', backgroundColor: 'white', boxShadow: '-5px 0 15px rgba(0,0,0,0.1)', padding: '30px', zIndex: 100 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><h2>Cart</h2> <X onClick={() => setIsCartOpen(false)} style={{ cursor: 'pointer' }}/></div>
          {cart.length === 0 ? <p>Khali hai!</p> : (
            <>
              <p style={{ color: '#be123c', fontWeight: 'bold' }}>From: {cart[0].restaurantName}</p>
              {cart.map((item, i) => <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid #eee' }}>{item.name} - ₹{item.price}</div>)}
              <h3 style={{ marginTop: '20px' }}>Total: ₹{cart.reduce((s, i) => s + i.price, 0)}</h3>
              <button onClick={handleCheckout} style={{ width: '100%', padding: '15px', backgroundColor: '#be123c', color: 'white', border: 'none', borderRadius: '10px', marginTop: '20px', cursor: 'pointer', fontWeight: 'bold' }}>Place Order</button>
            </>
          )}
        </div>
      )}

      {/* Success Popup */}
      {isOrdered && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', backgroundColor: '#059669', color: 'white', padding: '15px 30px', borderRadius: '30px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', zIndex: 1000 }}>
          Order Successful! 🛵 Check Order History.
        </div>
      )}
    </div>
  );
}

export default App;