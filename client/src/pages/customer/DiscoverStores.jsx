import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaStore, FaMapMarkerAlt, FaStar, FaSearch, FaFilter, FaCheckCircle } from 'react-icons/fa';
import axios from 'axios';
import './CustomerPages.css';

const DiscoverStores = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showingAll, setShowingAll] = useState(false);
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadStores = async () => {
      setLoading(true);
      setError('');

      const fetchWithoutGeo = async () => {
        const res = await axios.get('/api/stores');
        if (!cancelled) setStores(res.data.stores || []);
        if (!cancelled) setShowingAll(true);
      };

      if (!navigator.geolocation) {
        await fetchWithoutGeo();
        if (!cancelled) setLoading(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const coords = { lng: pos.coords.longitude, lat: pos.coords.latitude };
            localStorage.setItem('lastLocation', JSON.stringify(coords));
            const res = await axios.get('/api/stores', {
              params: { lng: coords.lng, lat: coords.lat, radiusKm: 5, limit: 50 }
            });
            if (!cancelled) {
              const nearbyStores = res.data.stores || [];
              if (nearbyStores.length === 0) {
                await fetchWithoutGeo();
              } else {
                setStores(nearbyStores);
                setShowingAll(false);
              }
            }
          } catch (e) {
            if (!cancelled) {
              setError('Could not load nearby stores.');
              setStores([]);
              setShowingAll(false);
            }
          } finally {
            if (!cancelled) setLoading(false);
          }
        },
        async () => {
          try {
            await fetchWithoutGeo();
          } catch (e) {
            if (!cancelled) setError('Could not load stores.');
          } finally {
            if (!cancelled) setLoading(false);
          }
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    };

    loadStores();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const query = params.get('q') || '';
    setSearchTerm(query);
  }, [location.search]);

  useEffect(() => {
    let cancelled = false;
    const term = searchTerm.trim();

    if (!term) {
      setProducts([]);
      setProductsError('');
      return undefined;
    }

    const timer = setTimeout(async () => {
      setProductsLoading(true);
      setProductsError('');
      try {
        const res = await axios.get('/api/products/search', {
          params: { q: term, limit: 20 }
        });
        if (!cancelled) setProducts(res.data.products || []);
      } catch (e) {
        if (!cancelled) setProductsError(e.response?.data?.message || 'Could not search products.');
      } finally {
        if (!cancelled) setProductsLoading(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchTerm]);

  const filteredStores = useMemo(() => {
    return (stores || []).filter((store) =>
      (store.storeName || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [stores, searchTerm]);

  const openStoreNavigation = (store) => {
    const coords = store?.location?.coordinates;
    const destinationCoords = Array.isArray(coords) && coords.length >= 2
      ? { lat: coords[1], lng: coords[0] }
      : null;
    const destination = store?.address?.fullAddress
      || [store?.address?.street, store?.address?.city, store?.address?.state, store?.address?.zipCode].filter(Boolean).join(', ')
      || (destinationCoords ? `${destinationCoords.lat},${destinationCoords.lng}` : '');

    if (!destination) {
      window.alert('Store location is not available.');
      return;
    }

    navigate('/customer/navigation', {
      state: {
        destination,
        destinationCoords,
        title: store?.storeName ? `${store.storeName} Directions` : 'Store Directions',
        backTo: '/customer/discover'
      }
    });
  };

  return (
    <div className="discover-page">
      <div className="page-header">
        <h1>Discover Nearby Stores</h1>
        <p>{showingAll ? 'No nearby stores found, showing all stores.' : 'Find products from stores near you'}</p>
      </div>

      <div className="search-section">
        <div className="search-bar">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search stores or products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button className="filter-btn" onClick={() => setShowFilters(!showFilters)}>
            <FaFilter />
          </button>
        </div>

        {showFilters && (
          <div className="filters-panel">
            <div className="filter-group">
              <label>Category</label>
              <select>
                <option>All Categories</option>
                <option>Electronics</option>
                <option>Groceries</option>
                <option>Clothing</option>
                <option>Home</option>
                <option>Sports</option>
                <option>Books</option>
              </select>
            </div>
            <div className="filter-group">
              <label>Distance</label>
              <select>
                <option>Any Distance</option>
                <option>Within 1 km</option>
                <option>Within 2 km</option>
                <option>Within 5 km</option>
              </select>
            </div>
            <div className="filter-group">
              <label>Rating</label>
              <select>
                <option>Any Rating</option>
                <option>4+ Stars</option>
                <option>4.5+ Stars</option>
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="stores-list">
        {loading ? (
          <div className="no-results">
            <p>Loading stores...</p>
          </div>
        ) : filteredStores.length === 0 ? (
          <div className="no-results">
            <p>{error || 'No stores found matching your search.'}</p>
          </div>
        ) : (
          filteredStores.map((store) => (
            <div key={store._id || store.id} className="store-item">
              <div className="store-item-image">
                <FaStore />
              </div>
              <div className="store-item-info">
                <h3>
                  {store.storeName}
                  {store.storeVerificationStatus === 'approved' ? (
                    <span className="verified-badge" title="Verified store">
                      <FaCheckCircle /> Verified
                    </span>
                  ) : null}
                </h3>
                <div className="store-item-meta">
                  <span className="store-category">{store.category || 'Store'}</span>
                  <span className="store-distance">
                    <FaMapMarkerAlt /> {typeof store.distanceKm === 'number' ? store.distanceKm.toFixed(1) : '--'} km
                  </span>
                </div>
                <div className="store-item-rating">
                  <FaStar className="star-icon" />
                  <span>{store.reputation?.averageRating ?? 0}</span>
                  <span className="stock-info">Trust: {store.reputation?.trustScore ?? 0}%</span>
                </div>
              </div>
              <div className="store-item-actions">
                <Link to={`/customer/store/${store._id || store.id}`} className="btn-primary">
                  View Store
                </Link>
                <button className="btn-secondary" type="button" onClick={() => openStoreNavigation(store)}>
                  <FaMapMarkerAlt /> Navigate
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {searchTerm.trim() ? (
        <div className="discover-products">
          <div className="section-header">
            <h2>Products</h2>
            <span className="products-subtitle">Results for "{searchTerm.trim()}"</span>
          </div>

          {productsLoading ? (
            <div className="no-results">
              <p>Searching products...</p>
            </div>
          ) : productsError ? (
            <div className="no-results">
              <p>{productsError}</p>
            </div>
          ) : products.length === 0 ? (
            <div className="no-results">
              <p>No products found.</p>
            </div>
          ) : (
            <div className="discover-products-grid">
              {products.map((product) => (
                <Link
                  key={product.id}
                  to={`/customer/product/${product.id}`}
                  className="discover-product-card"
                >
                  <div className="discover-product-image">
                    {product.images?.[0] ? (
                      <img src={product.images[0]} alt={product.name} />
                    ) : (
                      <FaStore />
                    )}
                  </div>
                  <div className="discover-product-info">
                    <h3>{product.name}</h3>
                    <p className="discover-product-store">{product.storeName || 'Store'}</p>
                    <p className="discover-product-price">Rs. {Number(product.price || 0).toLocaleString()}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default DiscoverStores;

