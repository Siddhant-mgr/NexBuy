import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import toast from '../utils/toastConfig';
import './KycSection.css';

const statusLabels = {
  not_submitted: 'Not submitted',
  pending: 'Pending review',
  approved: 'Approved',
  rejected: 'Rejected'
};

const idTypeLabels = {
  passport: 'Passport',
  driver_license: 'Driver License',
  national_id: 'National ID'
};

const KycSection = () => {
  const { user, submitKyc } = useAuth();
  const [form, setForm] = useState({
    fullName: '',
    dob: '',
    address: '',
    idType: 'passport',
    idNumber: '',
    businessName: '',
    panVat: '',
    notes: ''
  });
  const [frontFile, setFrontFile] = useState(null);
  const [backFile, setBackFile] = useState(null);
  const [frontPreview, setFrontPreview] = useState('');
  const [backPreview, setBackPreview] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const kyc = user?.kyc || null;
  const kycStatus = user?.kycStatus || 'not_submitted';
  const isLocked = kycStatus === 'pending' || kycStatus === 'approved';

  useEffect(() => {
    if (!user) return;
    setForm({
      fullName: kyc?.fullName || user.name || '',
      dob: kyc?.dob ? String(kyc.dob).slice(0, 10) : '',
      address: kyc?.address || user.address || '',
      idType: kyc?.idType || 'passport',
      idNumber: kyc?.idNumber || '',
      businessName: '',
      panVat: '',
      notes: ''
    });
    setFrontPreview(kyc?.documentFrontUrl || '');
    setBackPreview(kyc?.documentBackUrl || '');
    setFrontFile(null);
    setBackFile(null);
  }, [kyc, user]);

  useEffect(() => {
    if (!frontFile || !frontPreview) return undefined;
    return () => URL.revokeObjectURL(frontPreview);
  }, [frontFile, frontPreview]);

  useEffect(() => {
    if (!backFile || !backPreview) return undefined;
    return () => URL.revokeObjectURL(backPreview);
  }, [backFile, backPreview]);

  if (!user) {
    return null;
  }

  const uploadDoc = async (file) => {
    const data = new FormData();
    data.append('image', file);
    const res = await axios.post('/api/uploads', data, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data.url;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (isLocked) {
      toast.info('Your KYC submission is already in review.');
      return;
    }

    if (!form.fullName || !form.dob || !form.address || !form.idNumber) {
      toast.error('Please complete all required fields.');
      return;
    }

    setSubmitting(true);

    try {
      const documentFrontUrl = frontFile ? await uploadDoc(frontFile) : kyc?.documentFrontUrl;
      const documentBackUrl = backFile ? await uploadDoc(backFile) : kyc?.documentBackUrl;

      if (!documentFrontUrl || !documentBackUrl) {
        toast.error('Please upload both document images.');
        setSubmitting(false);
        return;
      }

      const payload = {
        fullName: form.fullName,
        dob: form.dob,
        address: form.address,
        idType: form.idType,
        idNumber: form.idNumber,
        documentFrontUrl,
        documentBackUrl
      };

      const result = await submitKyc(payload);
      if (result.success) {
        toast.success('KYC submitted successfully.');
      } else if (result.errors) {
        result.errors.forEach((err) => toast.error(err.msg || err.message));
      } else {
        toast.error(result.message || 'KYC submission failed');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'KYC upload failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="kyc-section">
      <div className="kyc-header">
        <div>
          <h2>Submit Documents</h2>
          <p>Upload a government-issued ID and business registration (if applicable).</p>
        </div>
        <span className={`status-pill status-${kycStatus}`}>
          {statusLabels[kycStatus] || 'Not submitted'}
        </span>
      </div>

      {kycStatus === 'rejected' && kyc?.rejectionReason ? (
        <div className="kyc-alert kyc-alert-error">
          Rejected: {kyc.rejectionReason}
        </div>
      ) : null}

      {kycStatus === 'pending' ? (
        <div className="kyc-alert kyc-alert-info">
          Your submission is under review. You will be notified once it is approved.
        </div>
      ) : null}

      {kycStatus === 'approved' ? (
        <div className="kyc-alert kyc-alert-success">
          Your identity has been verified.
        </div>
      ) : null}

      {kycStatus !== 'approved' ? (
        <form className="kyc-form" onSubmit={handleSubmit}>
          <div className="kyc-grid">
            <div className="kyc-field">
              <label htmlFor="kycFullName">Full Legal Name</label>
              <input
                id="kycFullName"
                value={form.fullName}
                onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
                placeholder="As shown on your ID"
                disabled={isLocked}
                required
              />
            </div>
            <div className="kyc-field">
              <label htmlFor="kycIdNumber">ID Number</label>
              <input
                id="kycIdNumber"
                value={form.idNumber}
                onChange={(e) => setForm((prev) => ({ ...prev, idNumber: e.target.value }))}
                placeholder="Citizenship / Passport number"
                disabled={isLocked}
                required
              />
            </div>
            <div className="kyc-field">
              <label htmlFor="kycBusiness">Business Name (Optional)</label>
              <input
                id="kycBusiness"
                value={form.businessName}
                onChange={(e) => setForm((prev) => ({ ...prev, businessName: e.target.value }))}
                placeholder="If you have a registered business"
                disabled={isLocked}
              />
            </div>
            <div className="kyc-field">
              <label htmlFor="kycPanVat">PAN / VAT Number (Optional)</label>
              <input
                id="kycPanVat"
                value={form.panVat}
                onChange={(e) => setForm((prev) => ({ ...prev, panVat: e.target.value }))}
                placeholder="Tax registration number"
                disabled={isLocked}
              />
            </div>
            <div className="kyc-field">
              <label htmlFor="kycDob">Date of Birth</label>
              <input
                id="kycDob"
                type="date"
                value={form.dob}
                onChange={(e) => setForm((prev) => ({ ...prev, dob: e.target.value }))}
                disabled={isLocked}
                required
              />
            </div>
            <div className="kyc-field">
              <label htmlFor="kycAddress">Address</label>
              <input
                id="kycAddress"
                value={form.address}
                onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                placeholder="Street, city, state"
                disabled={isLocked}
                required
              />
            </div>
            <div className="kyc-field">
              <label htmlFor="kycIdType">ID Type</label>
              <select
                id="kycIdType"
                value={form.idType}
                onChange={(e) => setForm((prev) => ({ ...prev, idType: e.target.value }))}
                disabled={isLocked}
              >
                {Object.entries(idTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="kyc-docs">
            <div className="kyc-doc">
              <label htmlFor="kycFront">Government ID (Front)</label>
              <label className="kyc-upload" htmlFor="kycFront">
                <div className="kyc-upload-icon">⬆</div>
                <div className="kyc-upload-text">Click or drag to upload</div>
                <div className="kyc-upload-hint">JPG, PNG up to 5MB</div>
              </label>
              <input
                id="kycFront"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files && e.target.files[0];
                  if (!file) return;
                  setFrontFile(file);
                  setFrontPreview(URL.createObjectURL(file));
                }}
                disabled={isLocked}
              />
              {frontPreview ? (
                <div className="kyc-preview">
                  <img src={frontPreview} alt="Document front" />
                </div>
              ) : null}
            </div>
            <div className="kyc-doc">
              <label htmlFor="kycBack">Government ID (Back)</label>
              <label className="kyc-upload" htmlFor="kycBack">
                <div className="kyc-upload-icon">⬆</div>
                <div className="kyc-upload-text">Click or drag to upload</div>
                <div className="kyc-upload-hint">JPG, PNG up to 5MB</div>
              </label>
              <input
                id="kycBack"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files && e.target.files[0];
                  if (!file) return;
                  setBackFile(file);
                  setBackPreview(URL.createObjectURL(file));
                }}
                disabled={isLocked}
              />
              {backPreview ? (
                <div className="kyc-preview">
                  <img src={backPreview} alt="Document back" />
                </div>
              ) : null}
            </div>
          </div>

          <div className="kyc-field kyc-notes">
            <label htmlFor="kycNotes">Additional Notes</label>
            <textarea
              id="kycNotes"
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Any additional information..."
              disabled={isLocked}
              rows={4}
            />
          </div>

          <div className="kyc-actions">
            <button className="btn-primary" type="submit" disabled={submitting || isLocked}>
              {submitting ? 'Submitting...' : kycStatus === 'rejected' ? 'Resubmit KYC' : 'Submit KYC'}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
};

export default KycSection;
