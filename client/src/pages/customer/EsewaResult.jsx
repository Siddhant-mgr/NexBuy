import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useCart } from '../../context/CartContext';
import toast from '../../utils/toastConfig';
import './CustomerPages.css';

const EsewaResult = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { clearCart } = useCart();
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');

  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const orderId = params.get('oid') || '';
  const dataParam = params.get('data') || '';
  const dataFallback = useMemo(() => {
    if (dataParam) return '';
    const match = location.href.match(/[?&]data=([^&]+)/);
    return match ? decodeURIComponent(match[1]) : '';
  }, [dataParam, location.href]);
  const isSuccessPath = location.pathname.includes('/success');

  useEffect(() => {
    let cancelled = false;

    const verify = async () => {
      try {
        if (isSuccessPath) {
          const payload = dataParam || dataFallback;
          if (!payload) {
            throw new Error('Missing payment data.');
          }
          const res = await axios.post('/api/payments/esewa/verify', {
            data: payload
          });
          if (cancelled) return;
          setStatus('success');
          setMessage(res.data?.message || 'Payment verified.');
          clearCart();
        } else {
          if (!orderId) {
            throw new Error('Missing order information.');
          }
          await axios.post('/api/payments/esewa/fail', { orderId });
          if (cancelled) return;
          setStatus('failed');
          setMessage('Payment failed or was cancelled.');
        }
      } catch (error) {
        if (cancelled) return;
        setStatus('error');
        setMessage(error.response?.data?.message || error.message || 'Payment verification failed.');
        if (isSuccessPath) {
          toast.error(error.response?.data?.message || 'Payment verification failed');
        }
      }
    };

    verify();

    return () => {
      cancelled = true;
    };
  }, [clearCart, dataFallback, dataParam, isSuccessPath, orderId]);

  return (
    <div className="cart-page">
      <div className="page-header">
        <h1>{status === 'success' ? 'Payment Successful' : 'Payment Status'}</h1>
        <p>{message || 'Checking payment status...'}</p>
      </div>

      <div className="cart-empty">
        {status === 'loading' ? (
          <p>Verifying your payment...</p>
        ) : null}
        {status === 'success' ? (
          <>
            <p>Your order is confirmed. You can track it in reservations.</p>
            <button className="btn-primary" onClick={() => navigate('/customer/reservations')}>
              View Orders
            </button>
          </>
        ) : null}
        {status === 'failed' || status === 'error' ? (
          <>
            <p>Please try again or choose another payment method.</p>
            <Link to="/customer/cart" className="btn-secondary">
              Back
            </Link>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default EsewaResult;
