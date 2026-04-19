import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  FaArrowLeft,
  FaHeart,
  FaShareAlt,
  FaShoppingCart,
  FaStar
} from 'react-icons/fa';
import axios from 'axios';
import toast from '../../utils/toastConfig';
import { useCart } from '../../context/CartContext';
import './CustomerPages.css';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [product, setProduct] = useState(null);
  const [store, setStore] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [qty, setQty] = useState(1);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await axios.get(`/api/products/${id}`);
        if (cancelled) return;
        setProduct(res.data.product);
        setStore(res.data.store);

        if (res.data.store?.id) {
          const relatedRes = await axios.get(`/api/stores/${res.data.store.id}/products`);
          if (!cancelled) {
            const list = (relatedRes.data.products || []).filter((item) => String(item.id) !== String(id));
            setRelated(list.slice(0, 4));
          }
        }
      } catch (e) {
        if (!cancelled) setError(e.response?.data?.message || 'Could not load product.');
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
    let cancelled = false;

    const loadFavorite = async () => {
      try {
        const res = await axios.get('/api/favorites');
        if (cancelled) return;
        const isFav = (res.data.products || []).some((item) => String(item.id) === String(id));
        setIsFavorite(isFav);
      } catch {
        if (!cancelled) setIsFavorite(false);
      }
    };

    loadFavorite();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const availableQty = product?.availableQuantity ?? product?.quantity ?? 0;
  const stockStatus = product?.stockStatus || 'in_stock';
  const stockLabel = useMemo(() => {
    if (stockStatus === 'out_of_stock') return 'Out of Stock';
    if (stockStatus === 'low_stock') return 'Low Stock';
    return 'In Stock';
  }, [stockStatus]);

  const addToCart = () => {
    if (!product || !store) return;
    const safeQty = Math.min(Math.max(Number(qty) || 1, 1), Math.max(availableQty, 1));
    addItem(product, safeQty, store);
    toast.success('Added to cart');
  };

  const toggleFavorite = async () => {
    try {
      const res = await axios.post(`/api/favorites/product/${id}`);
      setIsFavorite(res.data.isFavorite);
      toast.success(res.data.isFavorite ? 'Added to favorites' : 'Removed from favorites');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not update favorites');
    }
  };

  const shareProduct = async () => {
    const shareUrl = `${window.location.origin}/customer/product/${id}`;
    const shareTitle = product?.name || 'Product';
    const shareText = product?.description || `Check out ${shareTitle} on NexBuy.`;

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
      toast.success('Product link copied.');
    } catch {
      toast.error('Unable to share this product.');
    }
  };

  if (loading) {
    return (
      <div className="product-detail-page">
        <div className="no-results">Loading product...</div>
      </div>
    );
  }

  if (!product || !store) {
    return (
      <div className="product-detail-page">
        <div className="no-results">{error || 'Product not found.'}</div>
      </div>
    );
  }

  const imageUrl = Array.isArray(product.images) && product.images.length ? product.images[0] : '';
  const rating = store.reputation?.averageRating ?? 0;
  const storeLocation = store.address?.fullAddress || [store.address?.street, store.address?.city, store.address?.state, store.address?.zipCode].filter(Boolean).join(', ');
  const detailItems = [
    { label: 'SKU', value: product.sku },
    { label: 'Brand', value: product.brand },
    { label: 'Unit', value: product.unit },
    { label: 'Origin', value: product.origin },
    { label: 'Expiry', value: product.expiryDate ? new Date(product.expiryDate).toLocaleDateString() : '' },
    { label: 'Ingredients', value: product.ingredients },
    { label: 'Nutrition', value: product.nutrition }
  ]
    .filter((item) => item.value)
    .concat(
      (product.details || [])
        .filter((row) => row?.label && row?.value)
        .map((row) => ({ label: row.label, value: row.value }))
    );

  return (
    <div className="product-detail-page">
      <button className="back-link" type="button" onClick={() => navigate(-1)}>
        <FaArrowLeft /> Back
      </button>

      <div className="product-detail-card">
        <div className="product-detail-image">
          {imageUrl ? (
            <img src={imageUrl} alt={product.name} />
          ) : (
            <div className="product-detail-placeholder">
              <FaShoppingCart />
            </div>
          )}
        </div>

        <div className="product-detail-info">
          <div className="product-detail-header">
            <h1>{product.name}</h1>
            <div className="product-detail-actions">
              <button
                className={`icon-button ${isFavorite ? 'active' : ''}`}
                type="button"
                aria-label="Save product"
                onClick={toggleFavorite}
              >
                <FaHeart />
              </button>
              <button className="icon-button" type="button" aria-label="Share product" onClick={shareProduct}>
                <FaShareAlt />
              </button>
            </div>
          </div>

          <p className="product-detail-desc">
            {product.description || 'No description provided for this product.'}
          </p>

          <div className="product-detail-price">
            <span>Rs. {Number(product.price || 0).toLocaleString()}</span>
            <span className={`stock-pill ${stockStatus}`}>{stockLabel}</span>
          </div>

          <div className="product-detail-info-grid">
            {detailItems.length ? (
              detailItems.map((item, index) => (
                <div key={`${item.label}-${index}`}>
                  <span className="detail-label">{item.label}</span>
                  <span className="detail-value">{item.value}</span>
                </div>
              ))
            ) : (
              <div>
                <span className="detail-label">Category</span>
                <span className="detail-value">{product.category || 'General'}</span>
              </div>
            )}
          </div>

          <div className="product-detail-cta">
            <div className="qty-control">
              <button
                type="button"
                onClick={() => setQty((prev) => Math.max(1, prev - 1))}
                disabled={stockStatus === 'out_of_stock'}
              >
                -
              </button>
              <span>{qty}</span>
              <button
                type="button"
                onClick={() => setQty((prev) => Math.min(Math.max(availableQty, 1), prev + 1))}
                disabled={stockStatus === 'out_of_stock'}
              >
                +
              </button>
            </div>
            <button className="btn-primary" type="button" onClick={addToCart} disabled={stockStatus === 'out_of_stock'}>
              <FaShoppingCart /> Add to Cart
            </button>
          </div>

          <div className="product-detail-badges">
            <div className="product-badge">Pickup Available</div>
            <div className="product-badge">Verified Store</div>
            <div className="product-badge">Easy Returns</div>
          </div>

          <div className="product-detail-store">
            <div>
              <h4>{store.storeName}</h4>
              <p>
                <FaStar className="star-filled" /> {rating.toFixed(1)}
                {storeLocation ? ` · ${storeLocation}` : ''}
              </p>
            </div>
            <Link to={`/customer/store/${store.id}`} className="btn-secondary">
              View Store
            </Link>
          </div>
        </div>
      </div>

      <div className="product-more">
        <h2>More from {store.storeName}</h2>
        <div className="product-more-grid">
          {related.map((item) => (
            <button
              key={item.id}
              type="button"
              className="product-more-card"
              onClick={() => navigate(`/customer/product/${item.id}`)}
            >
              <div className="product-more-image">
                {item.images?.[0] ? <img src={item.images[0]} alt={item.name} /> : <FaShoppingCart />}
              </div>
              <div className="product-more-info">
                <h4>{item.name}</h4>
                <p>Rs. {Number(item.price || 0).toLocaleString()}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
