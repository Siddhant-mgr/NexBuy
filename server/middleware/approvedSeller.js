const User = require('../models/User');

// Ensures the authenticated seller has been approved by an admin.
module.exports = async function requireApprovedSeller(req, res, next) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    if (user.role !== 'seller') {
      return res.status(403).json({ message: 'Seller account is not approved yet' });
    }

    if (!user.sellerVerificationStatus) {
      await User.updateOne(
        { _id: userId },
        {
          $set: {
            sellerVerificationStatus: 'pending',
            sellerIsVerified: false,
            updatedAt: new Date()
          }
        }
      );
      return res.status(403).json({ message: 'Seller account is not approved yet' });
    }

    if (user.sellerVerificationStatus !== 'approved') {
      return res.status(403).json({ message: 'Seller account is not approved yet' });
    }

    req.sellerProfile = {
      verificationStatus: user.sellerVerificationStatus,
      isVerified: user.sellerIsVerified,
      approvedAt: user.sellerApprovedAt,
      approvedBy: user.sellerApprovedBy
    };
    next();
  } catch (error) {
    console.error('requireApprovedSeller error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
