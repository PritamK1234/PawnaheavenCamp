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
        "SELECT id, username, referral_code FROM referral_users WHERE referral_code = $1 AND status = 'active'",
        [code.toUpperCase()]
      );
      if (result.rows.length > 0) {
        return res.json({ valid: true, referrer: result.rows[0].username });
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
  }
};

module.exports = ReferralController;