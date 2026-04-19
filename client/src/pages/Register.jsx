import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import './Auth.css';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'customer',
    phone: '',
    address: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('register');
  const [verificationEmail, setVerificationEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const { register, verifyEmail, resendVerification } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    const { confirmPassword, ...registerData } = formData;
    const result = await register(registerData);
    
    if (result.success) {
      if (result.verificationRequired) {
        const targetEmail = result.email || formData.email;
        setVerificationEmail(targetEmail);
        setStep('verify');
        toast.info(`Verification code sent to ${targetEmail}`);
      } else {
        toast.success('Registration successful!');
        // Navigate to appropriate dashboard based on role
        const userRole = result.user?.role || formData.role || 'customer';
        setTimeout(() => {
          navigate(userRole === 'seller' ? '/seller/dashboard' : '/customer/home');
        }, 500);
      }
    } else {
      if (result.errors) {
        result.errors.forEach(error => {
          toast.error(error.msg || error.message);
        });
      } else {
        toast.error(result.message || 'Registration failed');
      }
    }
    
    setLoading(false);
  };

  const handleVerify = async (e) => {
    e.preventDefault();

    if (verificationCode.trim().length !== 6) {
      toast.error('Enter the 6-digit verification code');
      return;
    }

    setVerifyLoading(true);
    const result = await verifyEmail(verificationEmail, verificationCode.trim());
    if (result.success) {
      toast.success('Email verified!');
      const userRole = result.user?.role || 'customer';
      setTimeout(() => {
        navigate(userRole === 'seller' ? '/seller/dashboard' : '/customer/home');
      }, 500);
    } else {
      toast.error(result.message || 'Verification failed');
    }
    setVerifyLoading(false);
  };

  const handleResend = async () => {
    if (!verificationEmail) return;
    setResendLoading(true);
    const result = await resendVerification(verificationEmail);
    if (result.success) {
      toast.success(result.message || 'Code resent');
    } else {
      toast.error(result.message || 'Resend failed');
    }
    setResendLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>NexBuy</h1>
          <p>Create your account to get started.</p>
        </div>

        {step === 'register' ? (
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="name">Full Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="Enter your full name"
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="Enter your email"
              />
            </div>

            <div className="form-group">
              <label htmlFor="role">I am a</label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                required
              >
                <option value="customer">Customer</option>
                <option value="seller">Seller</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="phone">Phone (Optional)</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Enter your phone number"
              />
            </div>

            <div className="form-group">
              <label htmlFor="address">Address (Optional)</label>
              <input
                type="text"
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Enter your address"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="password-field">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  placeholder="Enter your password (min 6 characters)"
                  minLength="6"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <div className="password-field">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  placeholder="Confirm your password"
                  minLength="6"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  aria-label={showConfirmPassword ? 'Hide password confirmation' : 'Show password confirmation'}
                >
                  {showConfirmPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <button type="submit" className="auth-button" disabled={loading}>
              {loading ? 'Registering...' : 'Register'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="auth-form">
            <div className="auth-hint">
              Enter the 6-digit code sent to <strong>{verificationEmail}</strong>.
            </div>
            <div className="form-group">
              <label htmlFor="verificationCode">Verification Code</label>
              <input
                type="text"
                id="verificationCode"
                name="verificationCode"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                required
                maxLength="6"
                placeholder="Enter 6-digit code"
              />
            </div>
            <button type="submit" className="auth-button" disabled={verifyLoading}>
              {verifyLoading ? 'Verifying...' : 'Verify Email'}
            </button>
            <div className="auth-inline-actions">
              <button type="button" className="auth-text-button" onClick={handleResend} disabled={resendLoading}>
                {resendLoading ? 'Resending...' : 'Resend code'}
              </button>
              <button
                type="button"
                className="auth-text-button"
                onClick={() => {
                  setStep('register');
                  setVerificationCode('');
                }}
              >
                Change email
              </button>
            </div>
          </form>
        )}

        <div className="auth-footer">
          <p>
            Already have an account? <Link to="/login">Login here</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;

