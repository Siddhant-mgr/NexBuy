import React, { useEffect, useMemo, useState } from 'react';
import { FaStore, FaMapMarkerAlt, FaPhone, FaEnvelope, FaEdit, FaClock, FaStar, FaShieldAlt, FaShoppingCart, FaFileAlt, FaTimes } from 'react-icons/fa';
import axios from 'axios';
import './SellerPages.css';

const StoreManagement = () => {
  const [isEditing, setIsEditing] = useState(false);

  const emptyStore = {
    _id: null,
    storeName: '',
    description: '',
    category: 'Electronics',
    address: { street: '', city: '', state: '', zipCode: '', fullAddress: '' },
    contact: { phone: '', email: '' },
    openingHours: {
      monday: { open: '09:00', close: '20:00', closed: false },
      tuesday: { open: '09:00', close: '20:00', closed: false },
      wednesday: { open: '09:00', close: '20:00', closed: false },
      thursday: { open: '09:00', close: '20:00', closed: false },
      friday: { open: '09:00', close: '20:00', closed: false },
      saturday: { open: '10:00', close: '18:00', closed: false },
      sunday: { open: '10:00', close: '18:00', closed: false }
    },
    reputation: { trustScore: 0, totalOrders: 0, averageRating: 0 },
    storeVerificationStatus: 'not_submitted',
    storeVerification: {
      panNumber: '',
      businessCertificateUrl: '',
      submittedAt: null,
      reviewedAt: null,
      reviewedBy: null,
      rejectionReason: ''
    }
  };

  const [store, setStore] = useState(emptyStore);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isNewStore, setIsNewStore] = useState(false);
  const [certificateFile, setCertificateFile] = useState(null);
  const [certificatePreview, setCertificatePreview] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [verificationOpen, setVerificationOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await axios.get('/api/stores/mine');
        if (cancelled) return;
        setStore(res.data.store);
        setIsNewStore(false);
      } catch (e) {
        if (cancelled) return;
        if (e.response?.status === 404) {
          setStore(emptyStore);
          setIsNewStore(true);
          setIsEditing(true);
        } else {
          setError(e.response?.data?.message || 'Could not load store.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!store?.storeVerification?.businessCertificateUrl || certificateFile) return;
    setCertificatePreview(store.storeVerification.businessCertificateUrl);
  }, [certificateFile, store?.storeVerification?.businessCertificateUrl]);

  useEffect(() => {
    if (!certificateFile || !certificatePreview) return undefined;
    const previewUrl = certificatePreview;
    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [certificateFile, certificatePreview]);

  const getGeoCoords = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error('Geolocation not supported'));
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lng: pos.coords.longitude, lat: pos.coords.latitude }),
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  };

  const save = async () => {
    setError('');
    try {
      if (isNewStore) {
        const coords = await getGeoCoords();
        const res = await axios.post('/api/stores', {
          storeName: store.storeName,
          description: store.description,
          category: store.category,
          address: store.address,
          contact: store.contact,
          openingHours: store.openingHours,
          lng: coords.lng,
          lat: coords.lat
        });
        setStore(res.data.store);
        setIsNewStore(false);
      } else {
        const res = await axios.put(`/api/stores/${store._id}`, {
          storeName: store.storeName,
          description: store.description,
          category: store.category,
          address: store.address,
          contact: store.contact,
          openingHours: store.openingHours
        });
        setStore(res.data.store);
      }
      setIsEditing(false);
    } catch (e) {
      setError(e.response?.data?.message || 'Could not save store.');
    }
  };

  const uploadCertificate = async (file) => {
    const data = new FormData();
    data.append('image', file);
    const res = await axios.post('/api/uploads', data, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data.url;
  };

  const submitVerification = async () => {
    if (!store?._id) {
      setError('Create your store before submitting verification.');
      return;
    }

    if (store.storeVerificationStatus === 'pending' || store.storeVerificationStatus === 'approved') {
      setError('Store verification is already in progress.');
      return;
    }

    const panNumber = store.storeVerification?.panNumber || '';
    if (!panNumber.trim()) {
      setError('PAN number is required for store verification.');
      return;
    }

    setVerifying(true);
    setError('');

    try {
      const certificateUrl = certificateFile
        ? await uploadCertificate(certificateFile)
        : store.storeVerification?.businessCertificateUrl;

      if (!certificateUrl) {
        setError('Business registration certificate is required.');
        setVerifying(false);
        return;
      }

      const res = await axios.post('/api/stores/verification', {
        panNumber,
        businessCertificateUrl: certificateUrl
      });

      setStore(res.data.store);
    } catch (e) {
      setError(e.response?.data?.message || 'Could not submit verification.');
    } finally {
      setVerifying(false);
    }
  };

  const toggleEditOrSave = async () => {
    if (isEditing) {
      await save();
    } else {
      setActiveTab('basic');
      setIsEditing(true);
    }
  };

  const formatTime = (value) => {
    if (!value) return '--';
    const [hourStr, minuteStr] = value.split(':');
    const hour = Number(hourStr);
    if (!Number.isFinite(hour)) return value;
    const suffix = hour >= 12 ? 'PM' : 'AM';
    const normalizedHour = ((hour + 11) % 12) + 1;
    return `${String(normalizedHour).padStart(2, '0')}:${minuteStr || '00'} ${suffix}`;
  };

  const openingDays = useMemo(() => Object.entries(store.openingHours || {}), [store.openingHours]);

  return (
    <div className="store-management-page">
      <div className="page-header compact">
        <div>
          <h1>My Store</h1>
          <p>Manage your store profile and settings.</p>
        </div>
      </div>

      {error && (
        <div className="no-results">
          <p>{error}</p>
        </div>
      )}

      <div className="store-overview-card">
        <div className="store-overview-top">
          <div className="store-overview-main">
            <div className="store-overview-icon">
              <FaStore />
            </div>
            <div>
              <h2>
                {store.storeName || 'Your Store'}
                {store.storeVerificationStatus === 'approved' ? (
                  <span className="store-chip verified">Verified</span>
                ) : (
                  <button
                    type="button"
                    className="store-chip unverified"
                    onClick={() => setVerificationOpen(true)}
                  >
                    Unverified
                  </button>
                )}
              </h2>
              <p className="store-category">{store.category || 'Store'}</p>
            </div>
          </div>
          <div className="store-overview-actions">
            <button className="btn-secondary" onClick={toggleEditOrSave} disabled={loading}>
              <FaEdit /> {isEditing ? (isNewStore ? 'Create Store' : 'Save Changes') : 'Edit'}
            </button>
            <span className={`store-status ${store.isActive ? 'active' : 'inactive'}`}>
              {store.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
        <p className="store-description">
          {store.description || 'Add a short description about your store.'}
        </p>
        <div className="store-overview-meta">
          <span>
            <FaMapMarkerAlt />
            {store.address?.fullAddress
              || [store.address?.street, store.address?.city, store.address?.state, store.address?.zipCode].filter(Boolean).join(', ')
              || 'Address not set'}
          </span>
          <span>
            <FaPhone /> {store.contact?.phone || 'Phone not set'}
          </span>
          <span>
            <FaEnvelope /> {store.contact?.email || 'Email not set'}
          </span>
        </div>
      </div>

      <div className="store-metrics">
        <div className="metric-card">
          <div className="metric-icon">
            <FaShieldAlt />
          </div>
          <div>
            <p>Trust Score</p>
            <h3>{store.reputation?.trustScore ?? 0}/100</h3>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon">
            <FaStar />
          </div>
          <div>
            <p>Avg Rating</p>
            <h3>{store.reputation?.averageRating ?? 0}</h3>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon">
            <FaShoppingCart />
          </div>
          <div>
            <p>Total Orders</p>
            <h3>{store.reputation?.totalOrders ?? 0}</h3>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon">
            <FaFileAlt />
          </div>
          <div>
            <p>Total Reviews</p>
            <h3>{store.reputation?.totalReviews ?? 0}</h3>
          </div>
        </div>
      </div>

      <div className="store-hours-card">
        <div className="store-hours-header">
          <FaClock />
          <h3>Opening Hours</h3>
        </div>
        <div className="store-hours-grid">
          {openingDays.map(([day, hours]) => (
            <div key={day} className="store-hours-row">
              <span className="store-hours-day">{day.charAt(0).toUpperCase() + day.slice(1)}</span>
              <span className="store-hours-time">
                {hours.closed ? 'Closed' : `${formatTime(hours.open)} - ${formatTime(hours.close)}`}
              </span>
            </div>
          ))}
        </div>
      </div>

      {isEditing ? (
        <div className="edit-modal-overlay" role="dialog" aria-modal="true">
          <div className="edit-modal">
            <div className="edit-modal-header">
              <h2>Edit Store</h2>
              <button type="button" className="icon-btn" onClick={() => setIsEditing(false)}>
                <FaTimes />
              </button>
            </div>

            <div className="edit-tabs">
              <button
                type="button"
                className={activeTab === 'basic' ? 'active' : ''}
                onClick={() => setActiveTab('basic')}
              >
                Basic Info
              </button>
              <button
                type="button"
                className={activeTab === 'contact' ? 'active' : ''}
                onClick={() => setActiveTab('contact')}
              >
                Location & Contact
              </button>
              <button
                type="button"
                className={activeTab === 'hours' ? 'active' : ''}
                onClick={() => setActiveTab('hours')}
              >
                Opening Hours
              </button>
            </div>

            {activeTab === 'basic' ? (
              <div className="edit-tab-body">
                <div className="form-grid">
                  <div className="form-field">
                    <label>Store Name</label>
                    <input
                      type="text"
                      value={store.storeName || ''}
                      onChange={(e) => setStore((s) => ({ ...s, storeName: e.target.value }))}
                    />
                  </div>
                  <div className="form-field">
                    <label>Category</label>
                    <select
                      value={store.category || 'Electronics'}
                      onChange={(e) => setStore((s) => ({ ...s, category: e.target.value }))}
                    >
                      <option>Electronics</option>
                      <option>Groceries</option>
                      <option>Clothing</option>
                      <option>Home</option>
                    </select>
                  </div>
                </div>
                <div className="form-field">
                  <label>Description</label>
                  <textarea
                    rows="3"
                    value={store.description || ''}
                    onChange={(e) => setStore((s) => ({ ...s, description: e.target.value }))}
                  />
                </div>
              </div>
            ) : null}

            {activeTab === 'contact' ? (
              <div className="edit-tab-body">
                <div className="form-grid">
                  <div className="form-field">
                    <label>Street</label>
                    <input
                      type="text"
                      value={store.address?.street || ''}
                      onChange={(e) => setStore((s) => ({ ...s, address: { ...(s.address || {}), street: e.target.value } }))}
                    />
                  </div>
                  <div className="form-field">
                    <label>City</label>
                    <input
                      type="text"
                      value={store.address?.city || ''}
                      onChange={(e) => setStore((s) => ({ ...s, address: { ...(s.address || {}), city: e.target.value } }))}
                    />
                  </div>
                  <div className="form-field">
                    <label>State</label>
                    <input
                      type="text"
                      value={store.address?.state || ''}
                      onChange={(e) => setStore((s) => ({ ...s, address: { ...(s.address || {}), state: e.target.value } }))}
                    />
                  </div>
                  <div className="form-field">
                    <label>ZIP Code</label>
                    <input
                      type="text"
                      value={store.address?.zipCode || ''}
                      onChange={(e) => setStore((s) => ({ ...s, address: { ...(s.address || {}), zipCode: e.target.value } }))}
                    />
                  </div>
                </div>
                <div className="form-grid">
                  <div className="form-field">
                    <label>Phone</label>
                    <input
                      type="tel"
                      value={store.contact?.phone || ''}
                      onChange={(e) => setStore((s) => ({ ...s, contact: { ...(s.contact || {}), phone: e.target.value } }))}
                    />
                  </div>
                  <div className="form-field">
                    <label>Email</label>
                    <input
                      type="email"
                      value={store.contact?.email || ''}
                      onChange={(e) => setStore((s) => ({ ...s, contact: { ...(s.contact || {}), email: e.target.value } }))}
                    />
                  </div>
                </div>
              </div>
            ) : null}

            {activeTab === 'hours' ? (
              <div className="edit-tab-body">
                <div className="hours-editor">
                  {openingDays.map(([day, hours]) => (
                    <div key={day} className="hours-editor-row">
                      <span className="hours-day">{day.charAt(0).toUpperCase() + day.slice(1)}</span>
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={!hours.closed}
                          onChange={(e) => setStore((s) => ({
                            ...s,
                            openingHours: {
                              ...(s.openingHours || {}),
                              [day]: { ...(s.openingHours?.[day] || {}), closed: !e.target.checked }
                            }
                          }))}
                        />
                        <span className="slider" />
                      </label>
                      <input
                        type="time"
                        value={hours.open || ''}
                        onChange={(e) => setStore((s) => ({
                          ...s,
                          openingHours: {
                            ...(s.openingHours || {}),
                            [day]: { ...(s.openingHours?.[day] || {}), open: e.target.value }
                          }
                        }))}
                        disabled={hours.closed}
                      />
                      <span className="hours-sep">to</span>
                      <input
                        type="time"
                        value={hours.close || ''}
                        onChange={(e) => setStore((s) => ({
                          ...s,
                          openingHours: {
                            ...(s.openingHours || {}),
                            [day]: { ...(s.openingHours?.[day] || {}), close: e.target.value }
                          }
                        }))}
                        disabled={hours.closed}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="edit-modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setIsEditing(false)}>
                Cancel
              </button>
              <button type="button" className="btn-primary" onClick={save}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {verificationOpen ? (
        <div className="edit-modal-overlay" role="dialog" aria-modal="true">
          <div className="edit-modal kyc-modal">
            <div className="edit-modal-header">
              <h2>Store Verification</h2>
              <button type="button" className="icon-btn" onClick={() => setVerificationOpen(false)}>
                <FaTimes />
              </button>
            </div>

            <div className="kyc-header">
              <div>
                <p>Upload business registration documents to verify your store.</p>
              </div>
              <span className={`status-pill status-${store.storeVerificationStatus || 'not_submitted'}`}>
                {store.storeVerificationStatus === 'approved'
                  ? 'Approved'
                  : store.storeVerificationStatus === 'pending'
                    ? 'Pending'
                    : store.storeVerificationStatus === 'rejected'
                      ? 'Rejected'
                      : 'Not submitted'}
              </span>
            </div>

            {store.storeVerificationStatus === 'rejected' && store.storeVerification?.rejectionReason ? (
              <div className="verification-alert verification-alert-error">
                Rejected: {store.storeVerification.rejectionReason}
              </div>
            ) : null}

            <div className="kyc-form">
              <div className="kyc-grid">
                <div className="kyc-field">
                  <label>PAN Number</label>
                  <input
                    type="text"
                    value={store.storeVerification?.panNumber || ''}
                    onChange={(e) => setStore((s) => ({
                      ...s,
                      storeVerification: {
                        ...(s.storeVerification || {}),
                        panNumber: e.target.value
                      }
                    }))}
                    disabled={store.storeVerificationStatus === 'pending' || store.storeVerificationStatus === 'approved'}
                    placeholder="Tax registration number"
                  />
                </div>
              </div>

              <div className="kyc-docs">
                <div className="kyc-doc">
                  <label>Business Registration Certificate</label>
                  <label className="kyc-upload" htmlFor="storeCertificate">
                    <div className="kyc-upload-icon">⬆</div>
                    <div className="kyc-upload-text">Click or drag to upload</div>
                    <div className="kyc-upload-hint">JPG, PNG up to 5MB</div>
                  </label>
                  <input
                    id="storeCertificate"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files && e.target.files[0];
                      if (!file) return;
                      setCertificateFile(file);
                      setCertificatePreview(URL.createObjectURL(file));
                    }}
                    disabled={store.storeVerificationStatus === 'pending' || store.storeVerificationStatus === 'approved'}
                  />
                  {certificatePreview ? (
                    <div className="image-preview">
                      <img src={certificatePreview} alt="Business certificate" />
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="kyc-actions">
                <button
                  className="btn-primary"
                  onClick={submitVerification}
                  disabled={verifying || store.storeVerificationStatus === 'pending' || store.storeVerificationStatus === 'approved'}
                >
                  {verifying ? 'Submitting...' : store.storeVerificationStatus === 'rejected' ? 'Resubmit Verification' : 'Submit Verification'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default StoreManagement;

