import React from 'react';
import { useAuth } from '../../context/AuthContext';
import './AdminPages.css';

const AdminProfile = () => {
  const { user } = useAuth();

  return (
    <div className="admin-page admin-profile-page">
      <div className="page-header">
        <div>
          <h1>Profile</h1>
          <p>Manage your admin account details.</p>
        </div>
      </div>

      <div className="admin-card admin-card-pad admin-profile-card">
        <div className="admin-profile-row">
          <span className="admin-profile-label">Name</span>
          <span className="admin-profile-value">{user?.name || 'Admin'}</span>
        </div>
        <div className="admin-profile-row">
          <span className="admin-profile-label">Email</span>
          <span className="admin-profile-value">{user?.email || 'Not set'}</span>
        </div>
        <div className="admin-profile-row">
          <span className="admin-profile-label">Role</span>
          <span className="admin-profile-value">Admin</span>
        </div>
      </div>
    </div>
  );
};

export default AdminProfile;
