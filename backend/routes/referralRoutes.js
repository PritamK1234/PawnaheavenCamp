const express = require('express');
const router = express.Router();
const OtpController = require('../controllers/otpController');
const ReferralController = require('../controllers/referralController');
const UserController = require('../controllers/userController');
const WithdrawalController = require('../controllers/withdrawalController');
const AdminController = require('../controllers/adminController');
const authenticateReferralUser = require('../middleware/referralAuth');
const authMiddleware = require('../middleware/auth');

// Public endpoints
router.get('/top-earners', ReferralController.getTopEarners);
router.get('/validate/:code', ReferralController.validateCode);

// OTP endpoints
router.post('/request-otp', OtpController.requestOtp);
router.post('/verify-otp', OtpController.verifyOtp);

// User endpoints (OTP Protected)
router.post('/register', authenticateReferralUser, UserController.register);
router.post('/login', authenticateReferralUser, UserController.login);

// Authenticated User endpoints
router.get('/dashboard', authenticateReferralUser, UserController.getDashboard);
router.get('/share', authenticateReferralUser, ReferralController.getShareInfo);
router.post('/withdraw', authenticateReferralUser, WithdrawalController.withdraw);

// Admin endpoints (Session Protected)
router.get('/admin/all', authMiddleware, AdminController.getAllReferrals);
router.post('/admin/update-status', authMiddleware, AdminController.updateReferralStatus);

module.exports = router;