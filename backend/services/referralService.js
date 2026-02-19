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
    const { query } = require('../db');
    const userResult = await query(
      'SELECT id, username, referral_code, status, referral_type, linked_property_id, linked_property_slug FROM referral_users WHERE id = $1',
      [userId]
    );
    const user = userResult.rows[0];
    if (!user) {
      throw new Error("User not found");
    }

    if (user.status === "blocked") {
      throw new Error("Account is blocked");
    }

    const referralCode = user.referral_code.toUpperCase();
    const domain = process.env.REPLIT_DOMAINS?.split(",")[0] || process.env.REPLIT_DEV_DOMAIN || "pawnahavencamp.com";
    const referralType = user.referral_type || 'public';
    
    let referralLink;
    if (referralType === 'owner' && user.linked_property_slug) {
      referralLink = `https://${domain}/property/${user.linked_property_slug}?ref=${referralCode}`;
    } else {
      referralLink = `https://${domain}/?ref=${referralCode}`;
    }

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
      referralType,
      linkedPropertySlug: user.linked_property_slug || null,
    };
  },
};

module.exports = ReferralService;
