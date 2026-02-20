const UserService = require('../services/userService');

const UserController = {
  async register(req, res) {
    try {
      // req.user is set by referralAuth middleware from the OTP verification token
      const { mobile, purpose } = req.user;
      
      if (purpose !== 'register') {
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
      
      if (purpose !== 'login') {
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
      if (!mobile || !propertyId) return res.status(400).json({ error: 'Mobile and property ID are required' });
      const cleanMobile = mobile.replace(/\D/g, '');
      const UserRepository = require('../repositories/userRepository');
      const user = await UserRepository.findByMobile(cleanMobile);
      if (!user) return res.status(404).json({ success: false, error: 'No referral found for this mobile' });
      if (user.referral_type !== 'owner') return res.status(403).json({ success: false, error: 'Not an owner referral' });
      if (String(user.linked_property_id) !== String(propertyId)) return res.status(403).json({ success: false, error: 'Property mismatch' });
      const result = await UserService.login(cleanMobile);
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