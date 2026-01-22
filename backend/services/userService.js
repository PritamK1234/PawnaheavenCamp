const UserRepository = require('../repositories/userRepository');
const jwt = require('jsonwebtoken');

const UserService = {
  async register(username, mobileNumber, referralCode) {
    // 1. Check if username exists
    const existingUser = await UserRepository.findByUsername(username);
    if (existingUser) throw new Error('Username already taken');

    // 2. Check if mobile already registered
    const existingMobile = await UserRepository.findByMobile(mobileNumber);
    if (existingMobile) throw new Error('Mobile number already registered');

    // 3. Check if custom referral code already exists
    const existingCode = await UserRepository.findByReferralCode(referralCode);
    if (existingCode) throw new Error('Referral code already taken');

    // 4. Create user with provided code
    return await UserRepository.create(username, mobileNumber, referralCode.toUpperCase());
  },

  async login(mobileNumber) {
    const user = await UserRepository.findByMobile(mobileNumber);
    if (!user) throw new Error('User not found');
    if (user.status === 'blocked') throw new Error('Account is blocked');

    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET || 'your_fallback_secret',
      { expiresIn: '24h' }
    );

    return { token, user };
  },

  async getDashboard(userId) {
    // Get user details
    const userResult = await require('../db').query('SELECT username, referral_code, status FROM referral_users WHERE id = $1', [userId]);
    const userDetails = userResult.rows[0];

    if (!userDetails || userDetails.status === 'blocked') {
      throw new Error('Unauthorized or account blocked');
    }

    const WithdrawalRepository = require('../repositories/withdrawalRepository');
    const stats = await WithdrawalRepository.getDashboardStats(userId);
    
    const earnings = parseFloat(stats.total_earnings);
    const withdrawals = parseFloat(stats.total_withdrawals);
    const pending = parseFloat(stats.pending_withdrawals);

    return {
      username: userDetails.username,
      referral_code: userDetails.referral_code,
      total_earnings: earnings,
      total_withdrawals: withdrawals,
      available_balance: earnings - withdrawals,
      pending_withdrawal_amount: pending,
      total_referrals: parseInt(stats.total_referrals)
    };
  }
};

module.exports = UserService;