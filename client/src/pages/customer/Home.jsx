import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  FaStar, 
  FaStore, 
  FaMapMarkerAlt, 
  FaShoppingCart,
  FaArrowRight,
  FaSearch
} from 'react-icons/fa';
import axios from 'axios';
import './CustomerPages.css';

const Home = () => {
  const navigate = useNavigate();
  const [nearbyProducts, setNearbyProducts] = useState([]);
  const [featuredStores, setFeaturedStores] = useState([]);
  const [exploreStores, setExploreStores] = useState([]);
  const [loadingNearby, setLoadingNearby] = useState(true);
  const [loadingStores, setLoadingStores] = useState(true);
  const [loadError, setLoadError] = useState('');

  const visibleNearbyProducts = useMemo(() => {
    return (nearbyProducts || [])
      .slice()
      .sort((a, b) => {
        const aDist = Number.isFinite(a.distance) ? a.distance : Number.MAX_SAFE_INTEGER;
        const bDist = Number.isFinite(b.distance) ? b.distance : Number.MAX_SAFE_INTEGER;
        return aDist - bDist;
      })
      .slice(0, 6);
  }, [nearbyProducts]);

  const categories = [
    { name: 'Electronics', icon: '📱', count: 45 },
    { name: 'Groceries', icon: '🛒', count: 120 },
    { name: 'Clothing', icon: '👕', count: 89 },
    { name: 'Home & Living', icon: '🏠', count: 67 },
    { name: 'Sports', icon: '⚽', count: 34 },
    { name: 'Books', icon: '📚', count: 156 },
  ];

  useEffect(() => {
    let cancelled = false;

    const loadStores = async (coords) => {
      setLoadingStores(true);
      setLoadError('');
      try {
        const res = await axios.get('/api/stores', {
          params: coords ? { lng: coords.lng, lat: coords.lat, radiusKm: 40, limit: 8 } : { limit: 8 }
        });
        if (cancelled) return [];

        const stores = res.data.stores || [];
        const mappedStores = stores.map((store) => ({
          id: store._id,
          name: store.storeName,
          category: store.category || 'Store',
          distance: typeof store.distanceKm === 'number' ? store.distanceKm : null,
          rating: store.reputation?.averageRating ?? 0,
          trustScore: store.reputation?.trustScore ?? 0,
          isVerified: store.storeVerificationStatus === 'approved'
        }));
        setFeaturedStores(mappedStores);
        setExploreStores(mappedStores.slice(0, 8));
        return stores;
      } catch (e) {
        if (!cancelled) setLoadError('Could not load nearby stores.');
        return [];
      } finally {
        if (!cancelled) setLoadingStores(false);
      }
    };

    const loadProducts = async (stores) => {
      setLoadingNearby(true);
      try {
        const productLists = await Promise.all(
          (stores || []).map(async (store) => {
            try {
              const res = await axios.get(`/api/stores/${store._id}/products`);
              return (res.data.products || []).map((product) => ({
                ...product,
                storeId: store._id,
                storeName: store.storeName,
                storeDistance: typeof store.distanceKm === 'number' ? store.distanceKm : null,
                storeRating: store.reputation?.averageRating ?? 0
              }));
            } catch {
              return [];
            }
          })
        );

        if (cancelled) return;
        const flattened = productLists.flat();
        const mapped = flattened.map((product) => ({
          id: product._id || product.id,
          name: product.name,
          price: product.price,
          store: product.storeName,
          distance: product.storeDistance,
          rating: product.storeRating,
          imageUrl: Array.isArray(product.images) && product.images.length ? product.images[0] : ''
        }));
        setNearbyProducts(mapped);
      } finally {
        if (!cancelled) setLoadingNearby(false);
      }
    };

    const load = async () => {
      let coords = null;
      if (navigator.geolocation) {
        coords = await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ lng: pos.coords.longitude, lat: pos.coords.latitude }),
            () => resolve(null),
            { enableHighAccuracy: true, timeout: 10000 }
          );
        });
      }

      const stores = await loadStores(coords);
      await loadProducts(stores);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="home-page">
      <div className="home-hero">
        <div className="hero-content">
          <h1>Discover Products from Nearby Stores</h1>
          <p>Shop local, save time, and support your community.</p>

          {loadingStores ? (
            <div className="no-results">
              <p>Loading stores...</p>
            </div>
          ) : exploreStores.length === 0 ? (
            <div className="no-results">
              <p>{loadError || 'No nearby stores found.'}</p>
            </div>
          ) : (
            <div className="explore-map">
              <div className="explore-map-bg">
                <span className="explore-you" />
                <span className="explore-you-label">You</span>
                {exploreStores.map((store, index) => {
                  const markerPositions = [
                    { top: '18%', left: '20%' },
                    { top: '22%', left: '48%' },
                    { top: '16%', left: '72%' },
                    { top: '44%', left: '28%' },
                    { top: '48%', left: '56%' },
                    { top: '38%', left: '78%' },
                    { top: '68%', left: '36%' },
                    { top: '70%', left: '66%' }
                  ];
                  const position = markerPositions[index % markerPositions.length];
                  const emoji = store.category.toLowerCase().includes('grocery')
                    ? '🥬'
                    : store.category.toLowerCase().includes('elect')
                      ? '📱'
                      : store.category.toLowerCase().includes('fashion')
                        ? '👗'
                        : store.category.toLowerCase().includes('book')
                          ? '📚'
                          : store.category.toLowerCase().includes('pet')
                            ? '🐾'
                            : store.category.toLowerCase().includes('home')
                              ? '🏠'
                              : store.category.toLowerCase().includes('sport')
                                ? '🏀'
                                : '🏬';
                  return (
                    <button
                      key={store.id}
                      type="button"
                      className="explore-marker"
                      style={{ top: position.top, left: position.left }}
                      onClick={() => navigate(`/customer/store/${store.id}`)}
                      title={store.name}
                    >
                      <span className="explore-marker-dot">{emoji}</span>
                      <span className="explore-marker-name">{store.name}</span>
                    </button>
                  );
                })}
              </div>
              <div className="explore-legend">
                <span className="legend-dot you" /> Your location
                <span className="legend-dot store" /> Stores ({exploreStores.length})
              </div>
            </div>
          )}
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
          {loadingNearby ? (
            <div className="no-results">
              <p>Loading nearby products...</p>
            </div>
          ) : visibleNearbyProducts.length === 0 ? (
            <div className="no-results">
              <p>No nearby products found.</p>
            </div>
          ) : (
            visibleNearbyProducts.map((product) => (
              <Link
                key={product.id}
                to={`/customer/product/${product.id}`}
                className="product-card-home"
              >
                <div className="product-image-home">
                  {product.imageUrl ? (
                    <img
                      className="product-image-home-img"
                      src={product.imageUrl}
                      alt={product.name}
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        setNearbyProducts((prev) =>
                          prev.map((item) =>
                            item.id === product.id ? { ...item, imageUrl: '' } : item
                          )
                        );
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
                      <span>{Number.isFinite(product.distance) ? product.distance.toFixed(1) : '--'} km</span>
                    </div>
                  </div>
                  <div className="product-price-home">
                    <span className="price">NRS {product.price}</span>
                    <button className="btn-reserve-small">Buy</button>
                  </div>
                </div>
              </Link>
            ))
          )}
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
          {loadingStores ? (
            <div className="no-results">
              <p>Loading nearby stores...</p>
            </div>
          ) : featuredStores.length === 0 ? (
            <div className="no-results">
              <p>{loadError || 'No nearby stores found.'}</p>
            </div>
          ) : (
            featuredStores.map((store) => (
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
                      <span>{Number.isFinite(store.distance) ? store.distance.toFixed(1) : '--'} km</span>
                    </div>
                  </div>
                </div>
                <div className="featured-store-action">
                  <span>Visit Store</span>
                  <FaArrowRight />
                </div>
              </Link>
            ))
          )}
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

