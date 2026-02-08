import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  FaUserShield,
  FaUsers,
  FaSignOutAlt,
  FaBars,
  FaTimes,
  FaUser,
  FaChartBar,
  FaStore,
  FaBoxOpen,
  FaShoppingCart
} from 'react-icons/fa';
import './Layout.css';

const AdminLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { path: '/admin/dashboard', icon: FaChartBar, label: 'Dashboard' },
    { path: '/admin/users', icon: FaUserShield, label: 'Users' },
    { path: '/admin/sellers', icon: FaUsers, label: 'Sellers' },
    { path: '/admin/stores', icon: FaStore, label: 'Stores' },
    { path: '/admin/products', icon: FaBoxOpen, label: 'Products' },
    { path: '/admin/orders', icon: FaShoppingCart, label: 'Orders' }
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

  return (
    <div className="layout-container">
      <header className="navbar">
        <div className="navbar-container">
          <div className="navbar-brand">
            <h2 className="logo">NexBuy Admin</h2>
          </div>

          <nav className="navbar-nav">
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
                    <FaUserShield />
                  )}
                </div>
              </button>
              <div className={`user-menu-dropdown ${menuOpen ? 'open' : ''}`}>
                <div className="user-menu-header">
                  <p className="user-name">{user?.name}</p>
                  <p className="user-role">Admin</p>
                </div>
                <button className="logout-btn" onClick={handleLogout}>
                  <FaSignOutAlt />
                  <span>Logout</span>
                </button>
              </div>
            </div>
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
