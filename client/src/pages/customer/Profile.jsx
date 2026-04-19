import React, { useEffect, useState } from 'react';
import { FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt, FaCheckCircle, FaEdit } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import toast from '../../utils/toastConfig';
import axios from 'axios';
import KycSection from '../../components/KycSection';
import './CustomerPages.css';

const Profile = () => {
  const { user, updateProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    address: user?.address || '',
    currentPassword: '',
    password: '',
    confirmPassword: ''
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [saving, setSaving] = useState(false);

  const startEdit = () => {
    setForm({
      name: user.name || '',
      phone: user.phone || '',
      address: user.address || '',
      currentPassword: '',
      password: '',
      confirmPassword: ''
    });
    setAvatarFile(null);
    setAvatarPreview(user.avatarUrl || '');
    setEditing(true);
  };

  useEffect(() => {
    if (!avatarFile || !avatarPreview) return undefined;
    const previewUrl = avatarPreview;
    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [avatarFile, avatarPreview]);


  if (!user) {
    return (
      <div className="profile-page">
        <div className="profile-card">
          <p>Please log in to view your profile.</p>
        </div>
      </div>
    );
  }

  const uploadAvatar = async (file) => {
    const data = new FormData();
    data.append('image', file);
    const res = await axios.post('/api/uploads', data, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data.url;
  };

  const handleAvatarSelect = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      name: form.name,
      phone: form.phone,
      address: form.address
    };
    if (form.password) {
      if (!form.currentPassword) {
        toast.error('Please enter your current password');
        setSaving(false);
        return;
      }
      if (form.password !== form.confirmPassword) {
        toast.error('New passwords do not match');
        setSaving(false);
        return;
      }
      payload.currentPassword = form.currentPassword;
      payload.password = form.password;
      payload.confirmPassword = form.confirmPassword;
    }
    if (avatarFile) {
      try {
        payload.avatarUrl = await uploadAvatar(avatarFile);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Avatar upload failed');
        setSaving(false);
        return;
      }
    }

    const result = await updateProfile(payload);
    if (result.success) {
      toast.success('Profile updated');
      setEditing(false);
    } else if (result.errors) {
      result.errors.forEach((err) => toast.error(err.msg || err.message));
    } else {
      toast.error(result.message || 'Profile update failed');
    }
    setSaving(false);
  };

  return (
    <div className="profile-page">
      <div className="page-header">
        <h1>My Profile</h1>
        <p>Manage your account information</p>
      </div>

      <div className="profile-card">
        {!editing ? (
          <button
            type="button"
            className="profile-edit-button"
            onClick={startEdit}
            aria-label="Edit profile"
          >
            <FaEdit />
          </button>
        ) : null}
        <label className="profile-avatar" htmlFor="avatar" aria-label="Change profile photo">
          {avatarPreview || user.avatarUrl ? (
            <img src={avatarPreview || user.avatarUrl} alt={user.name} />
          ) : (
            <FaUser />
          )}
        </label>
        <h2>
          {user.name}
          {user.kycStatus === 'approved' ? (
            <span className="verified-badge" title="Verified user">
              <FaCheckCircle /> Verified
            </span>
          ) : null}
        </h2>
        <p className="profile-role">{user.role.charAt(0).toUpperCase() + user.role.slice(1)}</p>

        {!editing ? (
          <>
            <div className="profile-details">
              <div className="profile-item">
                <FaEnvelope />
                <div>
                  <label>Email</label>
                  <p>{user.email}</p>
                </div>
              </div>
              <div className="profile-item">
                <FaPhone />
                <div>
                  <label>Phone</label>
                  <p>{user.phone || '-'}</p>
                </div>
              </div>
              <div className="profile-item">
                <FaMapMarkerAlt />
                <div>
                  <label>Address</label>
                  <p>{user.address || '-'}</p>
                </div>
              </div>
            </div>

          </>
        ) : (
          <form className="profile-form" onSubmit={save}>
            <input
              id="avatar"
              type="file"
              accept="image/*"
              onChange={handleAvatarSelect}
              style={{ display: 'none' }}
            />
            <div className="profile-form-row">
              <label htmlFor="name">Name</label>
              <input
                id="name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div className="profile-form-row">
              <label htmlFor="email">Email</label>
              <input id="email" value={user.email} disabled />
            </div>
            <div className="profile-form-row">
              <label htmlFor="phone">Phone</label>
              <input
                id="phone"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div className="profile-form-row">
              <label htmlFor="address">Address</label>
              <input
                id="address"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              />
            </div>
            <div className="profile-form-row">
              <label htmlFor="currentPassword">Current Password</label>
              <input
                id="currentPassword"
                type="password"
                value={form.currentPassword}
                onChange={(e) => setForm((f) => ({ ...f, currentPassword: e.target.value }))}
                placeholder="Enter current password"
                autoComplete="current-password"
              />
            </div>
            <div className="profile-form-row">
              <label htmlFor="password">New Password</label>
              <input
                id="password"
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="Leave blank to keep current"
                minLength={6}
                autoComplete="new-password"
              />
            </div>
            <div className="profile-form-row">
              <label htmlFor="confirmPassword">Confirm New Password</label>
              <input
                id="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                placeholder="Re-enter new password"
                minLength={6}
                autoComplete="new-password"
              />
            </div>
            <div className="profile-actions">
              <button type="button" className="btn-secondary" onClick={() => setEditing(false)}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        )}
      </div>

      <KycSection />
    </div>
  );
};

export default Profile;

