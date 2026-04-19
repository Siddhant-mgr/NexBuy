import React from 'react';
import { Link } from 'react-router-dom';
import { FaMapMarkerAlt, FaShoppingCart, FaComments, FaStar, FaStore, FaClock } from 'react-icons/fa';
import './Landing.css';

const Landing = () => {
  return (
    <div className="landing-container">
      {/* Navigation */}
      <nav className="landing-nav">
        <div className="nav-container">
          <div className="nav-logo">
            <h1>NexBuy</h1>
          </div>
          <div className="nav-links">
            <Link to="/login" className="nav-link">Login</Link>
            <Link to="/register" className="nav-button">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            Discover Products from <span className="highlight">Nearby Stores</span>
          </h1>
          <p className="hero-subtitle">
            Connect with local shops in real-time. Find what you need, reserve it, and pick it up today.
          </p>
          <div className="hero-buttons">
            <Link to="/register" className="btn-primary">Start Shopping</Link>
            <Link to="/login" className="btn-secondary">Sign In</Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="container">
          <h2 className="section-title">Why Choose NexBuy?</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <FaMapMarkerAlt />
              </div>
              <h3>Location-Based Discovery</h3>
              <p>Find products from stores nearest to you. No more long delivery waits!</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <FaShoppingCart />
              </div>
              <h3>Real-Time Stock Status</h3>
              <p>See live inventory updates. Know if products are in stock before you visit.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <FaClock />
              </div>
              <h3>Reserve & Pick Up</h3>
              <p>Reserve items online and pick them up at your convenience. No more sold-out disappointments.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <FaComments />
              </div>
              <h3>Quick Bargain Chat</h3>
              <p>Negotiate prices directly with sellers through our built-in chat system.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <FaStore />
              </div>
              <h3>Support Local Businesses</h3>
              <p>Empower small local sellers with an easy-to-use platform to reach nearby customers.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <FaStar />
              </div>
              <h3>Trust & Reputation</h3>
              <p>Shop with confidence using our seller reputation and trust score system.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container">
          <h2>Ready to Get Started?</h2>
          <p>Join NexBuy today and experience hyperlocal shopping like never before.</p>
          <div className="cta-buttons">
            <Link to="/register" className="btn-primary-large">Create Account</Link>
            <Link to="/login" className="btn-secondary-large">Login</Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="container">
          <p>&copy; 2024 NexBuy. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;


