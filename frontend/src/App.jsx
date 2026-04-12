import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Utensils, Search, ShoppingCart, X, Store, LogOut, Home, ClipboardList, Bell, Bike, Star } from 'lucide-react';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(localStorage.getItem('isLoggedIn') === 'true');
  const [user, setUser] = useState(localStorage.getItem('userName') || null);
  const [userId, setUserId] = useState(localStorage.getItem('userId') || null);
  const [userRole, setUserRole] = useState(localStorage.getItem('userRole') || 'customer');

  const [restaurants, setRestaurants] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isOrdered, setIsOrdered] = useState(false);
  const [liveNotification, setLiveNotification] = useState(null);
  const [view, setView] = useState('home'); 
  
  const [orders, setOrders] = useState([]); 
  const [merchantOrders, setMerchantOrders] = useState([]); 
  const [availableOrders, setAvailableOrders] = useState([]); 
  const [myRiderOrders, setMyRiderOrders] = useState([]); 
  
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'customer' });
  const [showRegister, setShowRegister] = useState(false);
  const [merchantResId, setMerchantResId] = useState(1); 
  const ws = useRef(null); 

  // --- 📡 DATA FETCHING LOGIC ---
  const refreshData = () => {
    if (userRole === 'customer') {
        axios.get('http://127.0.0.1:8002/restaurants').then(res => setRestaurants(res.data));
        axios.get(`http://127.0.0.1:8003/orders/user/${userId}`).then(res => setOrders(res.data));
    } else if (userRole === 'merchant') {
        axios.get('http://127.0.0.1:8002/restaurants').then(res => setRestaurants(res.data));
        axios.get(`http://127.0.0.1:8003/orders/restaurant/${merchantResId}`).then(res => setMerchantOrders(res.data));
    } else if (userRole === 'rider') {
        axios.get(`http://127.0.0.1:8003/orders/available/`).then(res => setAvailableOrders(res.data));
        axios.get(`http://127.0.0.1:8003/orders/rider/${userId}`).then(res => setMyRiderOrders(res.data));
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      let channel = userRole === 'customer' ? `customer_${userId}` : userRole === 'merchant' ? `merchant_${merchantResId}` : 'riders';
      refreshData();

      ws.current = new WebSocket(`ws://127.0.0.1:8003/ws/${channel}`);
      ws.current.onmessage = (e) => {
        setLiveNotification(e.data);
        refreshData(); // 🔥 Live update on notification
        setTimeout(() => setLiveNotification(null), 5000);
      };
    }
    return () => ws.current?.close();
  }, [isLoggedIn, userRole, merchantResId, userId]);

  // --- ⚡ ACTION FUNCTIONS (FIXED) ---
  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      const url = showRegister ? 'register' : 'login';
      const res = await axios.post(`http://127.0.0.1:8001/${url}`, formData);
      if(!showRegister) {
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userName', res.data.user_name);
        localStorage.setItem('userId', res.data.user_id);
        localStorage.setItem('userRole', res.data.role);
        window.location.reload();
      } else {
        alert("Registration Successful!");
        setShowRegister(false);
      }
    } catch (err) { alert("Auth Failed!"); }
  };

  const updateStatus = async (id, status) => {
    try {
        await axios.patch(`http://127.0.0.1:8003/orders/${id}/status?status=${status}`);
        refreshData(); // 🔥 Refreshing UI after state change
    } catch (err) { console.error(err); }
  };

  const claimOrder = async (id) => {
    try {
        await axios.patch(`http://127.0.0.1:8003/orders/${id}/claim?rider_id=${userId}`);
        refreshData(); // 🔥 Refreshing UI after claim
    } catch (err) { alert("Could not claim order!"); }
  };

  const filteredRestaurants = restaurants.map(res => {
    const matchRes = res.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchItems = res.items?.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));
    if (matchRes) return res;
    if (matchItems && matchItems.length > 0) return { ...res, items: matchItems };
    return null;
  }).filter(res => res !== null);

  // --- 🧱 UI LAYOUT ---
  if (!isLoggedIn) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f3f4f6', fontFamily: 'sans-serif' }}>
      <form onSubmit={handleAuth} style={{ background: 'white', padding: '40px', borderRadius: '15px', width: '350px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
        <h2 style={{ textAlign: 'center', color: '#be123c' }}>PuneFood Express 🥘</h2>
        {showRegister && (
          <><input type="text" placeholder="Full Name" required onChange={e => setFormData({...formData, name: e.target.value})} style={{ width: '100%', margin: '10px 0', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', boxSizing: 'border-box' }} />
            <select onChange={e => setFormData({...formData, role: e.target.value})} style={{ width: '100%', margin: '10px 0', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', boxSizing: 'border-box' }}>
              <option value="customer">I am a Customer 🧑</option>
              <option value="merchant">I am a Restaurant Owner 👨‍🍳</option>
              <option value="rider">I am a Delivery Rider 🛵</option>
            </select></>
        )}
        <input type="email" placeholder="Email" required onChange={e => setFormData({...formData, email: e.target.value})} style={{ width: '100%', margin: '10px 0', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', boxSizing: 'border-box' }} />
        <input type="password" placeholder="Password" required onChange={e => setFormData({...formData, password: e.target.value})} style={{ width: '100%', margin: '10px 0', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', boxSizing: 'border-box' }} />
        <button type="submit" style={{ width: '100%', padding: '12px', background: '#be123c', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>{showRegister ? 'Register' : 'Login'}</button>
        <p onClick={() => setShowRegister(!showRegister)} style={{ textAlign: 'center', cursor: 'pointer', color: '#3b82f6', marginTop: '15px', fontSize: '14px' }}>{showRegister ? 'Back to Login' : 'New User? Create Account'}</p>
      </form>
    </div>
  );

  return (
    <div style={{ backgroundColor: '#f9fafb', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      {liveNotification && <div style={{ position: 'fixed', top: '20px', right: '20px', background: '#1e293b', color: 'white', padding: '15px 25px', borderRadius: '10px', zIndex: 1000, boxShadow: '0 4px 15px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', gap: '10px' }}> <Bell size={20} color="#f59e0b" /> {liveNotification}</div>}
      
      <nav style={{ background: 'white', padding: '15px 50px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
        <h2 onClick={() => setView('home')} style={{ color: '#be123c', cursor: 'pointer', margin: 0 }}>PuneFood Express 🥘</h2>
        <div style={{ display: 'flex', gap: '25px', alignItems: 'center' }}>
          {userRole === 'customer' && <><Home onClick={() => setView('home')} size={22} style={{cursor:'pointer', color: view==='home'?'#be123c':'#555'}} /><ClipboardList onClick={() => setView('orders')} size={22} style={{cursor:'pointer', color: view==='orders'?'#be123c':'#555'}} /><div style={{position:'relative'}}><ShoppingCart onClick={() => setIsCartOpen(true)} size={22} style={{cursor:'pointer'}} />{cart.length>0 && <span style={{position:'absolute', top:'-10px', right:'-10px', background:'#be123c', color:'white', borderRadius:'50%', padding:'2px 6px', fontSize:'10px'}}>{cart.length}</span>}</div></>}
          <span style={{ fontWeight: 'bold', color: '#333' }}>{user} <span style={{fontSize:'12px', color:'#666'}}>({userRole})</span></span>
          <LogOut onClick={() => {localStorage.clear(); window.location.reload();}} size={22} style={{ cursor: 'pointer', color: '#be123c' }} />
        </div>
      </nav>

      <div style={{ padding: '30px 50px' }}>
        {userRole === 'merchant' ? (
          <div style={{ maxWidth: '900px', margin: '0 auto', background: 'white', padding: '30px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <h2 style={{color:'#be123c', marginBottom:'20px'}}>👨‍🍳 Merchant Dashboard</h2>
            <div style={{marginBottom:'20px'}}>
                <label style={{fontWeight:'bold', marginRight:'10px'}}>Outlet:</label>
                <select value={merchantResId} onChange={e => setMerchantResId(e.target.value)} style={{padding:'8px', borderRadius:'5px', border:'1px solid #ddd'}}>
                    <option value="1">Goodluck Cafe</option><option value="2">Vaishali</option><option value="3">Bedekar Misal</option><option value="4">Blue Nile</option>
                </select>
            </div>
            {merchantOrders.length === 0 ? <p>No orders yet.</p> : merchantOrders.map(o => (
                <div key={o.id} style={{ border: '1px solid #eee', padding: '20px', borderRadius: '10px', marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div><h3 style={{margin:0}}>Order #{o.id}</h3><p style={{margin:0, color:'#666'}}>Status: <b>{o.status}</b> | Amount: ₹{o.total_amount}</p></div>
                    <div>
                        {o.status === 'Pending' && <button onClick={() => updateStatus(o.id, 'Preparing')} style={{background:'#f59e0b', color:'white', border:'none', padding:'10px 20px', borderRadius:'5px', cursor:'pointer', fontWeight:'bold'}}>Accept</button>}
                        {o.status === 'Preparing' && <button onClick={() => updateStatus(o.id, 'Ready')} style={{background:'#10b981', color:'white', border:'none', padding:'10px 20px', borderRadius:'5px', cursor:'pointer', fontWeight:'bold'}}>Ready</button>}
                        {o.status === 'Ready' && <span style={{color:'#10b981', fontWeight:'bold'}}>✓ Ready</span>}
                    </div>
                </div>
            ))}
          </div>
        ) : userRole === 'rider' ? (
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <div style={{ background: 'white', padding: '30px', borderRadius: '15px', marginBottom: '25px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border:'2px solid #bfdbfe' }}>
                <h3 style={{marginTop:0, color:'#1e40af'}}>🚨 Ready for Pickup (Pool)</h3>
                {availableOrders.length === 0 ? <p>No orders in pool.</p> : availableOrders.map(o => (
                    <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 0', borderBottom: '1px solid #f3f4f6', alignItems:'center' }}>
                        <span>Order #{o.id} - Food Ready</span>
                        <button onClick={() => claimOrder(o.id)} style={{background:'#3b82f6', color:'white', border:'none', padding:'8px 15px', borderRadius:'5px', cursor:'pointer', fontWeight:'bold'}}>Claim Order</button>
                    </div>
                ))}
            </div>
            <div style={{ background: 'white', padding: '30px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border:'2px solid #10b981' }}>
                <h3 style={{marginTop:0, color:'#065f46'}}>🎒 My Active Jobs</h3>
                {myRiderOrders.length === 0 ? <p>No active jobs.</p> : myRiderOrders.map(o => (
                    <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 0', borderBottom: '1px solid #f3f4f6', alignItems:'center' }}>
                        <span>Order #{o.id} - <b style={{color:'#3b82f6'}}>{o.status}</b></span>
                        <button onClick={() => updateStatus(o.id, 'Delivered')} style={{background:'#10b981', color:'white', border:'none', padding:'8px 15px', borderRadius:'5px', cursor:'pointer', fontWeight:'bold'}}>Mark Delivered</button>
                    </div>
                ))}
            </div>
          </div>
        ) : (
          view === 'home' ? (
            <div>
                <div style={{ maxWidth: '600px', margin: '0 auto 40px auto', position: 'relative' }}>
                    <Search size={20} color="#9ca3af" style={{ position: 'absolute', left: '15px', top: '15px' }} />
                    <input type="text" placeholder="Search for Biryani, Pizza..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: '100%', padding: '15px 20px 15px 45px', borderRadius: '30px', border: '1px solid #e5e7eb', fontSize: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', boxSizing: 'border-box' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '30px', maxWidth: '1200px', margin: '0 auto' }}>
                    {filteredRestaurants.map(res => (
                        <div key={res.id} style={{ background: 'white', padding: '25px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border:'1px solid #f3f4f6' }}>
                            <div style={{display:'flex', justifyContent:'space-between'}}><h3>{res.name}</h3> <span style={{color:'#f59e0b', fontWeight:'bold'}}>{res.rating} ⭐</span></div>
                            <div style={{ marginTop: '15px', borderTop: '1px solid #eee', paddingTop: '15px' }}>
                                {res.items?.map(i => (
                                    <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', alignItems:'center' }}>
                                        <div><b>{i.name}</b><br/><span style={{fontSize:'14px', color:'#666'}}>₹{i.price}</span></div>
                                        <button onClick={() => {
                                            if(cart.length>0 && cart[0].restaurantId !== res.id) { if(window.confirm('Clear cart?')) setCart([{...i, restaurantId: res.id, restaurantName: res.name}]); }
                                            else { setCart([...cart, {...i, restaurantId: res.id, restaurantName: res.name}]); }
                                            setIsCartOpen(true);
                                        }} style={{ color: '#be123c', border: '1px solid #be123c', background: 'none', borderRadius: '8px', cursor: 'pointer', padding: '5px 12px', fontWeight: 'bold' }}>ADD</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
          ) : (
            <div style={{ maxWidth: '800px', margin: '0 auto', background: 'white', padding: '40px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                <h2 style={{color:'#be123c'}}>My History 📜</h2>
                {orders.map(o => (
                    <div key={o.id} style={{ padding: '20px 0', borderBottom: '1px solid #eee', display:'flex', justifyContent:'space-between' }}>
                        <div><b>Order #{o.id}</b></div>
                        <div style={{fontWeight:'bold', color: o.status === 'Delivered'?'#10b981':'#3b82f6'}}>{o.status}</div>
                        <div style={{fontWeight:'bold'}}>₹{o.total_amount}</div>
                    </div>
                ))}
            </div>
          )
        )}
      </div>

      {isCartOpen && (
        <div style={{ position: 'fixed', right: 0, top: 0, width: '380px', height: '100%', background: 'white', padding: '30px', boxShadow: '-5px 0 20px rgba(0,0,0,0.1)', zIndex: 100, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #f3f4f6', paddingBottom:'15px' }}>
                <h2 style={{margin:0}}>Cart 🛒</h2>
                <X onClick={() => setIsCartOpen(false)} style={{ cursor: 'pointer' }}/>
            </div>
            {cart.length > 0 ? (
                <div style={{flex: 1, overflowY: 'auto'}}>
                    <p style={{ color: '#be123c', fontWeight: 'bold' }}>From: {cart[0].restaurantName}</p>
                    {cart.map((i, idx) => (
                        <div key={idx} style={{display:'flex', justifyContent:'space-between', padding:'12px 0', borderBottom:'1px solid #f3f4f6'}}>
                            <span>{i.name}</span><b>₹{i.price}</b>
                        </div>
                    ))}
                    <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#f9fafb', borderRadius: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}><span>Item Total</span><span>₹{cart.reduce((s,i)=>s+i.price,0)}</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}><span>Fee</span><span>₹40</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #ddd', paddingTop: '15px', fontWeight: 'bold', fontSize: '20px' }}><span>To Pay</span><span>₹{cart.reduce((s,i)=>s+i.price,0)+40}</span></div>
                    </div>
                    <button onClick={async () => {
                        const total = cart.reduce((s, i) => s + i.price, 0) + 40;
                        await axios.post('http://127.0.0.1:8003/orders', { user_id: userId, restaurant_id: cart[0].restaurantId, total_amount: total });
                        setIsOrdered(true); setCart([]); setIsCartOpen(false); refreshData();
                        setTimeout(() => setIsOrdered(false), 3000);
                    }} style={{ width: '100%', padding: '15px', background: '#be123c', color: 'white', border: 'none', borderRadius: '10px', marginTop: '20px', cursor: 'pointer', fontWeight: 'bold' }}>Checkout</button>
                </div>
            ) : <div style={{textAlign:'center', marginTop:'50px'}}><ShoppingCart size={60} style={{opacity:0.2, margin:'0 auto'}}/><h3>Empty</h3></div>}
        </div>
      )}

      {isOrdered && (
        <div style={{ position: 'fixed', bottom: '40px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#10b981', color: 'white', padding: '15px 40px', borderRadius: '40px', boxShadow: '0 4px 15px rgba(0,0,0,0.3)', zIndex: 1000, fontWeight: 'bold' }}>🚀 Order Placed!</div>
      )}
    </div>
  );
}

export default App;