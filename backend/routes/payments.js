const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

router.post('/paytm/initiate', paymentController.initiatePaytmPayment);
router.get('/paytm/redirect/:booking_id', paymentController.paytmRedirect);
router.post('/paytm/callback', paymentController.paytmCallback);

module.exports = router;
