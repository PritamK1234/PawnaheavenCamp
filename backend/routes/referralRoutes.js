const express = require('express');
const router = express.Router();
const OtpController = require('../controllers/otpController');
const ReferralController = require('../controllers/referralController');
const UserController = require('../controllers/userController');
const WithdrawalController = require('../controllers/withdrawalController');
const authenticateReferralUser = require('../middleware/referralAuth');

// Public endpoints
router.get('/top-earners', ReferralController.getTopEarners);

// OTP endpoints
router.post('/request-otp', OtpController.requestOtp);
router.post('/verify-otp', OtpController.verifyOtp);

// User endpoints (OTP Protected)
router.post('/register', authenticateReferralUser, UserController.register);
router.post('/login', authenticateReferralUser, UserController.login);

// Authenticated User endpoints
router.get('/dashboard', authenticateReferralUser, UserController.getDashboard);
router.post('/withdraw', authenticateReferralUser, WithdrawalController.withdraw);

module.exports = router;