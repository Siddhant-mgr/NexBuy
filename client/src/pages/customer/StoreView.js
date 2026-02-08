import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FaMapMarkerAlt, FaStar, FaShoppingCart, FaComments, FaArrowLeft } from 'react-icons/fa';
import axios from 'axios';
import { io } from 'socket.io-client';
import toast from '../../utils/toastConfig';
import './CustomerPages.css';

const StoreView = () => {
  const { id } = useParams();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [store, setStore] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quantities, setQuantities] = useState({});
  const socketRef = useRef(null);

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const [storeRes, productsRes] = await Promise.all([
          axios.get(`/api/stores/${id}`),
          axios.get(`/api/stores/${id}/products`)
        ]);
        if (cancelled) return;
        setStore(storeRes.data.store);
        setProducts(productsRes.data.products || []);
      } catch (e) {
        if (!cancelled) setError('Could not load store.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!id) return undefined;

    const socket = io(API_BASE_URL, { transports: ['websocket'] });
    socketRef.current = socket;

    const roomId = `store:${id}`;
    socket.emit('join-room', roomId);

    socket.on('stock:update', (payload) => {
      if (!payload) return;
      if (payload.type === 'delete' && payload.productId) {
        setProducts((prev) => (prev || []).filter((p) => String(p.id) !== String(payload.productId)));
        return;
      }

      if (payload.product?.id) {
        setProducts((prev) => {
          const existing = prev || [];
          const idx = existing.findIndex((p) => String(p.id) === String(payload.product.id));
          if (idx === -1) return [payload.product, ...existing];
          const next = [...existing];
          next[idx] = { ...next[idx], ...payload.product };
          return next;
        });
      }
    });

    return () => {
      socket.emit('leave-room', roomId);
      socket.disconnect();
    };
  }, [API_BASE_URL, id]);

  const distanceKm = useMemo(() => {
    if (!store?.location?.coordinates) return null;
    const raw = localStorage.getItem('lastLocation');
    if (!raw) return null;
    try {
      const { lng, lat } = JSON.parse(raw);
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
      const [storeLng, storeLat] = store.location.coordinates;

      const toRad = (deg) => (deg * Math.PI) / 180;
      const R = 6371;
      const dLat = toRad(storeLat - lat);
      const dLng = toRad(storeLng - lng);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat)) * Math.cos(toRad(storeLat)) *
          Math.sin(dLng / 2) * Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    } catch {
      return null;
    }
  }, [store]);

  const categories = useMemo(() => ['all', ...new Set((products || []).map((p) => p.category).filter(Boolean))], [products]);
  const filteredProducts = useMemo(() => {
    return selectedCategory === 'all' ? products : (products || []).filter((p) => p.category === selectedCategory);
  }, [products, selectedCategory]);

  const getStockBadge = (stock) => {
    const badges = {
      in_stock: { text: 'In Stock', class: 'badge-success' },
      low_stock: { text: 'Low Stock', class: 'badge-warning' },
      out_of_stock: { text: 'Out of Stock', class: 'badge-danger' },
    };
    return badges[stock] || badges.in_stock;
  };

  const buyNow = async (product) => {
    const rawQty = quantities[product.id] ?? 1;
    const maxQty = product.availableQuantity ?? product.quantity ?? 1;
    const qty = Math.min(Math.max(Number(rawQty) || 1, 1), Math.max(maxQty, 1));
    try {
      const res = await axios.post('/api/orders', { productId: product.id, quantity: qty });
      const updated = res.data.product;

      setProducts((prev) =>
        (prev || []).map((p) => (p.id === updated.id ? { ...p, ...updated } : p))
      );
      setQuantities((prev) => ({ ...prev, [product.id]: 1 }));
      toast.success('Order placed');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not place order');
    }
  };

  if (loading) {
    return (
      <div className="store-view-page">
        <Link to="/customer/discover" className="back-link">
          <FaArrowLeft /> Back to Stores
        </Link>
        <div className="no-results">
          <p>Loading store...</p>
        </div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="store-view-page">
        <Link to="/customer/discover" className="back-link">
          <FaArrowLeft /> Back to Stores
        </Link>
        <div className="no-results">
          <p>{error || 'Store not found.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="store-view-page">
      <Link to="/customer/discover" className="back-link">
        <FaArrowLeft /> Back to Stores
      </Link>

      <div className="store-header">
        <div className="store-header-info">
          <h1>{store.storeName}</h1>
          <div className="store-header-meta">
            <span className="store-rating">
              <FaStar /> {store.reputation?.averageRating ?? 0}
            </span>
            <span className="store-trust">Trust Score: {store.reputation?.trustScore ?? 0}%</span>
            <span className="store-distance">
              <FaMapMarkerAlt /> {typeof distanceKm === 'number' ? distanceKm.toFixed(1) : '--'} km away
            </span>
          </div>
          <p className="store-address">{store.address?.fullAddress || [store.address?.street, store.address?.city, store.address?.state, store.address?.zipCode].filter(Boolean).join(', ')}</p>
          <p className="store-hours">{store.openingHours ? 'See opening hours' : ''}</p>
        </div>
        <div className="store-header-actions">
          <button className="btn-primary">
            <FaMapMarkerAlt /> Navigate
          </button>
          <button className="btn-secondary">
            <FaComments /> Chat
          </button>
        </div>
      </div>

      <div className="store-content">
        <div className="category-filter">
          {categories.map(cat => (
            <button
              key={cat}
              className={`category-btn ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>

        <div className="products-grid">
          {filteredProducts.map((product) => {
            const badge = getStockBadge(product.stockStatus);
            const imageUrl = Array.isArray(product.images) && product.images.length ? product.images[0] : '';
            const availableQty = product.availableQuantity ?? product.quantity ?? 0;
            const quantityValue = quantities[product.id] ?? 1;
            return (
              <div key={product.id} className="product-card">
                <div className="product-image">
                  <div className="product-placeholder">
                    <FaShoppingCart />
                  </div>
                  {imageUrl ? (
                    <img
                      className="product-image-img"
                      src={imageUrl}
                      alt={product.name}
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : null}
                  <span className={`stock-badge ${badge.class}`}>{badge.text}</span>
                </div>
                <div className="product-info">
                  <h3>{product.name}</h3>
                  <p className="product-price">${product.price}</p>
                  <p className="product-quantity">Available: {product.availableQuantity ?? product.quantity}</p>
                </div>
                <div className="product-actions">
                  {product.stockStatus !== 'out_of_stock' ? (
                    <>
                      <div className="product-quantity-row">
                        <label htmlFor={`qty-${product.id}`}>Qty</label>
                        <input
                          id={`qty-${product.id}`}
                          className="product-quantity-input"
                          type="number"
                          min="1"
                          max={Math.max(availableQty, 1)}
                          value={quantityValue}
                          onChange={(e) =>
                            setQuantities((prev) => ({
                              ...prev,
                              [product.id]: e.target.value
                            }))
                          }
                        />
                      </div>
                      <button className="btn-reserve" onClick={() => buyNow(product)}>Buy</button>
                      <button className="btn-chat">Chat</button>
                    </>
                  ) : (
                    <button className="btn-disabled" disabled>Out of Stock</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default StoreView;

