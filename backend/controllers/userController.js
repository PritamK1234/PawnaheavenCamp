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