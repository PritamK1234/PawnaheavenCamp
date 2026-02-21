const { query } = require('../db');

const UserRepository = {
  async create(username, mobileNumber, referralCode) {
    const code = referralCode.toUpperCase();
    const domain = process.env.REPLIT_DOMAINS?.split(",")[0] || process.env.REPLIT_DEV_DOMAIN || "pawnahavencamp.com";
    const referralUrl = `https://${domain}?ref=${code}`;
    const text = `
      INSERT INTO referral_users (username, referral_otp_number, referral_code, referral_url, status, balance)
      VALUES ($1, $2, $3, $4, 'active', 0)
      RETURNING id, username, referral_otp_number, referral_code, referral_url, status
    `;
    const res = await query(text, [username.toLowerCase(), mobileNumber, code, referralUrl]);
    return res.rows[0];
  },

  async findByUsername(username) {
    const text = 'SELECT * FROM referral_users WHERE username = $1';
    const res = await query(text, [username.toLowerCase()]);
    return res.rows[0];
  },

  async findByMobile(mobileNumber) {
    const text = 'SELECT * FROM referral_users WHERE referral_otp_number = $1';
    const res = await query(text, [mobileNumber]);
    return res.rows[0];
  },

  async findByReferralCode(code) {
    const text = 'SELECT * FROM referral_users WHERE referral_code = $1';
    const res = await query(text, [code.toUpperCase()]);
    return res.rows[0];
  },

  async getDashboardData(userId) {
    const earningsQuery = `
      SELECT COALESCE(SUM(amount), 0) as total
      FROM referral_transactions
      WHERE referral_user_id = $1 AND type = 'earning' AND status = 'completed'
    `;
    const withdrawalsQuery = `
      SELECT COALESCE(SUM(amount), 0) as total
      FROM referral_transactions
      WHERE referral_user_id = $1 AND type = 'withdrawal' AND status = 'completed'
    `;
    const referralsQuery = `
      SELECT COUNT(*) as total
      FROM referral_transactions
      WHERE referral_user_id = $1 AND type = 'earning' AND source = 'booking'
    `;

    const [earnings, withdrawals, referrals] = await Promise.all([
      query(earningsQuery, [userId]),
      query(withdrawalsQuery, [userId]),
      query(referralsQuery, [userId])
    ]);

    return {
      total_earnings: parseFloat(earnings.rows[0].total),
      total_withdrawals: parseFloat(withdrawals.rows[0].total),
      total_referrals: parseInt(referrals.rows[0].total)
    };
  }
};

module.exports = UserRepository;