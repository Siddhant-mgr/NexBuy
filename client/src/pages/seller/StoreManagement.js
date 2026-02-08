import React, { useEffect, useState } from 'react';
import { FaStore, FaMapMarkerAlt, FaPhone, FaEnvelope, FaEdit, FaClock } from 'react-icons/fa';
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
    reputation: { trustScore: 0, totalOrders: 0, averageRating: 0 }
  };

  const [store, setStore] = useState(emptyStore);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isNewStore, setIsNewStore] = useState(false);

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

  const toggleEditOrSave = async () => {
    if (isEditing) {
      await save();
    } else {
      setIsEditing(true);
    }
  };

  return (
    <div className="store-management-page">
      <div className="page-header">
        <div>
          <h1>Store Management</h1>
          <p>Manage your store information and settings</p>
        </div>
        <button className="btn-primary" onClick={toggleEditOrSave} disabled={loading}>
          <FaEdit /> {isEditing ? (isNewStore ? 'Create Store' : 'Save Changes') : 'Edit Store'}
        </button>
      </div>

      {error && (
        <div className="no-results">
          <p>{error}</p>
        </div>
      )}

      <div className="store-management-grid">
        <div className="store-info-card">
          <h2>Store Information</h2>
          <div className="info-section">
            <div className="info-item">
              <label>Store Name</label>
              {isEditing ? (
                <input type="text" value={store.storeName || ''} onChange={(e) => setStore((s) => ({ ...s, storeName: e.target.value }))} />
              ) : (
                <p>{store.storeName}</p>
              )}
            </div>
            <div className="info-item">
              <label>Description</label>
              {isEditing ? (
                <textarea rows="3" value={store.description || ''} onChange={(e) => setStore((s) => ({ ...s, description: e.target.value }))}></textarea>
              ) : (
                <p>{store.description}</p>
              )}
            </div>
            <div className="info-item">
              <label>Category</label>
              {isEditing ? (
                <select value={store.category || 'Electronics'} onChange={(e) => setStore((s) => ({ ...s, category: e.target.value }))}>
                  <option>Electronics</option>
                  <option>Groceries</option>
                  <option>Clothing</option>
                  <option>Home</option>
                </select>
              ) : (
                <p>{store.category}</p>
              )}
            </div>
          </div>
        </div>

        <div className="store-info-card">
          <h2>Contact Information</h2>
          <div className="info-section">
            <div className="info-item">
              <FaMapMarkerAlt />
              <div>
                <label>Address</label>
                {isEditing ? (
                  <div className="address-inputs">
                    <input type="text" placeholder="Street" value={store.address?.street || ''} onChange={(e) => setStore((s) => ({ ...s, address: { ...(s.address || {}), street: e.target.value } }))} />
                    <input type="text" placeholder="City" value={store.address?.city || ''} onChange={(e) => setStore((s) => ({ ...s, address: { ...(s.address || {}), city: e.target.value } }))} />
                    <input type="text" placeholder="State" value={store.address?.state || ''} onChange={(e) => setStore((s) => ({ ...s, address: { ...(s.address || {}), state: e.target.value } }))} />
                    <input type="text" placeholder="ZIP Code" value={store.address?.zipCode || ''} onChange={(e) => setStore((s) => ({ ...s, address: { ...(s.address || {}), zipCode: e.target.value } }))} />
                  </div>
                ) : (
                  <p>
                    {store.address?.street}, {store.address?.city}, {store.address?.state} {store.address?.zipCode}
                  </p>
                )}
              </div>
            </div>
            <div className="info-item">
              <FaPhone />
              <div>
                <label>Phone</label>
                {isEditing ? (
                  <input type="tel" value={store.contact?.phone || ''} onChange={(e) => setStore((s) => ({ ...s, contact: { ...(s.contact || {}), phone: e.target.value } }))} />
                ) : (
                  <p>{store.contact?.phone}</p>
                )}
              </div>
            </div>
            <div className="info-item">
              <FaEnvelope />
              <div>
                <label>Email</label>
                {isEditing ? (
                  <input type="email" value={store.contact?.email || ''} onChange={(e) => setStore((s) => ({ ...s, contact: { ...(s.contact || {}), email: e.target.value } }))} />
                ) : (
                  <p>{store.contact?.email}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="store-info-card">
          <h2>Opening Hours</h2>
          <div className="hours-section">
            {Object.entries(store.openingHours || {}).map(([day, hours]) => (
              <div key={day} className="hours-item">
                <label>{day.charAt(0).toUpperCase() + day.slice(1)}</label>
                {isEditing ? (
                  <div className="hours-inputs">
                    <input type="time" value={hours.open || ''} onChange={(e) => setStore((s) => ({ ...s, openingHours: { ...(s.openingHours || {}), [day]: { ...(s.openingHours?.[day] || {}), open: e.target.value } } }))} />
                    <span>to</span>
                    <input type="time" value={hours.close || ''} onChange={(e) => setStore((s) => ({ ...s, openingHours: { ...(s.openingHours || {}), [day]: { ...(s.openingHours?.[day] || {}), close: e.target.value } } }))} />
                    <label className="checkbox-label">
                      <input type="checkbox" checked={!!hours.closed} onChange={(e) => setStore((s) => ({ ...s, openingHours: { ...(s.openingHours || {}), [day]: { ...(s.openingHours?.[day] || {}), closed: e.target.checked } } }))} />
                      Closed
                    </label>
                  </div>
                ) : hours.closed ? (
                  <p>Closed</p>
                ) : (
                  <p>{hours.open} - {hours.close}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="store-info-card">
          <h2>Store Reputation</h2>
          <div className="reputation-stats">
            <div className="reputation-item">
              <h3>{store.reputation?.trustScore ?? 0}%</h3>
              <p>Trust Score</p>
            </div>
            <div className="reputation-item">
              <h3>{store.reputation?.totalOrders ?? 0}</h3>
              <p>Total Orders</p>
            </div>
            <div className="reputation-item">
              <h3>{store.reputation?.averageRating ?? 0}</h3>
              <p>Average Rating</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoreManagement;

