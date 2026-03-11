const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const authMiddleware = require('../middleware/auth');
const { pool } = require('../db');

router.post('/paytm/initiate', paymentController.initiatePaytmPayment);
router.get('/paytm/redirect/:booking_id', paymentController.paytmRedirect);
router.post('/paytm/callback', paymentController.paytmCallback);
router.post('/paytm/webhook', paymentController.paytmWebhook);
router.get('/verify/:booking_id', paymentController.verifyPaymentStatus);
router.post('/verify/:booking_id', paymentController.verifyPaymentStatus);
router.post('/refund/initiate', authMiddleware, paymentController.initiateRefund);
router.post('/refund/deny', authMiddleware, paymentController.denyRefund);
router.get('/refund/requests', authMiddleware, paymentController.getRefundRequests);
router.post('/refund/webhook', paymentController.refundWebhook);
router.get('/requests/history', authMiddleware, paymentController.getRequestHistory);
router.get('/withdrawal/requests', authMiddleware, paymentController.getWithdrawalRequests);
router.post('/withdrawal/process', authMiddleware, paymentController.processWithdrawal);
router.post('/withdrawal/reject', authMiddleware, paymentController.rejectWithdrawal);
router.post('/withdrawal/webhook', paymentController.payoutWebhook);
router.get('/refund/status/:booking_id', authMiddleware, paymentController.checkRefundStatus);
router.get('/withdrawal/status/:id', authMiddleware, paymentController.checkWithdrawalStatus);
router.get('/bookings', authMiddleware, paymentController.getAllBookings);
router.get('/transactions', authMiddleware, paymentController.getAllTransactions);
router.post('/commissions/distribute', authMiddleware, paymentController.triggerCommissions);

router.get('/revenue-summary', authMiddleware, async (req, res) => {
  try {
    const month = parseInt(req.query.month, 10);
    const year = parseInt(req.query.year, 10);

    if (!month || !year || month < 1 || month > 12 || year < 2000 || year > 2100) {
      return res.status(400).json({ success: false, message: 'Valid month (1-12) and year are required' });
    }

    const grossResult = await pool.query(
      `SELECT COALESCE(SUM(advance_amount), 0) AS total
       FROM bookings
       WHERE payment_status = 'SUCCESS'
         AND EXTRACT(MONTH FROM created_at) = $1
         AND EXTRACT(YEAR FROM created_at) = $2`,
      [month, year]
    );

    const refundResult = await pool.query(
      `SELECT COALESCE(SUM(refund_amount), 0) AS total
       FROM bookings
       WHERE payment_status = 'SUCCESS'
         AND refund_status IS NOT NULL
         AND refund_status <> 'REFUND_SUCCESSFUL'
         AND EXTRACT(MONTH FROM created_at) = $1
         AND EXTRACT(YEAR FROM created_at) = $2`,
      [month, year]
    );

    const referralResult = await pool.query(
      `SELECT COALESCE(SUM(referrer_commission), 0) AS total
       FROM bookings
       WHERE payment_status = 'SUCCESS'
         AND commission_paid = false
         AND referrer_commission IS NOT NULL
         AND referrer_commission > 0
         AND EXTRACT(MONTH FROM created_at) = $1
         AND EXTRACT(YEAR FROM created_at) = $2`,
      [month, year]
    );

    const grossRevenue = Math.round(parseFloat(grossResult.rows[0].total));
    const refundPayable = Math.round(parseFloat(refundResult.rows[0].total));
    const referralPayable = Math.round(parseFloat(referralResult.rows[0].total));

    return res.json({
      success: true,
      month,
      year,
      grossRevenue,
      refundPayable,
      referralPayable,
    });
  } catch (err) {
    console.error('[Revenue Summary] Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to compute revenue summary' });
  }
});

module.exports = router;
