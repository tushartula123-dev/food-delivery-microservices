import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Utensils, Search, ShoppingCart, X, Store, LogOut, Home, ClipboardList, Bell, Bike, Star } from 'lucide-react';

function App() {
  // --- 🛠️ SESSION STORAGE LOGIC (Identity Crisis & Direct Entry Fix) ---
  // SessionStorage clears when the tab is closed.
  const [isLoggedIn, setIsLoggedIn] = useState(sessionStorage.getItem('isLoggedIn') === 'true');
  const [user, setUser] = useState(sessionStorage.getItem('userName'));
  const [userId, setUserId] = useState(sessionStorage.getItem('userId'));
  const [userRole, setUserRole] = useState(sessionStorage.getItem('userRole'));

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

  // --- 📡 DATA FETCHING ---
  const refreshData = () => {
    // Reading directly from session to ensure NO stale data
    const currentRole = sessionStorage.getItem('userRole');
    const currentId = sessionStorage.getItem('userId');

    if (!currentRole || !currentId) return;

    if (currentRole === 'customer') {
        axios.get('http://localhost:8002/restaurants').then(res => setRestaurants(res.data));
        axios.get(`http://localhost:8003/orders/user/${currentId}`).then(res => setOrders(res.data));
    } else if (currentRole === 'merchant') {
        axios.get(`http://localhost:8003/orders/restaurant/${merchantResId}`).then(res => setMerchantOrders(res.data));
    } else if (currentRole === 'rider') {
        axios.get(`http://localhost:8003/orders/available/`).then(res => setAvailableOrders(res.data));
        axios.get(`http://localhost:8003/orders/rider/${currentId}`).then(res => setMyRiderOrders(res.data));
    }
  };

  // --- 🔍 FILTER LOGIC ---
  const filteredRestaurants = restaurants.map(res => {
    const matchRes = res.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchItems = res.items?.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));
    if (matchRes) return res;
    if (matchItems && matchItems.length > 0) return { ...res, items: matchItems };
    return null;
  }).filter(res => res !== null);

  useEffect(() => {
    if (isLoggedIn && userRole) {
      let channel = userRole === 'customer' ? `customer_${userId}` : userRole === 'merchant' ? `merchant_${merchantResId}` : 'riders';
      refreshData();

      // Standardizing to localhost for WebSockets
      ws.current = new WebSocket(`ws://localhost:8003/ws/${channel}`);
      ws.current.onmessage = (e) => {
        setLiveNotification(e.data);
        refreshData(); 
        setTimeout(() => setLiveNotification(null), 6000);
      };
      
      ws.current.onerror = () => console.log("WebSocket Connection Pending...");
    }
    return () => ws.current?.close();
  }, [isLoggedIn, userRole, merchantResId, userId]);

  // --- ⚡ AUTH ACTIONS (Using SessionStorage) ---
  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      const url = showRegister ? 'register' : 'login';
      const res = await axios.post(`http://localhost:8001/${url}`, formData);
      
      if(!showRegister) {
        // Save to SessionStorage instead of LocalStorage
        sessionStorage.setItem('isLoggedIn', 'true');
        sessionStorage.setItem('userName', res.data.user_name);
        sessionStorage.setItem('userId', res.data.user_id);
        sessionStorage.setItem('userRole', res.data.role);
        
        // Sync State
        setIsLoggedIn(true);
        setUser(res.data.user_name);
        setUserId(res.data.user_id);
        setUserRole(res.data.role);
        
        window.location.reload(); 
      } else {
        alert("Registration Successful! Please Login.");
        setShowRegister(false);
      }
    } catch (err) { alert("Auth Failed! Check Backend (Port 8001)"); }
  };

  const handleLogout = () => {
    sessionStorage.clear(); // Clears everything for this tab
    window.location.href = '/'; // Forces back to root
  };

  const updateStatus = async (id, status) => {
    try {
        await axios.patch(`http://localhost:8003/orders/${id}/status?status=${status}`);
        refreshData();
    } catch (err) { console.error(err); }
  };

  const claimOrder = async (id) => {
    try {
        await axios.patch(`http://localhost:8003/orders/${id}/claim?rider_id=${userId}`);
        refreshData();
    } catch (err) { alert("Could not claim order!"); }
  };

  // --- 🧱 UI RENDER ---

  // 1. LOGIN / REGISTER VIEW
  if (!isLoggedIn) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'linear-gradient(135deg, #be123c 0%, #881337 100%)', fontFamily: 'sans-serif' }}>
      <form onSubmit={handleAuth} style={{ background: 'white', padding: '40px', borderRadius: '25px', width: '380px', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
        <h1 style={{ textAlign: 'center', color: '#be123c', fontSize: '2.5rem', margin: '0 0 10px 0' }}>PuneFood🥘</h1>
        <p style={{textAlign: 'center', color:'#666', marginBottom: '30px'}}>Welcome to Pune's fastest delivery</p>
        
        {showRegister && (
          <><input type="text" placeholder="Full Name" required onChange={e => setFormData({...formData, name: e.target.value})} style={{ width: '100%', margin: '10px 0', padding: '14px', borderRadius: '10px', border: '1px solid #ddd', boxSizing: 'border-box' }} />
            <select onChange={e => setFormData({...formData, role: e.target.value})} style={{ width: '100%', margin: '10px 0', padding: '14px', borderRadius: '10px', border: '1px solid #ddd', boxSizing: 'border-box', background:'#f9fafb' }}>
              <option value="customer">Customer 🧑</option>
              <option value="merchant">Restaurant Owner 👨‍🍳</option>
              <option value="rider">Delivery Rider 🛵</option>
            </select></>
        )}
        <input type="email" placeholder="Email Address" required onChange={e => setFormData({...formData, email: e.target.value})} style={{ width: '100%', margin: '10px 0', padding: '14px', borderRadius: '10px', border: '1px solid #ddd', boxSizing: 'border-box' }} />
        <input type="password" placeholder="Password" required onChange={e => setFormData({...formData, password: e.target.value})} style={{ width: '100%', margin: '10px 0', padding: '14px', borderRadius: '10px', border: '1px solid #ddd', boxSizing: 'border-box' }} />
        <button type="submit" style={{ width: '100%', padding: '15px', background: '#be123c', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', marginTop: '15px', fontSize:'16px' }}>{showRegister ? 'Register Now' : 'Sign In'}</button>
        <p onClick={() => setShowRegister(!showRegister)} style={{ textAlign: 'center', cursor: 'pointer', color: '#3b82f6', marginTop: '20px', fontSize: '14px' }}>{showRegister ? 'Back to Login' : 'Need an account? Create one'}</p>
      </form>
    </div>
  );

  // 2. DASHBOARD VIEW (Customer / Merchant / Rider)
  return (
    <div style={{ backgroundColor: '#f3f4f6', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      {liveNotification && <div style={{ position: 'fixed', top: '25px', right: '25px', background: '#1e293b', color: 'white', padding: '20px 30px', borderRadius: '15px', zIndex: 1000, boxShadow: '0 10px 25px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', gap: '15px', borderLeft: '6px solid #f59e0b' }}> <Bell size={24} color="#f59e0b" /> {liveNotification}</div>}
      
      <nav style={{ background: 'white', padding: '15px 60px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', position: 'sticky', top: 0, zIndex: 50 }}>
        <h2 onClick={() => setView('home')} style={{ color: '#be123c', cursor: 'pointer', margin: 0, fontSize: '28px' }}>PuneFood🥘</h2>
        <div style={{ display: 'flex', gap: '35px', alignItems: 'center' }}>
          {userRole === 'customer' && (
            <><Home onClick={() => setView('home')} size={26} style={{cursor:'pointer', color: view==='home'?'#be123c':'#6b7280'}} />
              <ClipboardList onClick={() => setView('orders')} size={26} style={{cursor:'pointer', color: view==='orders'?'#be123c':'#6b7280'}} />
              <div style={{position:'relative'}}><ShoppingCart onClick={() => setIsCartOpen(true)} size={26} style={{cursor:'pointer', color: isCartOpen?'#be123c':'#6b7280'}} />{cart.length>0 && <span style={{position:'absolute', top:'-12px', right:'-12px', background:'#be123c', color:'white', borderRadius:'50%', width:'22px', height:'22px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:'bold'}}>{cart.length}</span>}</div>
            </>
          )}
          <div style={{ background: '#fef2f2', padding: '8px 18px', borderRadius: '25px', border: '1px solid #fee2e2' }}>
            <span style={{ fontWeight: 'bold', color: '#991b1b' }}>{user} <small style={{color:'#be123c', textTransform:'uppercase', marginLeft:'5px'}}>[{userRole}]</small></span>
          </div>
          <LogOut onClick={handleLogout} size={26} style={{ cursor: 'pointer', color: '#be123c' }} />
        </div>
      </nav>

      <div style={{ padding: '40px 60px' }}>
        
        {/* MERCHANT LOGIC */}
        {userRole === 'merchant' && (
          <div style={{ maxWidth: '1000px', margin: '0 auto', background: 'white', padding: '40px', borderRadius: '25px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
            <h2 style={{color:'#111827', margin:'0 0 30px 0'}}>👨‍🍳 Orders Management</h2>
            <div style={{marginBottom:'30px', padding:'15px', background:'#f9fafb', borderRadius:'12px'}}>
                <label style={{fontWeight:'bold', marginRight:'15px'}}>Current Outlet:</label>
                <select value={merchantResId} onChange={e => setMerchantResId(e.target.value)} style={{padding:'10px 20px', borderRadius:'10px', border:'1px solid #ddd', fontWeight:'600', color:'#be123c'}}>
                    <option value="1">Goodluck Cafe (Deccan)</option><option value="2">Vaishali (FC Rd)</option><option value="3">Bedekar Misal</option><option value="4">Blue Nile (Camp)</option>
                </select>
            </div>
            {merchantOrders.length === 0 ? <p style={{color:'#666'}}>No orders for this outlet yet.</p> : merchantOrders.map(o => (
                <div key={o.id} style={{ border: '1px solid #f3f4f6', padding: '25px', borderRadius: '20px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff' }}>
                    <div><h3 style={{margin:0, color:'#111827'}}>Order #{o.id}</h3><p style={{margin:'5px 0 0 0', color:'#6b7280'}}>Status: <b style={{color: o.status==='Pending'?'#d97706':'#059669'}}>{o.status}</b> | ₹{o.total_amount}</p></div>
                    <div style={{display:'flex', gap:'10px'}}>
                        {o.status === 'Pending' && <button onClick={() => updateStatus(o.id, 'Preparing')} style={{background:'#d97706', color:'white', border:'none', padding:'12px 25px', borderRadius:'10px', cursor:'pointer', fontWeight:'bold'}}>Accept & Cook</button>}
                        {o.status === 'Preparing' && <button onClick={() => updateStatus(o.id, 'Ready')} style={{background:'#059669', color:'white', border:'none', padding:'12px 25px', borderRadius:'10px', cursor:'pointer', fontWeight:'bold'}}>Mark Ready</button>}
                        {o.status === 'Ready' && <span style={{color:'#059669', fontWeight:'bold', display:'flex', alignItems:'center', gap:'5px'}}><Star size={18} fill="#059669"/> Ready for Pickup</span>}
                    </div>
                </div>
            ))}
          </div>
        )}

        {/* RIDER LOGIC */}
        {userRole === 'rider' && (
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ background: 'white', padding: '35px', borderRadius: '25px', marginBottom: '35px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', border:'2px solid #bfdbfe' }}>
                <h3 style={{marginTop:0, color:'#1e40af', display:'flex', alignItems:'center', gap:'10px'}}><Bell size={22}/> Available for Pickup</h3>
                {availableOrders.length === 0 ? <p style={{color:'#666'}}>No orders in the pool. Stay tuned!</p> : availableOrders.map(o => (
                    <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '20px', borderBottom: '1px solid #f3f4f6', alignItems:'center', background:'#f8fafc', borderRadius:'15px', marginBottom:'10px' }}>
                        <span><b>Order #{o.id}</b> is ready for pickup</span>
                        <button onClick={() => claimOrder(o.id)} style={{background:'#2563eb', color:'white', border:'none', padding:'12px 25px', borderRadius:'10px', cursor:'pointer', fontWeight:'bold'}}>Pick Up Order</button>
                    </div>
                ))}
            </div>
            <div style={{ background: 'white', padding: '35px', borderRadius: '25px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', border:'2px solid #10b981' }}>
                <h3 style={{marginTop:0, color:'#065f46', display:'flex', alignItems:'center', gap:'10px'}}><Bike size={22}/> My Active Jobs</h3>
                {myRiderOrders.length === 0 ? <p style={{color:'#666'}}>No active deliveries.</p> : myRiderOrders.map(o => (
                    <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '20px', borderBottom: '1px solid #f3f4f6', alignItems:'center', background:'#ecfdf5', borderRadius:'15px', marginBottom:'10px' }}>
                        <span>Order #{o.id} - <b style={{color:'#2563eb'}}>{o.status}</b></span>
                        <button onClick={() => updateStatus(o.id, 'Delivered')} style={{background:'#059669', color:'white', border:'none', padding:'12px 25px', borderRadius:'10px', cursor:'pointer', fontWeight:'bold'}}>Mark Delivered</button>
                    </div>
                ))}
            </div>
          </div>
        )}

        {/* CUSTOMER LOGIC */}
        {userRole === 'customer' && (
          view === 'home' ? (
            <div>
                <div style={{ maxWidth: '650px', margin: '0 auto 50px auto', position: 'relative' }}>
                    <Search size={24} color="#9ca3af" style={{ position: 'absolute', left: '20px', top: '18px' }} />
                    <input type="text" placeholder="Search for Misal, Biryani, Dosa..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: '100%', padding: '18px 25px 18px 60px', borderRadius: '40px', border: '1px solid #e5e7eb', fontSize: '18px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', outline:'none' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '40px', maxWidth: '1200px', margin: '0 auto' }}>
                    {filteredRestaurants.map(res => (
                        <div key={res.id} style={{ background: 'white', borderRadius: '25px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', overflow:'hidden', border:'1px solid #f3f4f6' }}>
                            <div style={{background:'#be123c', padding:'20px', color:'white', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                <h3 style={{margin:0}}>{res.name}</h3>
                                <span style={{background:'rgba(255,255,255,0.2)', padding:'4px 12px', borderRadius:'15px', fontWeight:'bold'}}>{res.rating} ⭐</span>
                            </div>
                            <div style={{ padding: '25px' }}>
                                {res.items?.map(i => (
                                    <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems:'center' }}>
                                        <div><b style={{color:'#374151'}}>{i.name}</b><br/><span style={{fontSize:'14px', color:'#6b7280'}}>₹{i.price}</span></div>
                                        <button onClick={() => {
                                            if(cart.length>0 && cart[0].restaurantId !== res.id) { 
                                                if(window.confirm('Adding items from this restaurant will clear your current cart. Continue?')) 
                                                    setCart([{...i, restaurantId: res.id, restaurantName: res.name}]); 
                                            }
                                            else { setCart([...cart, {...i, restaurantId: res.id, restaurantName: res.name}]); }
                                            setIsCartOpen(true);
                                        }} style={{ color: '#be123c', border: '2px solid #be123c', background: 'none', borderRadius: '12px', cursor: 'pointer', padding: '6px 18px', fontWeight: 'bold' }}>ADD</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
          ) : (
            <div style={{ maxWidth: '900px', margin: '0 auto', background: 'white', padding: '45px', borderRadius: '30px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
                <h2 style={{color:'#111827', borderBottom:'2px solid #f3f4f6', paddingBottom:'20px', marginBottom:'30px'}}>My Recent Orders 📜</h2>
                {orders.length === 0 ? <p>No orders yet. Time to eat!</p> : [...orders].reverse().map(o => (
                    <div key={o.id} style={{ padding: '25px 0', borderBottom: '1px solid #f3f4f6', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <div><b style={{fontSize:'18px'}}>Order #{o.id}</b><br/><small style={{color:'#6b7280'}}>Tracking live</small></div>
                        <div><span style={{fontWeight:'bold', padding:'8px 20px', borderRadius:'20px', background: o.status === 'Delivered' ? '#d1fae5' : '#ffedd5', color: o.status === 'Delivered' ? '#065f46' : '#9a3412'}}>{o.status}</span></div>
                        <div style={{fontWeight:'bold', fontSize:'20px', color:'#111827'}}>₹{o.total_amount}</div>
                    </div>
                ))}
            </div>
          )
        )}
      </div>

      {/* 🛒 CART SIDEBAR */}
      {isCartOpen && (
        <div style={{ position: 'fixed', right: 0, top: 0, width: '420px', height: '100%', background: 'white', padding: '40px', boxShadow: '-15px 0 35px rgba(0,0,0,0.15)', zIndex: 100, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom:'2px solid #f3f4f6', paddingBottom:'20px' }}>
                <h2 style={{margin:0, color:'#111827'}}>Your Cart 🛒</h2>
                <X onClick={() => setIsCartOpen(false)} style={{ cursor: 'pointer', color:'#6b7280' }} size={30}/>
            </div>
            {cart.length > 0 ? (
                <div style={{flex: 1, overflowY: 'auto'}}>
                    <div style={{background:'#fef2f2', padding:'15px', borderRadius:'12px', marginBottom:'25px', border:'1px solid #fee2e2'}}>
                        <p style={{ color: '#be123c', fontWeight: 'bold', margin:0 }}>Cooking at: {cart[0].restaurantName}</p>
                    </div>
                    {cart.map((i, idx) => (
                        <div key={idx} style={{display:'flex', justifyContent:'space-between', padding:'15px 0', borderBottom:'1px solid #f3f4f6'}}>
                            <span style={{color:'#4b5563'}}>{i.name}</span><b style={{color:'#111827'}}>₹{i.price}</b>
                        </div>
                    ))}
                    <div style={{ marginTop: '40px', padding: '30px', backgroundColor: '#f9fafb', borderRadius: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', color:'#6b7280' }}><span>Subtotal</span><span>₹{cart.reduce((s,i)=>s+i.price,0)}</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', color:'#6b7280' }}><span>Delivery Fee</span><span>₹40</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px dashed #d1d5db', paddingTop: '20px', fontWeight: 'bold', fontSize: '24px', color:'#111827' }}><span>To Pay</span><span>₹{cart.reduce((s,i)=>s+i.price,0)+40}</span></div>
                    </div>
                    <button onClick={async () => {
                        const total = cart.reduce((s, i) => s + i.price, 0) + 40;
                        try {
                            await axios.post('http://localhost:8003/orders', { user_id: userId, restaurant_id: cart[0].restaurantId, total_amount: total });
                            setIsOrdered(true); setCart([]); setIsCartOpen(false); refreshData();
                            setTimeout(() => setIsOrdered(false), 5000);
                        } catch (err) { alert("Checkout Failed!"); }
                    }} style={{ width: '100%', padding: '20px', background: '#be123c', color: 'white', border: 'none', borderRadius: '15px', marginTop: '30px', cursor: 'pointer', fontWeight: 'bold', fontSize:'18px', boxShadow: '0 10px 15px -3px rgba(190, 18, 60, 0.4)' }}>Place Order 🚀</button>
                </div>
            ) : <div style={{textAlign:'center', marginTop:'100px'}}><ShoppingCart size={100} style={{opacity:0.1, margin:'0 auto'}}/><h3 style={{color:'#9ca3af'}}>Cart is looking empty!</h3></div>}
        </div>
      )}

      {isOrdered && (
        <div style={{ position: 'fixed', bottom: '50px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#059669', color: 'white', padding: '18px 50px', borderRadius: '50px', boxShadow: '0 10px 25px rgba(5, 150, 105, 0.4)', zIndex: 1000, fontWeight: 'bold', fontSize:'18px' }}>🚀 Success! Order sent to the kitchen.</div>
      )}
    </div>
  );
}

export default App;