const ReferralService = require('../services/referralService');
const { query } = require('../db');

const ReferralController = {
  async getTopEarners(req, res) {
    try {
      const { period } = req.query;
      const earners = await ReferralService.getTopEarners(period);
      res.json(earners);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  async validateCode(req, res) {
    try {
      const { code } = req.params;
      if (!code) return res.status(400).json({ valid: false, error: 'Code is required' });
      const result = await query(
        "SELECT id, username, referral_code, referral_type, linked_property_id, linked_property_slug FROM referral_users WHERE referral_code = $1 AND status = 'active'",
        [code.toUpperCase()]
      );
      if (result.rows.length > 0) {
        const user = result.rows[0];
        return res.json({ 
          valid: true, 
          referrer: user.username,
          referral_type: user.referral_type || 'public',
          linked_property_id: user.linked_property_id || null,
          linked_property_slug: user.linked_property_slug || null
        });
      }
      return res.json({ valid: false });
    } catch (error) {
      res.status(400).json({ valid: false, error: error.message });
    }
  },

  async getStats(req, res) {
    try {
      const stats = await ReferralService.getUserStats(req.user.id);
      res.json(stats);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  async getTransactions(req, res) {
    try {
      const transactions = await ReferralService.getUserTransactions(req.user.id);
      res.json(transactions);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  async getShareInfo(req, res) {
    try {
      const shareInfo = await ReferralService.getShareInfo(req.user.id);
      res.json(shareInfo);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  async ownerLookup(req, res) {
    try {
      const { mobile } = req.params;
      if (!mobile) return res.status(400).json({ error: 'Mobile number is required' });
      const result = await query(
        "SELECT id, username, referral_code, referral_type, linked_property_id, linked_property_slug, status FROM referral_users WHERE referral_otp_number = $1 AND referral_type = 'owner'",
        [mobile]
      );
      if (result.rows.length > 0) {
        return res.json({ found: true, data: result.rows[0] });
      }
      return res.json({ found: false });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  async getOwnerB2BList(req, res) {
    try {
      const { mobile } = req.query;
      if (!mobile) return res.status(400).json({ found: false, error: 'Mobile is required' });
      const ownerRes = await query(
        "SELECT id FROM referral_users WHERE referral_otp_number = $1 AND referral_type = 'owner'",
        [mobile]
      );
      if (ownerRes.rows.length === 0) {
        return res.json({ found: true, list: [] });
      }
      const ownerId = ownerRes.rows[0].id;
      const b2bRes = await query(
        "SELECT id, username, referral_otp_number, referral_code, referral_url FROM referral_users WHERE parent_referral_id = $1 AND visible_to_owner = true AND referral_type = 'owners_b2b' ORDER BY created_at DESC",
        [ownerId]
      );
      return res.json({ found: true, list: b2bRes.rows });
    } catch (error) {
      res.status(400).json({ found: false, error: error.message });
    }
  },

  async hideOwnerB2B(req, res) {
    try {
      const { id, ownerMobile } = req.body;
      if (!id || !ownerMobile) return res.status(400).json({ success: false, error: 'id and ownerMobile are required' });
      const ownerRes = await query(
        "SELECT id FROM referral_users WHERE referral_otp_number = $1 AND referral_type = 'owner'",
        [ownerMobile]
      );
      if (ownerRes.rows.length === 0) {
        return res.status(403).json({ success: false, error: 'Owner not found' });
      }
      const ownerId = ownerRes.rows[0].id;
      const check = await query(
        "SELECT id FROM referral_users WHERE id = $1 AND parent_referral_id = $2 AND referral_type = 'owners_b2b'",
        [id, ownerId]
      );
      if (check.rows.length === 0) {
        return res.status(403).json({ success: false, error: 'Not authorized to hide this record' });
      }
      await query('UPDATE referral_users SET visible_to_owner = false WHERE id = $1', [id]);
      return res.json({ success: true });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  },

  async ownerLookupByProperty(req, res) {
    try {
      const { propertyId } = req.params;
      if (!propertyId) return res.status(400).json({ error: 'Property ID is required' });
      const propResult = await query(
        'SELECT id, property_id FROM properties WHERE property_id = $1 OR id::text = $1',
        [propertyId]
      );
      if (propResult.rows.length === 0) {
        return res.json({ found: false });
      }
      const prop = propResult.rows[0];
      const result = await query(
        "SELECT id, username, referral_code, referral_otp_number, referral_type, linked_property_id, linked_property_slug, status FROM referral_users WHERE (property_id = $1 OR linked_property_id = $2) AND referral_type = 'owner'",
        [prop.property_id, prop.id]
      );
      if (result.rows.length > 0) {
        return res.json({ found: true, data: result.rows[0] });
      }
      return res.json({ found: false });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
};

module.exports = ReferralController;