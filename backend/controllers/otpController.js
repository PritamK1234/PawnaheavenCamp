const OtpService = require("../services/otpService");
const ReferralRepository = require("../repositories/referralRepository");
const jwt = require("jsonwebtoken");

const OtpController = {
  async requestOtp(req, res) {
    try {
      const { mobile, purpose } = req.body;

      if (!mobile || !purpose) {
        return res
          .status(400)
          .json({ success: false, message: "Mobile number and purpose are required." });
      }

      const result = await OtpService.sendOtp(mobile, purpose);

      if (!result.success) {
        return res.status(result.status || 400).json({ success: false, message: result.message });
      }

      return res.json({ success: true, message: result.message });
    } catch (error) {
      return res
        .status(500)
        .json({ success: false, message: "Internal server error." });
    }
  },

  async verifyOtp(req, res) {
    try {
      const { mobile, otp, purpose } = req.body;

      if (!mobile || !otp || !purpose) {
        return res
          .status(400)
          .json({ success: false, message: "Mobile, OTP, and purpose are required." });
      }

      const result = await OtpService.verifyOtp(mobile, otp, purpose);

      if (!result.success) {
        return res.status(result.status || 401).json({ success: false, message: result.message });
      }

      if (purpose === "referral_login" || purpose === "referral_register") {
        const raw = mobile.replace(/\s+/g, "").replace(/^\+/, "");
        const cleanMobile = (raw.length === 12 && raw.startsWith("91")) ? raw.slice(2) : raw;
        const user = await ReferralRepository.findByMobile(cleanMobile);

        const payload = {
          mobile: cleanMobile,
          purpose,
          userId: user ? user.id : null,
        };

        const token = jwt.sign(
          payload,
          process.env.JWT_SECRET || "your_fallback_secret",
          { expiresIn: "10m" }
        );

        return res.json({ success: true, token, exists: !!user });
      }

      return res.json({ success: true, message: result.message });
    } catch (error) {
      return res
        .status(500)
        .json({ success: false, message: "Internal server error." });
    }
  },
};

module.exports = OtpController;
