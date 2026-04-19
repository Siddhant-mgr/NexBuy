const express = require('express');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const User = require('../models/User');
const { createAdminNotifications } = require('../utils/notifications');

const router = express.Router();

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
    role: user.role,
    phone: user.phone,
    address: user.address,
    avatarUrl: user.avatarUrl,
    seller: sellerProfile,
    kycStatus: user.kycStatus || 'not_submitted',
    kyc
  };
};

// @route   GET /api/kyc/me
// @desc    Get current user's KYC status and data
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

    return res.json({ user: buildUserPayload(user) });
  } catch (error) {
    console.error('KYC me error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/kyc/submit
// @desc    Submit or resubmit KYC data
// @access  Private
router.post(
  '/submit',
  auth,
  [
    body('fullName').trim().notEmpty().withMessage('Full name is required'),
    body('dob').isISO8601().withMessage('Date of birth is required').toDate(),
    body('address').trim().notEmpty().withMessage('Address is required'),
    body('idType').isIn(['passport', 'driver_license', 'national_id']).withMessage('Invalid ID type'),
    body('idNumber').trim().notEmpty().withMessage('ID number is required'),
    body('documentFrontUrl').isString().notEmpty().withMessage('Front document image is required'),
    body('documentBackUrl').isString().notEmpty().withMessage('Back document image is required')
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

      if (user.kycStatus === 'approved') {
        return res.status(400).json({ message: 'KYC is already approved' });
      }

      const {
        fullName,
        dob,
        address,
        idType,
        idNumber,
        documentFrontUrl,
        documentBackUrl
      } = req.body;

      user.kycStatus = 'pending';
      user.kyc = {
        fullName,
        dob,
        address,
        idType,
        idNumber,
        documentFrontUrl,
        documentBackUrl,
        submittedAt: new Date(),
        reviewedAt: null,
        reviewedBy: null,
        rejectionReason: null
      };

      await user.save();

      try {
        await createAdminNotifications(req, {
          type: 'kyc_submitted',
          title: 'New KYC submission',
          message: `${user.name} submitted KYC for review.`,
          link: '/admin/kyc',
          data: { userId: user._id, status: user.kycStatus }
        });
      } catch (notifyError) {
        console.error('Admin KYC notification error:', notifyError);
      }

      return res.json({
        message: 'KYC submitted successfully',
        user: buildUserPayload(user)
      });
    } catch (error) {
      console.error('KYC submit error:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  }
);

module.exports = router;
