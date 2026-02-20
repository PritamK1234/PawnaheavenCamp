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

// Owner dashboard - lookup referral by mobile
router.get('/owner-lookup/:mobile', ReferralController.ownerLookup);

// Owner self-login (no admin auth needed, generates token for own mobile)
router.post('/owner-login', UserController.ownerSelfLogin);

// Admin endpoints (Session Protected)
router.get('/admin/all', authMiddleware, AdminController.getAllReferrals);
router.post('/admin/update-status', authMiddleware, AdminController.updateReferralStatus);
router.post('/admin/create', authMiddleware, AdminController.createReferral);
router.post('/admin/delete', authMiddleware, AdminController.deleteReferral);
router.post('/admin/login-as', authMiddleware, AdminController.loginAsReferralUser);

module.exports = router;