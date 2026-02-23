const jwt = require('jsonwebtoken');
const { query } = require('../db');

const authenticateReferralUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_fallback_secret');

    // If purpose is register or login, we only need to verify the OTP purpose
    if (decoded.purpose === 'register' || decoded.purpose === 'login' || decoded.purpose === 'referral_login') {
      req.user = decoded;
      return next();
    }

    // For other purposes (dashboard, withdrawal), fetch user and check status
    const result = await query(
      'SELECT id, username, referral_otp_number, status FROM referral_users WHERE id = $1',
      [decoded.userId]
    );

    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: User not found' });
    }

    if (user.status === 'blocked') {
      return res.status(403).json({ error: 'Forbidden: Account is blocked' });
    }

    // Attach user info to request
    req.user = user;
    next();
  } catch (error) {
    console.error('JWT Authentication Error:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

module.exports = authenticateReferralUser;