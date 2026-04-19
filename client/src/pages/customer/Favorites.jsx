import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaHeart, FaStore } from 'react-icons/fa';
import axios from 'axios';
import './CustomerPages.css';

const Favorites = () => {
  const [favoriteStores, setFavoriteStores] = useState([]);
  const [favoriteProducts, setFavoriteProducts] = useState([]);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [favoritesError, setFavoritesError] = useState('');
  const [favoritesTab, setFavoritesTab] = useState('stores');

  useEffect(() => {
    let cancelled = false;

    const loadFavorites = async () => {
      setFavoritesLoading(true);
      setFavoritesError('');
      try {
        const res = await axios.get('/api/favorites');
        if (cancelled) return;
        setFavoriteStores(res.data.stores || []);
        setFavoriteProducts(res.data.products || []);
      } catch (err) {
        if (!cancelled) setFavoritesError(err.response?.data?.message || 'Could not load favorites.');
      } finally {
        if (!cancelled) setFavoritesLoading(false);
      }
    };

    loadFavorites();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="favorites-page">
      <div className="page-header">
        <h1>Favorites</h1>
        <p>Quick access to your saved stores and products.</p>
      </div>

      <div className="favorites-card">
        <div className="favorites-header">
          <div>
            <h2>Saved Items</h2>
            <p>Manage your favorites here.</p>
          </div>
          <div className="favorites-tabs">
            <button
              type="button"
              className={favoritesTab === 'stores' ? 'active' : ''}
              onClick={() => setFavoritesTab('stores')}
            >
              Stores
            </button>
            <button
              type="button"
              className={favoritesTab === 'products' ? 'active' : ''}
              onClick={() => setFavoritesTab('products')}
            >
              Products
            </button>
          </div>
        </div>

        {favoritesLoading ? (
          <div className="favorites-empty">Loading favorites...</div>
        ) : favoritesError ? (
          <div className="favorites-empty">{favoritesError}</div>
        ) : favoritesTab === 'stores' ? (
          favoriteStores.length === 0 ? (
            <div className="favorites-empty">No favorite stores yet.</div>
          ) : (
            <div className="favorites-grid">
              {favoriteStores.map((store) => (
                <Link key={store.id} to={`/customer/store/${store.id}`} className="favorite-item">
                  <div className="favorite-icon">
                    <FaStore />
                  </div>
                  <div>
                    <h4>{store.storeName}</h4>
                    <p>{store.category || 'Store'}</p>
                  </div>
                </Link>
              ))}
            </div>
          )
        ) : favoriteProducts.length === 0 ? (
          <div className="favorites-empty">No favorite products yet.</div>
        ) : (
          <div className="favorites-grid">
            {favoriteProducts.map((product) => (
              <Link key={product.id} to={`/customer/product/${product.id}`} className="favorite-item">
                <div className="favorite-icon">
                  <FaHeart />
                </div>
                <div>
                  <h4>{product.name}</h4>
                  <p>{product.storeName || 'Store'}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Favorites;
