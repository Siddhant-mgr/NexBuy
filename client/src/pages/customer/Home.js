import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  FaStar, 
  FaStore, 
  FaMapMarkerAlt, 
  FaShoppingCart,
  FaArrowRight,
  FaSearch
} from 'react-icons/fa';
import './CustomerPages.css';

const Home = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const nearbyProducts = [
    { id: 1, name: 'Wireless Headphones', price: 49.99, store: 'TechMart Electronics', distance: 1.2, rating: 4.5, imageUrl: 'https://picsum.photos/seed/nexbuy-headphones/800/600' },
    { id: 2, name: 'Organic Vegetables Pack', price: 24.99, store: 'Fresh Groceries', distance: 2.3, rating: 4.8, imageUrl: 'https://picsum.photos/seed/nexbuy-veggies/800/600' },
    { id: 3, name: 'Summer Dress', price: 59.99, store: 'Fashion Boutique', distance: 0.8, rating: 4.2, imageUrl: 'https://picsum.photos/seed/nexbuy-dress/800/600' },
    { id: 4, name: 'Bluetooth Speaker', price: 79.99, store: 'TechMart Electronics', distance: 1.2, rating: 4.6, imageUrl: 'https://picsum.photos/seed/nexbuy-speaker/800/600' },
    { id: 5, name: 'Running Shoes', price: 89.99, store: 'Sports Zone', distance: 1.9, rating: 4.7, imageUrl: 'https://picsum.photos/seed/nexbuy-shoes/800/600' },
    { id: 6, name: 'Coffee Maker', price: 129.99, store: 'Home Essentials', distance: 3.1, rating: 4.5, imageUrl: 'https://picsum.photos/seed/nexbuy-coffee/800/600' },
  ]
    .filter((product) => product.distance <= 2)
    .sort((a, b) => a.distance - b.distance);

  const featuredStores = [
    { id: 1, name: 'TechMart Electronics', category: 'Electronics', distance: 1.2, rating: 4.5, trustScore: 95, products: 45 },
    { id: 2, name: 'Fresh Groceries', category: 'Groceries', distance: 2.3, rating: 4.8, trustScore: 98, products: 120 },
    { id: 3, name: 'Fashion Boutique', category: 'Clothing', distance: 0.8, rating: 4.2, trustScore: 92, products: 89 },
  ];

  const categories = [
    { name: 'Electronics', icon: '📱', count: 45 },
    { name: 'Groceries', icon: '🛒', count: 120 },
    { name: 'Clothing', icon: '👕', count: 89 },
    { name: 'Home & Living', icon: '🏠', count: 67 },
    { name: 'Sports', icon: '⚽', count: 34 },
    { name: 'Books', icon: '📚', count: 156 },
  ];

  return (
    <div className="home-page">
      {/* Hero Section */}
      <div className="home-hero">
        <div className="hero-content">
          <h1>Discover Products from Nearby Stores</h1>
          <p>Find what you need and buy it from nearby stores</p>
          <div className="hero-search">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search products or stores..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Link to="/customer/discover" className="search-btn">
              Search
            </Link>
          </div>
        </div>
      </div>

      {/* Categories Section */}
      <section className="home-section">
        <div className="section-header">
          <h2>Shop by Category</h2>
          <Link to="/customer/discover" className="view-all-link">
            View All <FaArrowRight />
          </Link>
        </div>
        <div className="categories-grid">
          {categories.map((category, index) => (
            <Link
              key={index}
              to="/customer/discover"
              className="category-card"
            >
              <div className="category-icon">{category.icon}</div>
              <h3>{category.name}</h3>
              <p>{category.count} products</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Nearby Products */}
      <section className="home-section">
        <div className="section-header">
          <div className="section-title-with-icon">
            <FaMapMarkerAlt className="nearby-icon" />
            <h2>Nearby Products</h2>
          </div>
          <Link to="/customer/discover" className="view-all-link">
            View All <FaArrowRight />
          </Link>
        </div>
        <div className="products-slider">
          {nearbyProducts.map((product) => (
            <div key={product.id} className="product-card-home">
              <div className="product-image-home">
                {product.imageUrl ? (
                  <img
                    className="product-image-home-img"
                    src={product.imageUrl}
                    alt={product.name}
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="product-emoji">🛍️</div>
                )}
                <span className="nearby-badge">
                  <FaMapMarkerAlt /> Nearby
                </span>
              </div>
              <div className="product-info-home">
                <h3>{product.name}</h3>
                <div className="product-store-info">
                  <FaStore className="store-icon-small" />
                  <span>{product.store}</span>
                </div>
                <div className="product-meta">
                  <div className="product-rating">
                    <FaStar className="star-filled" />
                    <span>{product.rating}</span>
                  </div>
                  <div className="product-distance">
                    <FaMapMarkerAlt />
                    <span>{product.distance} km</span>
                  </div>
                </div>
                <div className="product-price-home">
                  <span className="price">${product.price}</span>
                  <button className="btn-reserve-small">Buy</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Nearby Stores */}
      <section className="home-section">
        <div className="section-header">
          <div className="section-title-with-icon">
            <FaMapMarkerAlt className="featured-icon" />
            <h2>Nearby Stores</h2>
          </div>
          <Link to="/customer/discover" className="view-all-link">
            View All <FaArrowRight />
          </Link>
        </div>
        <div className="featured-stores-grid">
          {featuredStores.map((store) => (
            <Link
              key={store.id}
              to={`/customer/store/${store.id}`}
              className="featured-store-card"
            >
              <div className="featured-store-header">
                <div className="featured-store-avatar">
                  <FaStore />
                </div>
                <div className="featured-store-badge">
                  <FaMapMarkerAlt /> Nearby
                </div>
              </div>
              <div className="featured-store-info">
                <h3>{store.name}</h3>
                <p className="store-category-badge">{store.category}</p>
                <div className="featured-store-stats">
                  <div className="store-stat">
                    <FaStar className="stat-icon" />
                    <span>{store.rating}</span>
                  </div>
                  <div className="store-stat">
                    <span className="trust-score">{store.trustScore}% Trust</span>
                  </div>
                  <div className="store-stat">
                    <FaMapMarkerAlt className="stat-icon" />
                    <span>{store.distance} km</span>
                  </div>
                </div>
                <div className="featured-store-products">
                  <FaShoppingCart />
                  <span>{store.products} products available</span>
                </div>
              </div>
              <div className="featured-store-action">
                <span>Visit Store</span>
                <FaArrowRight />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Quick Actions */}
      <section className="home-section">
        <div className="section-header">
          <h2>Quick Actions</h2>
        </div>
        <div className="quick-actions-grid">
          <Link to="/customer/discover" className="quick-action-card">
            <div className="quick-action-icon">
              <FaSearch />
            </div>
            <h3>Discover Stores</h3>
            <p>Find products from nearby shops</p>
          </Link>
          <Link to="/customer/reservations" className="quick-action-card">
            <div className="quick-action-icon">
              <FaShoppingCart />
            </div>
            <h3>My Orders</h3>
            <p>View your purchased items</p>
          </Link>
          <Link to="/customer/chat" className="quick-action-card">
            <div className="quick-action-icon">
              <FaStore />
            </div>
            <h3>Messages</h3>
            <p>Chat with sellers</p>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;

