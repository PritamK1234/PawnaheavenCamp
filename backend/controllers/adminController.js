const AdminService = require('../services/adminService');
const UserService = require('../services/userService');

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
      const { username, mobile_number, referral_code, referral_type, linked_property_id } = req.body;
      if (!username || !mobile_number || !referral_code || !referral_type) {
        return res.status(400).json({ error: 'All fields are required' });
      }
      if (!['owner', 'b2b'].includes(referral_type)) {
        return res.status(400).json({ error: 'Invalid referral type. Must be owner or b2b' });
      }
      if (referral_type === 'owner' && !linked_property_id) {
        return res.status(400).json({ error: 'Property ID is required for owner referrals' });
      }
      const result = await AdminService.createAdminReferral(username, mobile_number, referral_code, referral_type, linked_property_id);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
};

module.exports = AdminController;