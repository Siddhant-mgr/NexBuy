import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { io } from 'socket.io-client';
import axios from 'axios';
import { 
  FaHome, 
  FaStore, 
  FaShoppingCart, 
  FaComments, 
  FaUser, 
  FaSignOutAlt,
  FaBars,
  FaTimes,
  FaClipboardList,
  FaBell,
  FaSearch,
  FaHeart
} from 'react-icons/fa';
import Footer from './Footer';
import './Layout.css';

const CustomerLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationUnread, setNotificationUnread] = useState(0);
  const [navSearch, setNavSearch] = useState('');
  const [navSearchOpen, setNavSearchOpen] = useState(false);
  const navSearchInputRef = useRef(null);
  const menuRef = useRef(null);
  const notificationRef = useRef(null);
  const navSearchRef = useRef(null);
  const socketRef = useRef(null);
  const roomsRef = useRef([]);
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { path: '/customer/home', icon: FaHome, label: 'Home' },
    { path: '/customer/discover', icon: FaStore, label: 'Discover' },
    { path: '/customer/chat', icon: FaComments, label: 'Messages' },
    { path: '/customer/cart', icon: FaShoppingCart, label: 'Cart' }
  ];

  const showHomeSearch = true;

  useEffect(() => {
    if (showHomeSearch) return;
    setNavSearch('');
    setNavSearchOpen(false);
  }, [showHomeSearch]);

  useEffect(() => {
    if (navSearchOpen && navSearchInputRef.current) {
      navSearchInputRef.current.focus();
    }
  }, [navSearchOpen]);

  const handleNavSearchSubmit = (event) => {
    event.preventDefault();
    const trimmed = navSearch.trim();
    navigate(trimmed ? `/customer/discover?q=${encodeURIComponent(trimmed)}` : '/customer/discover');
  };

  const handleNavSearchToggle = (event) => {
    if (navSearchOpen) return;
    event.preventDefault();
    setNavSearchOpen(true);
  };

  useEffect(() => {
    const handleClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
      if (navSearchRef.current && !navSearchRef.current.contains(event.target)) {
        setNavSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (!user?.id) return undefined;

    let cancelled = false;

    const loadNotifications = async () => {
      try {
        const res = await axios.get('/api/notifications', { params: { status: 'all', limit: 20 } });
        if (cancelled) return;
        setNotifications(res.data.notifications || []);
        setNotificationUnread(res.data.unreadCount || 0);
      } catch (e) {
        // ignore notification list failures
      }
    };

    loadNotifications();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return undefined;

    let cancelled = false;

    const setupSocket = async () => {
      try {
        const ordersRes = await axios.get('/api/orders', { params: { status: 'all', limit: 200 } });
        if (cancelled) return;
        const orders = ordersRes.data.orders || [];
        const storeIds = [...new Set(
          orders
            .map((o) => o.storeId?._id || o.storeId?.id || o.storeId)
            .filter(Boolean)
            .map((value) => String(value))
        )];
        const rooms = storeIds.map((storeId) => `chat:store:${storeId}:customer:${user.id}`);

        roomsRef.current = rooms;
        if (!socketRef.current) {
          socketRef.current = io(API_BASE_URL, { transports: ['websocket'] });
        }

        socketRef.current.emit('join-room', `user:${user.id}`);

        rooms.forEach((roomId) => socketRef.current.emit('join-room', roomId));

        socketRef.current.off('receive-message');
        socketRef.current.on('receive-message', (payload) => {
          if (!payload?.message) return;
          if (String(payload.message.senderId) === String(user.id)) return;
          if (location.pathname.startsWith('/customer/chat')) return;
          setUnreadCount((prev) => prev + 1);
        });

        socketRef.current.off('notification:new');
        socketRef.current.on('notification:new', (payload) => {
          if (!payload?.notification) return;
          setNotifications((prev) => [payload.notification, ...(prev || []).slice(0, 19)]);
          setNotificationUnread((prev) => prev + 1);
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
        socketRef.current.emit('leave-room', `user:${user.id}`);
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [API_BASE_URL, location.pathname, user?.id]);

  useEffect(() => {
    if (location.pathname.startsWith('/customer/chat')) {
      setUnreadCount(0);
    }
  }, [location.pathname]);

  const toggleNotifications = async () => {
    const nextOpen = !notificationsOpen;
    setNotificationsOpen(nextOpen);

    if (nextOpen && notificationUnread > 0) {
      try {
        await axios.put('/api/notifications/read-all');
        setNotifications((prev) => (prev || []).map((n) => ({ ...n, isRead: true })));
        setNotificationUnread(0);
      } catch (e) {
        // ignore
      }
    }
  };

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
              const showBadge = item.path === '/customer/chat' && unreadCount > 0;
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

          <div className="navbar-user">
            {showHomeSearch ? (
              <form
                ref={navSearchRef}
                className={`navbar-search ${navSearchOpen ? 'open' : ''}`}
                onSubmit={handleNavSearchSubmit}
              >
                {navSearchOpen ? (
                  <input
                    ref={navSearchInputRef}
                    type="search"
                    placeholder="Search"
                    value={navSearch}
                    onChange={(e) => setNavSearch(e.target.value)}
                    aria-label="Search stores or products"
                  />
                ) : null}
                <button
                  type={navSearchOpen ? 'submit' : 'button'}
                  className="navbar-search-toggle"
                  onClick={handleNavSearchToggle}
                  aria-label="Open search"
                  aria-expanded={navSearchOpen}
                >
                  <FaSearch />
                </button>
              </form>
            ) : null}
            <div className="notification-wrap" ref={notificationRef}>
              <button
                type="button"
                className="notification-button"
                onClick={toggleNotifications}
                aria-haspopup="true"
                aria-expanded={notificationsOpen}
              >
                <FaBell />
                {notificationUnread > 0 ? <span className="nav-badge">{notificationUnread}</span> : null}
              </button>
              <div className={`notification-dropdown ${notificationsOpen ? 'open' : ''}`}>
                <p className="notification-title">Notifications</p>
                {notifications.length === 0 ? (
                  <div className="notification-empty">No notifications yet.</div>
                ) : (
                  notifications.map((item) => (
                    <div
                      key={item.id}
                      className={`notification-item ${item.isRead ? '' : 'unread'}`}
                    >
                      <h4>{item.title}</h4>
                      <p>{item.message}</p>
                      <span className="notification-time">
                        {new Date(item.createdAt).toLocaleString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* User Menu */}
            <div ref={menuRef}>
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
                  <p className="user-role">Customer</p>
                </div>
                <Link className="user-menu-link" to="/customer/profile" onClick={() => setMenuOpen(false)}>
                  <FaUser />
                  <span>Profile</span>
                </Link>
                <Link className="user-menu-link" to="/customer/favorites" onClick={() => setMenuOpen(false)}>
                  <FaHeart />
                  <span>Favorites</span>
                </Link>
                <Link className="user-menu-link" to="/customer/reservations" onClick={() => setMenuOpen(false)}>
                  <FaClipboardList />
                  <span>My Orders</span>
                </Link>
                <button className="logout-btn" onClick={handleLogout}>
                  <FaSignOutAlt />
                  <span>Logout</span>
                </button>
              </div>
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
            const showBadge = item.path === '/customer/chat' && unreadCount > 0;
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
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default CustomerLayout;

