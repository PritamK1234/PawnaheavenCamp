const UserService = require('../services/userService');

const UserController = {
  async register(req, res) {
    try {
      // req.user is set by referralAuth middleware from the OTP verification token
      const { mobile, purpose } = req.user;
      
      if (purpose !== 'register' && purpose !== 'referral_register') {
        return res.status(400).json({ error: 'Invalid token for registration' });
      }

      const { username, referralCode } = req.body;
      if (!username) return res.status(400).json({ error: 'Username is required' });
      if (!referralCode) return res.status(400).json({ error: 'Referral code is required' });

      const user = await UserService.register(username, mobile, referralCode);
      res.json(user);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  async login(req, res) {
    try {
      const { mobile, purpose } = req.user;
      
      if (purpose !== 'login' && purpose !== 'referral_login') {
        return res.status(400).json({ error: 'Invalid token for login' });
      }

      const result = await UserService.login(mobile);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  async ownerSelfLogin(req, res) {
    try {
      const { mobile, propertyId } = req.body;
      if (!propertyId) return res.status(400).json({ error: 'Property ID is required' });

      const { query: dbQuery } = require('../db');
      const propResult = await dbQuery(
        'SELECT id, property_id FROM properties WHERE property_id = $1 OR id::text = $1',
        [propertyId]
      );
      if (propResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Property not found' });
      }
      const prop = propResult.rows[0];

      const refResult = await dbQuery(
        "SELECT id, referral_otp_number FROM referral_users WHERE (property_id = $1 OR linked_property_id = $2) AND referral_type = 'owner'",
        [prop.property_id, prop.id]
      );
      if (refResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'No owner referral found for this property' });
      }
      const refUser = refResult.rows[0];
      const loginMobile = refUser.referral_otp_number;
      if (!loginMobile) {
        return res.status(400).json({ success: false, error: 'Referral user has no OTP number' });
      }
      const result = await UserService.login(loginMobile);
      res.json({ success: true, token: result.token });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  async getDashboard(req, res) {
    try {
      const result = await UserService.getDashboard(req.user.id);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
};

module.exports = UserController;