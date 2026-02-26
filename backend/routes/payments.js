const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const authMiddleware = require('../middleware/auth');

router.post('/paytm/initiate', paymentController.initiatePaytmPayment);
router.get('/paytm/redirect/:booking_id', paymentController.paytmRedirect);
router.post('/paytm/callback', paymentController.paytmCallback);
router.post('/paytm/webhook', paymentController.paytmWebhook);
router.get('/verify/:booking_id', paymentController.verifyPaymentStatus);
router.post('/refund/initiate', authMiddleware, paymentController.initiateRefund);
router.get('/refund/requests', authMiddleware, paymentController.getRefundRequests);
router.get('/bookings', authMiddleware, paymentController.getAllBookings);

module.exports = router;
