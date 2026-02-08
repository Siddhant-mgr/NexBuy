const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key_here');
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

const requireRole = (...roles) => {
  const allowedRoles = roles.flat().filter(Boolean);
  return (req, res, next) => {
    const role = req.user?.role;
    if (!role) {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    next();
  };
};

module.exports = auth;
module.exports.requireRole = requireRole;

