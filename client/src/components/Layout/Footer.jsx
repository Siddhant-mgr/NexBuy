import React from 'react';
import './Layout.css';

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="app-footer">
      <div className="footer-content">
        <div className="footer-brand">
          <span className="footer-logo">NexBuy</span>
          <span className="footer-tagline">Local stores, faster shopping.</span>
        </div>
        <div className="footer-links">
          <span>Support</span>
          <span>Privacy</span>
          <span>Terms</span>
        </div>
        <div className="footer-meta">© {year} NexBuy. All rights reserved.</div>
      </div>
    </footer>
  );
};

export default Footer;
