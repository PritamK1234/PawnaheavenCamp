const AdminService = require('../services/adminService');
const UserService = require('../services/userService');
const { query } = require('../db');

const AdminController = {
  async getAllReferrals(req, res) {
    try {
      const referrals = await AdminService.getAllReferralUsers();
      res.json(referrals);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  async updateReferralStatus(req, res) {
    try {
      const { userId, status } = req.body;
      const updated = await AdminService.updateReferralStatus(userId, status);
      res.json(updated);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  async deleteReferral(req, res) {
    try {
      const { userId } = req.body;
      if (!userId) return res.status(400).json({ error: 'User ID is required' });
      const deleted = await AdminService.deleteReferral(userId);
      res.json({ success: true, data: deleted });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  async loginAsReferralUser(req, res) {
    try {
      const { mobile } = req.body;
      if (!mobile) return res.status(400).json({ error: 'Mobile number is required' });
      const result = await UserService.login(mobile.replace(/\D/g, ''));
      res.json({ success: true, token: result.token });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  async createReferral(req, res) {
    try {
      const { username, referral_otp_number, referral_code, referral_type, linked_property_id, property_id, owner_referral_code } = req.body;
      if (!username || !referral_otp_number || !referral_code || !referral_type) {
        return res.status(400).json({ error: 'All fields are required' });
      }
      if (!['owner', 'b2b', 'owners_b2b'].includes(referral_type)) {
        return res.status(400).json({ error: 'Invalid referral type. Must be owner, b2b, or owners_b2b' });
      }
      if (referral_type === 'owner' && !property_id) {
        return res.status(400).json({ error: 'Property ID is required for owner referrals' });
      }
      let parentReferralId = null;
      let ownerId = null;
      if (referral_type === 'owners_b2b') {
        if (!owner_referral_code) {
          return res.status(400).json({ error: 'Owner referral code is required for owners_b2b type' });
        }
        const ownerRes = await query(
          "SELECT id FROM referral_users WHERE referral_code = $1 AND referral_type = 'owner' AND status = 'active'",
          [owner_referral_code.toUpperCase()]
        );
        if (ownerRes.rows.length === 0) {
          return res.status(400).json({ error: 'Invalid or inactive owner referral code' });
        }
        parentReferralId = ownerRes.rows[0].id;
        ownerId = ownerRes.rows[0].id;
      }
      const result = await AdminService.createAdminReferral(username, referral_otp_number, referral_code, referral_type, linked_property_id, property_id, parentReferralId, ownerId);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  async verifyOwnerCode(req, res) {
    try {
      const { code } = req.body;
      if (!code) return res.status(400).json({ valid: false, error: 'Code is required' });
      const result = await query(
        "SELECT id, username, property_id FROM referral_users WHERE referral_code = $1 AND referral_type = 'owner' AND status = 'active'",
        [code.toUpperCase()]
      );
      if (result.rows.length === 0) {
        return res.json({ valid: false, error: 'Invalid or inactive owner referral code' });
      }
      const owner = result.rows[0];
      return res.json({ valid: true, owner_name: owner.username, owner_id: owner.id, property_id: owner.property_id });
    } catch (error) {
      res.status(400).json({ valid: false, error: error.message });
    }
  },

  async updateOwnerOtpNumber(req, res) {
    try {
      const { property_id, new_otp_number } = req.body;
      if (!property_id || !new_otp_number) {
        return res.status(400).json({ success: false, error: 'Property ID and new OTP number are required' });
      }
      const cleaned = new_otp_number.replace(/\D/g, '');
      if (cleaned.length < 10) {
        return res.status(400).json({ success: false, error: 'OTP number must be at least 10 digits' });
      }

      const propResult = await query('SELECT id, property_id FROM properties WHERE property_id = $1 OR id::text = $1', [property_id]);
      if (propResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Property not found' });
      }
      const prop = propResult.rows[0];

      const dupCheck = await query(
        'SELECT id FROM owners WHERE owner_otp_number = $1 AND property_id != $2',
        [cleaned, prop.property_id]
      );
      if (dupCheck.rows.length > 0) {
        return res.status(400).json({ success: false, error: 'This OTP number is already registered with another property owner' });
      }

      await query('UPDATE properties SET owner_otp_number = $1 WHERE id = $2', [cleaned, prop.id]);
      await query('UPDATE owners SET owner_otp_number = $1 WHERE property_id = $2', [cleaned, prop.property_id]);
      await query(
        'UPDATE referral_users SET referral_otp_number = $1 WHERE linked_property_id = $2 OR property_id = $3',
        [cleaned, prop.id, prop.property_id]
      );

      res.json({ success: true, message: 'OTP number updated across all records' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async lookupOwnerByPropertyId(req, res) {
    try {
      const { propertyId } = req.params;
      if (!propertyId) {
        return res.status(400).json({ success: false, error: 'Property ID is required' });
      }
      const propResult = await query('SELECT id, property_id, title, owner_name FROM properties WHERE property_id = $1 OR id::text = $1', [propertyId]);
      if (propResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Property not found' });
      }
      const property = propResult.rows[0];
      const ownerResult = await query(
        'SELECT owner_otp_number, owner_name FROM owners WHERE property_id = $1 OR property_id = $2',
        [propertyId, property.property_id]
      );
      const owner = ownerResult.rows[0] || null;
      res.json({
        success: true,
        data: {
          property_db_id: property.id,
          property_id: property.property_id,
          title: property.title,
          owner_name: owner?.owner_name || property.owner_name || '',
          owner_otp_number: owner?.owner_otp_number || ''
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

module.exports = AdminController;