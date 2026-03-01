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
    const userResult = await require('../db').query('SELECT username, referral_code, status, referral_type, linked_property_id, linked_property_slug FROM referral_users WHERE id = $1', [userId]);
    const userDetails = userResult.rows[0];

    if (!userDetails || userDetails.status === 'blocked') {
      throw new Error('Unauthorized or account blocked');
    }

    const WithdrawalRepository = require('../repositories/withdrawalRepository');
    const stats = await WithdrawalRepository.getDashboardStats(userId);
    
    const earnings = parseFloat(stats.total_earnings);
    const withdrawals = parseFloat(stats.total_withdrawals);
    const pending = parseFloat(stats.pending_withdrawals);

    const referralType = userDetails.referral_type || 'public';
    let commissionLabel = '15% of advance';
    if (referralType === 'owner') commissionLabel = '25% of advance';
    else if (referralType === 'b2b' || referralType === 'owners_b2b') commissionLabel = '22% of advance';

    return {
      username: userDetails.username,
      referral_code: userDetails.referral_code,
      referral_type: referralType,
      linked_property_id: userDetails.linked_property_id || null,
      linked_property_slug: userDetails.linked_property_slug || null,
      commission_label: commissionLabel,
      total_earnings: earnings,
      total_withdrawals: withdrawals,
      available_balance: earnings - withdrawals,
      pending_withdrawal_amount: pending,
      total_referrals: parseInt(stats.total_referrals)
    };
  }
};

module.exports = UserService;