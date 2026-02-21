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
      const { username, referral_otp_number, referral_code, referral_type, linked_property_id, property_id } = req.body;
      if (!username || !referral_otp_number || !referral_code || !referral_type) {
        return res.status(400).json({ error: 'All fields are required' });
      }
      if (!['owner', 'b2b'].includes(referral_type)) {
        return res.status(400).json({ error: 'Invalid referral type. Must be owner or b2b' });
      }
      if (referral_type === 'owner' && !property_id) {
        return res.status(400).json({ error: 'Property ID is required for owner referrals' });
      }
      const result = await AdminService.createAdminReferral(username, referral_otp_number, referral_code, referral_type, linked_property_id, property_id);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(400).json({ error: error.message });
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