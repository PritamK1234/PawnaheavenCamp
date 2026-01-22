const { query } = require('../db');

const WithdrawalRepository = {
  async getPendingWithdrawal(userId) {
    const text = `
      SELECT * FROM referral_transactions 
      WHERE referral_user_id = $1 AND type = 'withdrawal' AND status = 'pending'
      LIMIT 1
    `;
    const res = await query(text, [userId]);
    return res.rows[0];
  },

  async createWithdrawal(userId, amount, upiId) {
    const text = `
      INSERT INTO referral_transactions (referral_user_id, amount, type, status, source, upi_id)
      VALUES ($1, $2, 'withdrawal', 'pending', 'manual', $3)
      RETURNING *
    `;
    const res = await query(text, [userId, amount, upiId]);
    return res.rows[0];
  },

  async getDashboardStats(userId) {
    const text = `
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'earning' AND status = 'completed' THEN amount ELSE 0 END), 0) as total_earnings,
        COALESCE(SUM(CASE WHEN type = 'withdrawal' AND status = 'completed' THEN amount ELSE 0 END), 0) as total_withdrawals,
        COALESCE(SUM(CASE WHEN type = 'withdrawal' AND status = 'pending' THEN amount ELSE 0 END), 0) as pending_withdrawals,
        (SELECT COUNT(*) FROM referral_transactions WHERE referral_user_id = $1 AND type = 'earning' AND source = 'booking') as total_referrals
      FROM referral_transactions
      WHERE referral_user_id = $1
    `;
    const res = await query(text, [userId]);
    return res.rows[0];
  }
};

module.exports = WithdrawalRepository;