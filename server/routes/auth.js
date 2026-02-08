const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const auth = require('../middleware/auth');
const router = express.Router();

// Generate JWT Token
const generateToken = (user) => {
  return jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET || 'your_jwt_secret_key_here', {
    expiresIn: '30d'
  });
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

    const user = new User({
      name,
      email,
      password,
      role: resolvedRole,
      phone,
      address,
      avatarUrl: undefined,
      sellerVerificationStatus: resolvedRole === 'seller' ? 'pending' : undefined,
      sellerIsVerified: resolvedRole === 'seller' ? false : undefined
    });

    await user.save();

    let sellerProfile = null;
    if (user.role === 'seller') {
      sellerProfile = {
        verificationStatus: user.sellerVerificationStatus || 'pending',
        isVerified: user.sellerIsVerified || false,
        approvedAt: user.sellerApprovedAt || null
      };
    }

    // Generate token
    const token = generateToken(user);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        address: user.address,
        avatarUrl: user.avatarUrl,
        seller: sellerProfile
      }
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

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(user);

    let sellerProfile = null;
    if (user.role === 'seller') {
      sellerProfile = {
        verificationStatus: user.sellerVerificationStatus || 'pending',
        isVerified: user.sellerIsVerified || false,
        approvedAt: user.sellerApprovedAt || null
      };
    }

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        address: user.address,
        avatarUrl: user.avatarUrl,
        seller: sellerProfile
      }
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

    let sellerProfile = null;
    if (user.role === 'seller') {
      sellerProfile = {
        verificationStatus: user.sellerVerificationStatus || 'pending',
        isVerified: user.sellerIsVerified || false,
        approvedAt: user.sellerApprovedAt || null
      };
    }

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        address: user.address,
        avatarUrl: user.avatarUrl,
        seller: sellerProfile
      }
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

      const { name, phone, address, password, avatarUrl } = req.body;

      if (name !== undefined) user.name = name;
      if (phone !== undefined) user.phone = phone;
      if (address !== undefined) user.address = address;
      if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;
      if (password) user.password = password;

      await user.save();

      let sellerProfile = null;
      if (user.role === 'seller') {
        sellerProfile = {
          verificationStatus: user.sellerVerificationStatus || 'pending',
          isVerified: user.sellerIsVerified || false,
          approvedAt: user.sellerApprovedAt || null
        };
      }

      res.json({
        message: 'Profile updated',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          address: user.address,
          avatarUrl: user.avatarUrl,
          seller: sellerProfile
        }
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

module.exports = router;

