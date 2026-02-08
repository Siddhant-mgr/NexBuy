import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import './AdminPages.css';

const roleOptions = ['all', 'customer', 'seller', 'admin'];

const AdminUsers = () => {
  const [roleFilter, setRoleFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get('/api/admin/users', {
        params: {
          role: roleFilter,
          search: search || undefined
        }
      });
      setUsers(res.data.users || []);
    } catch (e) {
      setError(e.response?.data?.message || 'Could not load users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [roleFilter]);

  const onSearchSubmit = (e) => {
    e.preventDefault();
    loadUsers();
  };

  const onRoleChange = async (userId, nextRole) => {
    setUpdatingId(userId);
    setError('');
    try {
      await axios.put(`/api/admin/users/${userId}/role`, { role: nextRole });
      await loadUsers();
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to update role.');
    } finally {
      setUpdatingId(null);
    }
  };

  const onToggleStatus = async (userId, isActive) => {
    setUpdatingId(userId);
    setError('');
    try {
      await axios.put(`/api/admin/users/${userId}/status`, { isActive: !isActive });
      await loadUsers();
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to update status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const counts = useMemo(() => {
    const result = { all: users.length, customer: 0, seller: 0, admin: 0 };
    users.forEach((user) => {
      if (result[user.role] !== undefined) {
        result[user.role] += 1;
      }
    });
    return result;
  }, [users]);

  return (
    <div className="admin-page">
      <div className="page-header">
        <div>
          <h1>User Management</h1>
          <p>Update roles and account status.</p>
        </div>
        <form className="admin-toolbar" onSubmit={onSearchSubmit}>
          <select
            className="admin-select"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            {roleOptions.map((role) => (
              <option key={role} value={role}>
                {role === 'all' ? `All (${counts.all})` : `${role} (${counts[role] || 0})`}
              </option>
            ))}
          </select>
          <input
            className="admin-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email"
          />
          <button className="admin-btn" type="submit">Search</button>
        </form>
      </div>

      {loading && <div className="admin-inline-message">Loading users...</div>}
      {!loading && error && <div className="admin-inline-message admin-inline-message-error">{error}</div>}

      <div className="admin-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {!loading && users.length === 0 ? (
              <tr>
                <td colSpan="4" className="empty-cell">No users found.</td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user._id}>
                  <td>
                    <div className="seller-name">{user.name || 'User'}</div>
                    <div className="seller-sub">{user.email}</div>
                  </td>
                  <td>
                    <select
                      className="admin-select compact"
                      value={user.role}
                      onChange={(e) => onRoleChange(user._id, e.target.value)}
                      disabled={updatingId === user._id}
                    >
                      <option value="customer">customer</option>
                      <option value="seller">seller</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td>
                    <span className={`status-pill ${user.isActive === false ? 'status-rejected' : 'status-approved'}`}>
                      {user.isActive === false ? 'Disabled' : 'Active'}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn-muted"
                      disabled={updatingId === user._id}
                      onClick={() => onToggleStatus(user._id, user.isActive !== false)}
                    >
                      {user.isActive === false ? 'Enable' : 'Disable'}
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

export default AdminUsers;
