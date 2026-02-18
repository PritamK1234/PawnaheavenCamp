const ReferralRepository = require("../repositories/referralRepository");
const QRCode = require("qrcode");

const ReferralService = {
  async getTopEarners(period) {
    if (!["month", "all"].includes(period)) {
      period = "all";
    }
    return ReferralRepository.getTopEarners(period);
  },

  async getShareInfo(userId) {
    const user = await ReferralRepository.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    if (user.status === "blocked") {
      throw new Error("Account is blocked");
    }

    const referralCode = user.referral_code.toUpperCase();
    const domain = process.env.REPLIT_DEV_DOMAIN || "pawnahavencamp.com";
    const referralLink = `https://${domain}/?ref=${referralCode}`;

    // Generate QR code as data URI
    const referralQrCode = await QRCode.toDataURL(referralLink, {
      width: 400,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    });

    return {
      referralCode,
      referralLink,
      referralQrCode,
    };
  },
};

module.exports = ReferralService;
