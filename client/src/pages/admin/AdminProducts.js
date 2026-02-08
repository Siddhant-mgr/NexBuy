import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './AdminPages.css';

const statusOptions = ['all', 'available', 'unavailable'];

const AdminProducts = () => {
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  const loadProducts = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get('/api/admin/products', {
        params: {
          status: statusFilter,
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
  };

  useEffect(() => {
    loadProducts();
  }, [statusFilter]);

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
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {!loading && products.length === 0 ? (
              <tr>
                <td colSpan="5" className="empty-cell">No products found.</td>
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
                    <span className={`status-pill ${product.isAvailable ? 'status-approved' : 'status-rejected'}`}>
                      {product.isAvailable ? 'Available' : 'Hidden'}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn-muted"
                      disabled={updatingId === product._id}
                      onClick={() => onToggleStatus(product._id, product.isAvailable)}
                    >
                      {product.isAvailable ? 'Hide' : 'Show'}
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

export default AdminProducts;
