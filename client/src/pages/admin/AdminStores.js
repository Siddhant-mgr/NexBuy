import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './AdminPages.css';

const statusOptions = ['all', 'active', 'inactive'];

const AdminStores = () => {
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  const loadStores = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get('/api/admin/stores', {
        params: {
          status: statusFilter,
          search: search || undefined
        }
      });
      setStores(res.data.stores || []);
    } catch (e) {
      setError(e.response?.data?.message || 'Could not load stores.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStores();
  }, [statusFilter]);

  const onSearchSubmit = (e) => {
    e.preventDefault();
    loadStores();
  };

  const onToggleStatus = async (storeId, isActive) => {
    setUpdatingId(storeId);
    setError('');
    try {
      await axios.put(`/api/admin/stores/${storeId}/status`, { isActive: !isActive });
      await loadStores();
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to update store status.');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="admin-page">
      <div className="page-header">
        <div>
          <h1>Stores</h1>
          <p>Monitor and moderate store activity.</p>
        </div>
        <form className="admin-toolbar" onSubmit={onSearchSubmit}>
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
          <input
            className="admin-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search store name"
          />
          <button className="admin-btn" type="submit">Search</button>
        </form>
      </div>

      {loading && <div className="admin-inline-message">Loading stores...</div>}
      {!loading && error && <div className="admin-inline-message admin-inline-message-error">{error}</div>}

      <div className="admin-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Store</th>
              <th>Seller</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {!loading && stores.length === 0 ? (
              <tr>
                <td colSpan="4" className="empty-cell">No stores found.</td>
              </tr>
            ) : (
              stores.map((store) => (
                <tr key={store._id}>
                  <td>
                    <div className="seller-name">{store.storeName}</div>
                    <div className="seller-sub">{store.category || 'Uncategorized'}</div>
                  </td>
                  <td>
                    <div>{store.sellerId?.name || 'Seller'}</div>
                    <div className="seller-sub">{store.sellerId?.email || 'No email'}</div>
                  </td>
                  <td>
                    <span className={`status-pill ${store.isActive ? 'status-approved' : 'status-rejected'}`}>
                      {store.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn-muted"
                      disabled={updatingId === store._id}
                      onClick={() => onToggleStatus(store._id, store.isActive)}
                    >
                      {store.isActive ? 'Disable' : 'Enable'}
                    </button>
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

export default AdminStores;
