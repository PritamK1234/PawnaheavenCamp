const OtpService = require('../services/otpService');

const OtpController = {
  async requestOtp(req, res) {
    try {
      const { mobile, purpose } = req.body;
      const result = await OtpService.requestOtp(mobile, purpose);
      // For testing: including OTP in response
      const latestOtp = await require('../repositories/otpRepository').getLatestOtp(mobile, purpose);
      res.json({ ...result, debug_otp: latestOtp.otp_code });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  async verifyOtp(req, res) {
    try {
      const { mobile, otp, purpose } = req.body;
      const result = await OtpService.verifyOtp(mobile, otp, purpose);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
};

module.exports = OtpController;