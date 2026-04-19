import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import './AdminPages.css';

const statusLabels = {
  not_submitted: 'Not submitted',
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected'
};

const idTypeLabels = {
  passport: 'Passport',
  driver_license: 'Driver License',
  national_id: 'National ID'
};

const AdminKyc = () => {
  const [statusFilter, setStatusFilter] = useState('pending');
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [rejectionState, setRejectionState] = useState({
    open: false,
    userId: null,
    userLabel: '',
    reason: ''
  });

  const loadSubmissions = async (filter) => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get('/api/admin/kyc', { params: { status: filter } });
      setSubmissions(res.data.submissions || []);
    } catch (e) {
      setError(e.response?.data?.message || 'Could not load KYC submissions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubmissions(statusFilter);
  }, [statusFilter]);

  const counts = useMemo(() => {
    const result = { not_submitted: 0, pending: 0, approved: 0, rejected: 0 };
    submissions.forEach((submission) => {
      const status = submission.kycStatus || 'not_submitted';
      if (result[status] !== undefined) {
        result[status] += 1;
      }
    });
    return result;
  }, [submissions]);

  const onUpdateStatus = async (userId, status, rejectionReason) => {
    setUpdatingId(userId);
    setError('');

    if (status === 'rejected' && !rejectionReason) {
      setError('Rejection reason is required.');
      setUpdatingId(null);
      return;
    }

    try {
      await axios.put(`/api/admin/kyc/${userId}/decision`, {
        status,
        rejectionReason
      });
      await loadSubmissions(statusFilter);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to update KYC status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const openReject = (submission) => {
    setRejectionState({
      open: true,
      userId: submission.userId,
      userLabel: submission.name || submission.email || 'User',
      reason: ''
    });
  };

  const cancelReject = () => {
    setRejectionState({ open: false, userId: null, userLabel: '', reason: '' });
  };

  const confirmReject = async () => {
    const reason = rejectionState.reason.trim();
    if (!reason) {
      setError('Rejection reason is required.');
      return;
    }
    await onUpdateStatus(rejectionState.userId, 'rejected', reason);
    setRejectionState({ open: false, userId: null, userLabel: '', reason: '' });
  };

  return (
    <div className="admin-page">
      <div className="page-header">
        <div>
          <h1>KYC Review</h1>
          <p>Review identity documents and approve verification.</p>
        </div>
        <div className="status-filters">
          {['pending', 'approved', 'rejected', 'not_submitted', 'all'].map((status) => (
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

      {loading && <div className="admin-inline-message">Loading KYC submissions...</div>}
      {!loading && error && <div className="admin-inline-message admin-inline-message-error">{error}</div>}

      <div className="admin-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Status</th>
              <th>ID Details</th>
              <th>Documents</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {!loading && submissions.length === 0 ? (
              <tr>
                <td colSpan="6" className="empty-cell">No KYC submissions found.</td>
              </tr>
            ) : (
              submissions.map((submission) => (
                <tr key={submission.userId}>
                  <td>
                    <div className="seller-name">{submission.name || 'User'}</div>
                    <div className="seller-sub">{submission.email}</div>
                  </td>
                  <td>{submission.role}</td>
                  <td>
                    <span className={`status-pill status-${submission.kycStatus || 'not_submitted'}`}>
                      {statusLabels[submission.kycStatus] || 'Not submitted'}
                    </span>
                  </td>
                  <td>
                    <div>{idTypeLabels[submission.kyc?.idType] || submission.kyc?.idType || '-'}</div>
                    <div className="seller-sub">{submission.kyc?.idNumber || '-'}</div>
                  </td>
                  <td>
                    {submission.kyc?.documentFrontUrl ? (
                      <a href={submission.kyc.documentFrontUrl} target="_blank" rel="noreferrer">Front</a>
                    ) : '-'}
                    {' / '}
                    {submission.kyc?.documentBackUrl ? (
                      <a href={submission.kyc.documentBackUrl} target="_blank" rel="noreferrer">Back</a>
                    ) : '-'}
                  </td>
                  <td>
                    <div className="action-group">
                      <button
                        className="btn-approve"
                        disabled={updatingId === submission.userId || submission.kycStatus === 'approved'}
                        onClick={() => onUpdateStatus(submission.userId, 'approved')}
                      >
                        Approve
                      </button>
                      <button
                        className="btn-reject"
                        disabled={updatingId === submission.userId || submission.kycStatus === 'rejected'}
                        onClick={() => openReject(submission)}
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

      {rejectionState.open ? (
        <div className="confirm-overlay" role="dialog" aria-modal="true">
          <div className="confirm-modal">
            <h3>Reject KYC</h3>
            <p>
              Add a rejection reason for <strong>{rejectionState.userLabel}</strong>.
            </p>
            <textarea
              className="admin-input"
              rows="4"
              placeholder="Rejection reason"
              value={rejectionState.reason}
              onChange={(e) => setRejectionState((prev) => ({ ...prev, reason: e.target.value }))}
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

export default AdminKyc;
