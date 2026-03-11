const WithdrawalService = require('../services/withdrawalService');
const { validateUpiVpa } = require('../services/razorpayService');
const { query } = require('../db');

const WithdrawalController = {
  async validateUpi(req, res) {
    try {
      const { upi } = req.body;
      if (!upi) return res.status(400).json({ error: 'UPI ID is required' });
      const result = await validateUpiVpa(upi);
      return res.json(result);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  },

  async removeSavedUpi(req, res) {
    try {
      await query(
        'UPDATE referral_users SET saved_upi_id = NULL WHERE id = $1',
        [req.user.id]
      );
      return res.json({ success: true, message: 'Saved UPI removed' });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  },

  async withdraw(req, res) {
    try {
      const { amount, upi } = req.body;
      if (!amount || !upi) {
        return res.status(400).json({ error: 'Amount and UPI ID are required' });
      }

      const result = await WithdrawalService.requestWithdrawal(req.user.id, parseFloat(amount), upi);
      res.json({
        success: true,
        message: result.message || 'Withdrawal initiated successfully',
        status: result.status,
        payout_id: result.payout_id || null,
        transaction: result
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
};

module.exports = WithdrawalController;