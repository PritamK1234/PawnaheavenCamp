const axios = require("axios");
const OtpRepository = require("../repositories/otpRepository");
const ReferralRepository = require("../repositories/referralRepository");
const { pool } = require("../db");

const MSG91_BASE_URL = "https://control.msg91.com/api/v5/otp";
const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY;
const IS_TEST_MODE = process.env.OTP_TEST_MODE === "true";
const TEST_OTP = "123456";
const RATE_LIMIT_PER_HOUR = 4;

function validateMobile(mobile) {
  if (!mobile || typeof mobile !== "string") return null;
  const cleaned = mobile.replace(/\s+/g, "").replace(/^(\+91|91)/, "");
  if (!/^\d{10}$/.test(cleaned)) return null;
  return cleaned;
}

function formatMobileForMsg91(mobile) {
  return `91${mobile}`;
}

const OtpService = {
  async sendOtp(mobile, purpose) {
    const cleanMobile = validateMobile(mobile);
    if (!cleanMobile) {
      return { success: false, status: 400, message: "Invalid mobile number. Please enter a valid 10-digit Indian mobile number." };
    }

    if (!["owner_login", "referral_login"].includes(purpose)) {
      return { success: false, status: 400, message: "Invalid login type." };
    }

    if (purpose === "owner_login") {
      const ownerCheck = await pool.query(
        "SELECT id FROM owners WHERE owner_otp_number = $1",
        [cleanMobile]
      );
      if (ownerCheck.rows.length === 0) {
        return { success: false, status: 404, message: "This number is not registered to any property." };
      }
    } else if (purpose === "referral_login") {
      const user = await ReferralRepository.findByMobile(cleanMobile);
      if (!user) {
        return { success: false, status: 404, message: "This number is not registered as a referral user." };
      }
      if (user.status === "blocked") {
        return { success: false, status: 403, message: "Account is blocked." };
      }
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const count = await OtpRepository.getOtpCount(cleanMobile, purpose, oneHourAgo);
    if (count >= RATE_LIMIT_PER_HOUR) {
      return { success: false, status: 429, message: "OTP limit reached. Please try again after some time." };
    }

    await OtpRepository.createOtp(cleanMobile, "MSG91", purpose, new Date(Date.now() + 5 * 60 * 1000));

    if (IS_TEST_MODE) {
      return { success: true, message: "OTP sent successfully.", testMode: true };
    }

    try {
      const response = await axios.post(
        `${MSG91_BASE_URL}?mobile=${formatMobileForMsg91(cleanMobile)}&authkey=${MSG91_AUTH_KEY}`,
        {},
        { headers: { "Content-Type": "application/json" } }
      );

      if (response.data && response.data.type === "success") {
        return { success: true, message: "OTP sent successfully." };
      }

      return { success: false, status: 500, message: "Failed to send OTP. Please try again." };
    } catch (err) {
      const msg91Error = err.response?.data?.message || "SMS service error";
      return { success: false, status: 500, message: `Failed to send OTP: ${msg91Error}` };
    }
  },

  async verifyOtp(mobile, otp, purpose) {
    const cleanMobile = validateMobile(mobile);
    if (!cleanMobile) {
      return { success: false, status: 400, message: "Invalid mobile number." };
    }

    if (!otp || typeof otp !== "string" || otp.length < 4 || otp.length > 6) {
      return { success: false, status: 400, message: "Invalid OTP format." };
    }

    if (!["owner_login", "referral_login"].includes(purpose)) {
      return { success: false, status: 400, message: "Invalid login type." };
    }

    if (IS_TEST_MODE && otp === TEST_OTP) {
      return { success: true, message: "OTP verified successfully." };
    }

    if (IS_TEST_MODE && otp !== TEST_OTP) {
      return { success: false, status: 401, message: "Invalid OTP." };
    }

    try {
      const response = await axios.get(
        `${MSG91_BASE_URL}/verify?mobile=${formatMobileForMsg91(cleanMobile)}&otp=${otp}&authkey=${MSG91_AUTH_KEY}`
      );

      if (response.data && response.data.type === "success") {
        return { success: true, message: "OTP verified successfully." };
      }

      return { success: false, status: 401, message: "Invalid OTP." };
    } catch (err) {
      const msg91Error = err.response?.data?.message || "Verification failed";
      if (msg91Error.toLowerCase().includes("otp expired")) {
        return { success: false, status: 401, message: "OTP has expired. Please request a new one." };
      }
      return { success: false, status: 401, message: "Invalid OTP." };
    }
  },
};

module.exports = OtpService;
