import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Search, ShoppingCart, X, LogOut, Home, ClipboardList, Bell, MapPin, RotateCcw, QrCode, Wallet, PlusCircle, CheckCircle, ChefHat, Bike, Phone, Receipt, Calendar, Key, IndianRupee, TrendingUp, Edit, Trash2, Upload, ArrowLeft, Eye, ToggleLeft, ToggleRight, Users, UserPlus, UserMinus, Clock, AlertCircle, ChevronLeft, ChevronRight, Info } from 'lucide-react';

axios.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('token');
    if (token) config.headers['Authorization'] = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(sessionStorage.getItem('isLoggedIn') === 'true');
  const [user, setUser] = useState(sessionStorage.getItem('userName'));
  const [userId, setUserId] = useState(sessionStorage.getItem('userId'));
  const [userRole, setUserRole] = useState((sessionStorage.getItem('userRole') || '').toLowerCase());
  const [walletBalance, setWalletBalance] = useState(parseFloat(sessionStorage.getItem('walletBalance')) || 0.0);

  const [currentUserDetails, setCurrentUserDetails] = useState({});

  const [restaurants, setRestaurants] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVeg, setFilterVeg] = useState(false);
  const [sortBy, setSortBy] = useState('none');
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isOrdered, setIsOrdered] = useState(false);
  
  // Payment States
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [simulatePaymentFailure, setSimulatePaymentFailure] = useState(false);

  const [liveNotification, setLiveNotification] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [view, setView] = useState('home');
  const [address, setAddress] = useState(sessionStorage.getItem('userAddress') || '');
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('Wallet');
  const [orders, setOrders] = useState([]);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null); 
  
  const [merchantOrders, setMerchantOrders] = useState([]);
  const [merchantStats, setMerchantStats] = useState({ total_orders_completed: 0, earnings: { today: 0, this_week: 0, this_month: 0, this_year: 0, lifetime: 0 } });
  
  // Merchant Modal States
  const [merchantSelectedOrder, setMerchantSelectedOrder] = useState(null);
  const [showEditRestaurantModal, setShowEditRestaurantModal] = useState(false);
  const [editRestData, setEditRestData] = useState({ address: '', phone_number: '' });

  // History Filters
  const [merchantHistoryFilter, setMerchantHistoryFilter] = useState('today');
  const [merchantHistoryPage, setMerchantHistoryPage] = useState(1);
  const [merchantCustomDateRange, setMerchantCustomDateRange] = useState({ start: '', end: '' });
  
  // Customer History Filter
  const [customerHistoryFilter, setCustomerHistoryFilter] = useState('all');

  const [availableOrders, setAvailableOrders] = useState([]);
  const [myRiderOrders, setMyRiderOrders] = useState([]);
  
  // Rider Edit State
  const [showRiderProfileModal, setShowRiderProfileModal] = useState(false);
  const [riderProfileData, setRiderProfileData] = useState({ phone_number: '', vehicle_number: '' });

  const [riderDetailsMap, setRiderDetailsMap] = useState({});
  const [myRestaurants, setMyRestaurants] = useState([]);
  const [newResName, setNewResName] = useState('');
  const [newItem, setNewItem] = useState({ name: '', price: '', is_veg: true, description: '', image_url: '', image_file: null });
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'Customer', phone_number: '', vehicle_number: '', confirmPassword: '' });
  const [formErrors, setFormErrors] = useState({});
  const [showRegister, setShowRegister] = useState(false);
  const [merchantResId, setMerchantResId] = useState(sessionStorage.getItem('merchantResId') || '');
  const ws = useRef(null);
  const wsMenu = useRef(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [selectedDish, setSelectedDish] = useState(null);
  
  // Address Management States
  const [defaultAddressId, setDefaultAddressId] = useState(sessionStorage.getItem('defaultAddressId') || null);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [editingAddressText, setEditingAddressText] = useState('');
  const [newAddressText, setNewAddressText] = useState('');
  
  // OTP States
  const [deliveryOtpMap, setDeliveryOtpMap] = useState({});
  const [pickupOtpMap, setPickupOtpMap] = useState({});
  const [otpModal, setOtpModal] = useState({ show: false, orderId: null, type: 'pickup' });
  const [otpInputValue, setOtpInputValue] = useState('');

  // Staff Management States
  const [staffList, setStaffList] = useState([]);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [newStaff, setNewStaff] = useState({ name: '', email: '', password: '', phone_number: '', restaurant_id: '' });
  const [showEditStaffModal, setShowEditStaffModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [editStaffData, setEditStaffData] = useState({ name: '', email: '', password: '', phone_number: '', restaurant_id: '' });
  
  // Capacity Management for Restaurant
  const [showCapacityModal, setShowCapacityModal] = useState(false);
  const [capacitySettings, setCapacitySettings] = useState({ max_active_orders: 10, max_queue_length: 5 });
  const [restaurantCapacity, setRestaurantCapacity] = useState({ max_active_orders: 10, max_queue_length: 5, current_active_count: 0, current_queue_length: 0 });
  
  // Capacity Management for Item
  const [itemCapacityMap, setItemCapacityMap] = useState({});
  const [editingItemCapacity, setEditingItemCapacity] = useState(null);

  // Analytics Filters
  const [analyticsTimeFilter, setAnalyticsTimeFilter] = useState('today');
  const [analyticsPerRestaurantId, setAnalyticsPerRestaurantId] = useState('');
  const [perRestaurantStats, setPerRestaurantStats] = useState({});
  
  // Customer Order Navigation
  const [currentActiveOrderIndex, setCurrentActiveOrderIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // ===== DERIVED DATA =====
  const activeOrders = orders.filter(o => !['Delivered', 'Cancelled', 'Cancelled_by_Merchant'].includes(o.status));
  const pastOrders = orders.filter(o => ['Delivered', 'Cancelled', 'Cancelled_by_Merchant'].includes(o.status));

  // Date Filtering Helpers
  const isToday = (dateStr) => new Date().toDateString() === new Date(dateStr).toDateString();
  const isYesterday = (dateStr) => {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    return y.toDateString() === new Date(dateStr).toDateString();
  };
  const isThisWeek = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const start = new Date(now.setDate(now.getDate() - now.getDay()));
    return d >= start;
  };
  const isThisMonth = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  };

  // Filtered Customer Orders
  const filteredPastOrders = pastOrders.filter(o => {
    if (customerHistoryFilter === 'today') return isToday(o.created_at);
    if (customerHistoryFilter === 'week') return isThisWeek(o.created_at);
    if (customerHistoryFilter === 'month') return isThisMonth(o.created_at);
    return true;
  });

  const completedMerchantOrders = merchantOrders.filter(o => ['Delivered', 'Cancelled', 'Cancelled_by_Merchant'].includes(o.status));
  const filteredCompletedMerchantOrders = completedMerchantOrders.filter(o => {
    if (merchantHistoryFilter === 'today') return isToday(o.created_at);
    if (merchantHistoryFilter === 'yesterday') return isYesterday(o.created_at);
    if (merchantHistoryFilter === 'week') return isThisWeek(o.created_at);
    if (merchantHistoryFilter === 'month') return isThisMonth(o.created_at);
    if (merchantHistoryFilter === 'custom' && merchantCustomDateRange.start && merchantCustomDateRange.end) {
      const d = new Date(o.created_at);
      return d >= new Date(merchantCustomDateRange.start) && d <= new Date(merchantCustomDateRange.end + 'T23:59:59');
    }
    return true;
  }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const historyPageSize = 10;
  const paginatedHistory = filteredCompletedMerchantOrders.slice((merchantHistoryPage - 1) * historyPageSize, merchantHistoryPage * historyPageSize);
  const totalHistoryRevenue = filteredCompletedMerchantOrders.filter(o => o.status === 'Delivered').reduce((sum, o) => sum + (o.total_amount - 40), 0);

  // ========== Helper Functions ==========
  const showToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  const fetchPerRestaurantStats = async () => {
    if (userRole !== 'merchant') return;
    const stats = {};
    for (const res of myRestaurants) {
      try {
        const resData = await axios.get(`http://localhost:8004/analytics/restaurant/${res.id}`);
        stats[res.id] = resData.data;
      } catch (e) { console.log("Analytics error for restaurant", res.id); }
    }
    setPerRestaurantStats(stats);
  };

  const fetchRestaurantCapacity = async (resId) => {
    if (!resId) return;
    try {
      const res = await axios.get(`http://localhost:8002/restaurants/${resId}/capacity`);
      setRestaurantCapacity(res.data);
    } catch (e) { console.log("Capacity fetch error", e); }
  };

  const updateRestaurantCapacity = async () => {
    try {
      await axios.put(`http://localhost:8002/restaurants/${merchantResId}/capacity`, {
        max_active_orders: capacitySettings.max_active_orders,
        max_queue_length: capacitySettings.max_queue_length
      });
      showToast("Capacity updated successfully!", "success");
      fetchRestaurantCapacity(merchantResId);
      setShowCapacityModal(false);
    } catch (err) {
      showToast("Update failed: " + (err.response?.data?.detail || "Unknown error"), "error");
    }
  };

  const fetchItemCapacity = async (itemId) => {
    try {
      const res = await axios.get(`http://localhost:8002/restaurants/items/${itemId}/capacity`);
      return res.data;
    } catch (e) { return null; }
  };

  const fetchAllItemCapacities = async (itemsList) => {
    const map = {};
    for (const item of itemsList) {
      const cap = await fetchItemCapacity(item.id);
      if (cap) map[item.id] = cap;
    }
    setItemCapacityMap(map);
  };

  const updateItemCapacity = async () => {
    if (!editingItemCapacity) return;
    try {
      await axios.put(`http://localhost:8002/restaurants/items/${editingItemCapacity.id}/capacity`, {
        max_active_orders: editingItemCapacity.max_active_orders === '' ? null : parseInt(editingItemCapacity.max_active_orders),
        max_queue_length: editingItemCapacity.max_queue_length === '' ? null : parseInt(editingItemCapacity.max_queue_length)
      });
      showToast("Item limits updated successfully!", "success");
      setEditingItemCapacity(null);
      refreshData();
    } catch (err) {
      showToast("Failed to update item limits.", "error");
    }
  };

  const isItemAvailable = (item) => {
    const cap = itemCapacityMap[item.id];
    if (!cap) return item.is_available !== false;
    if (item.is_available === false) return false;
    if (cap.max_active_orders === null) return true; // Infinity
    return (cap.current_active_count < cap.max_active_orders || cap.current_queue_length < cap.max_queue_length);
  };

  const uploadImageFile = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await axios.post('http://localhost:8002/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return res.data.image_url;
    } catch (err) {
      console.error("Image upload failed", err);
      showToast("Image upload failed", "error");
      return null;
    }
  };

  const validateName = (name) => {
    if (!name || name.trim().length < 2) return "Name must be at least 2 characters.";
    if (!/^[a-zA-Z\s]+$/.test(name)) return "Name can only contain letters and spaces.";
    return "";
  };
  const validateEmail = (email) => {
    if (!email) return "Email is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Enter a valid email address (e.g., name@example.com).";
    return "";
  };
  const validatePassword = (password) => {
    if (!password) return "Password is required.";
    if (password.length < 8) return "Password must be at least 8 characters.";
    if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter.";
    if (!/[a-z]/.test(password)) return "Password must contain at least one lowercase letter.";
    if (!/[0-9]/.test(password)) return "Password must contain at least one number.";
    if (!/[!@#$%^&*]/.test(password)) return "Password must contain at least one special character (!@#$%^&*).";
    return "";
  };
  const validatePhone = (phone) => {
    if (!phone) return "Phone number is required.";
    if (!/^[6-9][0-9]{9}$/.test(phone)) return "Enter a valid 10-digit Indian mobile number (starting with 6,7,8,9).";
    return "";
  };
  const validateVehicle = (vehicle, role) => {
    if (role !== 'Rider') return "";
    if (!vehicle) return "Vehicle number is required for riders.";
    if (!/^[A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{4}$/.test(vehicle.toUpperCase())) return "Invalid vehicle number format (e.g., MH12AB1234).";
    return "";
  };
  const validateConfirmPassword = (pwd, confirm) => {
    if (showRegister && pwd !== confirm) return "Passwords do not match.";
    return "";
  };

  const runAllValidations = () => {
    const errors = {
      name: validateName(formData.name),
      email: validateEmail(formData.email),
      password: validatePassword(formData.password),
      phone: validatePhone(formData.phone_number),
      vehicle: validateVehicle(formData.vehicle_number, formData.role),
      confirmPassword: validateConfirmPassword(formData.password, formData.confirmPassword),
    };
    setFormErrors(errors);
    return Object.values(errors).every(err => err === "");
  };

  const refreshData = async () => {
    if (isLoading) return;
    setIsLoading(true);
    const currentRole = (sessionStorage.getItem('userRole') || '').toLowerCase();
    const currentId = sessionStorage.getItem('userId');
    const token = sessionStorage.getItem('token');
    if (!currentRole || !currentId || !token) { setIsLoading(false); return; }

    let resMap = {};
    let allItemsGlobal = [];
    try {
        const resData = await axios.get('http://localhost:8002/restaurants');
        setRestaurants(resData.data);
        resData.data.forEach(r => resMap[r.id] = r.name);
        allItemsGlobal = resData.data.flatMap(r => r.items || []);
        if (currentRole === 'customer') {
          await fetchAllItemCapacities(allItemsGlobal);
        }
    } catch(e) {}

    try {
        const userRes = await axios.get(`http://localhost:8001/users/${currentId}`);
        setWalletBalance(userRes.data.wallet_balance);
        sessionStorage.setItem('walletBalance', userRes.data.wallet_balance);
        setCurrentUserDetails(userRes.data);
        if (userRes.data.role === 'Staff' && currentRole !== 'staff') {
          setUserRole('staff');
          sessionStorage.setItem('userRole', 'staff');
        }
    } catch (e) {}

    if (currentRole === 'customer') {
        try {
            const addrRes = await axios.get(`http://localhost:8001/users/${currentId}/addresses`);
            if(addrRes.data && Array.isArray(addrRes.data)) {
                if(addrRes.data.length > 0 && typeof addrRes.data[0] === 'object') {
                    setSavedAddresses(addrRes.data);
                } else {
                    const transformed = addrRes.data.map((addr, idx) => ({ id: idx, address: addr }));
                    setSavedAddresses(transformed);
                }
            }
        } catch(e) {}
        axios.get(`http://localhost:8003/orders/user/${currentId}`).then(async (res) => {
            const ordersWithNames = res.data.map(o => ({...o, restaurant_name: resMap[o.restaurant_id] || "Restaurant"}));
            setOrders(ordersWithNames);
            const activeOrdersLocal = res.data.filter(o => o.status !== 'Delivered' && o.rider_id);
            let newRiderDetails = {...riderDetailsMap};
            for(let order of activeOrdersLocal) {
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
            const currentResId = sessionStorage.getItem('merchantResId');
            const isValid = res.data.some(r => r.id.toString() === currentResId?.toString());
            if (res.data.length > 0 && (!currentResId || !isValid)) {
                setMerchantResId(res.data[0].id);
                sessionStorage.setItem('merchantResId', res.data[0].id);
                fetchRestaurantCapacity(res.data[0].id);
            } else if (res.data.length === 0) {
                setMerchantResId('');
                sessionStorage.removeItem('merchantResId');
            }
            const activeRes = res.data.find(r => r.id.toString() === sessionStorage.getItem('merchantResId'));
            if(activeRes && activeRes.items) fetchAllItemCapacities(activeRes.items);
            fetchPerRestaurantStats();
        }).catch(e=>console.log(e));
        
        if (merchantResId) {
            axios.get(`http://localhost:8003/orders/restaurant/${merchantResId}`).then(async res => {
                setMerchantOrders(res.data);
                const activeLocals = res.data.filter(o => o.rider_id);
                let newRiderMap = {...riderDetailsMap};
                let updated = false;
                for(let o of activeLocals) {
                    if(!newRiderMap[o.rider_id]) {
                        try {
                            const rRes = await axios.get(`http://localhost:8001/users/${o.rider_id}`);
                            newRiderMap[o.rider_id] = rRes.data;
                            updated = true;
                        } catch(e) {}
                    }
                }
                if(updated) setRiderDetailsMap(newRiderMap);
            }).catch(e=>console.log(e));
            
            axios.get(`http://localhost:8004/analytics/merchant/${currentId}`)
                .then(res => setMerchantStats(res.data))
                .catch(e => console.log("Analytics Service offline"));
            fetchRestaurantCapacity(merchantResId);
        }
        try {
            const staffRes = await axios.get(`http://localhost:8001/merchant/${currentId}/staff`);
            setStaffList(staffRes.data);
        } catch(e) { console.log("Staff fetch error"); }
    } else if (currentRole === 'staff') {
        try {
            const userRes = await axios.get(`http://localhost:8001/users/${currentId}`);
            const assignedRestaurantId = userRes.data.restaurant_id;
            if (assignedRestaurantId) {
                setMerchantResId(assignedRestaurantId.toString());
                sessionStorage.setItem('merchantResId', assignedRestaurantId);
                
                axios.get(`http://localhost:8003/orders/restaurant/${assignedRestaurantId}`).then(async res => {
                    setMerchantOrders(res.data);
                    const activeLocals = res.data.filter(o => o.rider_id);
                    let newRiderMap = {...riderDetailsMap};
                    let updated = false;
                    for(let o of activeLocals) {
                        if(!newRiderMap[o.rider_id]) {
                            try {
                                const rRes = await axios.get(`http://localhost:8001/users/${o.rider_id}`);
                                newRiderMap[o.rider_id] = rRes.data;
                                updated = true;
                            } catch(e) {}
                        }
                    }
                    if(updated) setRiderDetailsMap(newRiderMap);
                }).catch(e=>console.log(e));

                axios.get(`http://localhost:8004/analytics/restaurant/${assignedRestaurantId}`)
                    .then(res => setMerchantStats(res.data))
                    .catch(e => console.log("Analytics error"));
                const allRest = await axios.get('http://localhost:8002/restaurants');
                const staffRest = allRest.data.filter(r => r.id === assignedRestaurantId);
                setMyRestaurants(staffRest);
                fetchRestaurantCapacity(assignedRestaurantId);
                if (staffRest.length > 0 && staffRest[0].items) {
                  await fetchAllItemCapacities(staffRest[0].items);
                }
            }
        } catch(e) { console.log("Staff user fetch error"); }
    } else if (currentRole === 'rider') {
        axios.get(`http://localhost:8003/orders/available/`).then(res => setAvailableOrders(res.data)).catch(e=>console.log(e));
        axios.get(`http://localhost:8003/orders/rider/${currentId}`).then(res => setMyRiderOrders(res.data)).catch(e=>console.log(e));
    }
    setIsLoading(false);
  };

  useEffect(() => {
    const token = sessionStorage.getItem('token');
    if (!isLoggedIn || !userRole || !token) return;
    
    let channel = userRole === 'customer' ? `customer_${userId}` : userRole === 'merchant' ? `merchant_${merchantResId}` : userRole === 'staff' ? `staff_${userId}` : 'riders';
    setTimeout(() => { refreshData(); }, 100);
    
    const connectWS = () => {
        if ((userRole === 'merchant' || userRole === 'staff') && !merchantResId) return;
        const socket = new WebSocket(`ws://localhost:8003/ws/${channel}`);
        ws.current = socket;
        socket.onopen = () => console.log("✅ WebSocket Connected:", channel);
        socket.onmessage = (e) => {
            const msg = e.data;
            if(msg === "REFRESH_DATA" || msg === "REFRESH_MENU") { refreshData(); return; }
            
            // NAYA SIGNAL: Sirf restaurant change hua hai, ban nahi laga
            if(msg === "STAFF_TRANSFERRED" && userRole === 'staff') {
                showToast("Restaurant transferred successfully! Loading new dashboard...", "success");
                refreshData();
                return;
            }

            // PURANA SIGNAL: Agar sach mein remove kiya gaya hai toh logout karo
            if(msg === "STAFF_REVOKED" && userRole === 'staff') {
                showToast("Your access has been revoked. You will be logged out.", "error");
                setTimeout(handleLogout, 2000);
                return;
            }
            setLiveNotification(msg);
            
            if (userRole === 'customer' && msg.includes('delivery OTP')) {
                const otpMatch = msg.match(/\d{4}/);
                const orderMatch = msg.match(/#(\d+)/);
                if (otpMatch && orderMatch) {
                    const orderId = parseInt(orderMatch[1]);
                    setDeliveryOtpMap(prev => ({ ...prev, [orderId]: otpMatch[0] }));
                }
            }
            if ((userRole === 'merchant' || userRole === 'staff') && msg.includes('Pickup OTP')) {
                const otpMatch = msg.match(/\d{4}/);
                const orderMatch = msg.match(/#(\d+)/);
                if (otpMatch && orderMatch) {
                    const orderId = parseInt(orderMatch[1]);
                    setPickupOtpMap(prev => ({ ...prev, [orderId]: otpMatch[0] }));
                }
            }
            
            refreshData();
            setTimeout(() => setLiveNotification(null), 6000);
        };
        socket.onclose = () => setTimeout(connectWS, 3000);
    };

    const connectMenuWS = () => {
        if (userRole !== 'customer') return;
        const mSocket = new WebSocket(`ws://localhost:8003/ws/menu_update`);
        wsMenu.current = mSocket;
        mSocket.onmessage = (e) => {
            if(e.data === "REFRESH_MENU") refreshData();
        };
        mSocket.onclose = () => setTimeout(connectMenuWS, 3000);
    }

    connectWS();
    connectMenuWS();
    
    const interval = setInterval(refreshData, 3000);
    return () => { 
        if (ws.current && ws.current.readyState === 1) ws.current.close(); 
        if (wsMenu.current && wsMenu.current.readyState === 1) wsMenu.current.close();
        clearInterval(interval); 
    };
  }, [isLoggedIn, userRole, merchantResId, userId]);

  useEffect(() => {
    setMerchantHistoryFilter('today');
    setMerchantHistoryPage(1);
  }, [merchantResId]);

  useEffect(() => {
    if (currentActiveOrderIndex >= activeOrders.length && activeOrders.length > 0) {
      setCurrentActiveOrderIndex(activeOrders.length - 1);
    } else if (activeOrders.length === 0) {
      setCurrentActiveOrderIndex(0);
    } else if (currentActiveOrderIndex < 0) {
      setCurrentActiveOrderIndex(0);
    }
  }, [activeOrders.length, currentActiveOrderIndex]);

  const filteredRestaurants = restaurants.map(res => {
    let matchItems = res.items || [];
    if (searchTerm) matchItems = matchItems.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));
    if (filterVeg) matchItems = matchItems.filter(item => item.is_veg === true);
    if (sortBy === 'lowToHigh') matchItems.sort((a, b) => a.price - b.price);
    else if (sortBy === 'highToLow') matchItems.sort((a, b) => b.price - a.price);
    const matchResName = res.name.toLowerCase().includes(searchTerm.toLowerCase());
    if (matchItems.length > 0) return { ...res, items: matchItems };
    if (matchResName && !filterVeg) return res;
    return null;
  }).filter(res => res !== null);

  const detectLocation = () => {
    setAddress("📍 Detecting...");
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&zoom=18&addressdetails=1`);
          const data = await res.json();
          const fullAddr = data.display_name || `${pos.coords.latitude}, ${pos.coords.longitude}`;
          setAddress(fullAddr);
          sessionStorage.setItem('userAddress', fullAddr);
          showToast("Location detected", "success");
        } catch (err) {
          setAddress("FC Road, Deccan Gymkhana, Pune, MH 411004");
          sessionStorage.setItem('userAddress', "FC Road, Deccan Gymkhana, Pune, MH 411004");
          showToast("Could not detect precisely, using default", "info");
        }
      }, (err) => {
        setAddress("FC Road, Deccan Gymkhana, Pune, MH 411004");
        sessionStorage.setItem('userAddress', "FC Road, Deccan Gymkhana, Pune, MH 411004");
        showToast("Geolocation failed, using default", "error");
      });
    } else {
      setAddress("FC Road, Deccan Gymkhana, Pune, MH 411004");
      sessionStorage.setItem('userAddress', "FC Road, Deccan Gymkhana, Pune, MH 411004");
      showToast("Geolocation not supported", "error");
    }
  };

  const handleAddToCart = (item, res) => {
    if (!res.is_open) { showToast("Restaurant is currently closed!", "error"); return; }
    if (!isItemAvailable(item)) { showToast(`${item.name} is currently out of stock!`, "error"); return; }
    
    if (cart.length > 0 && cart[0].restaurantId !== res.id) {
        if (window.confirm(`Cart already contains food from ${cart[0].restaurantName}. Start a new order?`)) {
            setCart([{...item, restaurantId: res.id, restaurantName: res.name, quantity: 1}]);
            setIsCartOpen(true);
        }
    } else {
        const existingIndex = cart.findIndex(cartItem => cartItem.id === item.id);
        if (existingIndex !== -1) {
            const updatedCart = [...cart];
            updatedCart[existingIndex].quantity += 1;
            setCart(updatedCart);
        } else {
            setCart([...cart, {...item, restaurantId: res.id, restaurantName: res.name, quantity: 1}]);
        }
        setIsCartOpen(true);
        showToast("Item added to cart", "success");
    }
  };

  const updateQuantity = (itemId, delta) => {
    setCart(prevCart => prevCart.map(item => {
        if (item.id === itemId) {
            const newQ = item.quantity + delta;
            if (newQ <= 0) return null;
            return { ...item, quantity: newQ };
        }
        return item;
    }).filter(Boolean));
  };

  const initiatePayment = () => {
    if (!address.trim() || address === 'Select your address') { showToast("Please enter your delivery address!", "error"); return; }
    
    // PRE-PAYMENT CHECKS
    const restaurant = restaurants.find(r => r.id === cart[0].restaurantId);
    if (!restaurant) return showToast("Restaurant not found!", "error");
    if (!restaurant.is_open) {
        showToast(`Sorry, ${restaurant.name} is currently closed!`, "error");
        return;
    }
    
    let outOfStock = false;
    for (let item of cart) {
        const resItem = restaurant?.items?.find(i => i.id === item.id);
        if (resItem && !isItemAvailable(resItem)) {
            showToast(`${item.name} is currently Out of Stock!`, "error");
            outOfStock = true;
        }
    }
    if (outOfStock) return;

    if (paymentMethod === 'COD') {
      handleCheckout();
    } else {
      setSimulatePaymentFailure(false);
      setIsPaymentModalOpen(true);
    }
  };

  const processDummyPayment = () => {
    setIsPaying(true);
    setTimeout(() => {
      setIsPaying(false);
      if (simulatePaymentFailure) {
        showToast("Payment Failed! Bank rejected the transaction.", "error");
      } else {
        setIsPaymentModalOpen(false);
        handleCheckout();
      }
    }, 2000);
  };

  const handleCheckout = async () => {
    const total = parseFloat((cart.reduce((s, i) => s + (i.price * i.quantity), 0) + 40).toFixed(2));
    const itemsSummaryString = cart.map(i => `${i.quantity}x ${i.name}`).join(', ');
    const restaurant = restaurants.find(r => r.id === cart[0].restaurantId);
    
    const merchant_id = restaurant?.merchant_id ? parseInt(restaurant.merchant_id) : 1; 
    
    const payload = {
        user_id: parseInt(userId),
        restaurant_id: parseInt(cart[0].restaurantId),
        merchant_id: merchant_id,
        total_amount: total,
        address: address || "Pune",
        items_summary: itemsSummaryString,
        special_instructions: "",
        payment_method: paymentMethod || "Wallet",
        item_ids: cart.map(i => parseInt(i.id)),
        cart_items: cart.map(i => ({ item_id: parseInt(i.id), quantity: parseInt(i.quantity) }))
    };

    setIsPaying(true);
    try {
      if(paymentMethod === 'Wallet') {
           await axios.post(`http://localhost:8001/users/${userId}/wallet/deduct`, { amount: total });
      }
      await axios.post('http://localhost:8003/orders', payload);
      
      setIsPaying(false); 
      setIsOrdered(true); 
      setCart([]); 
      setIsCartOpen(false); 
      refreshData();
      showToast("Order placed successfully!", "success");
    } catch (err) {
      setIsPaying(false);
      if (err.response?.status === 429) {
          showToast("Restaurant is busy. Queue is full! Try again later.", "error");
      } else if (err.response?.status === 400) {
          const detail = err.response.data.detail;
          showToast(typeof detail === 'string' ? detail : "Out of Stock or Capacity limit reached.", "error");
      } else {
          const errorMsg = err.response?.data?.detail ? JSON.stringify(err.response.data.detail) : "Transaction Failed! Server Error.";
          showToast("Checkout Error: " + errorMsg, "error");
      }
    }
    setTimeout(() => setIsOrdered(false), 5000);
  };

  const topUpWallet = async () => {
    try {
        await axios.post(`http://localhost:8001/users/${userId}/wallet/topup`, { amount: 500 });
        refreshData();
        showToast("₹500 added to PuneFood Wallet! 🎉", "success");
    } catch(e) { showToast("Top-up Failed", "error"); }
  };

  const cancelOrder = async (orderId) => {
    if (!window.confirm("Are you sure you want to cancel this order?")) return;
    try {
      await axios.patch(`http://localhost:8003/orders/${orderId}/cancel?user_id=${userId}`);
      showToast("Order cancelled successfully. Refund will be processed.", "success");
      refreshData();
    } catch (err) {
      showToast("Cancellation failed: " + (err.response?.data?.detail || "Unknown error"), "error");
    }
  };

  const rejectOrder = async (orderId) => {
    if (!window.confirm("Reject this order? Customer will be notified and refunded.")) return;
    try {
      await axios.patch(`http://localhost:8003/orders/${orderId}/reject`);
      showToast("Order rejected.", "success");
      refreshData();
    } catch (err) {
      showToast("Rejection failed: " + (err.response?.data?.detail || "Unknown error"), "error");
    }
  };

  const toggleRestaurantOpenClose = async (restaurantId, currentOpen) => {
    try {
      await axios.patch(`http://localhost:8002/restaurants/${restaurantId}/settings`, {
        is_open: !currentOpen
      });
      refreshData();
      showToast(`Restaurant ${!currentOpen ? 'opened' : 'closed'} successfully!`, "success");
    } catch (err) {
      showToast("Failed to update restaurant status", "error");
    }
  };

  const toggleAutoAccept = async (restaurantId, currentAutoAccept) => {
    try {
      await axios.patch(`http://localhost:8002/restaurants/${restaurantId}/settings`, {
        auto_accept: !currentAutoAccept
      });
      refreshData();
      showToast(`Auto-accept ${!currentAutoAccept ? 'enabled' : 'disabled'}`, "success");
    } catch (err) {
      showToast("Failed to update auto-accept setting", "error");
    }
  };

  const handleUpdateRestaurantProfile = async () => {
      try {
          await axios.patch(`http://localhost:8002/restaurants/${merchantResId}/settings`, {
              address: editRestData.address,
              phone_number: editRestData.phone_number
          });
          showToast("Restaurant profile updated successfully!", "success");
          setShowEditRestaurantModal(false);
          refreshData();
      } catch (err) {
          showToast(err.response?.data?.detail || "Failed to update profile", "error");
      }
  };

  const handleUpdateRiderProfile = async () => {
       try {
           await axios.put(`http://localhost:8001/users/${userId}/profile`, riderProfileData);
           showToast("Profile updated successfully!", "success");
           setShowRiderProfileModal(false);
           refreshData();
       } catch (err) {
           showToast(err.response?.data?.detail || "Update failed", "error");
       }
  };

  const handleAddStaff = async () => {
    if (!newStaff.name || !newStaff.email || !newStaff.password || !newStaff.phone_number) {
      showToast("Please fill all fields", "error");
      return;
    }
    if (!newStaff.restaurant_id) {
      showToast("Please select a restaurant for staff", "error");
      return;
    }
    try {
      await axios.post(`http://localhost:8001/merchant/${userId}/staff`, {
        name: newStaff.name,
        email: newStaff.email,
        password: newStaff.password,
        phone_number: newStaff.phone_number,
        restaurant_id: parseInt(newStaff.restaurant_id)
      });
      showToast("Staff added successfully!", "success");
      setNewStaff({ name: '', email: '', password: '', phone_number: '', restaurant_id: '' });
      setShowStaffModal(false);
      refreshData();
    } catch (err) {
      showToast("Failed to add staff: " + (err.response?.data?.detail || ""), "error");
    }
  };

  const handleDeleteStaff = async (staffId) => {
    if (!window.confirm("Are you sure you want to remove this staff member?")) return;
    try {
      await axios.delete(`http://localhost:8001/merchant/${userId}/staff/${staffId}`);
      showToast("Staff removed.", "success");
      refreshData();
    } catch (err) {
      showToast("Failed to remove staff", "error");
    }
  };

  const handleEditStaff = (staff) => {
    setEditingStaff(staff);
    setEditStaffData({
      id: staff.id,
      name: staff.name,
      email: staff.email,
      phone_number: staff.phone_number,
      password: '',
      restaurant_id: staff.restaurant_id || ''
    });
    setShowEditStaffModal(true);
  };

  const handleUpdateStaff = async () => {
    if (!editStaffData.name || !editStaffData.email || !editStaffData.phone_number) {
      showToast("Name, email and phone are required", "error");
      return;
    }
    try {
      const payload = {
        name: editStaffData.name,
        email: editStaffData.email,
        phone_number: editStaffData.phone_number,
        restaurant_id: parseInt(editStaffData.restaurant_id)
      };
      if (editStaffData.password) payload.password = editStaffData.password;
      
      await axios.put(`http://localhost:8001/merchant/${userId}/staff/${editStaffData.id}`, payload);
      showToast("Staff updated successfully!", "success");
      setShowEditStaffModal(false);
      refreshData();
    } catch (err) {
      showToast("Update failed: " + (err.response?.data?.detail || ""), "error");
    }
  };

  const createRestaurant = async () => {
    if(!newResName.trim()) return;
    try {
        await axios.post('http://localhost:8002/restaurants', {
            merchant_id: parseInt(userId),
            name: newResName,
            address: "Pune, Maharashtra"
        });
        setNewResName('');
        refreshData();
        showToast("Restaurant Created Successfully! 🎉", "success");
    } catch (e) {
        const errorMsg = e.response?.data?.detail ? JSON.stringify(e.response.data.detail) : "Server issue (Port 8002)";
        showToast("Create Restaurant Failed: " + errorMsg, "error");
    }
  };

  const addMenuItem = async () => {
    if(!newItem.name || !newItem.price) {
        showToast("Bhai, dish ka naam aur price toh daalo! 😅", "error");
        return;
    }
    if(!merchantResId) {
        showToast("Pehle left side se apni restaurant select karo!", "error");
        return;
    }
    let finalImageUrl = newItem.image_url;
    if (newItem.image_file) {
        const uploadedUrl = await uploadImageFile(newItem.image_file);
        if (uploadedUrl) finalImageUrl = uploadedUrl;
    }
    try {
        await axios.post(`http://localhost:8002/restaurants/${merchantResId}/menu`, {
            name: newItem.name,
            price: parseFloat(newItem.price),
            description: newItem.description || "",
            is_available: true,
            image_url: finalImageUrl,
            is_veg: newItem.is_veg
        });
        setNewItem({ name: '', price: '', is_veg: true, description: '', image_url: '', image_file: null });
        refreshData();
        showToast("Dish added successfully! 🥘", "success");
    } catch (e) {
        const errorMsg = e.response?.data?.detail ? JSON.stringify(e.response.data.detail) : "Server issue";
        showToast("Add Item Failed: " + errorMsg, "error");
    }
  };

  const deleteMenuItem = async (itemId) => {
    if(!window.confirm("Are you sure you want to delete this dish?")) return;
    try {
        await axios.delete(`http://localhost:8002/restaurants/items/${itemId}`);
        refreshData();
        showToast("Dish deleted successfully! 🗑️", "success");
    } catch(e) {
        showToast("Failed to delete item: " + (e.response?.data?.detail || ""), "error");
    }
  };

  const updateMenuItem = async (item) => {
    const newName = prompt("Edit Dish Name:", item.name);
    if(!newName) return;
    const newPrice = prompt("Edit Price (₹):", item.price);
    if(!newPrice) return;
    const newDescription = prompt("Edit Description (custom text):", item.description || "");
    const isVeg = window.confirm("Is this dish Veg? Press OK for Veg, Cancel for Non-Veg");
    let newImageUrl = prompt("Edit Image URL (or leave blank to keep current):", item.image_url || "");
    if (newImageUrl === "") newImageUrl = item.image_url;
    try {
        await axios.put(`http://localhost:8002/restaurants/items/${item.id}`, {
            name: newName,
            price: parseFloat(newPrice),
            description: newDescription,
            is_veg: isVeg,
            image_url: newImageUrl
        });
        refreshData();
        showToast("Dish updated successfully! ✏️", "success");
    } catch(e) {
        showToast("Failed to update item: " + (e.response?.data?.detail || ""), "error");
    }
  };

  const toggleDishAvailability = async (itemId, currentAvailable) => {
    try {
      await axios.put(`http://localhost:8002/restaurants/items/${itemId}`, {
        is_available: !currentAvailable
      });
      refreshData();
      showToast(`Dish ${!currentAvailable ? 'in stock' : 'out of stock'} now`, "success");
    } catch (err) {
      showToast("Failed to update dish availability", "error");
    }
  };

  const resendPickupOtp = async (orderId) => {
    try {
      await axios.post(`http://localhost:8003/orders/${orderId}/resend-pickup-otp`);
      showToast("New Pickup OTP sent successfully!", "success");
    } catch (err) {
      showToast("Failed to resend OTP: " + (err.response?.data?.detail || "Unknown error"), "error");
    }
  };

  const handleLogout = () => { sessionStorage.clear(); window.location.href = '/'; };

  const updateStatus = async (id, status) => {
    try {
        await axios.patch(`http://localhost:8003/orders/${id}/status?status=${status}`);
        if (status === 'Delivered' && userRole === 'rider') {
            try {
                await axios.post(`http://localhost:8001/users/${userId}/wallet/topup`, { amount: 40 });
                showToast("Awesome! ₹40 credited to your Wallet for this delivery! 💰🛵", "success");
            } catch (walletErr) { console.error("Wallet update failed:", walletErr); }
        }
        refreshData();
    } catch (err) { console.error(err); }
  };

  const claimOrder = async (id) => {
    try {
        await axios.patch(`http://localhost:8003/orders/${id}/claim?rider_id=${userId}`);
        refreshData();
        showToast("Order successfully assigned to you! 🛵", "success");
    } catch (err) {
        showToast(err.response?.data?.detail || "Claim Failed! Someone else might have grabbed it.", "error");
        refreshData();
    }
  };

  const formatDate = (dateString) => {
      if(!dateString) return "Today";
      try { return new Date(dateString).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }); }
      catch(e) { return "Recently"; }
  };

  const handleRestaurantClick = (restaurant) => {
    setSelectedRestaurant(restaurant);
    setSelectedDish(null);
  };
  const handleBackToRestaurants = () => {
    setSelectedRestaurant(null);
    setSelectedDish(null);
  };
  const handleDishClick = (dish) => {
    setSelectedDish(dish);
  };
  const closeDishModal = () => {
    setSelectedDish(null);
  };

  const addNewAddress = async () => {
    if (!newAddressText.trim()) return showToast("Please enter an address", "error");
    try {
      await axios.post(`http://localhost:8001/users/${userId}/address`, { address: newAddressText });
      setNewAddressText('');
      refreshData();
      showToast("Address saved!", "success");
    } catch (err) {
      showToast("Failed to save address", "error");
    }
  };

  const startEditAddress = (id, text) => {
    setEditingAddressId(id);
    setEditingAddressText(text);
  };

  const cancelEditAddress = () => {
    setEditingAddressId(null);
    setEditingAddressText('');
  };

  const saveEditedAddress = async (id) => {
    if (!editingAddressText.trim()) return showToast("Address cannot be empty", "error");
    try {
      await axios.put(`http://localhost:8001/users/${userId}/address/${id}`, { address: editingAddressText });
      setEditingAddressId(null);
      setEditingAddressText('');
      refreshData();
      showToast("Address updated", "success");
    } catch (err) {
      showToast("Update failed", "error");
    }
  };

  const deleteAddress = async (id) => {
    if (!window.confirm("Delete this address?")) return;
    try {
      await axios.delete(`http://localhost:8001/users/${userId}/address/${id}`);
      refreshData();
      if (defaultAddressId == id) {
        sessionStorage.removeItem('defaultAddressId');
        setDefaultAddressId(null);
      }
      showToast("Address deleted", "success");
    } catch (err) {
      showToast("Delete failed", "error");
    }
  };

  const setDefaultAddress = (id, text) => {
    setDefaultAddressId(id);
    sessionStorage.setItem('defaultAddressId', id);
    sessionStorage.setItem('userAddress', text);
    setAddress(text);
    showToast("Default address set", "success");
  };

  const getEarningsByFilter = (stats, filter) => {
    if (!stats || !stats.earnings) return 0;
    switch(filter) {
      case 'today': return stats.earnings.today || 0;
      case 'week': return stats.earnings.this_week || 0;
      case 'month': return stats.earnings.this_month || 0;
      case 'year': return stats.earnings.this_year || 0;
      default: return stats.earnings.lifetime || 0;
    }
  };

  if (!isLoggedIn) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'linear-gradient(135deg, #be123c 0%, #881337 100%)', fontFamily: 'sans-serif' }}>
      <form onSubmit={(e) => {
          e.preventDefault();
          if (showRegister && !runAllValidations()) {
            showToast("Please fix the errors in the form.", "error");
            return;
          }
          const payload = { ...formData };
          delete payload.confirmPassword;
          axios.post(`http://localhost:8001/${showRegister?'register':'login'}`, payload)
          .then(res => {
              if(!showRegister) {
                  sessionStorage.setItem('isLoggedIn', 'true');
                  sessionStorage.setItem('userName', res.data.user_name);
                  sessionStorage.setItem('userId', res.data.user_id);
                  sessionStorage.setItem('userRole', (res.data.role || '').toLowerCase());
                  sessionStorage.setItem('walletBalance', res.data.wallet_balance || 0);
                  sessionStorage.setItem('token', res.data.token);
                  window.location.reload();
              } else {
                  showToast("Registered! Login to continue.", "success");
                  setShowRegister(false);
                  setFormData({ name: '', email: '', password: '', role: 'Customer', phone_number: '', vehicle_number: '', confirmPassword: '' });
                  setFormErrors({});
              }
          })
          .catch((err) => {
              let errorMsg = "Auth Failed!";
              if(err.response && err.response.data && err.response.data.detail) {
                  const detail = err.response.data.detail;
                  if (Array.isArray(detail)) errorMsg = detail[0].msg;
                  else errorMsg = detail;
              }
              showToast(errorMsg, "error");
          });
      }} style={{ background: 'white', padding: '40px', borderRadius: '25px', width: '380px', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
        <h1 style={{ textAlign: 'center', color: '#be123c', margin: '0 0 30px 0' }}>PuneFood🥘</h1>
        {showRegister && (
          <>
            <div style={{ margin: '10px 0' }}>
              <input type="text" placeholder="Full Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} onBlur={() => setFormErrors({...formErrors, name: validateName(formData.name)})} style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid #ddd', boxSizing:'border-box' }} />
              {formErrors.name && <div style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>{formErrors.name}</div>}
            </div>

            <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value, vehicle_number: ''})} style={{ width: '100%', margin: '10px 0', padding: '14px', borderRadius: '10px', border: '1px solid #ddd', boxSizing:'border-box', background:'#f8fafc' }}>
              <option value="Customer">Customer 🧑 (Gets ₹500 Bonus)</option>
              <option value="Merchant">Merchant 👨‍🍳</option>
              <option value="Rider">Rider 🛵</option>
            </select>

            <div style={{ margin: '10px 0' }}>
              <input type="text" placeholder="Phone Number (10 digits)" value={formData.phone_number} onChange={e => setFormData({...formData, phone_number: e.target.value})} onBlur={() => setFormErrors({...formErrors, phone: validatePhone(formData.phone_number)})} style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid #3b82f6', boxSizing:'border-box', background:'#eff6ff' }} />
              {formErrors.phone && <div style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>{formErrors.phone}</div>}
            </div>

            {formData.role === 'Rider' && (
              <div style={{ margin: '10px 0' }}>
                <input type="text" placeholder="Vehicle No (e.g. MH12AB1234)" value={formData.vehicle_number} onChange={e => setFormData({...formData, vehicle_number: e.target.value.toUpperCase()})} onBlur={() => setFormErrors({...formErrors, vehicle: validateVehicle(formData.vehicle_number, formData.role)})} style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid #3b82f6', boxSizing:'border-box', background:'#eff6ff' }} />
                {formErrors.vehicle && <div style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>{formErrors.vehicle}</div>}
              </div>
            )}

            <div style={{ margin: '10px 0' }}>
              <input type="email" placeholder="Email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} onBlur={() => setFormErrors({...formErrors, email: validateEmail(formData.email)})} style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid #ddd', boxSizing:'border-box' }} />
              {formErrors.email && <div style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>{formErrors.email}</div>}
            </div>

            <div style={{ margin: '10px 0' }}>
              <input type="password" placeholder="Password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} onBlur={() => setFormErrors({...formErrors, password: validatePassword(formData.password)})} style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid #ddd', boxSizing:'border-box' }} />
              {formErrors.password && <div style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>{formErrors.password}</div>}
            </div>

            <div style={{ margin: '10px 0' }}>
              <input type="password" placeholder="Confirm Password" value={formData.confirmPassword} onChange={e => setFormData({...formData, confirmPassword: e.target.value})} onBlur={() => setFormErrors({...formErrors, confirmPassword: validateConfirmPassword(formData.password, formData.confirmPassword)})} style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid #ddd', boxSizing:'border-box' }} />
              {formErrors.confirmPassword && <div style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>{formErrors.confirmPassword}</div>}
            </div>
          </>
        )}
        {!showRegister && (
          <>
            <input type="email" placeholder="Email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} style={{ width: '100%', margin: '10px 0', padding: '14px', borderRadius: '10px', border: '1px solid #ddd', boxSizing:'border-box' }} />
            <input type="password" placeholder="Password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} style={{ width: '100%', margin: '10px 0', padding: '14px', borderRadius: '10px', border: '1px solid #ddd', boxSizing:'border-box' }} />
          </>
        )}
        <button type="submit" style={{ width: '100%', padding: '15px', background: '#be123c', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', marginTop: '15px', cursor:'pointer' }}>{showRegister ? 'Join Now' : 'Sign In'}</button>
        <p onClick={() => { setShowRegister(!showRegister); setFormErrors({}); }} style={{ textAlign: 'center', cursor: 'pointer', color: '#3b82f6', marginTop: '20px', fontSize: '14px' }}>{showRegister ? 'Back to Login' : 'Create an Account'}</p>
      </form>
      
      {/* Toast Container for Login */}
      <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {toasts.map(t => (
          <div key={t.id} style={{ background: t.type === 'error' ? '#ef4444' : t.type === 'success' ? '#10b981' : '#3b82f6', color: 'white', padding: '12px 20px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', fontSize: '14px', fontWeight: 'bold', minWidth: '250px' }}>
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );

  // ----- Main App after login -----
  return (
    <div style={{ backgroundColor: '#f3f4f6', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      
      {/* Toast Container Global */}
      <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {toasts.map(t => (
          <div key={t.id} style={{ background: t.type === 'error' ? '#ef4444' : t.type === 'success' ? '#10b981' : '#3b82f6', color: 'white', padding: '12px 20px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', fontSize: '14px', fontWeight: 'bold', minWidth: '250px', animation: 'fadeIn 0.3s' }}>
            {t.message}
          </div>
        ))}
      </div>

      {isPaying && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.85)', zIndex: 5000, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'white' }}>
            <div className="animate-spin" style={{ width: '50px', height: '50px', border: '4px solid #be123c', borderTopColor: 'transparent', borderRadius: '50%', marginBottom: '20px' }}></div>
            <h2 style={{margin:0}}>Processing Secure Payment...</h2>
        </div>
      )}
      {liveNotification && <div style={{ position: 'fixed', top: '25px', right: '25px', background: '#1e293b', color: 'white', padding: '18px 25px', borderRadius: '12px', zIndex: 1000, boxShadow: '0 10px 25px rgba(0,0,0,0.5)', borderLeft: '6px solid #f59e0b' }}> <Bell size={20} color="#f59e0b" style={{marginRight:'10px'}}/> {liveNotification}</div>}
      
      <nav style={{ background: 'white', padding: '15px 60px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', position: 'sticky', top: 0, zIndex: 50 }}>
        <h2 onClick={() => { setView('home'); handleBackToRestaurants(); }} style={{ color: '#be123c', cursor: 'pointer', margin: 0 }}>PuneFood🥘</h2>
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
                <Home onClick={() => { setView('home'); handleBackToRestaurants(); }} size={24} style={{cursor:'pointer', color: view==='home'?'#be123c':'#6b7280'}} />
                <ClipboardList onClick={() => setView('orders')} size={24} style={{cursor:'pointer', color: view==='orders'?'#be123c':'#6b7280'}} />
                <MapPin onClick={() => setView('addresses')} size={24} style={{cursor:'pointer', color: view==='addresses'?'#be123c':'#6b7280'}} />
                <div style={{position:'relative'}}>
                    <ShoppingCart onClick={() => setIsCartOpen(true)} size={24} style={{cursor:'pointer', color: isCartOpen?'#be123c':'#6b7280'}} />
                    {cart.reduce((sum, i) => sum + i.quantity, 0) > 0 && <span style={{position:'absolute', top:'-8px', right:'-8px', background:'#be123c', color:'white', borderRadius:'50%', width:'18px', height:'18px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'10px', fontWeight:'bold'}}>{cart.reduce((sum, i) => sum + i.quantity, 0)}</span>}
                </div>
            </>
          )}
          <div style={{background: '#f1f5f9', padding: '8px 15px', borderRadius: '20px'}}><span style={{fontWeight:'bold'}}>{user} <small style={{color:'#be123c', textTransform:'uppercase'}}>[{userRole}]</small></span></div>
          <LogOut onClick={handleLogout} size={24} style={{ cursor: 'pointer', color: '#be123c' }} />
        </div>
      </nav>
      <div style={{ padding: '40px 60px' }}>
        
        {/* Merchant & Staff Dashboard */}
        {(userRole === 'merchant' || userRole === 'staff') && (
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            {/* Analytics Section */}
            <div style={{ marginBottom: '30px' }}>
              <div style={{ display: 'flex', gap: '20px', marginBottom: '30px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, background: 'linear-gradient(135deg, #be123c 0%, #881337 100%)', padding: '30px', borderRadius: '25px', color: 'white', boxShadow: '0 10px 20px rgba(190, 18, 60, 0.2)' }}>
                  <h3 style={{margin:0, opacity:0.9, display:'flex', alignItems:'center', gap:'10px'}}>
                    {userRole === 'merchant' ? 'Total Revenue (All Restaurants)' : 'Today\'s Revenue'}
                    <TrendingUp size={18}/>
                  </h3>
                  <h1 style={{fontSize:'45px', margin:'10px 0'}}>
                    ₹{userRole === 'merchant' 
                      ? getEarningsByFilter(merchantStats, analyticsTimeFilter).toFixed(2)
                      : (merchantStats.earnings?.today || 0).toFixed(2)
                    }
                  </h1>
                  <p style={{margin:0, fontWeight:'bold', display:'flex', alignItems:'center', gap:'8px', background:'rgba(255,255,255,0.2)', padding:'6px 12px', borderRadius:'10px', display:'inline-block'}}>
                    ✅ {merchantStats.total_orders_completed || 0} Orders Completed
                  </p>
                  {userRole === 'merchant' && <p style={{margin:'10px 0 0 0', fontSize:'13px', opacity:0.8}}>Viewing stats for: {analyticsTimeFilter}</p>}
                </div>
                <div style={{ flex: 1, background: 'white', padding: '30px', borderRadius: '25px', border: '1px solid #e2e8f0', display:'flex', flexDirection:'column', justifyContent:'center' }}>
                  <h3 style={{margin:0, color:'#374151'}}>{userRole === 'merchant' ? 'Merchant Console' : 'Staff Dashboard'} 👨‍🍳</h3>
                  <p style={{fontSize:'22px', fontWeight:'bold', color:'#111827', marginTop:'15px'}}>Welcome, {user}!</p>
                  <p style={{color:'#be123c', margin:0, fontWeight:'bold'}}>Track your business analytics live.</p>
                </div>
              </div>
              
              {/* Analytics Filters – only for merchant */}
              {userRole === 'merchant' && (
                <div style={{ background: 'white', padding: '20px', borderRadius: '20px', marginBottom: '20px', display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                  <div>
                    <label style={{ fontWeight: 'bold', marginRight: '10px', color: '#4b5563' }}>Time Period:</label>
                    <select value={analyticsTimeFilter} onChange={(e) => setAnalyticsTimeFilter(e.target.value)} style={{ padding: '8px 15px', borderRadius: '10px', border: '1px solid #ddd', background: '#f8fafc', fontWeight: 'bold' }}>
                      <option value="today">Today</option>
                      <option value="week">This Week</option>
                      <option value="month">This Month</option>
                      <option value="year">This Year</option>
                      <option value="lifetime">Lifetime</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontWeight: 'bold', marginRight: '10px', color: '#4b5563' }}>View:</label>
                    <select value={analyticsPerRestaurantId} onChange={(e) => setAnalyticsPerRestaurantId(e.target.value)} style={{ padding: '8px 15px', borderRadius: '10px', border: '1px solid #ddd', background: '#f8fafc', fontWeight: 'bold' }}>
                      <option value="">All Restaurants (Combined)</option>
                      {myRestaurants.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
              
              {userRole === 'merchant' && analyticsPerRestaurantId && perRestaurantStats[analyticsPerRestaurantId] && (
                <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '20px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
                  <h4 style={{ margin: '0 0 10px 0', color: '#1e40af' }}>{myRestaurants.find(r => r.id.toString() === analyticsPerRestaurantId)?.name} - Detailed Analytics</h4>
                  <div style={{ display: 'flex', gap: '20px' }}>
                      <div style={{ flex: 1, background: 'white', padding: '15px', borderRadius: '12px', border: '1px solid #ddd' }}>
                          <p style={{ margin: '0 0 5px 0', color: '#6b7280', fontSize: '13px' }}>Completed Orders</p>
                          <h2 style={{ margin: 0, color: '#111827' }}>{perRestaurantStats[analyticsPerRestaurantId].total_orders_completed || 0}</h2>
                      </div>
                      <div style={{ flex: 1, background: 'white', padding: '15px', borderRadius: '12px', border: '1px solid #ddd' }}>
                          <p style={{ margin: '0 0 5px 0', color: '#6b7280', fontSize: '13px' }}>Revenue ({analyticsTimeFilter})</p>
                          <h2 style={{ margin: 0, color: '#10b981' }}>₹{getEarningsByFilter(perRestaurantStats[analyticsPerRestaurantId], analyticsTimeFilter).toFixed(2)}</h2>
                      </div>
                  </div>
                </div>
              )}
            </div>

            {/* Restaurant Selection & Settings */}
            <div style={{ marginBottom: '30px', background: 'white', borderRadius: '20px', padding: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap: 'wrap', gap: '15px'}}>
                <div>
                  <label style={{fontWeight:'bold', marginRight:'15px'}}>Select Restaurant:</label>
                  <select value={merchantResId} onChange={e => {setMerchantResId(e.target.value); sessionStorage.setItem('merchantResId', e.target.value); setTimeout(refreshData, 50);}} style={{padding:'8px 15px', borderRadius:'10px', border:'1px solid #ddd', fontWeight:'600', cursor:'pointer'}} disabled={userRole === 'staff'}>
                      {myRestaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
                {userRole === 'merchant' && (
                  <div style={{ display: 'flex', gap: '10px' }}>
                      <button onClick={() => { setCapacitySettings({ max_active_orders: restaurantCapacity.max_active_orders, max_queue_length: restaurantCapacity.max_queue_length }); setShowCapacityModal(true); }} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>
                        Edit Limits
                      </button>
                      <button onClick={() => { 
                          const curr = myRestaurants.find(r => r.id.toString() === merchantResId.toString());
                          setEditRestData({ address: curr?.address || '', phone_number: curr?.phone_number || '' });
                          setShowEditRestaurantModal(true); 
                      }} style={{ background: '#f59e0b', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>
                        Edit Info
                      </button>
                  </div>
                )}
                {myRestaurants.length > 0 && merchantResId && (() => {
                  const currentRestaurant = myRestaurants.find(r => r.id.toString() === merchantResId?.toString());
                  if (!currentRestaurant) return null;
                  return (
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                      <button onClick={() => toggleRestaurantOpenClose(merchantResId, currentRestaurant.is_open)} style={{ background: currentRestaurant.is_open ? '#10b981' : '#ef4444', color: 'white', border: 'none', padding: '6px 15px', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' }}>
                        {currentRestaurant.is_open ? '🟢 Open' : '🔴 Closed'}
                      </button>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                        <span style={{ fontSize: '14px', fontWeight: 'bold' }}>Auto-Accept Orders</span>
                        <button onClick={() => toggleAutoAccept(merchantResId, currentRestaurant.auto_accept)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                          {currentRestaurant.auto_accept ? <ToggleRight size={28} color="#10b981" /> : <ToggleLeft size={28} color="#9ca3af" />}
                        </button>
                      </label>
                    </div>
                  );
                })()}
              </div>
              <div style={{ marginTop: '15px', display: 'flex', gap: '20px', fontSize: '14px', background: '#f8fafc', padding: '12px', borderRadius: '12px' }}>
                <div title="Active = Preparing or Picked Up orders"><strong>Active Orders:</strong> {restaurantCapacity.current_active_count} / {restaurantCapacity.max_active_orders} <Info size={14} style={{verticalAlign:'middle', color:'#9ca3af'}}/></div>
                <div title="Orders waiting to be prepared"><strong>Queue Length:</strong> {restaurantCapacity.current_queue_length} / {restaurantCapacity.max_queue_length} <Info size={14} style={{verticalAlign:'middle', color:'#9ca3af'}}/></div>
              </div>
            </div>

            {/* Orders – Active & Queued */}
            <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
              <div style={{ flex: 2, background: 'white', padding: '40px', borderRadius: '25px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                <h2 style={{color:'#111827', marginBottom:'20px'}}>👨‍🍳 Active Orders ({merchantOrders.filter(o => o.status !== 'Queued' && o.status !== 'Delivered' && o.status !== 'Cancelled' && o.status !== 'Cancelled_by_Merchant').length})</h2>
                {merchantOrders.filter(o => o.status !== 'Queued' && o.status !== 'Delivered' && o.status !== 'Cancelled' && o.status !== 'Cancelled_by_Merchant').length === 0 ? (
                  <div style={{textAlign:'center', padding:'40px', background:'#f8fafc', borderRadius:'15px', border:'2px dashed #e2e8f0'}}>
                    <div className="animate-pulse" style={{width:'15px', height:'15px', background:'#10b981', borderRadius:'50%', margin:'0 auto 10px auto'}}></div>
                    <h4 style={{color:'#475569', margin:0}}>No active orders</h4>
                    <p style={{color:'#94a3b8', fontSize:'13px'}}>Your kitchen is idle.</p>
                  </div>
                ) : merchantOrders.filter(o => o.status !== 'Queued' && o.status !== 'Delivered' && o.status !== 'Cancelled' && o.status !== 'Cancelled_by_Merchant').map(o => (
                  <div key={o.id} style={{ border: '1px solid #f3f4f6', padding: '20px', borderRadius: '15px', marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', background: o.status === 'Ready' ? '#f0fdf4' : 'white' }}>
                    <div>
                      <h3 style={{margin:0, display: 'flex', alignItems: 'center', gap: '8px'}}>
                          Order #{o.id}
                          <button onClick={() => setMerchantSelectedOrder(o)} style={{ background: '#f3f4f6', border: '1px solid #ddd', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 'bold' }}><Eye size={14}/> View</button>
                      </h3>
                      <p style={{margin:'5px 0', fontSize:'14px', color:'#1f2937'}}><b>Items:</b> {o.items_summary || 'Standard Meal'}</p>
                      <p style={{margin:0, color:'#6b7280', fontSize:'14px'}}>{o.status} | Total: ₹{o.total_amount}</p>
                      {o.status === 'Ready' && pickupOtpMap[o.id] && (
                        <div style={{ marginTop: '8px', background: '#fef3c7', padding: '6px 10px', borderRadius: '8px', fontSize: '13px' }}>
                          <strong>📦 Pickup OTP:</strong> {pickupOtpMap[o.id]}
                        </div>
                      )}
                    </div>
                    <div style={{display:'flex', gap:'10px', alignItems:'center'}}>
                      {(o.status === 'Pending_Acceptance' || o.status === 'Pending') && (
                        <>
                          <button onClick={() => updateStatus(o.id, 'Preparing')} style={{background:'#f59e0b', color:'white', border:'none', padding:'8px 16px', borderRadius:'10px', cursor:'pointer', fontWeight:'bold'}}>Accept</button>
                          <button onClick={() => rejectOrder(o.id)} style={{background:'#ef4444', color:'white', border:'none', padding:'8px 16px', borderRadius:'10px', cursor:'pointer', fontWeight:'bold'}}>Reject</button>
                        </>
                      )}
                      {o.status === 'Preparing' && <button onClick={() => updateStatus(o.id, 'Ready')} style={{background:'#10b981', color:'white', border:'none', padding:'10px 20px', borderRadius:'10px', cursor:'pointer', fontWeight:'bold'}}>Food Ready</button>}
                      {o.status === 'Ready' && (
                        <>
                          <span style={{color:'#10b981', fontWeight:'bold'}}>✓ Waiting for Rider</span>
                          <button onClick={() => resendPickupOtp(o.id)} style={{ background: '#f59e0b', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', marginLeft: '8px' }}>Resend Pickup OTP</button>
                        </>
                      )}
                      {o.status === 'Picked Up' && <span style={{color:'#3b82f6', fontWeight:'bold'}}>🛵 Out for Delivery</span>}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ flex: 1, background: 'white', padding: '40px', borderRadius: '25px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                <h2 style={{color:'#111827', marginBottom:'20px', display:'flex', alignItems:'center', gap:'10px'}}><Clock size={20}/> Queued Orders ({merchantOrders.filter(o => o.status === 'Queued').length})</h2>
                {merchantOrders.filter(o => o.status === 'Queued').length === 0 ? (
                  <p style={{color:'#6b7280', textAlign:'center', padding:'20px'}}>No queued orders.</p>
                ) : merchantOrders.filter(o => o.status === 'Queued').map(o => (
                  <div key={o.id} style={{ border: '1px solid #fef3c7', padding: '15px', borderRadius: '15px', marginBottom: '15px', background: '#fffbeb' }}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                      <div>
                        <h4 style={{margin:0}}>Order #{o.id}</h4>
                        <p style={{margin:'5px 0', fontSize:'13px'}}>{o.items_summary || 'Meal'}</p>
                        <p style={{margin:0, fontSize:'12px', color:'#b45309'}}>In queue - will be accepted when a slot opens</p>
                      </div>
                      <button onClick={() => rejectOrder(o.id)} style={{background:'#ef4444', color:'white', border:'none', padding:'6px 12px', borderRadius:'8px', cursor:'pointer', fontWeight:'bold'}}>Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Merchant History Section */}
            <div style={{ marginTop: '30px', background: 'white', padding: '30px', borderRadius: '25px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #f3f4f6', paddingBottom: '15px', flexWrap: 'wrap', gap: '15px' }}>
                    <h2 style={{ margin: 0, color: '#111827', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Receipt size={24}/> Completed Orders History
                    </h2>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <label style={{ fontWeight: 'bold' }}>Filter:</label>
                        <select value={merchantHistoryFilter} onChange={(e) => { setMerchantHistoryFilter(e.target.value); setMerchantHistoryPage(1); }} style={{ padding: '8px 15px', borderRadius: '10px', border: '1px solid #ddd' }}>
                            <option value="today">Today</option>
                            <option value="yesterday">Yesterday</option>
                            <option value="week">This Week</option>
                            <option value="month">This Month</option>
                            <option value="custom">Custom Range</option>
                            <option value="all">All Time</option>
                        </select>
                        {merchantHistoryFilter === 'custom' && (
                            <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                                <input type="date" value={merchantCustomDateRange.start} onChange={e => setMerchantCustomDateRange({...merchantCustomDateRange, start: e.target.value})} style={{ padding: '6px', borderRadius: '8px', border: '1px solid #ddd' }}/>
                                <span>-</span>
                                <input type="date" value={merchantCustomDateRange.end} onChange={e => setMerchantCustomDateRange({...merchantCustomDateRange, end: e.target.value})} style={{ padding: '6px', borderRadius: '8px', border: '1px solid #ddd' }}/>
                            </div>
                        )}
                        <button onClick={refreshData} style={{ background: '#f3f4f6', border: '1px solid #ddd', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer' }}>Refresh</button>
                    </div>
                </div>

                <div style={{ marginBottom: '20px', background: '#ecfdf5', padding: '15px', borderRadius: '12px', color: '#065f46', fontWeight: 'bold' }}>
                    Total Revenue for Selected Period: ₹{totalHistoryRevenue.toFixed(2)} (excludes ₹40 delivery fees)
                </div>

                {paginatedHistory.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#6b7280', padding: '20px' }}>No completed orders for this period.</p>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                            <thead>
                                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                                    <th style={{ padding: '12px' }}>Order ID</th>
                                    <th style={{ padding: '12px' }}>Date</th>
                                    <th style={{ padding: '12px' }}>Items Summary</th>
                                    <th style={{ padding: '12px' }}>Total Amount</th>
                                    <th style={{ padding: '12px' }}>Payment</th>
                                    <th style={{ padding: '12px' }}>Status</th>
                                    <th style={{ padding: '12px', textAlign: 'center' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedHistory.map(o => (
                                    <tr key={o.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                        <td style={{ padding: '12px', fontWeight: 'bold' }}>#{o.id}</td>
                                        <td style={{ padding: '12px', color: '#6b7280' }}>{formatDate(o.created_at)}</td>
                                        <td style={{ padding: '12px' }}>{o.items_summary || 'Standard Meal'}</td>
                                        <td style={{ padding: '12px', fontWeight: 'bold' }}>₹{o.total_amount}</td>
                                        <td style={{ padding: '12px' }}>{o.payment_method || 'Wallet'}</td>
                                        <td style={{ padding: '12px' }}>
                                            <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', background: o.status === 'Delivered' ? '#d1fae5' : '#fef2f2', color: o.status === 'Delivered' ? '#065f46' : '#ef4444' }}>
                                                {o.status === 'Cancelled_by_Merchant' ? 'Rejected' : o.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px', textAlign: 'center' }}>
                                            <button onClick={() => setMerchantSelectedOrder(o)} style={{ background: '#f3f4f6', border: '1px solid #ddd', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 'bold' }}><Eye size={14}/> View</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                
                {filteredCompletedMerchantOrders.length > historyPageSize && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '20px', alignItems: 'center' }}>
                        <button disabled={merchantHistoryPage === 1} onClick={() => setMerchantHistoryPage(prev => prev - 1)} style={{ padding: '8px 15px', borderRadius: '8px', border: '1px solid #ddd', background: merchantHistoryPage === 1 ? '#f3f4f6' : 'white', cursor: merchantHistoryPage === 1 ? 'not-allowed' : 'pointer' }}>Previous</button>
                        <span style={{ fontWeight: 'bold' }}>Page {merchantHistoryPage} of {Math.ceil(filteredCompletedMerchantOrders.length / historyPageSize)}</span>
                        <button disabled={merchantHistoryPage >= Math.ceil(filteredCompletedMerchantOrders.length / historyPageSize)} onClick={() => setMerchantHistoryPage(prev => prev + 1)} style={{ padding: '8px 15px', borderRadius: '8px', border: '1px solid #ddd', background: merchantHistoryPage >= Math.ceil(filteredCompletedMerchantOrders.length / historyPageSize) ? '#f3f4f6' : 'white', cursor: merchantHistoryPage >= Math.ceil(filteredCompletedMerchantOrders.length / historyPageSize) ? 'not-allowed' : 'pointer' }}>Next</button>
                    </div>
                )}
            </div>

            {/* Merchant-only sections: Add Restaurant, Staff Management */}
            {userRole === 'merchant' && (
              <div style={{ display: 'flex', gap: '30px', marginTop: '30px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, background: 'white', padding: '25px', borderRadius: '25px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                  <h3 style={{marginTop:0, color:'#be123c'}}>🏠 Add Restaurant</h3>
                  <input type="text" placeholder="Restaurant Name" value={newResName} onChange={e => setNewResName(e.target.value)} style={{width:'100%', padding:'12px', borderRadius:'10px', border:'1px solid #ddd', marginBottom:'10px', boxSizing:'border-box'}}/>
                  <button onClick={createRestaurant} style={{width:'100%', padding:'12px', background:'#be123c', color:'white', border:'none', borderRadius:'10px', fontWeight:'bold', cursor:'pointer'}}>Create</button>
                </div>

                <div style={{ flex: 1, background: 'white', padding: '25px', borderRadius: '25px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px'}}>
                    <h3 style={{margin:0, color:'#374151', display:'flex', alignItems:'center', gap:'8px'}}><Users size={18}/> Staff Management</h3>
                    <button onClick={() => setShowStaffModal(true)} style={{background:'#be123c', color:'white', border:'none', padding:'8px 15px', borderRadius:'8px', cursor:'pointer', fontWeight:'bold', display:'flex', alignItems:'center', gap:'5px'}}><UserPlus size={16}/> Add Staff</button>
                  </div>
                  {staffList.length === 0 ? (
                    <p style={{color:'#6b7280'}}>No staff members added yet.</p>
                  ) : (
                    <div style={{overflowX:'auto'}}>
                      <table style={{width:'100%', borderCollapse:'collapse'}}>
                        <thead>
                          <tr style={{borderBottom:'1px solid #e5e7eb'}}>
                            <th style={{textAlign:'left', padding:'8px'}}>Name</th>
                            <th style={{textAlign:'left', padding:'8px'}}>Email</th>
                            <th style={{textAlign:'left', padding:'8px'}}>Phone</th>
                            <th style={{textAlign:'center', padding:'8px'}}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {staffList.map(s => (
                            <tr key={s.id} style={{borderBottom:'1px solid #f3f4f6'}}>
                              <td style={{padding:'8px'}}>{s.name}</td>
                              <td style={{padding:'8px'}}>{s.email}</td>
                              <td style={{padding:'8px'}}>{s.phone_number}</td>
                              <td style={{padding:'8px', textAlign:'center'}}>
                                <button onClick={() => handleEditStaff(s)} style={{background:'none', border:'none', cursor:'pointer', color:'#3b82f6', marginRight:'8px'}}><Edit size={16}/></button>
                                <button onClick={() => handleDeleteStaff(s.id)} style={{background:'none', border:'none', cursor:'pointer', color:'#ef4444'}}><UserMinus size={18}/></button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Menu Management (for both merchant and staff) */}
            {merchantResId && (
              <div style={{ marginTop: '30px', background: 'white', padding: '25px', borderRadius: '25px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                <h3 style={{marginTop:0, color:'#10b981'}}>🥘 Add Menu Item</h3>
                <input type="text" placeholder="Dish Name" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} style={{width:'100%', padding:'12px', borderRadius:'10px', border:'1px solid #ddd', marginBottom:'10px', boxSizing:'border-box'}}/>
                <input type="number" placeholder="Price (₹)" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} style={{width:'100%', padding:'12px', borderRadius:'10px', border:'1px solid #ddd', marginBottom:'10px', boxSizing:'border-box'}}/>
                <textarea placeholder="Description (e.g. Spicy, Cheesy, etc.)" value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})} style={{width:'100%', padding:'12px', borderRadius:'10px', border:'1px solid #ddd', marginBottom:'10px', boxSizing:'border-box', minHeight:'70px'}}/>
                <input type="text" placeholder="Image URL (or upload below)" value={newItem.image_url} onChange={e => setNewItem({...newItem, image_url: e.target.value})} style={{width:'100%', padding:'12px', borderRadius:'10px', border:'1px solid #ddd', marginBottom:'10px', boxSizing:'border-box'}}/>
                <div style={{marginBottom:'15px'}}>
                  <label style={{display:'block', marginBottom:'8px', fontWeight:'bold', fontSize:'14px'}}>Upload Image File:</label>
                  <input type="file" accept="image/*" onChange={e => setNewItem({...newItem, image_file: e.target.files[0]})} style={{width:'100%'}}/>
                </div>
                <div style={{display:'flex', gap:'15px', marginBottom:'15px'}}>
                  <label style={{display:'flex', alignItems:'center', gap:'5px', cursor:'pointer'}}><input type="radio" checked={newItem.is_veg} onChange={() => setNewItem({...newItem, is_veg: true})}/> <span style={{color:'#10b981', fontWeight:'bold'}}>Veg 🟢</span></label>
                  <label style={{display:'flex', alignItems:'center', gap:'5px', cursor:'pointer'}}><input type="radio" checked={!newItem.is_veg} onChange={() => setNewItem({...newItem, is_veg: false})}/> <span style={{color:'#ef4444', fontWeight:'bold'}}>Non-Veg 🔴</span></label>
                </div>
                <button onClick={addMenuItem} style={{width:'100%', padding:'12px', background:'#10b981', color:'white', border:'none', borderRadius:'10px', fontWeight:'bold', cursor:'pointer'}}><PlusCircle size={18} style={{verticalAlign:'middle', marginRight:'5px'}}/> Add Dish</button>

                <h3 style={{marginTop:'30px', color:'#374151'}}>📋 Manage Menu</h3>
                {myRestaurants.find(r => r.id.toString() === merchantResId?.toString())?.items?.length > 0 ? (
                  myRestaurants.find(r => r.id.toString() === merchantResId.toString()).items.map(item => (
                    <div key={item.id} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'15px', borderBottom:'1px solid #f3f4f6'}}>
                      <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
                        {item.image_url && <img src={item.image_url} alt={item.name} style={{width:'50px', height:'50px', objectFit:'cover', borderRadius:'8px'}}/>}
                        <div>
                          <b style={{fontSize:'15px', color: item.is_available ? '#1f2937' : '#9ca3af', textDecoration: item.is_available ? 'none' : 'line-through'}}>{item.is_veg ? '🟢' : '🔴'} {item.name}</b>
                          <br/>
                          <span style={{fontSize:'14px', color:'#6b7280', fontWeight:'bold'}}>₹{item.price}</span>
                          {item.description && <div style={{fontSize:'12px', color:'#9ca3af'}}>{item.description}</div>}
                          
                          {/* Per-Item Capacity Info */}
                          <div style={{ display: 'flex', gap: '15px', marginTop: '8px', fontSize: '12px' }}>
                              <span title="Currently preparing/ready for this specific item" style={{ background: '#f8fafc', padding: '3px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                  Active: {itemCapacityMap[item.id] ? itemCapacityMap[item.id].current_active_count : 0} / {itemCapacityMap[item.id] && itemCapacityMap[item.id].max_active_orders !== null ? itemCapacityMap[item.id].max_active_orders : '∞'}
                              </span>
                              <span title="Orders queued waiting for this item's slot" style={{ background: '#f8fafc', padding: '3px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                  Queue: {itemCapacityMap[item.id] ? itemCapacityMap[item.id].current_queue_length : 0} / {itemCapacityMap[item.id] && itemCapacityMap[item.id].max_queue_length !== null ? itemCapacityMap[item.id].max_queue_length : '∞'}
                              </span>
                          </div>
                        </div>
                      </div>
                      <div style={{display:'flex', gap:'10px', alignItems:'center', flexWrap:'wrap', justifyContent:'flex-end'}}>
                        <label className="toggle-switch" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                          <input type="checkbox" checked={item.is_available !== false} onChange={() => toggleDishAvailability(item.id, item.is_available)} style={{ width: '20px', height: '20px', cursor: 'pointer' }} />
                          <span style={{ fontSize: '12px' }}>{item.is_available !== false ? 'In Stock' : 'Out of Stock'}</span>
                        </label>
                        <button onClick={() => {
                            setEditingItemCapacity({
                                id: item.id,
                                max_active_orders: itemCapacityMap[item.id]?.max_active_orders ?? '',
                                max_queue_length: itemCapacityMap[item.id]?.max_queue_length ?? ''
                            });
                        }} style={{padding:'6px 12px', background:'#f8fafc', border:'1px solid #3b82f6', color:'#3b82f6', borderRadius:'8px', cursor:'pointer', fontSize:'12px', fontWeight:'bold'}}>Edit Limits</button>
                        <button onClick={() => updateMenuItem(item)} style={{padding:'6px 12px', background:'#f8fafc', border:'1px solid #cbd5e1', borderRadius:'8px', cursor:'pointer'}}><Edit size={16}/></button>
                        <button onClick={() => deleteMenuItem(item.id)} style={{padding:'6px 12px', background:'#fef2f2', border:'1px solid #fca5a5', color:'#ef4444', borderRadius:'8px', cursor:'pointer'}}><Trash2 size={16}/></button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p style={{color:'#9ca3af', fontSize:'14px'}}>No items added yet.</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Rider Dashboard */}
        {userRole === 'rider' && (
          <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            <div style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
                <div style={{ flex: 1, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', padding: '30px', borderRadius: '25px', color: 'white', boxShadow: '0 10px 20px rgba(16, 185, 129, 0.3)' }}>
                    <h3 style={{margin:0, opacity:0.9}}>Lifetime Earnings 💰</h3>
                    <h1 style={{fontSize:'45px', margin:'10px 0'}}>₹{walletBalance?.toFixed(2) || '0.00'}</h1>
                    <p style={{margin:0, fontWeight:'bold'}}>{myRiderOrders?.filter(o=>o.status==='Delivered').length || 0} Deliveries Completed</p>
                </div>
                <div style={{ flex: 1, background: 'white', padding: '30px', borderRadius: '25px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h3 style={{margin:0, color:'#374151'}}>Rider Profile 🛵</h3>
                        <p style={{fontSize:'22px', fontWeight:'bold', color:'#111827', marginTop:'15px'}}>{user}</p>
                        <p style={{color:'#10b981', margin:0, fontWeight:'bold'}}>🟢 Active & Online</p>
                    </div>
                    <button onClick={() => {
                        setRiderProfileData({ phone_number: currentUserDetails.phone_number || '', vehicle_number: currentUserDetails.vehicle_number || '' });
                        setShowRiderProfileModal(true);
                    }} style={{ background: '#f3f4f6', color: '#374151', border: '1px solid #ddd', padding: '8px 15px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Edit size={16}/> Edit Profile
                    </button>
                </div>
            </div>
            <div style={{ display:'flex', gap:'30px', alignItems:'flex-start' }}>
                <div style={{ flex: 1, display:'flex', flexDirection:'column', gap:'30px' }}>
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
                    <div style={{ background: 'white', padding: '30px', borderRadius: '25px', border:'2px solid #f59e0b', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
                        <h3 style={{marginTop:0, color:'#b45309', display:'flex', alignItems:'center', gap:'10px'}}><Bike size={20}/> My Active Jobs</h3>
                        {myRiderOrders.filter(o=>o.status!=='Delivered').length === 0 ? <p style={{color:'#6b7280'}}>You don't have any active deliveries.</p> : myRiderOrders.filter(o=>o.status!=='Delivered').map(o => (
                            <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '18px', borderBottom: '1px solid #f3f4f6', alignItems:'center', background:'#fffbeb', borderRadius:'15px', marginBottom:'10px' }}>
                                <div>
                                    <b style={{fontSize:'16px'}}>Order #{o.id}</b><br/>
                                    <span style={{fontSize:'13px', color:'#b45309', fontWeight:'bold'}}>Status: {o.status}</span><br/>
                                    <span style={{fontSize:'12px', color:'#4b5563'}}>To: {o.address?.substring(0,25)}...</span>
                                </div>
                                {o.status === 'Ready' && (
                                    <button onClick={() => setOtpModal({ show: true, orderId: o.id, type: 'pickup' })} style={{ background: '#f59e0b', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer' }}>Enter Pickup OTP</button>
                                )}
                                {o.status === 'Picked Up' && (
                                    <button onClick={() => setOtpModal({ show: true, orderId: o.id, type: 'delivery' })} style={{ background: '#10b981', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer' }}>Enter Delivery OTP</button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
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
        )}

        {/* Customer Views */}
        {userRole === 'customer' && view === 'home' && (
          selectedRestaurant ? (
            <div>
              <button onClick={handleBackToRestaurants} style={{ background: 'none', border: 'none', color: '#be123c', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ArrowLeft size={20} /> Back to All Restaurants
              </button>
              <div style={{ background: 'white', borderRadius: '25px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', marginBottom: '30px' }}>
                <div style={{ background: '#be123c', padding: '30px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                      <h1 style={{ margin: 0 }}>{selectedRestaurant.name}</h1>
                      <p style={{ margin: '10px 0 0', opacity: 0.9 }}>{selectedRestaurant.address}</p>
                      {selectedRestaurant.phone_number && <p style={{ margin: '5px 0 0 0', opacity: 0.9, fontSize: '14px' }}>📞 {selectedRestaurant.phone_number}</p>}
                  </div>
                  {!selectedRestaurant.is_open && (
                      <div style={{ background: 'white', color: '#be123c', padding: '8px 16px', borderRadius: '20px', fontWeight: 'bold', fontSize: '14px' }}>
                          Currently Closed
                      </div>
                  )}
                </div>
                <div style={{ padding: '30px' }}>
                  <h2 style={{ marginTop: 0 }}>Full Menu 🍽️</h2>
                  {selectedRestaurant.items?.length === 0 ? (
                    <p>No items available.</p>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '25px' }}>
                      {selectedRestaurant.items.map(item => {
                        const available = isItemAvailable(item) && selectedRestaurant.is_open;
                        return (
                          <div key={item.id} style={{ border: '1px solid #e5e7eb', borderRadius: '20px', padding: '15px', cursor: 'pointer', transition: 'transform 0.2s', background: 'white', opacity: available ? 1 : 0.6 }} onClick={() => available && handleDishClick(item)}>
                            {item.image_url && <img src={item.image_url} alt={item.name} style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: '15px', marginBottom: '12px' }} />}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <h3 style={{ margin: 0 }}>{item.is_veg ? '🟢' : '🔴'} {item.name}</h3>
                              <span style={{ fontWeight: 'bold', color: '#be123c' }}>₹{item.price}</span>
                            </div>
                            {item.description && <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '8px' }}>{item.description}</p>}
                            {available ? (
                              <button onClick={(e) => { e.stopPropagation(); handleAddToCart(item, selectedRestaurant); }} style={{ marginTop: '12px', width: '100%', padding: '8px', background: '#be123c', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>Add to Cart</button>
                            ) : (
                              <div style={{ marginTop: '12px', width: '100%', padding: '8px', background: '#9ca3af', color: 'white', textAlign: 'center', borderRadius: '10px', fontWeight: 'bold' }}>Out of Stock 🚫</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div>
              {/* Active orders tracking – single order with navigation */}
              {activeOrders.length > 0 && (
                <div style={{ marginBottom: '50px' }}>
                  <div style={{ maxWidth: '800px', width: '100%', margin: '0 auto', background: 'white', padding: '25px', borderRadius: '25px', boxShadow: '0 10px 30px rgba(0,0,0,0.08)', border: '1px solid #f3f4f6' }}>
                    {(() => {
                      const activeOrder = activeOrders[currentActiveOrderIndex];
                      if (!activeOrder) return null;
                      const rider = riderDetailsMap[activeOrder.rider_id];
                      let stage = 0;
                      if (activeOrder.status === 'Pending_Acceptance' || activeOrder.status === 'Queued') stage = 1;
                      else if (activeOrder.status === 'Preparing') stage = 2;
                      else if (activeOrder.status === 'Ready') stage = 3;
                      else if (activeOrder.status === 'Picked Up') stage = 4;
                      else if (activeOrder.status === 'Delivered') stage = 5;
                      const stages = [
                        { label: 'Queued', value: 1, active: stage >= 1 && activeOrder.status === 'Queued' },
                        { label: 'Preparing', value: 2, active: stage >= 2 },
                        { label: 'Waiting for Rider', value: 3, active: stage >= 3 },
                        { label: 'Out for Delivery', value: 4, active: stage >= 4 },
                        { label: 'Delivered', value: 5, active: stage >= 5 }
                      ];
                      return (
                        <>
                          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'2px solid #f3f4f6', paddingBottom:'15px', flexWrap:'wrap', gap:'10px'}}>
                            <h3 style={{margin:0, color:'#be123c', display:'flex', alignItems:'center', gap:'10px'}}>
                              <div className="animate-pulse" style={{width:'12px', height:'12px', background: activeOrder.status === 'Queued' ? '#f59e0b' : '#10b981', borderRadius:'50%'}}></div>
                              Tracking Order #{activeOrder.id}
                            </h3>
                            <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                                <button onClick={() => setSelectedOrderDetails(activeOrder)} style={{ background: '#f3f4f6', border: '1px solid #ddd', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', fontWeight: 'bold' }}><Eye size={16}/> View Details</button>
                                <span style={{background:'#f3f4f6', padding:'6px 15px', borderRadius:'20px', fontSize:'13px', fontWeight:'bold', color:'#374151'}}>{activeOrder.restaurant_name}</span>
                                {(activeOrder.status === 'Pending_Acceptance' || activeOrder.status === 'Queued') && (
                                <button onClick={() => cancelOrder(activeOrder.id)} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Cancel Order</button>
                                )}
                            </div>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '20px 0' }}>
                            <button
                              onClick={() => setCurrentActiveOrderIndex(prev => Math.max(0, prev - 1))}
                              disabled={currentActiveOrderIndex === 0}
                              style={{ background: currentActiveOrderIndex === 0 ? '#e5e7eb' : '#be123c', color: 'white', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: currentActiveOrderIndex === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                              <ChevronLeft size={20} />
                            </button>
                            <span style={{ fontWeight: 'bold', fontSize: '14px' }}>Order {currentActiveOrderIndex + 1} of {activeOrders.length}</span>
                            <button
                              onClick={() => setCurrentActiveOrderIndex(prev => Math.min(activeOrders.length - 1, prev + 1))}
                              disabled={currentActiveOrderIndex === activeOrders.length - 1}
                              style={{ background: currentActiveOrderIndex === activeOrders.length - 1 ? '#e5e7eb' : '#be123c', color: 'white', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: currentActiveOrderIndex === activeOrders.length - 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                              <ChevronRight size={20} />
                            </button>
                          </div>
                          <div style={{ margin: '30px 0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
                              <div style={{ position: 'absolute', top: '20px', left: '8%', right: '8%', height: '4px', background: '#e5e7eb', zIndex: 1 }}></div>
                              {stages.map((s, idx) => (
                                <div key={idx} style={{ textAlign: 'center', zIndex: 2, background: 'white', padding: '0 10px' }}>
                                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: s.active ? '#be123c' : '#e5e7eb', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto' }}>
                                    {s.active ? <CheckCircle size={20}/> : idx+1}
                                  </div>
                                  <p style={{ fontSize: '12px', fontWeight: 'bold', marginTop: '8px', color: s.active ? '#be123c' : '#9ca3af' }}>{s.label}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                          {activeOrder.status === 'Picked Up' && rider ? (
                            <div style={{marginTop:'30px', background:'#f0f9ff', padding:'20px', borderRadius:'15px', border:'1px solid #bfdbfe', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'15px'}}>
                              <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
                                <div style={{width:'50px', height:'50px', background:'#2563eb', borderRadius:'50%', color:'white', display:'flex', justifyContent:'center', alignItems:'center', fontWeight:'bold', fontSize:'20px'}}>{rider.name?.charAt(0) || 'R'}</div>
                                <div>
                                  <p style={{margin:0, fontWeight:'bold', fontSize:'18px', color:'#1e3a8a'}}>{rider.name} <span style={{fontSize:'12px', background:'#10b981', color:'white', padding:'2px 6px', borderRadius:'10px'}}>4.9 ⭐</span></p>
                                  <p style={{margin:0, color:'#3b82f6', fontSize:'14px', marginTop:'4px'}}>Bike: <b>{rider.vehicle_number}</b></p>
                                </div>
                              </div>
                              <div style={{textAlign:'right'}}>
                                <button style={{background:'white', color:'#2563eb', border:'2px solid #2563eb', padding:'8px 15px', borderRadius:'20px', fontWeight:'bold', display:'flex', alignItems:'center', gap:'8px', cursor:'pointer'}}><Phone size={16}/> {rider.phone_number}</button>
                              </div>
                            </div>
                          ) : (
                            ['Preparing', 'Ready'].includes(activeOrder.status) && (
                              <div style={{textAlign:'center', marginTop:'20px'}}><p style={{color:'#6b7280', fontStyle:'italic'}}>Expected Delivery in ~25 Mins.</p></div>
                            )
                          )}
                          {activeOrder.status !== 'Delivered' && (
                            <div style={{ marginTop: '15px', background: '#f0fdf4', padding: '12px', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                                <div><strong>🔐 Delivery OTP:</strong> {deliveryOtpMap[activeOrder.id] || 'Loading...'}</div>
                                <button onClick={async () => {
                                  try {
                                    await axios.post(`http://localhost:8003/orders/${activeOrder.id}/resend-otp`);
                                    showToast('New OTP requested. It will appear here shortly.', "success");
                                  } catch (err) {
                                    showToast(err.response?.data?.detail || 'Resend failed', "error");
                                  }
                                }} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}>Resend OTP</button>
                              </div>
                              <small style={{ color: '#166534' }}>Share this OTP with rider for delivery</small>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}
              {/* Search and filters */}
              <div style={{ maxWidth: '700px', margin: '0 auto 40px auto' }}>
                  <div style={{ position:'relative', marginBottom: '20px' }}>
                      <Search size={22} color="#9ca3af" style={{position:'absolute', left:'18px', top:'18px'}}/>
                      <input type="text" placeholder="Search for Misal, Biryani..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: '100%', padding: '18px 18px 18px 55px', borderRadius: '35px', border: '1px solid #e2e8f0', fontSize: '17px', outline:'none', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }} />
                  </div>
                  <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                      <button onClick={() => setFilterVeg(!filterVeg)} style={{ padding: '10px 20px', borderRadius: '25px', border: filterVeg ? '2px solid #10b981' : '1px solid #e2e8f0', background: filterVeg ? '#ecfdf5' : 'white', color: filterVeg ? '#065f46' : '#4b5563', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '12px', height: '12px', border: '1px solid #10b981', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'white' }}><div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></div></div> Pure Veg
                      </button>
                      <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ padding: '10px 20px', borderRadius: '25px', border: '1px solid #e2e8f0', background: 'white', color: '#4b5563', fontWeight: 'bold', cursor: 'pointer' }}>
                          <option value="none">Sort by: Recommended</option>
                          <option value="lowToHigh">Price: Low to High</option>
                          <option value="highToLow">Price: High to Low</option>
                      </select>
                  </div>
              </div>
              {/* Restaurant cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: '35px' }}>
                  {filteredRestaurants.map(res => (
                      <div key={res.id} onClick={() => handleRestaurantClick(res)} style={{ cursor: 'pointer', background: 'white', borderRadius: '25px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', overflow:'hidden', border:'1px solid #f1f5f9', transition: 'transform 0.2s', opacity: res.is_open ? 1 : 0.6, ':hover': { transform: 'translateY(-5px)' } }}>
                          <div style={{background: res.is_open ? '#be123c' : '#6b7280', padding:'20px', color:'white', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                              <h3 style={{margin:0}}>
                                {res.name}
                                {!res.is_open && <span style={{ fontSize: '12px', background: 'white', color: '#6b7280', padding: '2px 6px', borderRadius: '4px', marginLeft: '10px' }}>Closed</span>}
                              </h3>
                              <span style={{background:'rgba(255,255,255,0.2)', padding:'4px 10px', borderRadius:'12px', fontSize:'13px', fontWeight:'bold'}}>{res.rating || '4.5'} ⭐</span>
                          </div>
                          <div style={{ padding: '25px' }}>
                              {res.items?.slice(0, 2).map(i => (
                                  <div key={i.id} style={{ display: 'flex', gap: '15px', marginBottom: '15px', alignItems: 'center' }}>
                                      {i.image_url && <img src={i.image_url} alt={i.name} style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '8px' }} />}
                                      <div>
                                          <b>{i.is_veg ? '🟢' : '🔴'} {i.name}</b><br/>
                                          <span>₹{i.price}</span>
                                          {i.description && <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>{i.description}</div>}
                                      </div>
                                  </div>
                              ))}
                              {res.items?.length > 2 && <p style={{ color: '#6b7280', textAlign: 'center' }}>+{res.items.length - 2} more items</p>}
                              <div style={{ textAlign: 'center', marginTop: '15px', color: res.is_open ? '#be123c' : '#6b7280', fontWeight: 'bold' }}>Click to see full menu →</div>
                          </div>
                      </div>
                  ))}
              </div>
            </div>
          )
        )}
        
        {userRole === 'customer' && view === 'orders' && (
          <div style={{ maxWidth: '850px', margin: '0 auto', background: 'white', padding: '45px', borderRadius: '30px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom:'2px solid #f3f4f6', paddingBottom:'20px', marginBottom:'30px', flexWrap: 'wrap', gap: '15px' }}>
              <h2 style={{margin: 0, color:'#111827', display:'flex', alignItems:'center', gap:'10px'}}><Receipt size={28}/> Order History & Receipts</h2>
              <select value={customerHistoryFilter} onChange={e => setCustomerHistoryFilter(e.target.value)} style={{ padding: '8px 15px', borderRadius: '10px', border: '1px solid #ddd', background: '#f8fafc', fontWeight: 'bold', cursor: 'pointer' }}>
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>

            {filteredPastOrders.length === 0 ? <p style={{textAlign:'center', color:'#9ca3af', padding:'40px 0'}}>No past orders found.</p> : [...filteredPastOrders].reverse().map(o => (
                <div key={o.id} style={{ border: '1px solid #e5e7eb', borderRadius: '20px', padding: '25px', marginBottom: '25px', background:'#fdfdfd' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', borderBottom:'1px dashed #d1d5db', paddingBottom:'15px', marginBottom:'15px' }}>
                        <div>
                            <span style={{background:'#f3f4f6', padding:'5px 12px', borderRadius:'8px', fontSize:'12px', fontWeight:'bold', color:'#4b5563', marginBottom:'10px', display:'inline-block'}}>Order #{o.id}</span>
                            <h3 style={{margin:'0 0 5px 0', color:'#1f2937'}}>{o.restaurant_name}</h3>
                            <p style={{margin:0, color:'#6b7280', fontSize:'13px', display:'flex', alignItems:'center', gap:'5px'}}><Calendar size={14}/> {formatDate(o.created_at)}</p>
                        </div>
                        <div style={{textAlign:'right'}}>
                            <span style={{background: o.status === 'Cancelled' || o.status === 'Cancelled_by_Merchant' ? '#fef2f2' : '#d1fae5', color: o.status === 'Cancelled' || o.status === 'Cancelled_by_Merchant' ? '#ef4444' : '#065f46', padding:'6px 15px', borderRadius:'20px', fontSize:'13px', fontWeight:'bold'}}>
                                {o.status === 'Cancelled' || o.status === 'Cancelled_by_Merchant' ? '❌ Cancelled' : '✓ Delivered'}
                            </span>
                        </div>
                    </div>
                    <div style={{background:'#f9fafb', padding:'15px', borderRadius:'12px', marginBottom:'15px'}}>
                        <p style={{margin:'0 0 8px 0', color:'#111827', fontSize:'15px'}}><b>Items:</b> {o.items_summary || 'Standard Meal'}</p>
                        <p style={{margin:'0 0 8px 0', color:'#4b5563', fontSize:'14px'}}><b>Delivered To:</b> {o.address?.substring(0, 40)}...</p>
                        <p style={{margin:0, color:'#4b5563', fontSize:'14px'}}><b>Paid via:</b> {o.payment_method || 'Wallet'}</p>
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap: 'wrap', gap: '15px' }}>
                        <div style={{fontSize:'22px', fontWeight:'900', color:'#111827'}}>Total: ₹{o.total_amount}</div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={() => setSelectedOrderDetails(o)} style={{ background: '#f8fafc', color: '#374151', border: '1px solid #cbd5e1', padding: '10px 15px', borderRadius: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}><Eye size={18}/> View Receipt</button>
                            <button onClick={() => { setCart([{name: "Reorder Item", price: o.total_amount-40, quantity: 1, restaurantId: o.restaurant_id, restaurantName: o.restaurant_name}]); setIsCartOpen(true); setView('home'); }} style={{background:'#fef2f2', color:'#be123c', border:'1px solid #be123c', padding:'10px 20px', borderRadius:'14px', fontWeight:'bold', display:'flex', alignItems:'center', gap:'8px', cursor:'pointer'}}><RotateCcw size={18}/> Reorder</button>
                        </div>
                    </div>
                </div>
            ))}
          </div>
        )}

        {userRole === 'customer' && view === 'addresses' && (
          <div style={{ maxWidth: '800px', margin: '0 auto', background: 'white', padding: '35px', borderRadius: '25px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
            <h2 style={{ marginTop: 0, borderBottom: '2px solid #f3f4f6', paddingBottom: '15px' }}>My Saved Addresses 📍</h2>
            <div style={{ marginBottom: '30px', background: '#f9fafb', padding: '20px', borderRadius: '15px' }}>
              <textarea placeholder="Enter new address (e.g., House No, Street, City, Pincode)" value={newAddressText} onChange={e => setNewAddressText(e.target.value)} rows="3" style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #ddd', marginBottom: '10px', boxSizing: 'border-box' }} />
              <button onClick={addNewAddress} style={{ background: '#10b981', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>+ Save New Address</button>
            </div>
            {savedAddresses.length === 0 ? (
              <p style={{ color: '#6b7280', textAlign: 'center' }}>No addresses saved yet.</p>
            ) : (
              savedAddresses.map(addr => {
                const addressId = addr.id;
                const addressText = addr.address || addr;
                return (
                  <div key={addressId} style={{ border: '1px solid #e5e7eb', borderRadius: '15px', padding: '15px', marginBottom: '15px', background: '#fdfdfd' }}>
                    {editingAddressId === addressId ? (
                      <>
                        <textarea value={editingAddressText} onChange={e => setEditingAddressText(e.target.value)} rows="3" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #be123c', marginBottom: '10px' }} autoFocus />
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button onClick={() => saveEditedAddress(addressId)} style={{ padding: '5px 12px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Save</button>
                          <button onClick={cancelEditAddress} style={{ padding: '5px 12px', background: '#6b7280', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
                        </div>
                      </>
                    ) : (
                      <>
                        <p style={{ margin: '0 0 10px 0', color: '#1f2937' }}>{addressText}</p>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button onClick={() => startEditAddress(addressId, addressText)} style={{ padding: '5px 12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Edit</button>
                          <button onClick={() => deleteAddress(addressId)} style={{ padding: '5px 12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Delete</button>
                          <button onClick={() => setDefaultAddress(addressId, addressText)} style={{ padding: '5px 12px', background: defaultAddressId == addressId ? '#10b981' : '#6b7280', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>{defaultAddressId == addressId ? '✓ Default' : 'Set as Default'}</button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Dish detail modal */}
      {selectedDish && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', zIndex: 2000, display: 'flex', justifyContent: 'center', alignItems: 'center' }} onClick={closeDishModal}>
          <div style={{ background: 'white', maxWidth: '500px', width: '90%', borderRadius: '25px', overflow: 'hidden', position: 'relative' }} onClick={(e) => e.stopPropagation()}>
            <button onClick={closeDishModal} style={{ position: 'absolute', top: '15px', right: '15px', background: 'black', color: 'white', border: 'none', borderRadius: '50%', width: '35px', height: '35px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>X</button>
            {selectedDish.image_url && <img src={selectedDish.image_url} alt={selectedDish.name} style={{ width: '100%', height: '300px', objectFit: 'cover' }} />}
            <div style={{ padding: '25px' }}>
              <h2>{selectedDish.is_veg ? '🟢' : '🔴'} {selectedDish.name}</h2>
              <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#be123c' }}>₹{selectedDish.price}</p>
              {selectedDish.description && <p style={{ color: '#4b5563', lineHeight: 1.5 }}>{selectedDish.description}</p>}
              <button onClick={() => { handleAddToCart(selectedDish, selectedRestaurant); closeDishModal(); }} style={{ width: '100%', padding: '15px', background: '#be123c', color: 'white', border: 'none', borderRadius: '15px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', marginTop: '20px' }}>Add to Cart</button>
            </div>
          </div>
        </div>
      )}

      {/* Order Details Tracking / Receipt Modal (Customer) */}
      {selectedOrderDetails && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', zIndex: 3000, display: 'flex', justifyContent: 'center', alignItems: 'center' }} onClick={() => setSelectedOrderDetails(null)}>
            <div style={{ background: 'white', padding: '30px', borderRadius: '20px', width: '90%', maxWidth: '500px', position: 'relative' }} onClick={e => e.stopPropagation()}>
                <button onClick={() => setSelectedOrderDetails(null)} style={{ position: 'absolute', top: '15px', right: '15px', background: '#f3f4f6', border: 'none', borderRadius: '50%', width: '35px', height: '35px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={20}/></button>
                <h2 style={{ marginTop: 0, borderBottom: '1px solid #ddd', paddingBottom: '15px' }}>Order Receipt</h2>
                
                <div style={{ marginBottom: '15px' }}>
                    <p style={{ margin: '5px 0' }}><strong>Order ID:</strong> #{selectedOrderDetails.id}</p>
                    <p style={{ margin: '5px 0' }}><strong>Restaurant:</strong> {selectedOrderDetails.restaurant_name}</p>
                    <p style={{ margin: '5px 0' }}><strong>Date:</strong> {formatDate(selectedOrderDetails.created_at)}</p>
                    <p style={{ margin: '5px 0' }}><strong>Status:</strong> <span style={{ color: '#be123c', fontWeight: 'bold' }}>{selectedOrderDetails.status}</span></p>
                </div>
                
                <div style={{ background: '#f9fafb', padding: '15px', borderRadius: '10px', marginBottom: '15px' }}>
                    <h4 style={{ margin: '0 0 10px 0' }}>Items</h4>
                    <p style={{ margin: 0, lineHeight: '1.5' }}>{selectedOrderDetails.items_summary}</p>
                    {selectedOrderDetails.special_instructions && (
                        <p style={{ margin: '10px 0 0 0', color: '#b45309', fontSize: '14px' }}><em>Note: {selectedOrderDetails.special_instructions}</em></p>
                    )}
                </div>

                <div style={{ marginBottom: '15px' }}>
                    <h4 style={{ margin: '0 0 5px 0' }}>Delivery Address</h4>
                    <p style={{ margin: 0, fontSize: '14px', color: '#4b5563' }}>{selectedOrderDetails.address}</p>
                </div>

                <div style={{ borderTop: '1px dashed #ddd', paddingTop: '15px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}><span>Base Price</span><span>₹{(selectedOrderDetails.total_amount - 40).toFixed(2)}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}><span>Delivery Fee</span><span>₹40.00</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}><span>Taxes & Charges</span><span>₹0.00</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '18px', marginTop: '10px' }}>
                        <span>Total Paid ({selectedOrderDetails.payment_method})</span>
                        <span style={{ color: '#be123c' }}>₹{selectedOrderDetails.total_amount.toFixed(2)}</span>
                    </div>
                </div>
            </div>
          </div>
      )}

      {/* Merchant / Staff Order Details Popup Modal */}
      {merchantSelectedOrder && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', zIndex: 4000, display: 'flex', justifyContent: 'center', alignItems: 'center' }} onClick={() => setMerchantSelectedOrder(null)}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '20px', width: '90%', maxWidth: '500px', position: 'relative' }} onClick={e => e.stopPropagation()}>
              <button onClick={() => setMerchantSelectedOrder(null)} style={{ position: 'absolute', top: '15px', right: '15px', background: '#f3f4f6', border: 'none', borderRadius: '50%', width: '35px', height: '35px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={20}/></button>
              <h2 style={{ marginTop: 0, borderBottom: '1px solid #ddd', paddingBottom: '15px' }}>Order Details #{merchantSelectedOrder.id}</h2>
              
              <div style={{ marginBottom: '15px' }}>
                  <p style={{ margin: '5px 0' }}><strong>Date:</strong> {formatDate(merchantSelectedOrder.created_at)}</p>
                  <p style={{ margin: '5px 0' }}><strong>Status:</strong> <span style={{ color: '#be123c', fontWeight: 'bold' }}>{merchantSelectedOrder.status}</span></p>
                  <p style={{ margin: '5px 0' }}><strong>Payment Method:</strong> {merchantSelectedOrder.payment_method}</p>
              </div>
              
              <div style={{ background: '#f9fafb', padding: '15px', borderRadius: '10px', marginBottom: '15px' }}>
                  <h4 style={{ margin: '0 0 10px 0' }}>Items Summary</h4>
                  <p style={{ margin: 0, lineHeight: '1.5', fontSize: '15px' }}>{merchantSelectedOrder.items_summary}</p>
              </div>

              <div style={{ marginBottom: '15px' }}>
                  <h4 style={{ margin: '0 0 5px 0' }}>Customer Address</h4>
                  <p style={{ margin: 0, fontSize: '14px', color: '#4b5563' }}>{merchantSelectedOrder.address}</p>
              </div>

              {merchantSelectedOrder.rider_id && riderDetailsMap[merchantSelectedOrder.rider_id] && (
                 <div style={{ marginBottom: '15px', background: '#eff6ff', padding: '15px', borderRadius: '10px', border: '1px solid #bfdbfe' }}>
                     <h4 style={{ margin: '0 0 10px 0', color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '8px' }}><Bike size={16}/> Assigned Rider</h4>
                     <p style={{ margin: '5px 0', fontSize: '14px' }}><strong>Name:</strong> {riderDetailsMap[merchantSelectedOrder.rider_id].name}</p>
                     <p style={{ margin: '5px 0', fontSize: '14px' }}><strong>Phone:</strong> {riderDetailsMap[merchantSelectedOrder.rider_id].phone_number}</p>
                     <p style={{ margin: '5px 0', fontSize: '14px' }}><strong>Vehicle:</strong> {riderDetailsMap[merchantSelectedOrder.rider_id].vehicle_number}</p>
                 </div>
              )}

              <div style={{ borderTop: '1px dashed #ddd', paddingTop: '15px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '20px' }}>
                      <span>Total Amount</span>
                      <span style={{ color: '#be123c' }}>₹{merchantSelectedOrder.total_amount}</span>
                  </div>
              </div>
          </div>
        </div>
      )}

      {/* Edit Restaurant Profile Modal */}
      {showEditRestaurantModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', zIndex: 10000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ background: 'white', padding: '30px', borderRadius: '20px', width: '400px' }}>
              <h3 style={{ marginTop: 0 }}>Edit Restaurant Info</h3>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ fontWeight: 'bold', fontSize: '14px' }}>Contact Number:</label>
                <input type="text" placeholder="e.g. 9876543210" value={editRestData.phone_number} onChange={e => setEditRestData({...editRestData, phone_number: e.target.value})} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '8px', border: '1px solid #ddd', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ fontWeight: 'bold', fontSize: '14px' }}>Complete Address:</label>
                <textarea placeholder="e.g. Shop 1, MG Road, Pune" value={editRestData.address} onChange={e => setEditRestData({...editRestData, address: e.target.value})} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '8px', border: '1px solid #ddd', boxSizing: 'border-box', minHeight: '80px' }} />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '25px' }}>
                <button onClick={handleUpdateRestaurantProfile} style={{ flex: 1, background: '#f59e0b', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Save Profile</button>
                <button onClick={() => setShowEditRestaurantModal(false)} style={{ flex: 1, background: '#6b7280', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
              </div>
            </div>
          </div>
      )}

      {/* Edit Rider Profile Modal */}
      {showRiderProfileModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', zIndex: 10000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ background: 'white', padding: '30px', borderRadius: '20px', width: '350px' }}>
              <h3 style={{ marginTop: 0 }}>Edit Rider Profile</h3>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ fontWeight: 'bold', fontSize: '14px' }}>Phone Number:</label>
                <input type="text" placeholder="e.g. 9876543210" value={riderProfileData.phone_number} onChange={e => setRiderProfileData({...riderProfileData, phone_number: e.target.value})} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '8px', border: '1px solid #ddd', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ fontWeight: 'bold', fontSize: '14px' }}>Vehicle Number:</label>
                <input type="text" placeholder="e.g. MH12AB1234" value={riderProfileData.vehicle_number} onChange={e => setRiderProfileData({...riderProfileData, vehicle_number: e.target.value})} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '8px', border: '1px solid #ddd', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '25px' }}>
                <button onClick={handleUpdateRiderProfile} style={{ flex: 1, background: '#3b82f6', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Save Profile</button>
                <button onClick={() => setShowRiderProfileModal(false)} style={{ flex: 1, background: '#6b7280', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
              </div>
            </div>
          </div>
      )}

      {/* Item Capacity Edit Modal */}
      {editingItemCapacity && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', zIndex: 10000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ background: 'white', padding: '30px', borderRadius: '20px', width: '350px' }}>
              <h3 style={{ marginTop: 0 }}>Edit Dish Capacity</h3>
              <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px' }}>Leave blank to remove limit (infinite).</p>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ fontWeight: 'bold', fontSize: '14px' }}>Max Active Orders (Currently preparing):</label>
                <input type="number" placeholder="e.g. 5" value={editingItemCapacity.max_active_orders} onChange={e => setEditingItemCapacity({...editingItemCapacity, max_active_orders: e.target.value})} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '8px', border: '1px solid #ddd', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ fontWeight: 'bold', fontSize: '14px' }}>Max Queue Length:</label>
                <input type="number" placeholder="e.g. 10" value={editingItemCapacity.max_queue_length} onChange={e => setEditingItemCapacity({...editingItemCapacity, max_queue_length: e.target.value})} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '8px', border: '1px solid #ddd', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '25px' }}>
                <button onClick={updateItemCapacity} style={{ flex: 1, background: '#3b82f6', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Save Limits</button>
                <button onClick={() => setEditingItemCapacity(null)} style={{ flex: 1, background: '#6b7280', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
              </div>
            </div>
          </div>
      )}

      {/* OTP Verification Modal */}
      {otpModal.show && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', zIndex: 3000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '20px', width: '320px', textAlign: 'center' }}>
            <h3>Enter {otpModal.type === 'pickup' ? 'Pickup' : 'Delivery'} OTP</h3>
            <input type="text" maxLength="4" placeholder="4-digit OTP" value={otpInputValue} onChange={e => setOtpInputValue(e.target.value)} style={{ width: '100%', padding: '10px', margin: '15px 0', fontSize: '20px', textAlign: 'center', borderRadius: '8px', border: '1px solid #ccc' }} />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={async () => {
                try {
                  const endpoint = otpModal.type === 'pickup' ? 'verify-pickup' : 'verify-delivery';
                  await axios.post(`http://localhost:8003/orders/${otpModal.orderId}/${endpoint}?rider_id=${userId}&otp=${otpInputValue}`);
                  showToast('✅ Verified successfully!', "success");
                  setOtpModal({ show: false, orderId: null, type: 'pickup' });
                  setOtpInputValue('');
                  refreshData();
                } catch (err) {
                  showToast(err.response?.data?.detail || 'Verification failed', "error");
                }
              }} style={{ background: '#10b981', color: 'white', padding: '10px', flex: 1, border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Verify</button>
              <button onClick={() => setOtpModal({ show: false, orderId: null, type: 'pickup' })} style={{ background: '#6b7280', color: 'white', padding: '10px', flex: 1, border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Gateway Modal */}
      {isPaymentModalOpen && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', zIndex: 6000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ background: 'white', padding: '30px', borderRadius: '20px', width: '400px', position: 'relative' }}>
                <button onClick={() => setIsPaymentModalOpen(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={24} color="#6b7280"/></button>
                <h2 style={{ marginTop: 0, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    Secure Checkout
                </h2>
                
                <div style={{ marginBottom: '25px', background: '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <p style={{ margin: '0 0 5px 0', color: '#6b7280' }}>Amount to Pay</p>
                    <h2 style={{ margin: 0, color: '#111827' }}>₹{cart.reduce((s,i)=>s+(i.price*i.quantity),0)+40}</h2>
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <p style={{ fontWeight: 'bold', marginBottom: '10px' }}>Selected Method: <span style={{ color: '#be123c' }}>{paymentMethod}</span></p>
                    
                    {paymentMethod === 'Card' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <input type="text" placeholder="Card Number (4242 4242...)" style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }} defaultValue="4242 4242 4242 4242"/>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <input type="text" placeholder="MM/YY" style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }} defaultValue="12/26"/>
                                <input type="text" placeholder="CVV" style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }} defaultValue="123"/>
                            </div>
                            <input type="text" placeholder="Name on Card" style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }} defaultValue={user}/>
                        </div>
                    )}
                    
                    {paymentMethod === 'UPI' && (
                        <div style={{ textAlign: 'center', padding: '20px 0' }}>
                            <div style={{ width: '150px', height: '150px', background: '#f3f4f6', margin: '0 auto 15px auto', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed #cbd5e1' }}>
                                <QrCode size={80} color="#9ca3af"/>
                            </div>
                            <input type="text" placeholder="Enter UPI ID (e.g. user@okhdfc)" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', boxSizing: 'border-box' }} defaultValue="user@dummyupi"/>
                        </div>
                    )}

                    {paymentMethod === 'NetBanking' && (
                        <select style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', boxSizing: 'border-box' }}>
                            <option>HDFC Bank</option>
                            <option>SBI</option>
                            <option>ICICI Bank</option>
                            <option>Axis Bank</option>
                        </select>
                    )}

                    {paymentMethod === 'Wallet' && (
                        <div style={{ padding: '15px', background: '#ecfdf5', border: '1px solid #d1fae5', borderRadius: '10px', color: '#065f46' }}>
                            <p style={{ margin: 0, fontWeight: 'bold' }}>Wallet Balance: ₹{walletBalance.toFixed(2)}</p>
                            {walletBalance < (cart.reduce((s,i)=>s+(i.price*i.quantity),0)+40) && (
                                <p style={{ margin: '5px 0 0 0', color: '#ef4444', fontSize: '13px' }}>Insufficient balance. Please add funds or choose another method.</p>
                            )}
                        </div>
                    )}
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: '#4b5563' }}>
                        <input type="checkbox" checked={simulatePaymentFailure} onChange={(e) => setSimulatePaymentFailure(e.target.checked)} />
                        Simulate Payment Failure (Testing)
                    </label>
                </div>

                <button 
                    onClick={processDummyPayment}
                    disabled={paymentMethod === 'Wallet' && walletBalance < (cart.reduce((s,i)=>s+(i.price*i.quantity),0)+40)}
                    style={{ width: '100%', padding: '15px', background: paymentMethod === 'Wallet' && walletBalance < (cart.reduce((s,i)=>s+(i.price*i.quantity),0)+40) ? '#9ca3af' : '#10b981', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '16px', cursor: paymentMethod === 'Wallet' && walletBalance < (cart.reduce((s,i)=>s+(i.price*i.quantity),0)+40) ? 'not-allowed' : 'pointer' }}>
                    Pay Now
                </button>
            </div>
          </div>
      )}

      {/* Cart Sidebar */}
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
                        {savedAddresses.length > 0 && (
                            <select onChange={(e) => { if(e.target.value !== "new") { setAddress(e.target.value); sessionStorage.setItem('userAddress', e.target.value); }}} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #ddd', marginBottom: '10px', backgroundColor: '#f8fafc', outline: 'none' }}>
                                <option value="new">-- Select a Saved Address --</option>
                                {savedAddresses.map(addr => {
                                    const addrText = addr.address || addr;
                                    return <option key={addr.id || addr} value={addrText}>{addrText.substring(0, 30)}...</option>;
                                })}
                            </select>
                        )}
                        <textarea value={address === 'Select your address' ? '' : address} onChange={(e) => { setAddress(e.target.value); sessionStorage.setItem('userAddress', e.target.value); }} placeholder="House No, Street Name, Pune..." style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #ddd', minHeight: '80px', boxSizing: 'border-box', outline: 'none' }} />
                    </div>
                    <div style={{marginBottom:'30px'}}>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px'}}>
                            <h4 style={{margin:0, color:'#374151'}}>Payment Method</h4>
                            <button onClick={topUpWallet} style={{background:'#d1fae5', color:'#065f46', border:'none', padding:'5px 12px', borderRadius:'15px', fontSize:'12px', fontWeight:'bold', cursor:'pointer'}}>+ Add ₹500</button>
                        </div>
                        <div style={{display:'flex', gap:'10px', flexWrap: 'wrap'}}>
                            {['Wallet', 'Card', 'UPI', 'NetBanking', 'COD'].map(m => (
                                <button key={m} onClick={() => setPaymentMethod(m)} style={{flex:'1 1 calc(33% - 10px)', padding:'10px', borderRadius:'10px', border: paymentMethod === m ? '2px solid #be123c' : '1px solid #e5e7eb', background: paymentMethod === m ? '#fef2f2' : 'white', fontWeight:'bold', color: paymentMethod === m ? '#be123c' : '#4b5563', cursor:'pointer', fontSize: '13px'}}>{m}</button>
                            ))}
                        </div>
                        {paymentMethod === 'Wallet' && <p style={{fontSize:'12px', color:'#666', marginTop:'10px', textAlign:'center'}}>Available Balance: ₹{walletBalance.toFixed(2)}</p>}
                    </div>
                    <div style={{ marginBottom: '30px' }}>
                        {cart.map((item) => (
                            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', paddingBottom: '15px', borderBottom: '1px solid #f3f4f6' }}>
                                <div>
                                    <div><b>{item.is_veg ? '🟢' : '🔴'} {item.name}</b></div>
                                    <span style={{ fontSize: '14px', color: '#be123c' }}>₹{item.price}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#f8fafc', padding: '6px 12px', borderRadius: '10px' }}>
                                    <button onClick={() => updateQuantity(item.id, -1)} style={{ background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', width: '28px', height: '28px', cursor: 'pointer', fontWeight: 'bold' }}>-</button>
                                    <span style={{ fontWeight: 'bold', minWidth: '24px', textAlign: 'center' }}>{item.quantity}</span>
                                    <button onClick={() => updateQuantity(item.id, 1)} style={{ background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', width: '28px', height: '28px', cursor: 'pointer', fontWeight: 'bold' }}>+</button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div style={{ marginTop: 'auto', padding: '25px', backgroundColor: '#f9fafb', borderRadius: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', color:'#6b7280' }}><span>Item Total</span><span>₹{cart.reduce((s,i)=>s+(i.price*i.quantity),0)}</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', color:'#6b7280' }}><span>Delivery Fee</span><span>₹40</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px dashed #cbd5e1', paddingTop: '15px', fontWeight: 'bold', fontSize: '26px', color:'#111827' }}><span>To Pay</span><span>₹{cart.reduce((s,i)=>s+(i.price*i.quantity),0)+40}</span></div>
                    </div>
                    <button onClick={initiatePayment} style={{ width: '100%', padding: '20px', background: '#be123c', color: 'white', border: 'none', borderRadius: '15px', marginTop: '25px', cursor: 'pointer', fontWeight: 'bold', fontSize:'19px', boxShadow:'0 10px 15px rgba(190, 18, 60, 0.3)' }}>Pay & Confirm 🚀</button>
                </div>
            ) : <div style={{textAlign:'center', marginTop:'100px'}}><ShoppingCart size={80} style={{opacity:0.1, margin:'0 auto'}}/><h3>Cart empty!</h3></div>}
        </div>
      )}
      {isOrdered && <div style={{ position: 'fixed', bottom: '50px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#059669', color: 'white', padding: '20px 60px', borderRadius: '50px', boxShadow: '0 10px 25px rgba(5, 150, 105, 0.4)', zIndex: 1000, fontWeight: 'bold', fontSize:'18px' }}>✅ Success! Order Placed.</div>}
      
      {/* Staff Add Modal */}
      {showStaffModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', zIndex: 10000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '20px', width: '400px' }}>
            <h3 style={{ marginTop: 0 }}>Add New Staff</h3>
            <input type="text" placeholder="Full Name" value={newStaff.name} onChange={e => setNewStaff({...newStaff, name: e.target.value})} style={{ width: '100%', padding: '10px', margin: '10px 0', borderRadius: '8px', border: '1px solid #ddd' }} />
            <input type="email" placeholder="Email" value={newStaff.email} onChange={e => setNewStaff({...newStaff, email: e.target.value})} style={{ width: '100%', padding: '10px', margin: '10px 0', borderRadius: '8px', border: '1px solid #ddd' }} />
            <input type="password" placeholder="Password" value={newStaff.password} onChange={e => setNewStaff({...newStaff, password: e.target.value})} style={{ width: '100%', padding: '10px', margin: '10px 0', borderRadius: '8px', border: '1px solid #ddd' }} />
            <input type="text" placeholder="Phone Number" value={newStaff.phone_number} onChange={e => setNewStaff({...newStaff, phone_number: e.target.value})} style={{ width: '100%', padding: '10px', margin: '10px 0', borderRadius: '8px', border: '1px solid #ddd' }} />
            <select value={newStaff.restaurant_id} onChange={e => setNewStaff({...newStaff, restaurant_id: e.target.value})} style={{ width: '100%', padding: '10px', margin: '10px 0', borderRadius: '8px', border: '1px solid #ddd', background: '#f8fafc' }}>
              <option value="">Select Restaurant</option>
              {myRestaurants.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button onClick={handleAddStaff} style={{ flex: 1, background: '#10b981', color: 'white', border: 'none', padding: '12px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>Add Staff</button>
              <button onClick={() => setShowStaffModal(false)} style={{ flex: 1, background: '#6b7280', color: 'white', border: 'none', padding: '12px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Staff Modal */}
      {showEditStaffModal && editingStaff && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', zIndex: 10000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '20px', width: '400px' }}>
            <h3 style={{ marginTop: 0 }}>Edit Staff</h3>
            <input type="text" placeholder="Full Name" value={editStaffData.name} onChange={e => setEditStaffData({...editStaffData, name: e.target.value})} style={{ width: '100%', padding: '10px', margin: '10px 0', borderRadius: '8px', border: '1px solid #ddd' }} />
            <input type="email" placeholder="Email" value={editStaffData.email} onChange={e => setEditStaffData({...editStaffData, email: e.target.value})} style={{ width: '100%', padding: '10px', margin: '10px 0', borderRadius: '8px', border: '1px solid #ddd' }} />
            <input type="text" placeholder="Phone Number" value={editStaffData.phone_number} onChange={e => setEditStaffData({...editStaffData, phone_number: e.target.value})} style={{ width: '100%', padding: '10px', margin: '10px 0', borderRadius: '8px', border: '1px solid #ddd' }} />
            <input type="password" placeholder="New Password (leave blank to keep unchanged)" value={editStaffData.password} onChange={e => setEditStaffData({...editStaffData, password: e.target.value})} style={{ width: '100%', padding: '10px', margin: '10px 0', borderRadius: '8px', border: '1px solid #ddd' }} />
            <select value={editStaffData.restaurant_id} onChange={e => setEditStaffData({...editStaffData, restaurant_id: e.target.value})} style={{ width: '100%', padding: '10px', margin: '10px 0', borderRadius: '8px', border: '1px solid #ddd', background: '#f8fafc' }}>
              <option value="">Select Restaurant</option>
              {myRestaurants.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button onClick={handleUpdateStaff} style={{ flex: 1, background: '#3b82f6', color: 'white', border: 'none', padding: '12px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>Update</button>
              <button onClick={() => setShowEditStaffModal(false)} style={{ flex: 1, background: '#6b7280', color: 'white', border: 'none', padding: '12px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Capacity Settings Modal (Restaurant level) */}
      {showCapacityModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', zIndex: 10000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '20px', width: '350px' }}>
            <h3 style={{ marginTop: 0 }}>Edit Kitchen Capacity</h3>
            <div style={{ marginBottom: '15px' }}>
              <label>Max Active Orders:</label>
              <input type="number" value={capacitySettings.max_active_orders} onChange={e => setCapacitySettings({...capacitySettings, max_active_orders: parseInt(e.target.value)})} style={{ width: '100%', padding: '8px', marginTop: '5px', borderRadius: '8px', border: '1px solid #ddd' }} />
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label>Max Queue Length:</label>
              <input type="number" value={capacitySettings.max_queue_length} onChange={e => setCapacitySettings({...capacitySettings, max_queue_length: parseInt(e.target.value)})} style={{ width: '100%', padding: '8px', marginTop: '5px', borderRadius: '8px', border: '1px solid #ddd' }} />
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button onClick={updateRestaurantCapacity} style={{ flex: 1, background: '#3b82f6', color: 'white', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Save</button>
              <button onClick={() => setShowCapacityModal(false)} style={{ flex: 1, background: '#6b7280', color: 'white', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;