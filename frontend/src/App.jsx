import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Search, ShoppingCart, X, LogOut, Home, ClipboardList, Bell, MapPin, RotateCcw, QrCode, Wallet, PlusCircle, CheckCircle, ChefHat, Bike, Phone, Receipt, Calendar, Key, IndianRupee } from 'lucide-react';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(sessionStorage.getItem('isLoggedIn') === 'true');
  const [user, setUser] = useState(sessionStorage.getItem('userName'));
  const [userId, setUserId] = useState(sessionStorage.getItem('userId'));
  const [userRole, setUserRole] = useState(sessionStorage.getItem('userRole'));
  
  const [walletBalance, setWalletBalance] = useState(parseFloat(sessionStorage.getItem('walletBalance')) || 0.0);

  const [restaurants, setRestaurants] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isOrdered, setIsOrdered] = useState(false);
  const [isPaying, setIsPaying] = useState(false); 
  const [liveNotification, setLiveNotification] = useState(null);
  const [view, setView] = useState('home'); 
  
  const [address, setAddress] = useState(sessionStorage.getItem('userAddress') || 'Select your address');
  const [paymentMethod, setPaymentMethod] = useState('Wallet'); 

  const [orders, setOrders] = useState([]); 
  const [merchantOrders, setMerchantOrders] = useState([]); 
  const [availableOrders, setAvailableOrders] = useState([]); 
  const [myRiderOrders, setMyRiderOrders] = useState([]); 
  
  const [riderDetailsMap, setRiderDetailsMap] = useState({});
  const [myRestaurants, setMyRestaurants] = useState([]);
  const [newResName, setNewResName] = useState('');
  const [newItem, setNewItem] = useState({ name: '', price: '', is_veg: true });

  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'customer', phone_number: '', vehicle_number: '' });
  const [showRegister, setShowRegister] = useState(false);
  const [merchantResId, setMerchantResId] = useState(sessionStorage.getItem('merchantResId') || ''); 
  const ws = useRef(null); 

  const refreshData = async () => {
    const currentRole = sessionStorage.getItem('userRole');
    const currentId = sessionStorage.getItem('userId');
    if (!currentRole || !currentId) return;

    let resMap = {};
    try {
        const resData = await axios.get('http://localhost:8002/restaurants');
        setRestaurants(resData.data);
        resData.data.forEach(r => resMap[r.id] = r.name); 
    } catch(e) {}

    try {
        const userRes = await axios.get(`http://localhost:8001/users/${currentId}`);
        setWalletBalance(userRes.data.wallet_balance);
        sessionStorage.setItem('walletBalance', userRes.data.wallet_balance);
    } catch (e) {}

    if (currentRole === 'customer') {
        axios.get(`http://localhost:8003/orders/user/${currentId}`).then(async (res) => {
            const ordersWithNames = res.data.map(o => ({...o, restaurant_name: resMap[o.restaurant_id] || "Restaurant"}));
            setOrders(ordersWithNames);

            const activeOrders = res.data.filter(o => o.status !== 'Delivered' && o.rider_id);
            let newRiderDetails = {...riderDetailsMap};
            for(let order of activeOrders) {
                if(!newRiderDetails[order.rider_id]) {
                    try {
                        const riderRes = await axios.get(`http://localhost:8001/users/${order.rider_id}`);
                        newRiderDetails[order.rider_id] = riderRes.data;
                    } catch(e) {}
                }
            }
            setRiderDetailsMap(newRiderDetails);
        }).catch(e=>console.log(e));
    } else if (currentRole === 'merchant') {
        axios.get(`http://localhost:8002/restaurants/merchant/${currentId}`).then(res => {
            setMyRestaurants(res.data);
            if(res.data.length > 0 && !merchantResId) {
                setMerchantResId(res.data[0].id);
                sessionStorage.setItem('merchantResId', res.data[0].id);
            }
        }).catch(e=>console.log(e));
        
        if (merchantResId) {
            axios.get(`http://localhost:8003/orders/restaurant/${merchantResId}`).then(res => setMerchantOrders(res.data)).catch(e=>console.log(e));
        }
    } else if (currentRole === 'rider') {
        axios.get(`http://localhost:8003/orders/available/`).then(res => setAvailableOrders(res.data)).catch(e=>console.log(e));
        axios.get(`http://localhost:8003/orders/rider/${currentId}`).then(res => setMyRiderOrders(res.data)).catch(e=>console.log(e));
    }
  };

  useEffect(() => {
    if (!isLoggedIn || !userRole) return;
    
    let channel = userRole === 'customer' ? `customer_${userId}` : userRole === 'merchant' ? `merchant_${merchantResId}` : 'riders';
    refreshData();
    
    const connectWS = () => {
        if (!merchantResId && userRole === 'merchant') return; 
        const socket = new WebSocket(`ws://localhost:8003/ws/${channel}`);
        ws.current = socket;
        socket.onopen = () => console.log("✅ WebSocket Connected:", channel);
        socket.onmessage = (e) => {
            if(e.data === "REFRESH_DATA") { refreshData(); return; }
            setLiveNotification(e.data);
            refreshData(); 
            setTimeout(() => setLiveNotification(null), 6000);
        };
        socket.onclose = () => setTimeout(connectWS, 3000);
    };
    connectWS();

    return () => { if (ws.current && ws.current.readyState === 1) ws.current.close(); };
  }, [isLoggedIn, userRole, merchantResId, userId]);

  const filteredRestaurants = restaurants.map(res => {
    const matchRes = res.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchItems = res.items?.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));
    if (matchRes) return res;
    if (matchItems && matchItems.length > 0) return { ...res, items: matchItems };
    return null;
  }).filter(res => res !== null);

  const detectLocation = () => {
    setAddress("📍 Detecting...");
    setTimeout(() => {
      const loc = "FC Road, Deccan Gymkhana, Pune, MH 411004";
      setAddress(loc);
      sessionStorage.setItem('userAddress', loc);
    }, 1000);
  };

  const handleAddToCart = (item, res) => {
    if (cart.length > 0 && cart[0].restaurantId !== res.id) {
        if (window.confirm(`Cart mein pehle se ${cart[0].restaurantName} ka khana hai. Naya order shuru karein?`)) {
            setCart([{...item, restaurantId: res.id, restaurantName: res.name}]);
            setIsCartOpen(true);
        }
    } else {
        setCart([...cart, {...item, restaurantId: res.id, restaurantName: res.name}]);
        setIsCartOpen(true);
    }
  };

  const handleCheckout = async () => {
    if (!address.trim() || address === 'Select your address') { alert("Please enter your delivery address!"); return; }
    const total = cart.reduce((s, i) => s + i.price, 0) + 40;
    
    // 🔥 NEW: Extract Items Summary for Receipt
    const itemsSummaryString = cart.map(i => i.name).join(', ');

    setIsPaying(true); 
    
    setTimeout(async () => {
      try {
        if(paymentMethod === 'Wallet') {
             await axios.post(`http://localhost:8001/users/${userId}/wallet/deduct`, { amount: total });
        }
        await axios.post('http://localhost:8003/orders', { 
            user_id: userId, 
            restaurant_id: cart[0].restaurantId, 
            total_amount: total, 
            address: address,
            items_summary: itemsSummaryString // Sent to backend
        });
        setIsPaying(false); setIsOrdered(true); setCart([]); setIsCartOpen(false); refreshData();
      } catch (err) { 
        setIsPaying(false); 
        alert(err.response?.data?.detail || "Transaction Failed! Check server connections.");
      }
      setTimeout(() => setIsOrdered(false), 5000);
    }, 2000);
  };

  const topUpWallet = async () => {
    try {
        await axios.post(`http://localhost:8001/users/${userId}/wallet/topup`, { amount: 500 });
        refreshData();
        alert("₹500 added to PuneFood Wallet! 🎉");
    } catch(e) { alert("Top-up Failed"); }
  };

  const createRestaurant = async () => {
    if(!newResName.trim()) return;
    try {
        await axios.post('http://localhost:8002/restaurants', { owner_id: userId, name: newResName });
        setNewResName('');
        refreshData();
        alert("Restaurant Created!");
    } catch (e) { alert("Failed to create restaurant"); }
  };

  const addMenuItem = async () => {
    if(!newItem.name || !newItem.price || !merchantResId) return;
    try {
        await axios.post(`http://localhost:8002/restaurants/${merchantResId}/items`, { name: newItem.name, price: parseFloat(newItem.price), is_veg: newItem.is_veg });
        setNewItem({ name: '', price: '', is_veg: true });
        refreshData();
        alert("Dish added to Menu!");
    } catch (e) { alert("Failed to add dish"); }
  };

  const handleLogout = () => { sessionStorage.clear(); window.location.href = '/'; };

  const updateStatus = async (id, status) => {
    try { await axios.patch(`http://localhost:8003/orders/${id}/status?status=${status}`); refreshData(); } 
    catch (err) { console.error(err); }
  };

  const claimOrder = async (id) => {
    try { 
        await axios.patch(`http://localhost:8003/orders/${id}/claim?rider_id=${userId}`); 
        refreshData(); 
        alert("Order successfully assigned to you! 🛵");
    } 
    catch (err) { 
        // 🔥 Race Condition Handling on UI
        alert(err.response?.data?.detail || "Claim Failed! Someone else might have grabbed it."); 
        refreshData();
    }
  };

  const activeOrders = orders.filter(o => o.status !== 'Delivered');
  const pastOrders = orders.filter(o => o.status === 'Delivered');
  
  const formatDate = (dateString) => {
      if(!dateString) return "Today";
      try { return new Date(dateString).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }); } 
      catch(e) { return "Recently"; }
  };

  if (!isLoggedIn) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'linear-gradient(135deg, #be123c 0%, #881337 100%)', fontFamily: 'sans-serif' }}>
      <form onSubmit={(e) => { e.preventDefault(); axios.post(`http://localhost:8001/${showRegister?'register':'login'}`, formData).then(res => { if(!showRegister) { sessionStorage.setItem('isLoggedIn', 'true'); sessionStorage.setItem('userName', res.data.user_name); sessionStorage.setItem('userId', res.data.user_id); sessionStorage.setItem('userRole', res.data.role); sessionStorage.setItem('walletBalance', res.data.wallet_balance || 0); window.location.reload(); } else { alert("Registered! Login to continue."); setShowRegister(false); } }).catch((err) => alert(err.response?.data?.detail || "Auth Failed!")); }} style={{ background: 'white', padding: '40px', borderRadius: '25px', width: '380px', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
        <h1 style={{ textAlign: 'center', color: '#be123c', margin: '0 0 30px 0' }}>PuneFood🥘</h1>
        {showRegister && <>
            <input type="text" placeholder="Full Name" required onChange={e => setFormData({...formData, name: e.target.value})} style={{ width: '100%', margin: '10px 0', padding: '14px', borderRadius: '10px', border: '1px solid #ddd', boxSizing:'border-box' }} />
            <select onChange={e => setFormData({...formData, role: e.target.value})} style={{ width: '100%', margin: '10px 0', padding: '14px', borderRadius: '10px', border: '1px solid #ddd', boxSizing:'border-box', background:'#f8fafc' }}><option value="customer">Customer 🧑 (Gets ₹500 Bonus)</option><option value="merchant">Merchant 👨‍🍳</option><option value="rider">Rider 🛵</option></select>
            {formData.role === 'rider' && <>
                <input type="text" placeholder="Phone Number (e.g. 9876543210)" required onChange={e => setFormData({...formData, phone_number: e.target.value})} style={{ width: '100%', margin: '10px 0', padding: '14px', borderRadius: '10px', border: '1px solid #3b82f6', boxSizing:'border-box', background:'#eff6ff' }} />
                <input type="text" placeholder="Bike No (e.g. MH-12-AB-1234)" required onChange={e => setFormData({...formData, vehicle_number: e.target.value})} style={{ width: '100%', margin: '10px 0', padding: '14px', borderRadius: '10px', border: '1px solid #3b82f6', boxSizing:'border-box', background:'#eff6ff' }} />
            </>}
        </>}
        <input type="email" placeholder="Email" required onChange={e => setFormData({...formData, email: e.target.value})} style={{ width: '100%', margin: '10px 0', padding: '14px', borderRadius: '10px', border: '1px solid #ddd', boxSizing:'border-box' }} />
        <input type="password" placeholder="Password" required onChange={e => setFormData({...formData, password: e.target.value})} style={{ width: '100%', margin: '10px 0', padding: '14px', borderRadius: '10px', border: '1px solid #ddd', boxSizing:'border-box' }} />
        <button type="submit" style={{ width: '100%', padding: '15px', background: '#be123c', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', marginTop: '15px', cursor:'pointer' }}>{showRegister ? 'Join Now' : 'Sign In'}</button>
        <p onClick={() => setShowRegister(!showRegister)} style={{ textAlign: 'center', cursor: 'pointer', color: '#3b82f6', marginTop: '20px', fontSize: '14px' }}>{showRegister ? 'Back to Login' : 'Create an Account'}</p>
      </form>
    </div>
  );

  return (
    <div style={{ backgroundColor: '#f3f4f6', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      {isPaying && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.85)', zIndex: 5000, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'white' }}>
            <div className="animate-spin" style={{ width: '50px', height: '50px', border: '4px solid #be123c', borderTopColor: 'transparent', borderRadius: '50%', marginBottom: '20px' }}></div>
            <h2 style={{margin:0}}>Processing Secure Payment...</h2>
        </div>
      )}

      {liveNotification && <div style={{ position: 'fixed', top: '25px', right: '25px', background: '#1e293b', color: 'white', padding: '18px 25px', borderRadius: '12px', zIndex: 1000, boxShadow: '0 10px 25px rgba(0,0,0,0.5)', borderLeft: '6px solid #f59e0b' }}> <Bell size={20} color="#f59e0b" style={{marginRight:'10px'}}/> {liveNotification}</div>}
      
      <nav style={{ background: 'white', padding: '15px 60px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', position: 'sticky', top: 0, zIndex: 50 }}>
        <h2 onClick={() => setView('home')} style={{ color: '#be123c', cursor: 'pointer', margin: 0 }}>PuneFood🥘</h2>
        <div style={{ display: 'flex', gap: '25px', alignItems: 'center' }}>
          {userRole === 'customer' && (
            <>
                <div onClick={detectLocation} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fef2f2', padding: '8px 18px', borderRadius: '25px', cursor: 'pointer', border: '1px solid #fee2e2' }}>
                    <MapPin size={18} color="#be123c"/>
                    <span style={{fontSize:'13px', fontWeight:'700', color:'#be123c'}}>{address ? (address.length > 20 ? address.substring(0,20)+'...' : address) : 'Add Address'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#ecfdf5', padding: '8px 18px', borderRadius: '25px', border: '1px solid #d1fae5', color:'#065f46' }}>
                    <Wallet size={18}/>
                    <span style={{fontSize:'14px', fontWeight:'800'}}>₹{walletBalance.toFixed(2)}</span>
                </div>
                <Home onClick={() => setView('home')} size={24} style={{cursor:'pointer', color: view==='home'?'#be123c':'#6b7280'}} />
                <ClipboardList onClick={() => setView('orders')} size={24} style={{cursor:'pointer', color: view==='orders'?'#be123c':'#6b7280'}} />
                <div style={{position:'relative'}}>
                    <ShoppingCart onClick={() => setIsCartOpen(true)} size={24} style={{cursor:'pointer', color: isCartOpen?'#be123c':'#6b7280'}} />
                    {cart.length > 0 && <span style={{position:'absolute', top:'-8px', right:'-8px', background:'#be123c', color:'white', borderRadius:'50%', width:'18px', height:'18px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'10px', fontWeight:'bold'}}>{cart.length}</span>}
                </div>
            </>
          )}
          <div style={{background: '#f1f5f9', padding: '8px 15px', borderRadius: '20px'}}><span style={{fontWeight:'bold'}}>{user} <small style={{color:'#be123c', textTransform:'uppercase'}}>[{userRole}]</small></span></div>
          <LogOut onClick={handleLogout} size={24} style={{ cursor: 'pointer', color: '#be123c' }} />
        </div>
      </nav>

      <div style={{ padding: '40px 60px' }}>
        
        {/* --- 👨‍🍳 MERCHANT DASHBOARD --- */}
        {userRole === 'merchant' ? (
          <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', gap: '30px' }}>
            <div style={{ flex: 2, background: 'white', padding: '40px', borderRadius: '25px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                <h2 style={{color:'#111827', marginBottom:'30px'}}>👨‍🍳 Live Orders</h2>
                <div style={{marginBottom:'25px', padding:'15px', background:'#f9fafb', borderRadius:'12px'}}>
                    <label style={{fontWeight:'bold', marginRight:'15px'}}>My Restaurants:</label>
                    {myRestaurants.length > 0 ? (
                        <select value={merchantResId} onChange={e => {setMerchantResId(e.target.value); sessionStorage.setItem('merchantResId', e.target.value);}} style={{padding:'10px 15px', borderRadius:'10px', border:'1px solid #ddd', fontWeight:'600', cursor:'pointer'}}>
                            {myRestaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                    ) : <span style={{color: '#ef4444', fontWeight: 'bold'}}>No restaurants yet! Create one below.</span>}
                </div>
                {merchantOrders.length === 0 ? <p style={{color:'#6b7280'}}>No active orders.</p> : merchantOrders.map(o => (
                    <div key={o.id} style={{ border: '1px solid #f3f4f6', padding: '20px', borderRadius: '15px', marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h3 style={{margin:0}}>Order #{o.id}</h3>
                            <p style={{margin:'5px 0', fontSize:'14px', color:'#1f2937'}}><b>Items:</b> {o.items_summary || 'Standard Meal'}</p>
                            <p style={{margin:0, color:'#6b7280', fontSize:'14px'}}>{o.status} | Total: ₹{o.total_amount}</p>
                        </div>
                        <div style={{display:'flex', gap:'10px'}}>
                            {o.status === 'Pending' && <button onClick={() => updateStatus(o.id, 'Preparing')} style={{background:'#f59e0b', color:'white', border:'none', padding:'10px 20px', borderRadius:'10px', cursor:'pointer', fontWeight:'bold'}}>Accept</button>}
                            {o.status === 'Preparing' && <button onClick={() => updateStatus(o.id, 'Ready')} style={{background:'#10b981', color:'white', border:'none', padding:'10px 20px', borderRadius:'10px', cursor:'pointer', fontWeight:'bold'}}>Food Ready</button>}
                            {o.status === 'Ready' && <span style={{color:'#10b981', fontWeight:'bold'}}>✓ Waiting for Rider</span>}
                        </div>
                    </div>
                ))}
            </div>
            <div style={{ flex: 1, display:'flex', flexDirection:'column', gap:'20px' }}>
                <div style={{ background: 'white', padding: '25px', borderRadius: '25px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                    <h3 style={{marginTop:0, color:'#be123c'}}>🏠 Add Restaurant</h3>
                    <input type="text" placeholder="Restaurant Name" value={newResName} onChange={e => setNewResName(e.target.value)} style={{width:'100%', padding:'12px', borderRadius:'10px', border:'1px solid #ddd', marginBottom:'10px', boxSizing:'border-box'}}/>
                    <button onClick={createRestaurant} style={{width:'100%', padding:'12px', background:'#be123c', color:'white', border:'none', borderRadius:'10px', fontWeight:'bold', cursor:'pointer'}}>Create</button>
                </div>
                {myRestaurants.length > 0 && (
                    <div style={{ background: 'white', padding: '25px', borderRadius: '25px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                        <h3 style={{marginTop:0, color:'#10b981'}}>🥘 Add Menu Item</h3>
                        <input type="text" placeholder="Dish Name" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} style={{width:'100%', padding:'12px', borderRadius:'10px', border:'1px solid #ddd', marginBottom:'10px', boxSizing:'border-box'}}/>
                        <input type="number" placeholder="Price (₹)" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} style={{width:'100%', padding:'12px', borderRadius:'10px', border:'1px solid #ddd', marginBottom:'10px', boxSizing:'border-box'}}/>
                        <div style={{display:'flex', gap:'15px', marginBottom:'15px'}}>
                            <label style={{display:'flex', alignItems:'center', gap:'5px', cursor:'pointer'}}><input type="radio" checked={newItem.is_veg} onChange={() => setNewItem({...newItem, is_veg: true})}/> <span style={{color:'#10b981', fontWeight:'bold'}}>Veg 🟢</span></label>
                            <label style={{display:'flex', alignItems:'center', gap:'5px', cursor:'pointer'}}><input type="radio" checked={!newItem.is_veg} onChange={() => setNewItem({...newItem, is_veg: false})}/> <span style={{color:'#ef4444', fontWeight:'bold'}}>Non-Veg 🔴</span></label>
                        </div>
                        <button onClick={addMenuItem} style={{width:'100%', padding:'12px', background:'#10b981', color:'white', border:'none', borderRadius:'10px', fontWeight:'bold', cursor:'pointer'}}><PlusCircle size={18} style={{verticalAlign:'middle', marginRight:'5px'}}/> Add Dish</button>
                    </div>
                )}
            </div>
          </div>
        ) : userRole === 'rider' ? (
          
          /* --- 🛵 RIDER DASHBOARD --- */
          <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            <div style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
                <div style={{ flex: 1, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', padding: '30px', borderRadius: '25px', color: 'white', boxShadow: '0 10px 20px rgba(16, 185, 129, 0.3)' }}>
                    <h3 style={{margin:0, opacity:0.9}}>Lifetime Earnings 💰</h3>
                    <h1 style={{fontSize:'45px', margin:'10px 0'}}>₹{myRiderOrders.filter(o=>o.status==='Delivered').length * 40}</h1>
                    <p style={{margin:0, fontWeight:'bold'}}>{myRiderOrders.filter(o=>o.status==='Delivered').length} Deliveries Completed</p>
                </div>
                <div style={{ flex: 1, background: 'white', padding: '30px', borderRadius: '25px', border: '1px solid #e2e8f0' }}>
                    <h3 style={{margin:0, color:'#374151'}}>Rider Profile 🛵</h3>
                    <p style={{fontSize:'22px', fontWeight:'bold', color:'#111827', marginTop:'15px'}}>{user}</p>
                    <p style={{color:'#10b981', margin:0, fontWeight:'bold'}}>🟢 Active & Online</p>
                </div>
            </div>

            <div style={{ display:'flex', gap:'30px', alignItems:'flex-start' }}>
                <div style={{ flex: 1, display:'flex', flexDirection:'column', gap:'30px' }}>
                    {/* Available Orders */}
                    <div style={{ background: 'white', padding: '30px', borderRadius: '25px', border:'2px solid #bfdbfe', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
                        <h3 style={{marginTop:0, color:'#1e40af', display:'flex', alignItems:'center', gap:'10px'}}><Bell size={20}/> New Requests</h3>
                        {availableOrders.length === 0 ? <p style={{color:'#6b7280'}}>No new orders in your area.</p> : availableOrders.map(o => (
                            <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '18px', borderBottom: '1px solid #f3f4f6', alignItems:'center', background:'#f8fafc', borderRadius:'15px', marginBottom:'10px' }}>
                                <div>
                                    <b style={{fontSize:'16px'}}>Order #{o.id}</b><br/>
                                    <span style={{fontSize:'13px', color:'#10b981', fontWeight:'bold'}}>Ready at Restaurant</span><br/>
                                    <span style={{fontSize:'12px', color:'#6b7280'}}>Pickup: {o.items_summary || 'Standard Meal'}</span>
                                </div>
                                <button onClick={() => claimOrder(o.id)} style={{background:'#2563eb', color:'white', border:'none', padding:'12px 25px', borderRadius:'10px', fontWeight:'bold', cursor:'pointer', boxShadow:'0 4px 10px rgba(37,99,235,0.3)'}}>Accept Job</button>
                            </div>
                        ))}
                    </div>
                    {/* Active Jobs */}
                    <div style={{ background: 'white', padding: '30px', borderRadius: '25px', border:'2px solid #f59e0b', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
                        <h3 style={{marginTop:0, color:'#b45309', display:'flex', alignItems:'center', gap:'10px'}}><Bike size={20}/> My Active Jobs</h3>
                        {myRiderOrders.filter(o=>o.status!=='Delivered').length === 0 ? <p style={{color:'#6b7280'}}>You don't have any active deliveries.</p> : myRiderOrders.filter(o=>o.status!=='Delivered').map(o => (
                            <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '18px', borderBottom: '1px solid #f3f4f6', alignItems:'center', background:'#fffbeb', borderRadius:'15px', marginBottom:'10px' }}>
                                <div>
                                    <b style={{fontSize:'16px'}}>Order #{o.id}</b><br/>
                                    <span style={{fontSize:'13px', color:'#b45309', fontWeight:'bold'}}>Status: {o.status}</span><br/>
                                    <span style={{fontSize:'12px', color:'#4b5563'}}>To: {o.address.substring(0,25)}...</span>
                                </div>
                                <button onClick={() => updateStatus(o.id, 'Delivered')} style={{background:'#10b981', color:'white', border:'none', padding:'12px 25px', borderRadius:'10px', fontWeight:'bold', cursor:'pointer', boxShadow:'0 4px 10px rgba(16,185,129,0.3)'}}>Mark Delivered ✓</button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Earning History */}
                <div style={{ flex: 1, background: 'white', padding: '30px', borderRadius: '25px', border:'1px solid #e2e8f0', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
                    <h3 style={{marginTop:0, color:'#374151', display:'flex', alignItems:'center', gap:'10px'}}><IndianRupee size={20}/> Earnings History</h3>
                    <div style={{maxHeight:'500px', overflowY:'auto'}}>
                        {myRiderOrders.filter(o=>o.status==='Delivered').length === 0 ? <p style={{color:'#6b7280'}}>Complete your first order to see history.</p> : [...myRiderOrders].filter(o=>o.status==='Delivered').reverse().map(o => (
                            <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 0', borderBottom: '1px dashed #e2e8f0', alignItems:'center' }}>
                                <div>
                                    <b style={{fontSize:'15px', color:'#111827'}}>Order #{o.id} Delivered</b><br/>
                                    <span style={{fontSize:'12px', color:'#6b7280'}}><Calendar size={12} style={{display:'inline', verticalAlign:'middle'}}/> {formatDate(o.created_at)}</span>
                                </div>
                                <div style={{background:'#ecfdf5', padding:'5px 12px', borderRadius:'12px', color:'#059669', fontWeight:'bold'}}>+ ₹40</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
          </div>

        ) : (
          view === 'home' ? (
            
            /* --- 🧑 CUSTOMER HOME & TRACKING --- */
            <div>
                {/* 🔥 MULTI-ORDER DYNAMIC TRACKER */}
                {activeOrders.length > 0 && (
                    <div style={{ marginBottom: '50px', display: 'flex', flexDirection: 'column', gap: '25px' }}>
                        {activeOrders.map(activeOrder => {
                            const rider = riderDetailsMap[activeOrder.rider_id];
                            return (
                                <div key={activeOrder.id} style={{ maxWidth: '800px', width:'100%', margin: '0 auto', background: 'white', padding: '35px', borderRadius: '25px', boxShadow: '0 10px 30px rgba(0,0,0,0.08)', border: '1px solid #f3f4f6' }}>
                                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'2px solid #f3f4f6', paddingBottom:'15px'}}>
                                        <h3 style={{margin:0, color:'#be123c', display:'flex', alignItems:'center', gap:'10px'}}>
                                            <div className="animate-pulse" style={{width:'12px', height:'12px', background:'#10b981', borderRadius:'50%'}}></div>
                                            Tracking Order #{activeOrder.id}
                                        </h3>
                                        <span style={{background:'#f3f4f6', padding:'6px 15px', borderRadius:'20px', fontSize:'13px', fontWeight:'bold', color:'#374151'}}>{activeOrder.restaurant_name}</span>
                                    </div>
                                    
                                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'30px', position:'relative'}}>
                                        <div style={{position:'absolute', top:'20px', left:'10%', right:'10%', height:'4px', background:'#e5e7eb', zIndex:1}}></div>
                                        
                                        <div style={{textAlign:'center', zIndex:2, background:'white', padding:'0 10px'}}>
                                            <div style={{width:'45px', height:'45px', borderRadius:'50%', background: activeOrder.status === 'Pending' ? '#be123c' : '#10b981', color:'white', display:'flex', justifyContent:'center', alignItems:'center', margin:'0 auto'}}><CheckCircle size={24}/></div>
                                            <p style={{fontWeight:'bold', marginTop:'10px', color:'#374151'}}>Placed</p>
                                        </div>
                                        <div style={{textAlign:'center', zIndex:2, background:'white', padding:'0 10px'}}>
                                            <div style={{width:'45px', height:'45px', borderRadius:'50%', background: ['Preparing', 'Ready', 'Picked Up'].includes(activeOrder.status) ? '#f59e0b' : '#e5e7eb', color:'white', display:'flex', justifyContent:'center', alignItems:'center', margin:'0 auto'}}><ChefHat size={24}/></div>
                                            <p style={{fontWeight:'bold', marginTop:'10px', color:['Preparing', 'Ready', 'Picked Up'].includes(activeOrder.status) ? '#374151' : '#9ca3af'}}>Cooking</p>
                                        </div>
                                        <div style={{textAlign:'center', zIndex:2, background:'white', padding:'0 10px'}}>
                                            <div style={{width:'45px', height:'45px', borderRadius:'50%', background: activeOrder.status === 'Picked Up' ? '#3b82f6' : '#e5e7eb', color:'white', display:'flex', justifyContent:'center', alignItems:'center', margin:'0 auto'}}><Bike size={24}/></div>
                                            <p style={{fontWeight:'bold', marginTop:'10px', color:activeOrder.status === 'Picked Up' ? '#374151' : '#9ca3af'}}>On the Way</p>
                                        </div>
                                    </div>

                                    {/* 🔥 REAL RIDER & OTP REVEAL */}
                                    {activeOrder.status === 'Picked Up' && rider ? (
                                        <div style={{marginTop:'30px', background:'#f0f9ff', padding:'20px', borderRadius:'15px', border:'1px solid #bfdbfe', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                            <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
                                                <div style={{width:'50px', height:'50px', background:'#2563eb', borderRadius:'50%', color:'white', display:'flex', justifyContent:'center', alignItems:'center', fontWeight:'bold', fontSize:'20px'}}>{rider.name.charAt(0)}</div>
                                                <div>
                                                    <p style={{margin:0, fontWeight:'bold', fontSize:'18px', color:'#1e3a8a'}}>{rider.name} <span style={{fontSize:'12px', background:'#10b981', color:'white', padding:'2px 6px', borderRadius:'10px'}}>4.9 ⭐</span></p>
                                                    <p style={{margin:0, color:'#3b82f6', fontSize:'14px', marginTop:'4px'}}>Bike: <b>{rider.vehicle_number}</b></p>
                                                </div>
                                            </div>
                                            <div style={{textAlign:'right'}}>
                                                <div style={{display:'inline-flex', alignItems:'center', gap:'6px', background:'white', padding:'6px 12px', borderRadius:'10px', border:'1px dashed #3b82f6', color:'#1e40af', fontWeight:'bold', marginBottom:'8px'}}>
                                                    <Key size={14}/> OTP: {(activeOrder.id * 789 % 9000 + 1000).toFixed(0)}
                                                </div>
                                                <div><button style={{background:'white', color:'#2563eb', border:'2px solid #2563eb', padding:'8px 15px', borderRadius:'20px', fontWeight:'bold', display:'flex', alignItems:'center', gap:'8px', cursor:'pointer'}}><Phone size={16}/> {rider.phone_number}</button></div>
                                            </div>
                                        </div>
                                    ) : (
                                        ['Preparing', 'Ready'].includes(activeOrder.status) && (
                                            <div style={{textAlign:'center', marginTop:'20px'}}><p style={{color:'#6b7280', fontStyle:'italic'}}>Expected Delivery in ~25 Mins. Preparing freshly!</p></div>
                                        )
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                <div style={{ maxWidth: '600px', margin: '0 auto 40px auto', position:'relative' }}>
                    <Search size={22} color="#9ca3af" style={{position:'absolute', left:'18px', top:'18px'}}/>
                    <input type="text" placeholder="Search for Misal, Biryani..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: '100%', padding: '18px 18px 18px 55px', borderRadius: '35px', border: '1px solid #e2e8f0', fontSize: '17px', outline:'none' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: '35px' }}>
                    {filteredRestaurants.map(res => (
                        <div key={res.id} style={{ background: 'white', borderRadius: '25px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', overflow:'hidden', border:'1px solid #f1f5f9' }}>
                            <div style={{background:'#be123c', padding:'20px', color:'white', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                <h3 style={{margin:0}}>{res.name}</h3>
                                <span style={{background:'rgba(255,255,255,0.2)', padding:'4px 10px', borderRadius:'12px', fontSize:'13px', fontWeight:'bold'}}>{res.rating} ⭐</span>
                            </div>
                            <div style={{ padding: '25px' }}>
                                {res.items?.length === 0 ? <p style={{color:'#9ca3af', textAlign:'center'}}>Menu coming soon...</p> : res.items?.map(i => (
                                    <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems:'center' }}>
                                        <div>
                                            <div style={{display:'flex', alignItems:'center', gap:'8px', marginBottom:'4px'}}>
                                                <div style={{width:'12px', height:'12px', border: i.is_veg ? '1px solid #10b981' : '1px solid #ef4444', display:'flex', justifyContent:'center', alignItems:'center'}}>
                                                    <div style={{width:'6px', height:'6px', borderRadius:'50%', background: i.is_veg ? '#10b981' : '#ef4444'}}></div>
                                                </div>
                                                <b style={{color:'#1f2937', fontSize:'16px'}}>{i.name}</b>
                                            </div>
                                            <span style={{fontSize:'14px', color:'#6b7280', fontWeight:'600'}}>₹{i.price}</span>
                                        </div>
                                        <button onClick={() => handleAddToCart(i, res)} style={{ color: '#be123c', border: '2px solid #be123c', background: 'none', borderRadius: '10px', padding: '6px 20px', fontWeight:'bold', cursor:'pointer' }}>ADD</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
          ) : (
            
            /* --- 🧾 DETAILED CUSTOMER HISTORY (DIGITAL RECEIPT) --- */
            <div style={{ maxWidth: '850px', margin: '0 auto', background: 'white', padding: '45px', borderRadius: '30px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                <h2 style={{borderBottom:'2px solid #f3f4f6', paddingBottom:'20px', marginBottom:'30px', color:'#111827', display:'flex', alignItems:'center', gap:'10px'}}><Receipt size={28}/> Order History & Receipts</h2>
                
                {pastOrders.length === 0 ? <p style={{textAlign:'center', color:'#9ca3af', padding:'40px 0'}}>No past orders found.</p> : [...pastOrders].reverse().map(o => (
                    <div key={o.id} style={{ border: '1px solid #e5e7eb', borderRadius: '20px', padding: '25px', marginBottom: '25px', background:'#fdfdfd' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', borderBottom:'1px dashed #d1d5db', paddingBottom:'15px', marginBottom:'15px' }}>
                            <div>
                                <span style={{background:'#f3f4f6', padding:'5px 12px', borderRadius:'8px', fontSize:'12px', fontWeight:'bold', color:'#4b5563', marginBottom:'10px', display:'inline-block'}}>Order #{o.id}</span>
                                <h3 style={{margin:'0 0 5px 0', color:'#1f2937'}}>{o.restaurant_name}</h3>
                                <p style={{margin:0, color:'#6b7280', fontSize:'13px', display:'flex', alignItems:'center', gap:'5px'}}><Calendar size={14}/> {formatDate(o.created_at)}</p>
                            </div>
                            <div style={{textAlign:'right'}}>
                                <span style={{background:'#d1fae5', color:'#065f46', padding:'6px 15px', borderRadius:'20px', fontSize:'13px', fontWeight:'bold'}}>✓ Delivered</span>
                            </div>
                        </div>
                        
                        <div style={{background:'#f9fafb', padding:'15px', borderRadius:'12px', marginBottom:'15px'}}>
                            {/* 🔥 REAL PROOF OF ITEMS */}
                            <p style={{margin:'0 0 8px 0', color:'#111827', fontSize:'15px'}}><b>Items:</b> {o.items_summary || 'Standard Meal'}</p>
                            <p style={{margin:'0 0 8px 0', color:'#4b5563', fontSize:'14px'}}><b>Delivered To:</b> {o.address.substring(0, 40)}...</p>
                            <p style={{margin:0, color:'#4b5563', fontSize:'14px'}}><b>Paid via:</b> PuneFood Wallet</p>
                        </div>
                        
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                            <div style={{fontSize:'22px', fontWeight:'900', color:'#111827'}}>Total: ₹{o.total_amount}</div>
                            <button onClick={() => { setCart([{name: "Reorder Item", price: o.total_amount-40, restaurantId: o.restaurant_id, restaurantName: o.restaurant_name}]); setIsCartOpen(true); setView('home'); }} style={{background:'#fef2f2', color:'#be123c', border:'1px solid #be123c', padding:'10px 20px', borderRadius:'14px', fontWeight:'bold', display:'flex', alignItems:'center', gap:'8px', cursor:'pointer'}}><RotateCcw size={18}/> Reorder</button>
                        </div>
                    </div>
                ))}
            </div>
          )
        )}
      </div>

      {/* 🛒 CART SIDEBAR */}
      {isCartOpen && (
        <div style={{ position: 'fixed', right: 0, top: 0, width: '420px', height: '100%', background: 'white', padding: '35px', boxShadow: '-15px 0 35px rgba(0,0,0,0.15)', zIndex: 100, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom:'2px solid #f3f4f6', paddingBottom:'15px' }}>
                <h2 style={{margin:0, color:'#111827'}}>Your Cart 🛒</h2>
                <X onClick={() => setIsCartOpen(false)} style={{ cursor: 'pointer', color:'#6b7280' }} size={30}/>
            </div>
            {cart.length > 0 ? (
                <div style={{flex: 1, overflowY: 'auto'}}>
                    <div style={{background:'#fff1f2', padding:'15px', borderRadius:'12px', marginBottom:'25px'}}><p style={{color:'#be123c', fontWeight:'bold', margin:0}}>From: {cart[0].restaurantName}</p></div>
                    
                    <div style={{ marginBottom: '30px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <h4 style={{ margin: 0, color:'#374151' }}>Delivery Address</h4>
                            <button onClick={detectLocation} style={{ background: 'none', border: 'none', color: '#be123c', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline' }}>Auto-Detect</button>
                        </div>
                        <textarea value={address === 'Select your address' ? '' : address} onChange={(e) => { setAddress(e.target.value); sessionStorage.setItem('userAddress', e.target.value); }} placeholder="House No, Street Name, Pune..." style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #ddd', minHeight: '80px', boxSizing: 'border-box', outline: 'none' }} />
                    </div>

                    <div style={{marginBottom:'30px'}}>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px'}}>
                            <h4 style={{margin:0, color:'#374151'}}>Payment Method</h4>
                            <button onClick={topUpWallet} style={{background:'#d1fae5', color:'#065f46', border:'none', padding:'5px 12px', borderRadius:'15px', fontSize:'12px', fontWeight:'bold', cursor:'pointer'}}>+ Add ₹500</button>
                        </div>
                        <div style={{display:'flex', gap:'10px'}}>
                            {['Wallet', 'UPI', 'COD'].map(m => (
                                <button key={m} onClick={() => setPaymentMethod(m)} style={{flex:1, padding:'12px', borderRadius:'10px', border: paymentMethod === m ? '2px solid #be123c' : '1px solid #e5e7eb', background: paymentMethod === m ? '#fef2f2' : 'white', fontWeight:'bold', color: paymentMethod === m ? '#be123c' : '#4b5563', cursor:'pointer'}}>{m}</button>
                            ))}
                        </div>
                        {paymentMethod === 'Wallet' && <p style={{fontSize:'12px', color:'#666', marginTop:'10px', textAlign:'center'}}>Available Balance: ₹{walletBalance.toFixed(2)}</p>}
                        {paymentMethod === 'UPI' && (
                            <div style={{textAlign:'center', padding:'20px', background:'#f8fafc', borderRadius:'15px', marginTop:'15px', border:'1px dashed #cbd5e1'}}>
                                <QrCode size={80} style={{margin:'0 auto', color:'#111827'}}/>
                                <p style={{fontSize:'13px', color:'#64748b', marginTop:'10px', fontWeight:'bold'}}>Scan QR to Pay</p>
                            </div>
                        )}
                    </div>

                    <div style={{ marginTop: 'auto', padding: '25px', backgroundColor: '#f9fafb', borderRadius: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', color:'#6b7280' }}><span>Item Total</span><span>₹{cart.reduce((s,i)=>s+i.price,0)}</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', color:'#6b7280' }}><span>Delivery Fee</span><span>₹40</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px dashed #cbd5e1', paddingTop: '15px', fontWeight: 'bold', fontSize: '26px', color:'#111827' }}><span>To Pay</span><span>₹{cart.reduce((s,i)=>s+i.price,0)+40}</span></div>
                    </div>
                    <button onClick={handleCheckout} style={{ width: '100%', padding: '20px', background: '#be123c', color: 'white', border: 'none', borderRadius: '15px', marginTop: '25px', cursor: 'pointer', fontWeight: 'bold', fontSize:'19px', boxShadow:'0 10px 15px rgba(190, 18, 60, 0.3)' }}>Pay & Confirm 🚀</button>
                </div>
            ) : <div style={{textAlign:'center', marginTop:'100px'}}><ShoppingCart size={80} style={{opacity:0.1, margin:'0 auto'}}/><h3 style={{color:'#9ca3af'}}>Your cart is empty!</h3></div>}
        </div>
      )}

      {isOrdered && <div style={{ position: 'fixed', bottom: '50px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#059669', color: 'white', padding: '20px 60px', borderRadius: '50px', boxShadow: '0 10px 25px rgba(5, 150, 105, 0.4)', zIndex: 1000, fontWeight: 'bold', fontSize:'18px' }}>✅ Success! Order Placed.</div>}
    </div>
  );
}

export default App;