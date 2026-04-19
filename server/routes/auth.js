const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { sendVerificationEmail } = require('../utils/email');
const router = express.Router();

// Generate JWT Token
const generateToken = (user) => {
  return jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET || 'your_jwt_secret_key_here', {
    expiresIn: '30d'
  });
};

const EMAIL_CODE_LENGTH = 6;
const EMAIL_CODE_TTL_MS = 10 * 60 * 1000;

const generateVerificationCode = () => {
  const max = 10 ** EMAIL_CODE_LENGTH;
  return String(crypto.randomInt(0, max)).padStart(EMAIL_CODE_LENGTH, '0');
};

const hashVerificationCode = (code) => {
  return crypto.createHash('sha256').update(code).digest('hex');
};

const buildUserPayload = (user) => {
  let sellerProfile = null;
  if (user.role === 'seller') {
    sellerProfile = {
      verificationStatus: user.sellerVerificationStatus || 'pending',
      isVerified: user.sellerIsVerified || false,
      approvedAt: user.sellerApprovedAt || null
    };
  }

  const kyc = user.kyc
    ? {
        fullName: user.kyc.fullName,
        dob: user.kyc.dob,
        address: user.kyc.address,
        idType: user.kyc.idType,
        idNumber: user.kyc.idNumber,
        documentFrontUrl: user.kyc.documentFrontUrl,
        documentBackUrl: user.kyc.documentBackUrl,
        submittedAt: user.kyc.submittedAt,
        reviewedAt: user.kyc.reviewedAt,
        reviewedBy: user.kyc.reviewedBy,
        rejectionReason: user.kyc.rejectionReason
      }
    : null;

  return {
    id: user._id,
    name: user.name,
    email: user.email,
    emailVerified: user.emailVerified !== false,
    role: user.role,
    phone: user.phone,
    address: user.address,
    avatarUrl: user.avatarUrl,
    seller: sellerProfile,
    kycStatus: user.kycStatus || 'not_submitted',
    kyc
  };
};

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(['customer', 'seller', 'admin']).withMessage('Role must be customer, seller, or admin')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password, role, phone, address } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const resolvedRole = role || 'customer';

    const verificationCode = generateVerificationCode();
    const user = new User({
      name,
      email,
      password,
      role: resolvedRole,
      phone,
      address,
      avatarUrl: undefined,
      emailVerified: false,
      emailVerificationCodeHash: hashVerificationCode(verificationCode),
      emailVerificationExpires: new Date(Date.now() + EMAIL_CODE_TTL_MS),
      sellerVerificationStatus: resolvedRole === 'seller' ? 'pending' : undefined,
      sellerIsVerified: resolvedRole === 'seller' ? false : undefined
    });

    await user.save();

    try {
      await sendVerificationEmail({
        to: user.email,
        code: verificationCode,
        name: user.name
      });
    } catch (mailError) {
      console.error('Email send error:', mailError);
      return res.status(500).json({
        message: 'Could not send verification code. Please try again later.'
      });
    }

    res.status(201).json({
      message: 'Verification code sent to your email',
      verificationRequired: true,
      email: user.email
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      message: 'Server error during registration',
      ...(process.env.NODE_ENV === 'production'
        ? {}
        : { error: error?.message || String(error) })
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (user.isActive === false) {
      return res.status(403).json({ message: 'Account is disabled' });
    }

    if (user.emailVerified === false) {
      return res.status(403).json({
        message: 'Please verify your email before logging in',
        verificationRequired: true
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(user);

    res.json({
      message: 'Login successful',
      token,
      user: buildUserPayload(user)
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      message: 'Server error during login',
      ...(process.env.NODE_ENV === 'production'
        ? {}
        : { error: error?.message || String(error) })
    });
  }
});

// @route   POST /api/auth/verify-email
// @desc    Verify email with code
// @access  Public
router.post('/verify-email', [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('code').isLength({ min: EMAIL_CODE_LENGTH, max: EMAIL_CODE_LENGTH }).withMessage('Invalid verification code')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, code } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.emailVerified === true || user.emailVerified === undefined) {
      return res.status(400).json({ message: 'Email already verified. Please login.' });
    }

    if (!user.emailVerificationExpires || user.emailVerificationExpires < Date.now()) {
      return res.status(400).json({ message: 'Verification code expired' });
    }

    const hashed = hashVerificationCode(code);
    if (hashed !== user.emailVerificationCodeHash) {
      return res.status(400).json({ message: 'Invalid verification code' });
    }

    user.emailVerified = true;
    user.emailVerificationCodeHash = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    const token = generateToken(user);

    res.json({
      message: 'Email verified successfully',
      token,
      user: buildUserPayload(user)
    });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({ message: 'Server error during email verification' });
  }
});

// @route   POST /api/auth/resend-verification
// @desc    Resend verification code
// @access  Public
router.post('/resend-verification', [
  body('email').isEmail().withMessage('Please provide a valid email')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.emailVerified !== false) {
      return res.status(400).json({ message: 'Email already verified' });
    }

    const verificationCode = generateVerificationCode();
    user.emailVerificationCodeHash = hashVerificationCode(verificationCode);
    user.emailVerificationExpires = new Date(Date.now() + EMAIL_CODE_TTL_MS);
    await user.save();

    await sendVerificationEmail({
      to: user.email,
      code: verificationCode,
      name: user.name
    });

    res.json({ message: 'Verification code resent' });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ message: 'Server error during resend' });
  }
});

// @route   GET /api/auth/me
// @desc    Get current authenticated user
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.isActive === false) {
      return res.status(403).json({ message: 'Account is disabled' });
    }

    res.json({
      user: buildUserPayload(user)
    });
  } catch (error) {
    console.error('Auth me error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/auth/me
// @desc    Update current authenticated user
// @access  Private
router.put(
  '/me',
  auth,
  [
    body('name').optional().trim().notEmpty().withMessage('Name is required'),
    body('phone').optional().isString().withMessage('Phone must be a string'),
    body('address').optional().isString().withMessage('Address must be a string'),
    body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('currentPassword').optional().isString().withMessage('Current password must be a string'),
    body('confirmPassword').optional().isString().withMessage('Confirm password must be a string'),
    body('avatarUrl').optional().isString().withMessage('Avatar URL must be a string')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const user = await User.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      if (user.isActive === false) {
        return res.status(403).json({ message: 'Account is disabled' });
      }

      const { name, phone, address, password, currentPassword, confirmPassword, avatarUrl } = req.body;

      if (name !== undefined) user.name = name;
      if (phone !== undefined) user.phone = phone;
      if (address !== undefined) user.address = address;
      if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;

      if (password) {
        if (!currentPassword) {
          return res.status(400).json({ message: 'Current password is required' });
        }
        if (!confirmPassword) {
          return res.status(400).json({ message: 'Please confirm the new password' });
        }
        if (confirmPassword !== password) {
          return res.status(400).json({ message: 'New passwords do not match' });
        }

        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
          return res.status(400).json({ message: 'Current password is incorrect' });
        }

        user.password = password;
      }

      await user.save();

      res.json({
        message: 'Profile updated',
        user: buildUserPayload(user)
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

module.exports = router;

