import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import './AdminPages.css';

const statusLabels = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected'
};

const AdminSellers = () => {
  const [statusFilter, setStatusFilter] = useState('pending');
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  const loadSellers = async (filter) => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get('/api/admin/sellers', {
        params: { status: filter }
      });
      setSellers(res.data.sellers || []);
    } catch (e) {
      setError(e.response?.data?.message || 'Could not load sellers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSellers(statusFilter);
  }, [statusFilter]);

  const onUpdateStatus = async (userId, status) => {
    setUpdatingId(userId);
    setError('');
    try {
      await axios.put(`/api/admin/sellers/${userId}/status`, {
        verificationStatus: status
      });
      await loadSellers(statusFilter);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to update seller status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const counts = useMemo(() => {
    const result = { pending: 0, approved: 0, rejected: 0 };
    sellers.forEach((seller) => {
      if (result[seller.verificationStatus] !== undefined) {
        result[seller.verificationStatus] += 1;
      }
    });
    return result;
  }, [sellers]);

  return (
    <div className="admin-page">
      <div className="page-header">
        <div>
          <h1>Seller Approvals</h1>
          <p>Review seller registrations and approve access.</p>
        </div>
        <div className="status-filters">
          {['pending', 'approved', 'rejected', 'all'].map((status) => (
            <button
              key={status}
              className={`filter-chip ${statusFilter === status ? 'active' : ''}`}
              onClick={() => setStatusFilter(status)}
            >
              {status === 'all'
                ? 'All'
                : `${statusLabels[status]} (${counts[status] || 0})`}
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="admin-inline-message">Loading sellers...</div>}
      {!loading && error && <div className="admin-inline-message admin-inline-message-error">{error}</div>}

      <div className="admin-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Seller</th>
              <th>Contact</th>
              <th>Address</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {!loading && sellers.length === 0 ? (
              <tr>
                <td colSpan="5" className="empty-cell">
                  No sellers found for this filter.
                </td>
              </tr>
            ) : (
              sellers.map((seller) => (
                <tr key={seller.userId}>
                  <td>
                    <div className="seller-name">{seller.name || 'Seller'}</div>
                    <div className="seller-sub">Joined: {new Date(seller.createdAt).toLocaleDateString()}</div>
                  </td>
                  <td>
                    <div>{seller.email || '-'}</div>
                    <div className="seller-sub">{seller.phone || 'No phone'}</div>
                  </td>
                  <td>{seller.address || '-'}</td>
                  <td>
                    <span className={`status-pill status-${seller.verificationStatus || 'pending'}`}>
                      {statusLabels[seller.verificationStatus] || 'Pending'}
                    </span>
                  </td>
                  <td>
                    <div className="action-group">
                      <button
                        className="btn-approve"
                        disabled={updatingId === seller.userId || seller.verificationStatus === 'approved'}
                        onClick={() => onUpdateStatus(seller.userId, 'approved')}
                      >
                        Approve
                      </button>
                      <button
                        className="btn-reject"
                        disabled={updatingId === seller.userId || seller.verificationStatus === 'rejected'}
                        onClick={() => onUpdateStatus(seller.userId, 'rejected')}
                      >
                        Reject
                      </button>
                    </div>
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

export default AdminSellers;
