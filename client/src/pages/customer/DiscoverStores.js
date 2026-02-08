import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaStore, FaMapMarkerAlt, FaStar, FaSearch, FaFilter } from 'react-icons/fa';
import axios from 'axios';
import './CustomerPages.css';

const DiscoverStores = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadStores = async () => {
      setLoading(true);
      setError('');

      const fetchWithoutGeo = async () => {
        const res = await axios.get('/api/stores');
        if (!cancelled) setStores(res.data.stores || []);
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
            if (!cancelled) setStores(res.data.stores || []);
          } catch (e) {
            if (!cancelled) {
              setError('Could not load nearby stores.');
              setStores([]);
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

  const filteredStores = useMemo(() => {
    return (stores || []).filter((store) =>
      (store.storeName || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [stores, searchTerm]);

  return (
    <div className="discover-page">
      <div className="page-header">
        <h1>Discover Nearby Stores</h1>
        <p>Find products from stores near you</p>
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
                <h3>{store.storeName}</h3>
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
                <button className="btn-secondary">
                  <FaMapMarkerAlt /> Navigate
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default DiscoverStores;

