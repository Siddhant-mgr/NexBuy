import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './AdminPages.css';

const statusOptions = ['all', 'placed', 'ready', 'completed', 'cancelled'];

const AdminOrders = () => {
  const [statusFilter, setStatusFilter] = useState('all');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  const loadOrders = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get('/api/admin/orders', {
        params: {
          status: statusFilter
        }
      });
      setOrders(res.data.orders || []);
    } catch (e) {
      setError(e.response?.data?.message || 'Could not load orders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [statusFilter]);

  const onStatusChange = async (orderId, nextStatus) => {
    setUpdatingId(orderId);
    setError('');
    try {
      await axios.put(`/api/admin/orders/${orderId}/status`, { status: nextStatus });
      await loadOrders();
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to update order status.');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="admin-page">
      <div className="page-header">
        <div>
          <h1>Orders</h1>
          <p>Track and update order statuses.</p>
        </div>
        <div className="admin-toolbar">
          <select
            className="admin-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && <div className="admin-inline-message">Loading orders...</div>}
      {!loading && error && <div className="admin-inline-message admin-inline-message-error">{error}</div>}

      <div className="admin-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Store</th>
              <th>Total</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {!loading && orders.length === 0 ? (
              <tr>
                <td colSpan="5" className="empty-cell">No orders found.</td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order._id}>
                  <td>
                    <div className="seller-name">{order._id}</div>
                    <div className="seller-sub">{new Date(order.createdAt).toLocaleString()}</div>
                  </td>
                  <td>
                    <div>{order.customerId?.name || 'Customer'}</div>
                    <div className="seller-sub">{order.customerId?.email || 'No email'}</div>
                  </td>
                  <td>
                    <div>{order.storeId?.storeName || 'Store'}</div>
                  </td>
                  <td>
                    <div>{Number(order.totalAmount || 0).toFixed(2)}</div>
                  </td>
                  <td>
                    <select
                      className="admin-select compact"
                      value={order.status}
                      onChange={(e) => onStatusChange(order._id, e.target.value)}
                      disabled={updatingId === order._id}
                    >
                      {statusOptions.filter((s) => s !== 'all').map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminOrders;
