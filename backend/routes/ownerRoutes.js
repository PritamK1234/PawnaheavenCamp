const express = require('express');
const router = express.Router();
const ownerController = require('../controllers/ownerController');

router.post('/register', ownerController.registerOwner);
router.post('/send-otp', ownerController.sendOTP);
router.post('/verify-otp', ownerController.verifyOTP);

module.exports = router;
