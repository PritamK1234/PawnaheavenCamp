const OtpRepository = require('../repositories/otpRepository');
const ReferralRepository = require('../repositories/referralRepository');
const jwt = require('jsonwebtoken');

const OtpService = {
  async requestOtp(mobile, purpose) {
    if (!['register', 'login'].includes(purpose)) {
      throw new Error('Invalid purpose');
    }

    // Check if user is blocked
    const user = await ReferralRepository.findByMobile(mobile);
    if (user && user.status === 'blocked') {
      throw new Error('Account is blocked');
    }

    // Rate limit: 4 OTPs per mobile per purpose per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const count = await OtpRepository.getOtpCount(mobile, purpose, oneHourAgo);
    
    if (count >= 4) {
      throw new Error('OTP limit reached. Try again later.');
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

    await OtpRepository.createOtp(mobile, otp, purpose, expiresAt);
    
    // In production, send SMS here
    console.log(`OTP for ${mobile} (${purpose}): ${otp}`);
    
    return { success: true, message: 'OTP sent successfully' };
  },

  async verifyOtp(mobile, otp, purpose) {
    const record = await OtpRepository.getLatestOtp(mobile, purpose);

    if (!record || record.otp_code !== otp) {
      if (record) await OtpRepository.incrementAttempts(record.id);
      throw new Error('Invalid OTP');
    }

    if (new Date() > record.expires_at) {
      throw new Error('OTP expired');
    }

    if (record.attempts >= 5) {
      throw new Error('Too many attempts. Request a new OTP.');
    }

    const user = await ReferralRepository.findByMobile(mobile);
    
    // Invalidate OTP only after all checks pass
    await OtpRepository.deleteOtp(record.id);

    const payload = { 
      mobile, 
      purpose, 
      userId: user ? user.id : null 
    };
    
    const token = jwt.sign(payload, process.env.JWT_SECRET || 'your_fallback_secret', { expiresIn: '10m' });

    return { token, exists: !!user };
  }
};

module.exports = OtpService;