const WithdrawalService = require('../services/withdrawalService');

const WithdrawalController = {
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