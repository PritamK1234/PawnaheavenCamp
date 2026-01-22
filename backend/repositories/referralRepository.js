const { query } = require('../db');

const ReferralRepository = {
  async findByMobile(mobile) {
    const text = 'SELECT id, status FROM referral_users WHERE mobile_number = $1';
    const res = await query(text, [mobile]);
    return res.rows[0];
  },

  async getTopEarners(period) {
    let text;
    if (period === 'month') {
      text = `
        SELECT u.username, SUM(t.amount) as earnings
        FROM referral_users u
        JOIN referral_transactions t ON u.id = t.referral_user_id
        WHERE u.status = 'active' 
          AND t.status = 'completed' 
          AND t.type = 'earning'
          AND t.created_at >= date_trunc('month', now())
        GROUP BY u.username
        ORDER BY earnings DESC
        LIMIT 20
      `;
    } else {
      // All time earnings - withdrawals
      text = `
        SELECT u.username, 
          COALESCE(SUM(CASE WHEN t.type = 'earning' THEN t.amount ELSE 0 END), 0) - 
          COALESCE(SUM(CASE WHEN t.type = 'withdrawal' THEN t.amount ELSE 0 END), 0) as earnings
        FROM referral_users u
        JOIN referral_transactions t ON u.id = t.referral_user_id
        WHERE u.status = 'active' AND t.status = 'completed'
        GROUP BY u.username
        ORDER BY earnings DESC
        LIMIT 20
      `;
    }
    const res = await query(text);
    return res.rows;
  },

  async findById(id) {
    const text = 'SELECT id, username, referral_code, status FROM referral_users WHERE id = $1';
    const res = await query(text, [id]);
    return res.rows[0];
  }
};

module.exports = ReferralRepository;