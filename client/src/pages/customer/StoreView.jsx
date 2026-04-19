import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  FaMapMarkerAlt,
  FaStar,
  FaShoppingCart,
  FaComments,
  FaArrowLeft,
  FaCheckCircle,
  FaHeart,
  FaShareAlt,
  FaPhone,
  FaSearch,
  FaThLarge,
  FaListUl,
  FaClock
} from 'react-icons/fa';
import axios from 'axios';
import { io } from 'socket.io-client';
import toast from '../../utils/toastConfig';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import './CustomerPages.css';

const StoreView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [activeSection, setActiveSection] = useState('products');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [store, setStore] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quantities, setQuantities] = useState({});
  const socketRef = useRef(null);
  const { addItem } = useCart();
  const { user } = useAuth();
  const [ratings, setRatings] = useState([]);
  const [ratingSummary, setRatingSummary] = useState({ averageRating: 0, totalReviews: 0 });
  const [ratingLoading, setRatingLoading] = useState(false);
  const [ratingError, setRatingError] = useState('');
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [canRate, setCanRate] = useState(false);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [deletingRating, setDeletingRating] = useState(false);
  const [myRatingId, setMyRatingId] = useState(null);
  const [isEditingComment, setIsEditingComment] = useState(false);
  const [savedRatingComment, setSavedRatingComment] = useState('');
  const [storeFavorite, setStoreFavorite] = useState(false);

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
    if (!user?.id || !id) return;
    let cancelled = false;

    const loadFavorite = async () => {
      try {
        const res = await axios.get('/api/favorites');
        if (cancelled) return;
        const isFav = (res.data.stores || []).some((store) => String(store.id) === String(id));
        setStoreFavorite(isFav);
      } catch {
        if (!cancelled) setStoreFavorite(false);
      }
    };

    loadFavorite();
    return () => {
      cancelled = true;
    };
  }, [id, user?.id]);

  useEffect(() => {
    if (!id) return undefined;

    let cancelled = false;

    const loadRatings = async () => {
      setRatingLoading(true);
      setRatingError('');
      try {
        const listPromise = axios.get(`/api/ratings/store/${id}`, { params: { limit: 20 } });
        const mePromise = user?.id ? axios.get(`/api/ratings/store/${id}/me`) : Promise.resolve({ data: {} });

        const [listRes, meRes] = await Promise.all([listPromise, mePromise]);
        if (cancelled) return;

        setRatings(listRes.data.ratings || []);
        setRatingSummary(listRes.data.summary || { averageRating: 0, totalReviews: 0 });

        if (meRes?.data) {
          setCanRate(!!meRes.data.canRate);
          if (meRes.data.rating) {
            setRatingValue(meRes.data.rating.rating || 0);
            setRatingComment(meRes.data.rating.comment || '');
            setMyRatingId(meRes.data.rating.id || null);
            setSavedRatingComment(meRes.data.rating.comment || '');
            setIsEditingComment(false);
          } else {
            setMyRatingId(null);
            setSavedRatingComment('');
            setIsEditingComment(false);
          }
        } else {
          setCanRate(false);
          setMyRatingId(null);
          setSavedRatingComment('');
          setIsEditingComment(false);
        }
      } catch (e) {
        if (!cancelled) setRatingError('Could not load ratings.');
      } finally {
        if (!cancelled) setRatingLoading(false);
      }
    };

    loadRatings();
    return () => {
      cancelled = true;
    };
  }, [id, user?.id]);

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

  const openStoreNavigation = () => {
    const coords = store?.location?.coordinates;
    const destinationCoords = Array.isArray(coords) && coords.length >= 2
      ? { lat: coords[1], lng: coords[0] }
      : null;
    const destination = store?.address?.fullAddress
      || [store?.address?.street, store?.address?.city, store?.address?.state, store?.address?.zipCode].filter(Boolean).join(', ')
      || (destinationCoords ? `${destinationCoords.lat},${destinationCoords.lng}` : '');

    if (!destination) {
      toast.error('Store location is not available.');
      return;
    }

    navigate('/customer/navigation', {
      state: {
        destination,
        destinationCoords,
        title: store?.storeName ? `${store.storeName} Directions` : 'Store Directions',
        backTo: `/customer/store/${id}`
      }
    });
  };

  const toggleStoreFavorite = async () => {
    try {
      const res = await axios.post(`/api/favorites/store/${id}`);
      setStoreFavorite(res.data.isFavorite);
      toast.success(res.data.isFavorite ? 'Added to favorites' : 'Removed from favorites');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not update favorites');
    }
  };

  const shareStore = async () => {
    const shareUrl = `${window.location.origin}/customer/store/${id}`;
    const shareTitle = store?.storeName || 'Store';
    const shareText = store?.description || `Check out ${shareTitle} on NexBuy.`;

    if (navigator.share) {
      try {
        await navigator.share({ title: shareTitle, text: shareText, url: shareUrl });
        return;
      } catch {
        // fall back to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Store link copied.');
    } catch {
      toast.error('Unable to share this store.');
    }
  };

  const categories = useMemo(() => ['all', ...new Set((products || []).map((p) => p.category).filter(Boolean))], [products]);
  const filteredProducts = useMemo(() => {
    const base = selectedCategory === 'all' ? products : (products || []).filter((p) => p.category === selectedCategory);
    if (!searchTerm.trim()) return base;
    const term = searchTerm.trim().toLowerCase();
    return (base || []).filter((p) =>
      [p.name, p.description, p.category].filter(Boolean).some((value) => String(value).toLowerCase().includes(term))
    );
  }, [products, selectedCategory, searchTerm]);

  const reviewsCount = ratingSummary.totalReviews || 0;

  const formatTodayHours = () => {
    const hours = store?.openingHours;
    if (!hours) return 'Hours not set';
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayKey = dayNames[new Date().getDay()];
    const today = hours[todayKey];
    if (!today) return 'Hours not set';
    if (today.closed) return 'Closed today';
    if (!today.open || !today.close) return 'Hours not set';
    return `${today.open} - ${today.close}`;
  };

  const storeLocation = store?.address?.fullAddress || [store?.address?.street, store?.address?.city, store?.address?.state, store?.address?.zipCode].filter(Boolean).join(', ');
  const storePhone = store?.contact?.phone || '';

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

  const addToCart = (product) => {
    const rawQty = quantities[product.id] ?? 1;
    const maxQty = product.availableQuantity ?? product.quantity ?? 1;
    const qty = Math.min(Math.max(Number(rawQty) || 1, 1), Math.max(maxQty, 1));
    addItem(product, qty, store);
    toast.success('Added to cart');
  };

  const openProductDetail = (productId) => {
    navigate(`/customer/product/${productId}`);
  };

  const submitRating = async () => {
    if (!ratingValue) {
      setRatingError('Please select a rating.');
      return;
    }

    setSubmittingRating(true);
    setRatingError('');
    try {
      const res = await axios.post(`/api/ratings/store/${id}`, {
        rating: ratingValue,
        comment: ratingComment
      });

      const updatedRating = res.data.rating;
      const summary = res.data.summary || ratingSummary;

      setRatings((prev) => {
        const filtered = (prev || []).filter((r) => r.id !== updatedRating.id);
        return [updatedRating, ...filtered];
      });
      setRatingSummary(summary);
      setMyRatingId(updatedRating?.id || null);
      setSavedRatingComment(updatedRating?.comment || '');
      setIsEditingComment(false);
      setStore((prev) =>
        prev
          ? {
              ...prev,
              reputation: {
                ...(prev.reputation || {}),
                averageRating: summary.averageRating,
                totalReviews: summary.totalReviews
              }
            }
          : prev
      );
      toast.success('Rating saved');
    } catch (e) {
      const message = e.response?.data?.message || 'Could not save rating';
      setRatingError(message);
      toast.error(message);
    } finally {
      setSubmittingRating(false);
    }
  };

  const deleteRating = async () => {
    if (!myRatingId) return;
    setDeletingRating(true);
    setRatingError('');
    try {
      const res = await axios.delete(`/api/ratings/store/${id}`);
      const summary = res.data.summary || ratingSummary;

      setRatings((prev) => (prev || []).filter((entry) => entry.id !== myRatingId));
      setRatingSummary(summary);
      setMyRatingId(null);
      setRatingValue(0);
      setRatingComment('');
      setSavedRatingComment('');
      setIsEditingComment(false);
      setStore((prev) =>
        prev
          ? {
              ...prev,
              reputation: {
                ...(prev.reputation || {}),
                averageRating: summary.averageRating,
                totalReviews: summary.totalReviews
              }
            }
          : prev
      );
      toast.success('Rating deleted');
    } catch (e) {
      const message = e.response?.data?.message || 'Could not delete rating';
      setRatingError(message);
      toast.error(message);
    } finally {
      setDeletingRating(false);
    }
  };

  if (loading) {
    return (
      <div className="store-view-page">
        <Link to="/customer/discover" className="back-link">
          <FaArrowLeft /> Back
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
          <FaArrowLeft /> Back
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
        <FaArrowLeft /> Back
      </Link>

      <div className="store-hero">
        <div className="store-hero-card">
          <div className="store-hero-top">
            <div className="store-avatar">
              {store.storeName?.[0] || 'S'}
            </div>
            <div className="store-hero-actions">
              <button
                className={`store-icon-btn ${storeFavorite ? 'active' : ''}`}
                type="button"
                aria-label="Save store"
                onClick={toggleStoreFavorite}
              >
                <FaHeart />
              </button>
              <button className="store-icon-btn" type="button" aria-label="Share store" onClick={shareStore}>
                <FaShareAlt />
              </button>
            </div>
          </div>

          <div className="store-hero-body">
            <div className="store-hero-title">
              <h1>
                {store.storeName}
                {store.storeVerificationStatus === 'approved' ? (
                  <span className="verified-badge" title="Verified store">
                    <FaCheckCircle /> Verified
                  </span>
                ) : null}
              </h1>
              <p className="store-subtitle">{store.category || 'Store'}</p>
            </div>

            <p className="store-description">
              {store.description || 'Your neighborhood store with fresh products and daily essentials.'}
            </p>

            <div className="store-meta-row">
              <span className="store-rating">
                <FaStar className="star-filled" /> {ratingSummary.averageRating.toFixed(1)} ({reviewsCount} reviews)
              </span>
              <span className="store-distance">
                <FaMapMarkerAlt /> {storeLocation || 'Location not set'}
              </span>
              <span className="store-hours">
                <FaClock /> {formatTodayHours()}
              </span>
              <span className={`store-open ${store.isActive ? 'open' : 'closed'}`}>
                {store.isActive ? 'Open' : 'Closed'}
              </span>
            </div>

            <div className="store-action-row">
              <button className="btn-primary" type="button" onClick={openStoreNavigation}>
                <FaMapMarkerAlt /> Directions
              </button>
              {storePhone ? (
                <a className="btn-secondary" href={`tel:${storePhone}`}>
                  <FaPhone /> Call
                </a>
              ) : (
                <button className="btn-secondary" type="button" disabled>
                  <FaPhone /> Call
                </button>
              )}
              <Link to="/customer/chat" className="btn-secondary">
                <FaComments /> Chat
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="store-tabs">
        <button
          className={`store-tab ${activeSection === 'products' ? 'active' : ''}`}
          onClick={() => setActiveSection('products')}
        >
          Products ({filteredProducts.length})
        </button>
        <button
          className={`store-tab ${activeSection === 'about' ? 'active' : ''}`}
          onClick={() => setActiveSection('about')}
        >
          About
        </button>
        <button
          className={`store-tab ${activeSection === 'reviews' ? 'active' : ''}`}
          onClick={() => setActiveSection('reviews')}
        >
          Reviews ({reviewsCount})
        </button>
      </div>

      {activeSection === 'products' ? (
        <div className="store-content">
          <div className="store-search-row">
            <div className="store-search">
              <FaSearch />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="store-view-toggle">
              <button
                type="button"
                className={viewMode === 'grid' ? 'active' : ''}
                onClick={() => setViewMode('grid')}
                aria-label="Grid view"
              >
                <FaThLarge />
              </button>
              <button
                type="button"
                className={viewMode === 'list' ? 'active' : ''}
                onClick={() => setViewMode('list')}
                aria-label="List view"
              >
                <FaListUl />
              </button>
            </div>
          </div>

          <div className="store-category-pills">
            {categories.map((cat) => (
              <button
                key={cat}
                className={`category-btn ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>

          <div className={`products-grid ${viewMode === 'list' ? 'products-list' : ''}`}>
            {filteredProducts.map((product) => {
              const badge = getStockBadge(product.stockStatus);
              const imageUrl = Array.isArray(product.images) && product.images.length ? product.images[0] : '';
              const availableQty = product.availableQuantity ?? product.quantity ?? 0;
              const quantityValue = quantities[product.id] ?? 1;
              return (
                <div key={product.id} className="product-card">
                  <div
                    className="product-image"
                    role="button"
                    tabIndex={0}
                    onClick={() => openProductDetail(product.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') openProductDetail(product.id);
                    }}
                  >
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
                    {product.category ? (
                      <span className="product-category-pill">{product.category}</span>
                    ) : null}
                  </div>
                  <div
                    className="product-info"
                    role="button"
                    tabIndex={0}
                    onClick={() => openProductDetail(product.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') openProductDetail(product.id);
                    }}
                  >
                    <h3>{product.name}</h3>
                    {product.description ? <p className="product-desc">{product.description}</p> : null}
                    <p className="product-price">NRS {product.price}</p>
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
                        <button
                          className="btn-reserve"
                          onClick={(event) => {
                            event.stopPropagation();
                            buyNow(product);
                          }}
                        >
                          Buy
                        </button>
                        <button
                          className="btn-cart"
                          onClick={(event) => {
                            event.stopPropagation();
                            addToCart(product);
                          }}
                        >
                          Add to Cart
                        </button>
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
      ) : null}

      {activeSection === 'about' ? (
        <div className="store-about">
          <div className="store-about-card">
            <h3>About {store.storeName}</h3>
            <p>{store.description || 'This store has not added a description yet.'}</p>
            <div className="store-about-grid">
              <div>
                <span className="store-about-label">Address</span>
                <span className="store-about-value">{storeLocation || 'Not available'}</span>
              </div>
              <div>
                <span className="store-about-label">Phone</span>
                <span className="store-about-value">{storePhone || 'Not available'}</span>
              </div>
              <div>
                <span className="store-about-label">Trust Score</span>
                <span className="store-about-value">{store.reputation?.trustScore ?? 0}%</span>
              </div>
              <div>
                <span className="store-about-label">Total Orders</span>
                <span className="store-about-value">{store.reputation?.totalOrders ?? 0}</span>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {activeSection === 'reviews' ? (
        <div className="store-ratings">
          <div className="store-ratings-header">
            <div>
              <h2>Customer Reviews</h2>
              <p>
                <FaStar className="star-filled" /> {ratingSummary.averageRating.toFixed(1)} ({ratingSummary.totalReviews} reviews)
              </p>
            </div>
            {ratingLoading ? <span className="rating-status">Loading...</span> : null}
          </div>

          {canRate ? (
            <div className="rating-form">
              <p className="rating-form-title">Rate this store</p>
              <div className="rating-stars">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={`rating-star ${ratingValue >= value ? 'active' : ''}`}
                    onClick={() => setRatingValue(value)}
                    aria-label={`Rate ${value} star${value > 1 ? 's' : ''}`}
                  >
                    <FaStar />
                  </button>
                ))}
              </div>
              <textarea
                className="rating-comment"
                rows="3"
                placeholder="Share your experience (optional)"
                value={ratingComment}
                onChange={(e) => setRatingComment(e.target.value)}
                readOnly={!!myRatingId && !isEditingComment}
              />
              {ratingError ? <div className="rating-error">{ratingError}</div> : null}
              <div className="rating-actions">
                <button
                  className="btn-primary"
                  type="button"
                  onClick={submitRating}
                  disabled={submittingRating || deletingRating}
                >
                  {submittingRating ? 'Submitting...' : 'Submit Rating'}
                </button>
                {myRatingId ? (
                  <button
                    className="btn-secondary"
                    type="button"
                    onClick={() => {
                      if (isEditingComment) {
                        setRatingComment(savedRatingComment);
                        setIsEditingComment(false);
                        return;
                      }
                      setIsEditingComment(true);
                    }}
                    disabled={submittingRating || deletingRating}
                  >
                    {isEditingComment ? 'Cancel Edit' : 'Edit Comment'}
                  </button>
                ) : null}
                {myRatingId ? (
                  <button
                    className="btn-danger"
                    type="button"
                    onClick={deleteRating}
                    disabled={submittingRating || deletingRating}
                  >
                    {deletingRating ? 'Deleting...' : 'Delete Rating'}
                  </button>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="rating-hint">
              Complete an order from this store to leave a rating.
            </div>
          )}

          <div className="rating-list">
            {ratingError && !ratingLoading ? <div className="rating-error">{ratingError}</div> : null}
            {!ratingLoading && ratings.length === 0 ? (
              <div className="rating-empty">No reviews yet.</div>
            ) : (
              ratings.map((entry) => (
                <div key={entry.id} className="rating-item">
                  <div className="rating-item-header">
                    <span className="rating-user">{entry.user?.name || 'Customer'}</span>
                    <span className="rating-score">
                      <FaStar className="star-filled" /> {entry.rating}
                    </span>
                  </div>
                  {entry.comment ? <p className="rating-text">{entry.comment}</p> : null}
                  <span className="rating-date">
                    {new Date(entry.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default StoreView;

