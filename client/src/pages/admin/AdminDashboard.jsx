import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './AdminPages.css';

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState({ users: [], stores: [], orders: [] });

  useEffect(() => {
    const loadOverview = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await axios.get('/api/admin/overview');
        setStats(res.data.stats);
        setRecent(res.data.recent || { users: [], stores: [], orders: [] });
      } catch (e) {
        setError(e.response?.data?.message || 'Could not load overview.');
      } finally {
        setLoading(false);
      }
    };

    loadOverview();
  }, []);

  return (
    <div className="admin-page">
      <div className="page-header">
        <div>
          <h1>Admin Dashboard</h1>
          <p>Monitor platform activity and approvals.</p>
        </div>
      </div>

      {loading && <div className="admin-inline-message">Loading overview...</div>}
      {!loading && error && <div className="admin-inline-message admin-inline-message-error">{error}</div>}

      {!loading && !error && stats && (
        <>
          <div className="admin-grid">
            <div className="stat-card">
              <p className="stat-label">Total Users</p>
              <p className="stat-value">{stats.users}</p>
              <p className="stat-sub">Customers: {stats.customers}</p>
            </div>
            <div className="stat-card">
              <p className="stat-label">Sellers</p>
              <p className="stat-value">{stats.sellers}</p>
              <p className="stat-sub">Pending: {stats.pendingSellers}</p>
            </div>
            <div className="stat-card">
              <p className="stat-label">Stores</p>
              <p className="stat-value">{stats.stores}</p>
              <p className="stat-sub">Products: {stats.products}</p>
            </div>
            <div className="stat-card">
              <p className="stat-label">Orders</p>
              <p className="stat-value">{stats.orders}</p>
              <p className="stat-sub">Admins: {stats.admins}</p>
            </div>
          </div>

          <div className="admin-grid two-col">
            <div className="admin-card admin-card-pad">
              <h3 className="admin-section-title">Recent Users</h3>
              <div className="admin-list">
                {recent.users?.length ? (
                  recent.users.map((user) => (
                    <div key={user._id} className="admin-list-item">
                      <div>
                        <div className="admin-item-title">{user.name || 'User'}</div>
                        <div className="admin-item-sub">{user.email}</div>
                      </div>
                      <div className="admin-item-meta">
                        <span className="pill">{user.role}</span>
                        <span className={`pill ${user.isActive === false ? 'pill-muted' : 'pill-success'}`}>
                          {user.isActive === false ? 'Disabled' : 'Active'}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="admin-empty">No recent users.</div>
                )}
              </div>
            </div>

            <div className="admin-card admin-card-pad">
              <h3 className="admin-section-title">Recent Stores</h3>
              <div className="admin-list">
                {recent.stores?.length ? (
                  recent.stores.map((store) => (
                    <div key={store._id} className="admin-list-item">
                      <div>
                        <div className="admin-item-title">{store.storeName}</div>
                        <div className="admin-item-sub">
                          {store.sellerId?.name || 'Seller'} • {store.sellerId?.email || 'No email'}
                        </div>
                      </div>
                      <div className="admin-item-meta">
                        <span className={`pill ${store.isActive ? 'pill-success' : 'pill-muted'}`}>
                          {store.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="admin-empty">No recent stores.</div>
                )}
              </div>
            </div>
          </div>

          <div className="admin-card admin-card-pad">
            <h3 className="admin-section-title">Recent Orders</h3>
            <div className="admin-list">
              {recent.orders?.length ? (
                recent.orders.map((order) => (
                  <div key={order._id} className="admin-list-item">
                    <div>
                      <div className="admin-item-title">
                        {order.customerId?.name || 'Customer'} • {order.storeId?.storeName || 'Store'}
                      </div>
                      <div className="admin-item-sub">Total: {Number(order.totalAmount || 0).toFixed(2)}</div>
                    </div>
                    <div className="admin-item-meta">
                      <span className="pill">{order.status}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="admin-empty">No recent orders.</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminDashboard;
