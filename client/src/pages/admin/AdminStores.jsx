import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import './AdminPages.css';

const statusOptions = ['all', 'active', 'inactive'];
const verificationOptions = ['all', 'not_submitted', 'pending', 'approved', 'rejected'];
const verificationLabels = {
  not_submitted: 'Not submitted',
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected'
};

const AdminStores = () => {
  const [statusFilter, setStatusFilter] = useState('all');
  const [verificationFilter, setVerificationFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [rejectionReasons, setRejectionReasons] = useState({});

  const loadStores = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get('/api/admin/stores', {
        params: {
          status: statusFilter,
          verificationStatus: verificationFilter,
          search: search || undefined
        }
      });
      setStores(res.data.stores || []);
    } catch (e) {
      setError(e.response?.data?.message || 'Could not load stores.');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, verificationFilter]);

  useEffect(() => {
    loadStores();
  }, [loadStores]);

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

  const onUpdateVerification = async (storeId, status) => {
    setUpdatingId(storeId);
    setError('');

    const rejectionReason = status === 'rejected' ? (rejectionReasons[storeId] || '').trim() : undefined;
    if (status === 'rejected' && !rejectionReason) {
      setError('Rejection reason is required.');
      setUpdatingId(null);
      return;
    }

    try {
      await axios.put(`/api/admin/stores/${storeId}/verification`, { status, rejectionReason });
      await loadStores();
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to update verification status.');
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
          <select
            className="admin-select"
            value={verificationFilter}
            onChange={(e) => setVerificationFilter(e.target.value)}
          >
            {verificationOptions.map((status) => (
              <option key={status} value={status}>
                {verificationLabels[status] || status}
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
              <th>Verification</th>
              <th>Certificate</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {!loading && stores.length === 0 ? (
              <tr>
                <td colSpan="6" className="empty-cell">No stores found.</td>
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
                    <span className={`status-pill status-${store.storeVerificationStatus || 'not_submitted'}`}>
                      {verificationLabels[store.storeVerificationStatus] || 'Not submitted'}
                    </span>
                    <div className="seller-sub">PAN: {store.storeVerification?.panNumber || '-'}</div>
                  </td>
                  <td>
                    {store.storeVerification?.businessCertificateUrl ? (
                      <a href={store.storeVerification.businessCertificateUrl} target="_blank" rel="noreferrer">View</a>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td>
                    <button
                      className="btn-muted"
                      disabled={updatingId === store._id}
                      onClick={() => onToggleStatus(store._id, store.isActive)}
                    >
                      {store.isActive ? 'Disable' : 'Enable'}
                    </button>
                    <div className="action-group">
                      <button
                        className="btn-approve"
                        disabled={updatingId === store._id || store.storeVerificationStatus === 'approved'}
                        onClick={() => onUpdateVerification(store._id, 'approved')}
                      >
                        Approve
                      </button>
                      <button
                        className="btn-reject"
                        disabled={updatingId === store._id || store.storeVerificationStatus === 'rejected'}
                        onClick={() => onUpdateVerification(store._id, 'rejected')}
                      >
                        Reject
                      </button>
                    </div>
                    <input
                      className="admin-input"
                      placeholder="Rejection reason"
                      value={rejectionReasons[store._id] || ''}
                      onChange={(e) => setRejectionReasons((prev) => ({ ...prev, [store._id]: e.target.value }))}
                      disabled={updatingId === store._id}
                    />
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
