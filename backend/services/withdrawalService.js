const WithdrawalRepository = require('../repositories/withdrawalRepository');
const UserRepository = require('../repositories/userRepository');

const WithdrawalService = {
  async requestWithdrawal(userId, amount, upiId) {
    // 1. Check user status
    const userResult = await require('../db').query('SELECT status FROM referral_users WHERE id = $1', [userId]);
    const user = userResult.rows[0];
    
    if (!user || user.status !== 'active') {
      throw new Error('User is not active or not found');
    }

    // 2. Minimum withdrawal check
    if (amount < 500) {
      throw new Error('Minimum withdrawal amount is ₹500');
    }

    // 3. Dynamic balance check
    const stats = await WithdrawalRepository.getDashboardStats(userId);
    const availableBalance = parseFloat(stats.total_earnings) - parseFloat(stats.total_withdrawals);

    if (amount > availableBalance) {
      throw new Error('Insufficient balance');
    }

    // 4. Pending withdrawal check
    const pending = await WithdrawalRepository.getPendingWithdrawal(userId);
    if (pending) {
      throw new Error('You already have a pending withdrawal request');
    }

    // 5. Create withdrawal
    return await WithdrawalRepository.createWithdrawal(userId, amount, upiId);
  }
};

module.exports = WithdrawalService;