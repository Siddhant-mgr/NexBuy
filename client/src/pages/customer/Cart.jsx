import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaShoppingCart, FaTrash } from 'react-icons/fa';
import axios from 'axios';
import { useCart } from '../../context/CartContext';
import toast from '../../utils/toastConfig';
import './CustomerPages.css';

const Cart = () => {
  const { items, updateQuantity, removeItem, clearCart } = useCart();
  const [checkingOut, setCheckingOut] = useState(false);

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
    return {
      subtotal,
      total: subtotal
    };
  }, [items]);

  const submitEsewaForm = (actionUrl, payload) => {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = actionUrl;
    form.target = '_top';
    form.style.display = 'none';

    Object.entries(payload || {}).forEach(([key, value]) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = String(value);
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
  };

  const handleCheckout = async () => {
    if (!items.length) return;
    setCheckingOut(true);

    try {
      const payload = {
        items: items.map((item) => ({
          productId: item.id,
          quantity: item.quantity
        }))
      };

      const res = await axios.post('/api/payments/esewa/init', payload);
      submitEsewaForm(res.data.actionUrl, res.data.payload);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not start checkout');
      setCheckingOut(false);
    }
  };

  return (
    <div className="cart-page">
      <div className="page-header">
        <h1>My Cart</h1>
        <p>Review items before checkout.</p>
      </div>

      {items.length === 0 ? (
        <div className="cart-empty">
          <FaShoppingCart />
          <h3>Your cart is empty</h3>
          <p>Browse stores and add items to your cart.</p>
          <Link to="/customer/discover" className="btn-primary">
            Discover Stores
          </Link>
        </div>
      ) : (
        <div className="cart-grid">
          <div className="cart-items">
            {items.map((item) => (
              <div key={`${item.storeId}-${item.id}`} className="cart-item">
                <div className="cart-item-image">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} />
                  ) : (
                    <FaShoppingCart />
                  )}
                </div>
                <div className="cart-item-info">
                  <h3>{item.name}</h3>
                  <p className="cart-item-store">{item.storeName}</p>
                  <div className="cart-item-meta">
                    <span className="cart-item-price">NRS {Number(item.price || 0).toFixed(2)}</span>
                    <span className="cart-item-total">NRS {(Number(item.price || 0) * Number(item.quantity || 0)).toFixed(2)}</span>
                  </div>
                  <div className="cart-item-qty">
                    <label htmlFor={`qty-${item.storeId}-${item.id}`}>Qty</label>
                    <input
                      id={`qty-${item.storeId}-${item.id}`}
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateQuantity(item.id, item.storeId, e.target.value)}
                    />
                  </div>
                </div>
                <button
                  className="cart-item-remove"
                  onClick={() => removeItem(item.id, item.storeId)}
                  aria-label="Remove item"
                >
                  <FaTrash />
                </button>
              </div>
            ))}
            <div className="cart-actions">
              <button className="btn-secondary" onClick={clearCart}>Clear Cart</button>
              <Link to="/customer/discover" className="btn-secondary">Continue Shopping</Link>
            </div>
          </div>
          <div className="cart-summary">
            <h2>Summary</h2>
            <div className="cart-summary-row">
              <span>Subtotal</span>
              <span>NRS {totals.subtotal.toFixed(2)}</span>
            </div>
            <div className="cart-summary-row total">
              <span>Total</span>
              <span>NRS {totals.total.toFixed(2)}</span>
            </div>
            <button className="btn-primary" onClick={handleCheckout} disabled={checkingOut}>
              {checkingOut ? 'Redirecting to eSewa...' : 'Pay with eSewa'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cart;
