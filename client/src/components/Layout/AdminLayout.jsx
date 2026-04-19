import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  FaUserShield,
  FaSignOutAlt,
  FaBars,
  FaTimes,
  FaChartBar,
  FaStore,
  FaBoxOpen,
  FaShoppingCart,
  FaIdCard,
  FaBell,
  FaUser
} from 'react-icons/fa';
import axios from 'axios';
import './Layout.css';

const AdminLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationUnread, setNotificationUnread] = useState(0);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { path: '/admin/dashboard', icon: FaChartBar, label: 'Dashboard' },
    { path: '/admin/users', icon: FaUserShield, label: 'Users' },
    { path: '/admin/kyc', icon: FaIdCard, label: 'KYC' },
    { path: '/admin/stores', icon: FaStore, label: 'Stores' },
    { path: '/admin/products', icon: FaBoxOpen, label: 'Products' },
    { path: '/admin/orders', icon: FaShoppingCart, label: 'Orders' }
  ];

  useEffect(() => {
    if (!user?.id) return undefined;

    let cancelled = false;

    const loadNotifications = async () => {
      try {
        const res = await axios.get('/api/notifications', { params: { status: 'all', limit: 20 } });
        if (cancelled) return;
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
    const handleRead = () => setNotificationUnread(0);
    window.addEventListener('notifications:read', handleRead);
    return () => window.removeEventListener('notifications:read', handleRead);
  }, []);

  return (
    <div className="layout-container admin-layout">
      <header className="navbar">
        <div className="navbar-container">
          <div className="navbar-brand">
            <h2 className="logo">NexBuy Admin</h2>
          </div>

          <nav className="navbar-nav">
            <div className="nav-divider" />
            <Link
              to="/admin/profile"
              className={`nav-link ${location.pathname === '/admin/profile' ? 'active' : ''}`}
            >
              <FaUser className="nav-icon" />
              <span>Profile</span>
            </Link>
            <Link
              to="/admin/notifications"
              className={`nav-link ${location.pathname === '/admin/notifications' ? 'active' : ''}`}
            >
              <span className="nav-icon-wrap">
                <FaBell className="nav-icon" />
                {notificationUnread > 0 ? <span className="nav-badge">{notificationUnread}</span> : null}
              </span>
              <span>Notifications</span>
            </Link>
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`nav-link ${isActive ? 'active' : ''}`}
                >
                  <Icon className="nav-icon" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="navbar-user">
            <button type="button" className="nav-link nav-link-action nav-logout" onClick={handleLogout}>
              <FaSignOutAlt className="nav-icon" />
              <span>Logout</span>
            </button>
          </div>

          <button className="mobile-menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <FaTimes /> : <FaBars />}
          </button>
        </div>

        <div className={`mobile-nav ${sidebarOpen ? 'open' : ''}`}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`mobile-nav-link ${isActive ? 'active' : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon className="nav-icon" />
                <span>{item.label}</span>
              </Link>
            );
          })}
          <Link
            to="/admin/profile"
            className={`mobile-nav-link ${location.pathname === '/admin/profile' ? 'active' : ''}`}
            onClick={() => setSidebarOpen(false)}
          >
            <FaUser className="nav-icon" />
            <span>Profile</span>
          </Link>
          <Link
            to="/admin/notifications"
            className={`mobile-nav-link ${location.pathname === '/admin/notifications' ? 'active' : ''}`}
            onClick={() => setSidebarOpen(false)}
          >
            <span className="nav-icon-wrap">
              <FaBell className="nav-icon" />
              {notificationUnread > 0 ? <span className="nav-badge">{notificationUnread}</span> : null}
            </span>
            <span>Notifications</span>
          </Link>
          <button className="mobile-logout-btn" onClick={handleLogout}>
            <FaSignOutAlt />
            <span>Logout</span>
          </button>
        </div>
      </header>

      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

export default AdminLayout;
