import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { FaBox, FaShoppingCart, FaDollarSign, FaUsers } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import './SellerPages.css';

const SellerDashboard = () => {
  const { user } = useAuth();
  const [store, setStore] = useState(null);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);

  const loadSellerData = async () => {
    setLoading(true);
    setError(null);
    try {
      const storeRes = await axios.get('/api/stores/mine');
      const storeData = storeRes.data.store;
      setStore(storeData);

      const [ordersRes, productsRes] = await Promise.all([
        axios.get('/api/orders/store?status=all&limit=200'),
        axios.get(`/api/stores/${storeData._id}/products/all`)
      ]);

      setOrders(Array.isArray(ordersRes.data.orders) ? ordersRes.data.orders : []);
      setProducts(Array.isArray(productsRes.data.products) ? productsRes.data.products : []);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load seller dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role !== 'seller') {
      setLoading(false);
      return;
    }
    loadSellerData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role]);

  const metrics = useMemo(() => {
    const totalProducts = products.length;
    const activeOrders = orders.filter((o) => ['placed', 'ready'].includes(o.status)).length;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const monthSales = orders
      .filter((o) => o.status === 'completed' && new Date(o.createdAt) >= monthStart)
      .reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);

    const customerIds = new Set(
      orders
        .map((o) => (o.customerId && typeof o.customerId === 'object' ? o.customerId._id : o.customerId))
        .filter(Boolean)
        .map(String)
    );

    return {
      totalProducts,
      activeOrders,
      monthSales,
      totalCustomers: customerIds.size
    };
  }, [orders, products]);

  const recentOrders = useMemo(() => orders.slice(0, 5), [orders]);

  const lowStockProducts = useMemo(() => {
    return products
      .filter((p) => Number(p.availableQuantity) > 0 && Number(p.availableQuantity) < 10)
      .sort((a, b) => Number(a.availableQuantity || 0) - Number(b.availableQuantity || 0))
      .slice(0, 5);
  }, [products]);

  const statusLabel = (status) => {
    if (status === 'placed') return 'Placed';
    if (status === 'ready') return 'Pending';
    if (status === 'completed') return 'Completed';
    if (status === 'cancelled') return 'Cancelled';
    return status;
  };

  const statusClass = (status) => {
    if (status === 'placed') return 'status-placed';
    if (status === 'ready') return 'status-ready';
    if (status === 'completed') return 'status-completed';
    if (status === 'cancelled') return 'status-cancelled';
    return '';
  };

  const updateOrderStatus = async (orderId, status) => {
    setUpdatingOrderId(orderId);
    setError(null);
    try {
      await axios.put(`/api/orders/${orderId}/status`, { status });
      const refreshed = await axios.get('/api/orders/store?status=all&limit=200');
      setOrders(Array.isArray(refreshed.data.orders) ? refreshed.data.orders : []);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to update order status');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <h1>Seller Dashboard</h1>
        <p>Manage your store and track performance</p>
      </div>

      {loading && <div className="seller-inline-message">Loading dashboard...</div>}
      {!loading && error && <div className="seller-inline-message seller-inline-message-error">{error}</div>}
      {!loading && !store && user?.role === 'seller' && (
        <div className="seller-inline-message">No store found yet. Create your store from Store Management.</div>
      )}

      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(255, 107, 53, 0.1)', color: '#ff6b35' }}>
            <FaBox />
          </div>
          <div className="stat-info">
            <h3>{loading ? '-' : metrics.totalProducts}</h3>
            <p>Total Products</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(255, 107, 53, 0.1)', color: '#ff6b35' }}>
            <FaShoppingCart />
          </div>
          <div className="stat-info">
            <h3>{loading ? '-' : metrics.activeOrders}</h3>
            <p>Active Orders</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(255, 107, 53, 0.1)', color: '#ff6b35' }}>
            <FaDollarSign />
          </div>
          <div className="stat-info">
            <h3>{loading ? '-' : `$${Math.round(metrics.monthSales).toLocaleString()}`}</h3>
            <p>This Month Sales</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(255, 107, 53, 0.1)', color: '#ff6b35' }}>
            <FaUsers />
          </div>
          <div className="stat-info">
            <h3>{loading ? '-' : metrics.totalCustomers}</h3>
            <p>Total Customers</p>
          </div>
        </div>
      </div>

      <div className="dashboard-sections">
        <div className="section-card">
          <h2>Recent Orders</h2>
          <div className="reservations-preview">
            {!loading && recentOrders.length === 0 && <div className="seller-inline-message">No orders yet.</div>}
            {recentOrders.map((order) => {
              const firstItem = order.items?.[0];
              const customerName = order.customerId?.name || order.customerId?.email || 'Customer';
              const title = firstItem
                ? `${firstItem.name} × ${firstItem.quantity}`
                : `Order ${String(order._id).slice(-6)}`;

              return (
                <div key={order._id} className="reservation-preview-item">
                  <div>
                    <h4>{title}</h4>
                    <p>
                      Customer: {customerName} • {new Date(order.createdAt).toLocaleString()}
                    </p>
                  </div>

                  <div className="order-preview-right">
                    <span className={`status-badge ${statusClass(order.status)}`}>{statusLabel(order.status)}</span>

                    {(order.status === 'placed' || order.status === 'ready') && (
                      <div className="order-preview-actions">
                        {order.status === 'placed' && (
                          <button
                            className="btn-primary-small"
                            disabled={updatingOrderId === order._id}
                            onClick={() => updateOrderStatus(order._id, 'ready')}
                          >
                            Pending
                          </button>
                        )}

                        {order.status === 'ready' && (
                          <button
                            className="btn-primary-small"
                            disabled={updatingOrderId === order._id}
                            onClick={() => updateOrderStatus(order._id, 'completed')}
                          >
                            Complete
                          </button>
                        )}

                        <button
                          className="btn-secondary-small"
                          disabled={updatingOrderId === order._id}
                          onClick={() => updateOrderStatus(order._id, 'cancelled')}
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="section-card">
          <h2>Low Stock Alert</h2>
          <div className="low-stock-list">
            {!loading && lowStockProducts.length === 0 && (
              <div className="seller-inline-message">No low stock items.</div>
            )}
            {lowStockProducts.map((product) => (
              <div key={product.id} className="low-stock-item">
                <div>
                  <h4>{product.name}</h4>
                  <p>Only {product.availableQuantity} items left</p>
                </div>
                <button className="btn-primary-small" disabled>
                  Restock
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SellerDashboard;

