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
        u.property_id,
        u.parent_referral_id,
        u.owner_id,
        u.visible_to_owner,
        u.created_at,
        owner_ru.username AS parent_owner_name,
        COALESCE(SUM(CASE WHEN t.type = 'earning' AND t.status = 'completed' THEN t.amount ELSE 0 END), 0) - 
        COALESCE(SUM(CASE WHEN t.type = 'withdrawal' AND t.status = 'completed' THEN t.amount ELSE 0 END), 0) as balance,
        (SELECT COUNT(*) FROM referral_transactions WHERE referral_user_id = u.id AND type = 'earning' AND source = 'booking') as total_referrals
      FROM referral_users u
      LEFT JOIN referral_users owner_ru ON owner_ru.id = u.parent_referral_id
      LEFT JOIN referral_transactions t ON u.id = t.referral_user_id
      WHERE u.status NOT IN ('deleted', 'owner_deleted')
      GROUP BY u.id, owner_ru.username
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
    const res = await query("UPDATE referral_users SET status = 'deleted' WHERE id = $1 RETURNING *", [userId]);
    if (res.rows.length === 0) throw new Error('Referral user not found');
    return res.rows[0];
  },

  async hardDeleteContact(userId) {
    await query('DELETE FROM referral_transactions WHERE referral_user_id = $1', [userId]);
    const res = await query('DELETE FROM referral_users WHERE id = $1 RETURNING *', [userId]);
    if (res.rows.length === 0) throw new Error('Contact not found');
    return res.rows[0];
  },

  async getAllContacts() {
    const text = `
      SELECT 
        u.id, 
        u.username, 
        u.referral_otp_number, 
        u.referral_code, 
        u.status, 
        u.referral_type,
        u.visible_to_owner,
        u.created_at,
        owner_ru.username AS parent_owner_name
      FROM referral_users u
      LEFT JOIN referral_users owner_ru ON owner_ru.id = u.parent_referral_id
      ORDER BY u.created_at DESC
    `;
    const res = await query(text);
    return res.rows;
  },

  async createAdminReferral(username, mobileNumber, referralCode, referralType, linkedPropertyId, propertyId, parentReferralId, ownerId) {
    const code = referralCode.toUpperCase();
    const domain = process.env.REPLIT_DOMAINS?.split(",")[0] || process.env.REPLIT_DEV_DOMAIN || "pawnahavencamp.com";
    
    const existingCode = await query('SELECT id FROM referral_users WHERE referral_code = $1', [code]);
    if (existingCode.rows.length > 0) throw new Error('Referral code already exists');

    const existingMobile = await query("SELECT id FROM referral_users WHERE referral_otp_number = $1 AND status NOT IN ('deleted', 'owner_deleted')", [mobileNumber]);
    if (existingMobile.rows.length > 0) throw new Error('Mobile number already registered');

    let referralUrl = `https://${domain}/?ref=${code}`;
    let linkedSlug = null;
    let resolvedLinkedPropertyId = linkedPropertyId || null;

    if (referralType === 'owner' && propertyId) {
      const propResult = await query('SELECT id, slug, title FROM properties WHERE property_id = $1', [propertyId]);
      if (propResult.rows.length === 0) throw new Error('Property not found');
      linkedSlug = propResult.rows[0].slug;
      resolvedLinkedPropertyId = propResult.rows[0].id;
      referralUrl = `https://${domain}/property/${linkedSlug}?ref=${code}`;
    } else if (referralType === 'owners_b2b' && parentReferralId) {
      const parentRes = await query('SELECT linked_property_slug FROM referral_users WHERE id = $1', [parentReferralId]);
      const parentSlug = parentRes.rows[0]?.linked_property_slug;
      if (parentSlug) {
        linkedSlug = parentSlug;
        referralUrl = `https://${domain}/property/${parentSlug}?ref=${code}`;
      }
    }

    const text = `
      INSERT INTO referral_users (username, referral_otp_number, referral_code, referral_url, status, balance, referral_type, linked_property_id, linked_property_slug, property_id, parent_referral_id, owner_id)
      VALUES ($1, $2, $3, $4, 'active', 0, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    const res = await query(text, [username.toLowerCase(), mobileNumber, code, referralUrl, referralType, resolvedLinkedPropertyId, linkedSlug, propertyId || null, parentReferralId || null, ownerId || null]);
    return res.rows[0];
  }
};

module.exports = AdminService;