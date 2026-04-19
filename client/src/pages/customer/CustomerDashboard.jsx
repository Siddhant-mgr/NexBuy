import React from 'react';
import { Link } from 'react-router-dom';
import { FaStore, FaShoppingCart, FaMapMarkerAlt, FaSearch } from 'react-icons/fa';
import './CustomerPages.css';

const CustomerDashboard = () => {
  return (
    <div className="dashboard-page">
      <div className="page-header">
        <h1>Welcome Back!</h1>
        <p>Discover products from nearby stores</p>
      </div>

      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(255, 107, 53, 0.1)', color: '#ff6b35' }}>
            <FaStore />
          </div>
          <div className="stat-info">
            <h3>12</h3>
            <p>Nearby Stores</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(255, 107, 53, 0.1)', color: '#ff6b35' }}>
            <FaShoppingCart />
          </div>
          <div className="stat-info">
            <h3>3</h3>
            <p>Active Reservations</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(255, 107, 53, 0.1)', color: '#ff6b35' }}>
            <FaMapMarkerAlt />
          </div>
          <div className="stat-info">
            <h3>2.5 km</h3>
            <p>Nearest Store</p>
          </div>
        </div>
      </div>

      <div className="quick-actions">
        <h2>Quick Actions</h2>
        <div className="action-cards">
          <Link to="/customer/discover" className="action-card">
            <FaSearch className="action-icon" />
            <h3>Discover Stores</h3>
            <p>Find products from nearby shops</p>
          </Link>

          <Link to="/customer/reservations" className="action-card">
            <FaShoppingCart className="action-icon" />
            <h3>My Orders</h3>
            <p>View your purchased items</p>
          </Link>
        </div>
      </div>

      <div className="recent-stores">
        <h2>Recently Viewed Stores</h2>
        <div className="stores-grid">
          {[1, 2, 3].map((store) => (
            <div key={store} className="store-card">
              <div className="store-image">
                <FaStore />
              </div>
              <div className="store-info">
                <h3>Store Name {store}</h3>
                <p className="store-distance">2.{store} km away</p>
                <div className="store-rating">
                  <span className="stars">★★★★☆</span>
                  <span className="rating-text">4.{store}</span>
                </div>
              </div>
              <Link to={`/customer/store/${store}`} className="view-store-btn">
                View Store
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboard;

