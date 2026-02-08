import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { io } from 'socket.io-client';
import axios from 'axios';
import { 
  FaHome, 
  FaBox, 
  FaStore, 
  FaChartBar, 
  FaShoppingCart,
  FaComments, 
  FaUser, 
  FaSignOutAlt,
  FaBars,
  FaTimes
} from 'react-icons/fa';
import './Layout.css';

const SellerLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const menuRef = useRef(null);
  const socketRef = useRef(null);
  const roomsRef = useRef([]);
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { path: '/seller/dashboard', icon: FaHome, label: 'Dashboard' },
    { path: '/seller/inventory', icon: FaBox, label: 'Inventory' },
    { path: '/seller/store', icon: FaStore, label: 'Store Management' },
    { path: '/seller/analytics', icon: FaChartBar, label: 'Analytics' },
    { path: '/seller/orders', icon: FaShoppingCart, label: 'Orders' },
    { path: '/seller/chat', icon: FaComments, label: 'Messages' },
    { path: '/seller/profile', icon: FaUser, label: 'Profile' },
  ];

  useEffect(() => {
    const handleClick = (event) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (!user?.id) return undefined;

    let cancelled = false;

    const setupSocket = async () => {
      try {
        const ordersRes = await axios.get('/api/orders/store', { params: { status: 'all', limit: 200 } });
        if (cancelled) return;
        const orders = ordersRes.data.orders || [];
        const storeId = ordersRes.data.store?._id;

        if (!storeId) return;
        const customerIds = [...new Set(orders.map((o) => o.customerId?._id).filter(Boolean))];
        const rooms = customerIds.map((customerId) => `chat:store:${storeId}:customer:${customerId}`);

        roomsRef.current = rooms;
        if (!socketRef.current) {
          socketRef.current = io(API_BASE_URL, { transports: ['websocket'] });
        }

        rooms.forEach((roomId) => socketRef.current.emit('join-room', roomId));

        socketRef.current.off('receive-message');
        socketRef.current.on('receive-message', (payload) => {
          if (!payload?.message) return;
          if (String(payload.message.senderId) === String(user.id)) return;
          if (location.pathname.startsWith('/seller/chat')) return;
          setUnreadCount((prev) => prev + 1);
        });
      } catch (e) {
        // ignore nav badge errors
      }
    };

    setupSocket();

    return () => {
      cancelled = true;
      if (socketRef.current) {
        roomsRef.current.forEach((roomId) => socketRef.current.emit('leave-room', roomId));
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [API_BASE_URL, location.pathname, user?.id]);

  useEffect(() => {
    if (location.pathname.startsWith('/seller/chat')) {
      setUnreadCount(0);
    }
  }, [location.pathname]);

  return (
    <div className="layout-container">
      {/* Horizontal Navigation Bar */}
      <header className="navbar">
        <div className="navbar-container">
          <div className="navbar-brand">
            <h2 className="logo">NexBuy</h2>
          </div>

          {/* Desktop Navigation */}
          <nav className="navbar-nav">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              const showBadge = item.path === '/seller/chat' && unreadCount > 0;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`nav-link ${isActive ? 'active' : ''}`}
                >
                  <span className="nav-icon-wrap">
                    <Icon className="nav-icon" />
                    {showBadge ? <span className="nav-badge">{unreadCount}</span> : null}
                  </span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Menu */}
          <div className="navbar-user" ref={menuRef}>
            <div className={`user-menu ${menuOpen ? 'open' : ''}`}>
              <button
                type="button"
                className="user-menu-button"
                onClick={() => setMenuOpen((prev) => !prev)}
                aria-haspopup="true"
                aria-expanded={menuOpen}
              >
                <div className="user-avatar-small">
                  {user?.avatarUrl ? (
                    <img className="user-avatar-img" src={user.avatarUrl} alt={user.name || 'User'} />
                  ) : (
                    <FaUser />
                  )}
                </div>
              </button>
              <div className={`user-menu-dropdown ${menuOpen ? 'open' : ''}`}>
                <div className="user-menu-header">
                  <p className="user-name">{user?.name}</p>
                  <p className="user-role">Seller</p>
                </div>
                <button className="logout-btn" onClick={handleLogout}>
                  <FaSignOutAlt />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Menu Toggle */}
          <button className="mobile-menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <FaTimes /> : <FaBars />}
          </button>
        </div>

        {/* Mobile Navigation */}
        <div className={`mobile-nav ${sidebarOpen ? 'open' : ''}`}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            const showBadge = item.path === '/seller/chat' && unreadCount > 0;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`mobile-nav-link ${isActive ? 'active' : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <span className="nav-icon-wrap">
                  <Icon className="nav-icon" />
                  {showBadge ? <span className="nav-badge">{unreadCount}</span> : null}
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
          <button className="mobile-logout-btn" onClick={handleLogout}>
            <FaSignOutAlt />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        {user?.seller?.verificationStatus && user.seller.verificationStatus !== 'approved' && (
          <div className="approval-banner">
            <p>
              Your seller account is <strong>{user.seller.verificationStatus}</strong>. Admin approval is required to manage your store and products.
            </p>
          </div>
        )}
        {children}
      </main>
    </div>
  );
};

export default SellerLayout;

