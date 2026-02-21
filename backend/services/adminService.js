const ReferralRepository = require('../repositories/referralRepository');
const { query } = require('../db');

const AdminService = {
  async getAllReferralUsers() {
    const text = `
      SELECT 
        u.id, 
        u.username, 
        u.referral_otp_number, 
        u.referral_code, 
        u.status, 
        u.referral_type,
        u.linked_property_id,
        u.linked_property_slug,
        u.created_at,
        COALESCE(SUM(CASE WHEN t.type = 'earning' AND t.status = 'completed' THEN t.amount ELSE 0 END), 0) - 
        COALESCE(SUM(CASE WHEN t.type = 'withdrawal' AND t.status = 'completed' THEN t.amount ELSE 0 END), 0) as balance,
        (SELECT COUNT(*) FROM referral_transactions WHERE referral_user_id = u.id AND type = 'earning' AND source = 'booking') as total_referrals
      FROM referral_users u
      LEFT JOIN referral_transactions t ON u.id = t.referral_user_id
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `;
    const res = await query(text);
    return res.rows.map(r => ({ ...r, type: r.referral_type || 'public' }));
  },

  async updateReferralStatus(userId, status) {
    const text = 'UPDATE referral_users SET status = $1 WHERE id = $2 RETURNING *';
    const res = await query(text, [status, userId]);
    return res.rows[0];
  },

  async deleteReferral(userId) {
    await query('DELETE FROM referral_transactions WHERE referral_user_id = $1', [userId]);
    const res = await query('DELETE FROM referral_users WHERE id = $1 RETURNING *', [userId]);
    if (res.rows.length === 0) throw new Error('Referral user not found');
    return res.rows[0];
  },

  async createAdminReferral(username, mobileNumber, referralCode, referralType, linkedPropertyId) {
    const code = referralCode.toUpperCase();
    const domain = process.env.REPLIT_DOMAINS?.split(",")[0] || process.env.REPLIT_DEV_DOMAIN || "pawnahavencamp.com";
    
    const existingCode = await query('SELECT id FROM referral_users WHERE referral_code = $1', [code]);
    if (existingCode.rows.length > 0) throw new Error('Referral code already exists');

    const existingMobile = await query('SELECT id FROM referral_users WHERE referral_otp_number = $1', [mobileNumber]);
    if (existingMobile.rows.length > 0) throw new Error('Mobile number already registered');

    let referralUrl = `https://${domain}/?ref=${code}`;
    let linkedSlug = null;

    if (referralType === 'owner' && linkedPropertyId) {
      const propResult = await query('SELECT slug, title FROM properties WHERE id = $1', [linkedPropertyId]);
      if (propResult.rows.length === 0) throw new Error('Property not found');
      linkedSlug = propResult.rows[0].slug;
      referralUrl = `https://${domain}/property/${linkedSlug}?ref=${code}`;
    }

    const text = `
      INSERT INTO referral_users (username, referral_otp_number, referral_code, referral_url, status, balance, referral_type, linked_property_id, linked_property_slug)
      VALUES ($1, $2, $3, $4, 'active', 0, $5, $6, $7)
      RETURNING *
    `;
    const res = await query(text, [username.toLowerCase(), mobileNumber, code, referralUrl, referralType, linkedPropertyId || null, linkedSlug]);
    return res.rows[0];
  }
};

module.exports = AdminService;