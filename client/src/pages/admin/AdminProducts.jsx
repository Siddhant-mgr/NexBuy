import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import './AdminPages.css';

const statusOptions = ['all', 'available', 'unavailable'];
const approvalOptions = ['all', 'pending', 'approved', 'rejected'];

const AdminProducts = () => {
  const [statusFilter, setStatusFilter] = useState('all');
  const [approvalFilter, setApprovalFilter] = useState('pending');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [rejectState, setRejectState] = useState({ open: false, productId: null, productName: '', reason: '' });

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get('/api/admin/products', {
        params: {
          status: statusFilter,
          approval: approvalFilter,
          search: search || undefined,
          category: category || undefined
        }
      });
      setProducts(res.data.products || []);
    } catch (e) {
      setError(e.response?.data?.message || 'Could not load products.');
    } finally {
      setLoading(false);
    }
  }, [approvalFilter, category, search, statusFilter]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const onSearchSubmit = (e) => {
    e.preventDefault();
    loadProducts();
  };

  const onToggleStatus = async (productId, isAvailable) => {
    setUpdatingId(productId);
    setError('');
    try {
      await axios.put(`/api/admin/products/${productId}/status`, { isAvailable: !isAvailable });
      await loadProducts();
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to update product status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const onApprove = async (productId) => {
    setUpdatingId(productId);
    setError('');
    try {
      await axios.put(`/api/admin/products/${productId}/approval`, { status: 'approved' });
      await loadProducts();
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to approve product.');
    } finally {
      setUpdatingId(null);
    }
  };

  const openReject = (product) => {
    setRejectState({ open: true, productId: product._id, productName: product.name, reason: '' });
  };

  const cancelReject = () => {
    setRejectState({ open: false, productId: null, productName: '', reason: '' });
  };

  const confirmReject = async () => {
    const reason = rejectState.reason.trim();
    if (!reason) {
      setError('Rejection reason is required.');
      return;
    }
    setUpdatingId(rejectState.productId);
    setError('');
    try {
      await axios.put(`/api/admin/products/${rejectState.productId}/approval`, { status: 'rejected', reason });
      await loadProducts();
      setRejectState({ open: false, productId: null, productName: '', reason: '' });
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to reject product.');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="admin-page">
      <div className="page-header">
        <div>
          <h1>Products</h1>
          <p>Manage product availability and visibility.</p>
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
            value={approvalFilter}
            onChange={(e) => setApprovalFilter(e.target.value)}
          >
            {approvalOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <input
            className="admin-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search product name"
          />
          <input
            className="admin-search compact"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Category"
          />
          <button className="admin-btn" type="submit">Search</button>
        </form>
      </div>

      {loading && <div className="admin-inline-message">Loading products...</div>}
      {!loading && error && <div className="admin-inline-message admin-inline-message-error">{error}</div>}

      <div className="admin-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Store</th>
              <th>Stock</th>
              <th>Approval</th>
              <th>Visibility</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {!loading && products.length === 0 ? (
              <tr>
                <td colSpan="6" className="empty-cell">No products found.</td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product._id}>
                  <td>
                    <div className="seller-name">{product.name}</div>
                    <div className="seller-sub">{product.category || 'Uncategorized'}</div>
                  </td>
                  <td>
                    <div>{product.storeId?.storeName || 'Store'}</div>
                    <div className="seller-sub">Price: {Number(product.price || 0).toFixed(2)}</div>
                  </td>
                  <td>
                    <span className="status-pill status-pending">{product.stockStatus || 'in_stock'}</span>
                  </td>
                  <td>
                    <span className={`status-pill status-${product.approvalStatus || 'approved'}`}>
                      {product.approvalStatus || 'approved'}
                    </span>
                  </td>
                  <td>
                    <span className={`status-pill ${product.isAvailable ? 'status-approved' : 'status-rejected'}`}>
                      {product.isAvailable ? 'Visible' : 'Hidden'}
                    </span>
                  </td>
                  <td>
                    <div className="action-group">
                      <button
                        className="btn-approve"
                        disabled={updatingId === product._id || product.approvalStatus === 'approved'}
                        onClick={() => onApprove(product._id)}
                      >
                        Approve
                      </button>
                      <button
                        className="btn-reject"
                        disabled={updatingId === product._id || product.approvalStatus === 'rejected'}
                        onClick={() => openReject(product)}
                      >
                        Reject
                      </button>
                      <button
                        className="btn-muted"
                        disabled={updatingId === product._id || product.approvalStatus !== 'approved'}
                        onClick={() => onToggleStatus(product._id, product.isAvailable)}
                      >
                        {product.isAvailable ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {rejectState.open ? (
        <div className="confirm-overlay" role="dialog" aria-modal="true">
          <div className="confirm-modal">
            <h3>Reject Product</h3>
            <p>
              Add a rejection reason for <strong>{rejectState.productName}</strong>.
            </p>
            <textarea
              className="admin-input"
              rows="4"
              placeholder="Rejection reason"
              value={rejectState.reason}
              onChange={(e) => setRejectState((prev) => ({ ...prev, reason: e.target.value }))}
            />
            <div className="confirm-actions">
              <button className="btn-secondary" type="button" onClick={cancelReject}>
                Cancel
              </button>
              <button className="btn-primary" type="button" onClick={confirmReject}>
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default AdminProducts;
