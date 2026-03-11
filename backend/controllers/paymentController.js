const crypto = require("crypto");
const axios = require("axios");
const { query } = require("../db");
const PaytmChecksum = require("paytmchecksum");
const { WhatsAppService } = require("../utils/whatsappService");
const { distributeCheckoutCommissions } = require("../services/commissionService");
const { triggerRazorpayXPayout, getPayoutStatus, verifyRazorpayWebhookSignature } = require("../services/razorpayService");

function getPublicDomain(req) {
  const rawDomain =
    process.env.REPLIT_DOMAINS || process.env.REPLIT_DEV_DOMAIN || "";
  return (
    (rawDomain.includes(",") ? rawDomain.split(",")[0] : rawDomain) ||
    req.get("x-forwarded-host") ||
    req.get("host")
  );
}

function generatePaytmOrderId() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `PAYTM_${timestamp}_${random}`;
}

function generateActionToken() {
  return crypto.randomBytes(32).toString("hex");
}

function getPaytmBaseUrl() {
  const gatewayUrl = process.env.PAYTM_GATEWAY_URL || "";
  if (
    gatewayUrl.includes("securegw.paytm.in") &&
    !gatewayUrl.includes("securegw-stage")
  ) {
    return "https://securegw.paytm.in";
  }
  return "https://securestage.paytmpayments.com";
}

const initiatePaytmPayment = async (req, res) => {
  try {
    const { booking_id, channel_id } = req.body;

    if (!booking_id) {
      return res.status(400).json({ error: "Booking ID is required" });
    }

    const result = await query("SELECT * FROM bookings WHERE booking_id = $1", [
      booking_id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Booking not found" });
    }

    const booking = result.rows[0];

    if (booking.payment_status === "SUCCESS") {
      return res
        .status(400)
        .json({ error: "Payment already completed for this booking" });
    }

    const paytmOrderId = generatePaytmOrderId();
    const mid = process.env.PAYTM_MID;
    const website = process.env.PAYTM_WEBSITE;
    const merchantKey = process.env.PAYTM_MERCHANT_KEY;
    const publicDomain = getPublicDomain(req);
    const callbackUrl = `https://${publicDomain}/api/payments/paytm/callback`;
    const paytmBaseUrl = getPaytmBaseUrl();
    const amount = parseFloat(booking.advance_amount).toFixed(2);

    if (!mid || !website || !merchantKey) {
      console.error("Missing Paytm configuration");
      return res.status(500).json({ error: "Payment gateway not configured" });
    }

    const channelId = process.env.PAYTM_CHANNEL_ID || "WEB";

    const paytmBody = {
      requestType: "Payment",
      mid: mid,
      websiteName: website,
      orderId: paytmOrderId,
      callbackUrl: callbackUrl,
      txnAmount: {
        value: amount,
        currency: "INR",
      },
      userInfo: {
        custId: String(booking.guest_phone || "GUEST"),
      },
      channelId: channelId,
    };

    const checksum = await PaytmChecksum.generateSignature(
      JSON.stringify(paytmBody),
      merchantKey,
    );

    const paytmRequest = {
      body: paytmBody,
      head: {
        signature: checksum,
      },
    };

    console.log("Initiating Paytm transaction:", {
      mid,
      website,
      channelId,
      orderId: paytmOrderId,
      amount,
      callbackUrl,
      paytmBaseUrl,
    });

    const paytmResponse = await axios.post(
      `${paytmBaseUrl}/theia/api/v1/initiateTransaction?mid=${mid}&orderId=${paytmOrderId}`,
      paytmRequest,
      { headers: { "Content-Type": "application/json" } },
    );

    console.log(
      "Paytm initiateTransaction response:",
      JSON.stringify(paytmResponse.data),
    );

    const responseBody = paytmResponse.data.body;

    if (!responseBody || !responseBody.txnToken) {
      console.error("Failed to get txnToken from Paytm:", paytmResponse.data);
      return res.status(500).json({
        error: "Failed to initiate payment with gateway",
        details:
          responseBody?.resultInfo?.resultMsg ||
          "No transaction token received",
      });
    }

    await query("UPDATE bookings SET order_id = $1 WHERE booking_id = $2", [
      paytmOrderId,
      booking_id,
    ]);

    const redirectUrl = `${paytmBaseUrl}/theia/api/v1/showPaymentPage?mid=${mid}&orderId=${paytmOrderId}&txnToken=${responseBody.txnToken}`;

    return res.status(200).json({
      success: true,
      txnToken: responseBody.txnToken,
      order_id: paytmOrderId,
      booking_id: booking_id,
      amount: amount,
      mid: mid,
      redirect_url: redirectUrl,
    });
  } catch (error) {
    console.error(
      "Error initiating payment:",
      error.response?.data || error.message,
    );
    return res.status(500).json({
      error: "Internal server error",
      details:
        error.response?.data?.body?.resultInfo?.resultMsg || error.message,
    });
  }
};

const paytmRedirect = async (req, res) => {
  try {
    const { booking_id } = req.params;

    if (!booking_id) {
      return res.status(400).send("Booking ID is required");
    }

    const result = await query("SELECT * FROM bookings WHERE booking_id = $1", [
      booking_id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).send("Booking not found");
    }

    const booking = result.rows[0];

    if (booking.payment_status === "SUCCESS") {
      const frontendUrl = `https://${getPublicDomain(req)}`;
      return res.redirect(
        `${frontendUrl}/ticket?booking_id=${booking.booking_id}`,
      );
    }

    const mid = process.env.PAYTM_MID;
    const website = process.env.PAYTM_WEBSITE;
    const merchantKey = process.env.PAYTM_MERCHANT_KEY;
    const publicDomain = getPublicDomain(req);
    const callbackUrl = `https://${publicDomain}/api/payments/paytm/callback`;
    const paytmBaseUrl = getPaytmBaseUrl();
    const amount = parseFloat(booking.advance_amount).toFixed(2);

    if (!mid || !website || !merchantKey) {
      return res.status(500).send("Payment gateway not configured");
    }

    const paytmOrderId = booking.order_id || generatePaytmOrderId();

    if (!booking.order_id) {
      await query("UPDATE bookings SET order_id = $1 WHERE booking_id = $2", [
        paytmOrderId,
        booking_id,
      ]);
    }

    const channelId = process.env.PAYTM_CHANNEL_ID || "WEB";

    const paytmBody = {
      requestType: "Payment",
      mid: mid,
      websiteName: website,
      orderId: paytmOrderId,
      callbackUrl: callbackUrl,
      txnAmount: {
        value: amount,
        currency: "INR",
      },
      userInfo: {
        custId: String(booking.guest_phone || "GUEST"),
      },
      channelId: channelId,
    };

    const checksum = await PaytmChecksum.generateSignature(
      JSON.stringify(paytmBody),
      merchantKey,
    );

    const paytmRequest = {
      body: paytmBody,
      head: { signature: checksum },
    };

    console.log("Paytm redirect - initiating transaction:", {
      mid,
      website,
      channelId,
      orderId: paytmOrderId,
      amount,
      callbackUrl,
    });

    const paytmResponse = await axios.post(
      `${paytmBaseUrl}/theia/api/v1/initiateTransaction?mid=${mid}&orderId=${paytmOrderId}`,
      paytmRequest,
      { headers: { "Content-Type": "application/json" } },
    );

    console.log(
      "Paytm initiateTransaction response:",
      JSON.stringify(paytmResponse.data),
    );

    const responseBody = paytmResponse.data.body;

    if (!responseBody || !responseBody.txnToken) {
      console.error("Failed to get txnToken:", paytmResponse.data);
      const errorMsg =
        responseBody?.resultInfo?.resultMsg || "Payment initiation failed";
      const frontendUrl = `https://${publicDomain}`;
      return res.status(200).send(`
        <!DOCTYPE html>
        <html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>body{font-family:Arial;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#0a0a0a;color:white;}
        .container{background:#1a1a1a;padding:2rem;border-radius:16px;text-align:center;max-width:500px;}
        .icon{font-size:4rem;margin-bottom:1rem;color:#ef4444;}
        a{display:inline-block;margin-top:1.5rem;padding:0.75rem 2rem;background:#d4af37;color:black;text-decoration:none;border-radius:8px;font-weight:bold;}</style>
        </head><body><div class="container">
        <div class="icon">!</div>
        <h2>Payment Error</h2>
        <p style="color:#999">${errorMsg}</p>
        <a href="${frontendUrl}">Back to Home</a>
        </div></body></html>
      `);
    }

    const showPaymentUrl = `${paytmBaseUrl}/theia/api/v1/showPaymentPage?mid=${mid}&orderId=${paytmOrderId}&txnToken=${responseBody.txnToken}`;
    console.log("Redirecting to Paytm payment page:", showPaymentUrl);
    return res.redirect(showPaymentUrl);
  } catch (error) {
    console.error(
      "Error in Paytm redirect:",
      error.response?.data || error.message,
    );
    return res.status(500).send(`
      <!DOCTYPE html>
      <html><head><meta charset="UTF-8"><style>body{font-family:Arial;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#0a0a0a;color:white;}
      .container{background:#1a1a1a;padding:2rem;border-radius:16px;text-align:center;max-width:500px;}
      .icon{font-size:4rem;margin-bottom:1rem;color:#ef4444;}</style>
      </head><body><div class="container">
      <div class="icon">!</div>
      <h2>Payment Error</h2>
      <p style="color:#999">Something went wrong. Please try again.</p>
      <a href="/" style="display:inline-block;margin-top:1.5rem;padding:0.75rem 2rem;background:#d4af37;color:black;text-decoration:none;border-radius:8px;font-weight:bold;">Back to Home</a>
      </div></body></html>
    `);
  }
};

const paytmCallback = async (req, res) => {
  try {
    const paytmResponse = req.body;

    if (!paytmResponse || Object.keys(paytmResponse).length === 0) {
      console.error("Empty callback body received");
      return res
        .status(400)
        .json({ error: "Empty response from payment gateway" });
    }

    console.log("Paytm callback received:", paytmResponse);

    const orderId = paytmResponse.ORDERID;
    const txnId = paytmResponse.TXNID || "";
    const txnAmount = paytmResponse.TXNAMOUNT || "";
    const status = paytmResponse.STATUS || "";
    const respMsg = paytmResponse.RESPMSG || "";

    const checksumHash = paytmResponse.CHECKSUMHASH;
    const merchantKey = process.env.PAYTM_MERCHANT_KEY;

    if (checksumHash && merchantKey) {
      const isValidChecksum = await PaytmChecksum.verifySignature(
        paytmResponse,
        merchantKey,
        checksumHash,
      );

      if (!isValidChecksum) {
        console.error("Invalid checksum received from Paytm");
        return res
          .status(400)
          .json({ error: "Invalid checksum - payment verification failed" });
      }
      console.log("Checksum verified successfully");
    } else if (status === "TXN_SUCCESS") {
      console.error(
        "CRITICAL: Successful transaction missing checksum - rejecting",
      );
      return res.status(400).json({
        error: "Checksum verification required for successful payments",
      });
    } else {
      console.log(
        "No checksum in failed/rejected response, proceeding with status:",
        status,
      );
    }

    const result = await query("SELECT * FROM bookings WHERE order_id = $1", [
      orderId,
    ]);

    if (result.rows.length === 0) {
      console.error("Booking not found for order_id:", orderId);
      return res.status(404).json({ error: "Booking not found" });
    }

    const booking = result.rows[0];

    if (booking.webhook_processed && booking.payment_status === "SUCCESS") {
      console.log("Webhook already processed for booking:", booking.booking_id);
      const frontendUrl = `https://${getPublicDomain(req)}`;
      return res.redirect(
        `${frontendUrl}/ticket?booking_id=${booking.booking_id}`,
      );
    }

    if (
      status === "TXN_SUCCESS" &&
      parseFloat(txnAmount) !== parseFloat(booking.advance_amount)
    ) {
      console.error("Amount mismatch:", {
        expected: booking.advance_amount,
        received: txnAmount,
      });
      return res.status(400).json({ error: "Amount mismatch detected" });
    }

    let updatePaymentStatus = "FAILED";
    let updateBookingStatus = "PAYMENT_FAILED";

    if (status === "TXN_SUCCESS") {
      updatePaymentStatus = "SUCCESS";
      updateBookingStatus = "PENDING_OWNER_CONFIRMATION";
    } else if (status === "PENDING") {
      updatePaymentStatus = "PENDING";
      updateBookingStatus = "PAYMENT_PENDING";
    }

    const paymentMode = paytmResponse.PAYMENTMODE || "";
    const hasReferral = !!booking.referral_code;
    const commBase = parseFloat(booking.total_amount) || 0;
    let adminComm = 0;
    let referrerComm = 0;
    let commStatus = null;

    if (status === "TXN_SUCCESS") {
      if (hasReferral) {
        const rType = (booking.referral_type || '').toLowerCase();
        if (rType === 'owner') {
          adminComm = Math.round(commBase * 0.05 * 100) / 100;
          referrerComm = Math.round(commBase * 0.25 * 100) / 100;
        } else if (rType === 'b2b' || rType === 'owners_b2b') {
          adminComm = Math.round(commBase * 0.08 * 100) / 100;
          referrerComm = Math.round(commBase * 0.22 * 100) / 100;
        } else {
          adminComm = Math.round(commBase * 0.15 * 100) / 100;
          referrerComm = Math.round(commBase * 0.15 * 100) / 100;
        }
      } else {
        adminComm = Math.round(commBase * 0.3 * 100) / 100;
        referrerComm = 0;
      }
      commStatus = "PENDING";
    }

    const actionToken = generateActionToken();
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const softLockExpiry = status === "TXN_SUCCESS"
      ? new Date(Date.now() + 60 * 60 * 1000)
      : new Date();

    await query(
      `UPDATE bookings SET 
        payment_status = $1, booking_status = $2, transaction_id = $3,
        payment_method = $4, webhook_processed = true, 
        admin_commission = $5, referrer_commission = $6, commission_status = $7,
        action_token = $8, action_token_used = false, 
        action_token_expires_at = $9, soft_lock_expires_at = $10, updated_at = NOW()
      WHERE booking_id = $11`,
      [
        updatePaymentStatus,
        updateBookingStatus,
        txnId,
        paymentMode,
        adminComm,
        referrerComm,
        commStatus,
        actionToken,
        tokenExpiry,
        softLockExpiry,
        booking.booking_id,
      ],
    );

    console.log("Booking updated successfully:", {
      booking_id: booking.booking_id,
      order_id: orderId,
      payment_status: updatePaymentStatus,
      booking_status: updateBookingStatus,
      soft_lock_expires_at: softLockExpiry,
    });

    if (status === "TXN_SUCCESS") {
      try {
        const whatsapp = new WhatsAppService();
        const frontendUrl = `https://${getPublicDomain(req)}`;
        await whatsapp.sendBookingNotifications(booking, actionToken, frontendUrl);
      } catch (whatsappErr) {
        console.error("WhatsApp notification error in callback:", whatsappErr.message, whatsappErr.stack);
      }
    }

    const frontendUrl = `https://${getPublicDomain(req)}`;
    const redirectUrl = `${frontendUrl}/ticket?booking_id=${booking.booking_id}`;

    return res.status(200).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payment ${status === "TXN_SUCCESS" ? "Success" : "Failed"}</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: #0a0a0a;
            color: white;
          }
          .container {
            background: #1a1a1a;
            padding: 2rem;
            border-radius: 16px;
            border: 1px solid #d4af3730;
            text-align: center;
            max-width: 500px;
          }
          .success { color: #10b981; }
          .failed { color: #ef4444; }
          .icon { font-size: 4rem; margin-bottom: 1rem; }
          h1 { margin: 0 0 1rem 0; }
          p { color: #999; margin: 0.5rem 0; }
          .details {
            background: #111;
            padding: 1rem;
            border-radius: 8px;
            margin: 1rem 0;
            text-align: left;
          }
          .details p { margin: 0.5rem 0; font-size: 0.9rem; }
          .btn {
            display: inline-block;
            margin-top: 1.5rem;
            padding: 0.75rem 2rem;
            background: #d4af37;
            color: black;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
          }
        </style>
        <script>
          setTimeout(function() {
            window.location.href = "${redirectUrl}";
          }, 3000);
        </script>
      </head>
      <body>
        <div class="container">
          ${
            status === "TXN_SUCCESS"
              ? `
            <div class="icon success">✓</div>
            <h1 class="success">Payment Successful!</h1>
            <p>Redirecting to your booking status...</p>
          `
              : `
            <div class="icon failed">✗</div>
            <h1 class="failed">Payment Failed</h1>
            <p>${respMsg}</p>
          `
          }
          <div class="details">
            <p><strong>Booking ID:</strong> ${booking.booking_id}</p>
            <p><strong>Order ID:</strong> ${orderId}</p>
            ${txnId ? `<p><strong>Transaction ID:</strong> ${txnId}</p>` : ""}
            <p><strong>Amount:</strong> ₹${txnAmount}</p>
            <p><strong>Status:</strong> ${status}</p>
          </div>
          <a href="${redirectUrl}" class="btn">View Booking Status</a>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    console.error("Error in Paytm callback:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
};

const paytmWebhook = async (req, res) => {
  try {
    const paytmResponse = req.body;

    if (!paytmResponse || Object.keys(paytmResponse).length === 0) {
      console.error("Empty webhook body received");
      return res.status(400).json({ error: "Empty webhook payload" });
    }

    console.log("Paytm webhook received:", JSON.stringify(paytmResponse));

    const orderId = paytmResponse.ORDERID;
    const txnId = paytmResponse.TXNID || "";
    const txnAmount = paytmResponse.TXNAMOUNT || "";
    const status = paytmResponse.STATUS || "";
    const paymentMode = paytmResponse.PAYMENTMODE || "";
    const checksumHash = paytmResponse.CHECKSUMHASH;
    const merchantKey = process.env.PAYTM_MERCHANT_KEY;

    if (!checksumHash || !merchantKey) {
      console.error("Webhook missing checksum or merchant key");
      return res.status(400).json({ error: "Missing checksum" });
    }

    const dataForVerify = { ...paytmResponse };
    delete dataForVerify.CHECKSUMHASH;

    const isValidChecksum = await PaytmChecksum.verifySignature(
      dataForVerify,
      merchantKey,
      checksumHash,
    );

    if (!isValidChecksum) {
      console.error("Webhook: Invalid checksum");
      return res.status(400).json({ error: "Invalid checksum" });
    }

    console.log("Webhook: Checksum verified successfully");

    const result = await query("SELECT * FROM bookings WHERE order_id = $1", [
      orderId,
    ]);

    if (result.rows.length === 0) {
      console.error("Webhook: Booking not found for order_id:", orderId);
      return res.status(404).json({ error: "Booking not found" });
    }

    const booking = result.rows[0];

    if (booking.webhook_processed && booking.payment_status === "SUCCESS") {
      console.log(
        "Webhook: Already processed for booking:",
        booking.booking_id,
      );
      return res.status(200).json({ status: "already_processed" });
    }

    if (
      status === "TXN_SUCCESS" &&
      parseFloat(txnAmount) !== parseFloat(booking.advance_amount)
    ) {
      console.error("Webhook: Amount mismatch:", {
        expected: booking.advance_amount,
        received: txnAmount,
      });
      return res.status(400).json({ error: "Amount mismatch" });
    }

    let updatePaymentStatus = "FAILED";
    let updateBookingStatus = "PAYMENT_FAILED";

    if (status === "TXN_SUCCESS") {
      updatePaymentStatus = "SUCCESS";
      updateBookingStatus = "PENDING_OWNER_CONFIRMATION";
    } else if (status === "PENDING") {
      updatePaymentStatus = "PENDING";
      updateBookingStatus = "PAYMENT_PENDING";
    }

    const hasReferral = !!booking.referral_code;
    const commBase = parseFloat(booking.total_amount) || 0;
    let adminCommission = 0;
    let referrerCommission = 0;
    let commissionStatus = null;

    if (status === "TXN_SUCCESS") {
      if (hasReferral) {
        const rTypeW = (booking.referral_type || '').toLowerCase();
        if (rTypeW === 'owner') {
          adminCommission = Math.round(commBase * 0.05 * 100) / 100;
          referrerCommission = Math.round(commBase * 0.25 * 100) / 100;
        } else if (rTypeW === 'b2b' || rTypeW === 'owners_b2b') {
          adminCommission = Math.round(commBase * 0.08 * 100) / 100;
          referrerCommission = Math.round(commBase * 0.22 * 100) / 100;
        } else {
          adminCommission = Math.round(commBase * 0.15 * 100) / 100;
          referrerCommission = Math.round(commBase * 0.15 * 100) / 100;
        }
      } else {
        adminCommission = Math.round(commBase * 0.3 * 100) / 100;
        referrerCommission = 0;
      }
      commissionStatus = "PENDING";
    }

    const actionToken = generateActionToken();
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const softLockExpiryWebhook = status === "TXN_SUCCESS"
      ? new Date(Date.now() + 60 * 60 * 1000)
      : new Date();

    await query(
      `UPDATE bookings SET 
        payment_status = $1, booking_status = $2, transaction_id = $3,
        payment_method = $4, webhook_processed = true,
        admin_commission = $5, referrer_commission = $6, commission_status = $7,
        action_token = $8, action_token_used = false, action_token_expires_at = $9,
        soft_lock_expires_at = $10, updated_at = NOW()
      WHERE booking_id = $11`,
      [
        updatePaymentStatus,
        updateBookingStatus,
        txnId,
        paymentMode,
        adminCommission,
        referrerCommission,
        commissionStatus,
        actionToken,
        tokenExpiry,
        softLockExpiryWebhook,
        booking.booking_id,
      ],
    );

    console.log("Webhook: Booking updated:", {
      booking_id: booking.booking_id,
      payment_status: updatePaymentStatus,
      booking_status: updateBookingStatus,
      commission: { admin: adminCommission, referrer: referrerCommission },
      soft_lock_expires_at: softLockExpiryWebhook,
    });

    if (status === "TXN_SUCCESS") {
      const whatsapp = new WhatsAppService();

      await whatsapp.sendTextMessage(
        booking.guest_phone,
        `✅ Payment Successful!\n\nBooking ID: ${booking.booking_id}\nAmount Paid: ₹${txnAmount}\n\nYour booking request has been received.\nOwner confirmation is pending.\nTicket will be shared within 1 hour.`,
      );

      const checkinDate = new Date(booking.checkin_datetime).toLocaleString(
        "en-IN",
        { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" },
      );
      const checkoutDate = new Date(booking.checkout_datetime).toLocaleString(
        "en-IN",
        { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" },
      );
      const dueAmount = (booking.total_amount || 0) - booking.advance_amount;
      const publicDomain =
        process.env.REPLIT_DOMAINS?.split(",")[0] ||
        process.env.REPLIT_DEV_DOMAIN ||
        "";
      const frontendUrl = `https://${publicDomain}`;
      const confirmUrl = `${frontendUrl}/api/bookings/owner-action?token=${actionToken}&action=CONFIRM`;
      const cancelUrl = `${frontendUrl}/api/bookings/owner-action?token=${actionToken}&action=CANCEL`;

      const ownerMessage = `🔔 New Booking Request\n\nProperty: ${booking.property_name}\nGuest: ${booking.guest_name} (${booking.guest_phone})\nCheck-in: ${checkinDate}\nCheck-out: ${checkoutDate}\nPersons: ${booking.persons || 0}\n\nPlease confirm or cancel this booking:`;

      await whatsapp.sendInteractiveButtons(booking.owner_phone, ownerMessage, [
        {
          id: JSON.stringify({ token: actionToken, action: "CONFIRM" }),
          title: "✅ Confirm",
        },
        {
          id: JSON.stringify({ token: actionToken, action: "CANCEL" }),
          title: "❌ Cancel",
        },
      ]);

      await whatsapp.sendTextMessage(
        booking.admin_phone,
        `📋 New Booking Alert\n\nBooking ID: ${booking.booking_id}\nProperty: ${booking.property_name}\nOwner: ${booking.owner_name || ""} (${booking.owner_phone})\nGuest: ${booking.guest_name} (${booking.guest_phone})\nAdvance: ₹${booking.advance_amount}\nDue: ₹${dueAmount}\nPayment Method: ${paymentMode}\nStatus: Waiting for owner confirmation\n\nConfirm: ${confirmUrl}\nCancel: ${cancelUrl}`,
      );

      console.log(
        "Webhook: WhatsApp notifications sent for:",
        booking.booking_id,
      );
    }

    return res.status(200).json({ status: "ok" });
  } catch (error) {
    console.error("Error in Paytm webhook:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const initiateRefund = async (req, res) => {
  try {
    const { booking_id } = req.body;

    if (!booking_id) {
      return res.status(400).json({ error: "Booking ID is required" });
    }

    const result = await query("SELECT * FROM bookings WHERE booking_id = $1", [
      booking_id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Booking not found" });
    }

    const booking = result.rows[0];

    if (booking.refund_status === "REFUND_SUCCESSFUL") {
      return res
        .status(400)
        .json({
          error: "Refund already completed",
          refund_id: booking.refund_id,
        });
    }

    if (booking.payment_status !== "SUCCESS") {
      return res.status(400).json({ error: "No successful payment to refund" });
    }

    if (!booking.order_id) {
      return res
        .status(400)
        .json({ error: "No order ID found for this booking" });
    }

    const mid = process.env.PAYTM_MID;
    const merchantKey = process.env.PAYTM_MERCHANT_KEY;
    const paytmBaseUrl = getPaytmBaseUrl();

    if (!mid || !merchantKey) {
      return res.status(500).json({ error: "Payment gateway not configured" });
    }

    const refundId = `REFUND_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const refundAmount = parseFloat(booking.advance_amount).toFixed(2);

    const paytmBody = {
      mid: mid,
      txnType: "REFUND",
      orderId: booking.order_id,
      txnId: booking.transaction_id,
      refId: refundId,
      refundAmount: refundAmount,
    };

    const checksum = await PaytmChecksum.generateSignature(
      JSON.stringify(paytmBody),
      merchantKey,
    );

    const paytmRequest = {
      body: paytmBody,
      head: { signature: checksum },
    };

    console.log("Initiating Paytm refund:", {
      booking_id,
      refundId,
      amount: refundAmount,
    });

    const paytmResponse = await axios.post(
      `${paytmBaseUrl}/refund/apply`,
      paytmRequest,
      { headers: { "Content-Type": "application/json" } },
    );

    console.log("Paytm refund response:", JSON.stringify(paytmResponse.data));

    const responseBody = paytmResponse.data.body;
    const refundResult = responseBody?.resultInfo;

    if (
      refundResult?.resultStatus === "TXN_SUCCESS" ||
      refundResult?.resultStatus === "PENDING"
    ) {
      const refundStatus =
        refundResult.resultStatus === "TXN_SUCCESS"
          ? "REFUND_SUCCESSFUL"
          : "REFUND_INITIATED";

      await query(
        `UPDATE bookings SET 
          refund_id = $1, refund_status = $2, refund_amount = $3,
          booking_status = 'REFUND_INITIATED', updated_at = NOW()
        WHERE booking_id = $4`,
        [refundId, refundStatus, refundAmount, booking_id],
      );

      const whatsapp = new WhatsAppService();
      if (refundStatus === "REFUND_SUCCESSFUL") {
        await whatsapp.sendTextMessage(
          booking.guest_phone,
          `💰 Refund Successful!\n\nBooking ID: ${booking.booking_id}\nRefund Amount: ₹${refundAmount}\n\nYour refund has been successfully credited to your account.`,
        );
        await whatsapp.sendTextMessage(
          booking.admin_phone,
          `✅ Refund Completed\n\nBooking ID: ${booking.booking_id}\nGuest: ${booking.guest_name} (${booking.guest_phone})\nRefund Amount: ₹${refundAmount}\nRefund ID: ${refundId}`,
        );
      } else {
        await whatsapp.sendTextMessage(
          booking.guest_phone,
          `Your refund of ₹${refundAmount} for booking ${booking.booking_id} has been initiated and is being processed. You will receive it within 5–7 business days.`,
        );
      }

      return res.status(200).json({
        success: true,
        refund_id: refundId,
        refund_status: refundStatus,
        amount: refundAmount,
        message: refundResult.resultMsg,
      });
    } else {
      await query(
        `UPDATE bookings SET refund_status = 'REFUND_FAILED', updated_at = NOW() WHERE booking_id = $1`,
        [booking_id],
      );

      return res.status(400).json({
        error: "Refund failed",
        details: refundResult?.resultMsg || "Unknown error",
        resultCode: refundResult?.resultCode,
      });
    }
  } catch (error) {
    console.error(
      "Error initiating refund:",
      error.response?.data || error.message,
    );
    return res.status(500).json({
      error: "Internal server error",
      details:
        error.response?.data?.body?.resultInfo?.resultMsg || error.message,
    });
  }
};

const getRefundRequests = async (req, res) => {
  try {
    const result = await query(`
      SELECT booking_id, guest_name, guest_phone, property_name, property_type,
        advance_amount, total_amount, payment_status, booking_status, 
        refund_status, refund_id, refund_amount, payment_method,
        order_id, transaction_id, checkin_datetime, checkout_datetime,
        owner_name, owner_phone, referral_code, referral_discount,
        admin_commission, referrer_commission, commission_status,
        created_at, updated_at
      FROM bookings 
      WHERE booking_status = 'CANCELLED_BY_OWNER' 
        AND payment_status = 'SUCCESS'
        AND (refund_status IS NULL OR refund_status NOT IN ('REFUND_SUCCESSFUL', 'REFUND_INITIATED', 'REFUND_DENIED'))
      ORDER BY updated_at DESC
    `);

    return res.status(200).json({
      success: true,
      refund_requests: result.rows,
    });
  } catch (error) {
    console.error("Error fetching refund requests:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const getAllBookings = async (req, res) => {
  try {
    const { status, payment_status } = req.query;
    let queryText = "SELECT * FROM bookings";
    const conditions = [];
    const values = [];
    let paramCount = 1;

    if (status) {
      conditions.push(`booking_status = $${paramCount}`);
      values.push(status);
      paramCount++;
    }
    if (payment_status) {
      conditions.push(`payment_status = $${paramCount}`);
      values.push(payment_status);
      paramCount++;
    }

    if (conditions.length > 0) {
      queryText += " WHERE " + conditions.join(" AND ");
    }

    queryText += " ORDER BY created_at DESC";

    const result = await query(queryText, values);
    return res.status(200).json({ success: true, bookings: result.rows });
  } catch (error) {
    console.error("Error fetching bookings:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const verifyPaymentStatus = async (req, res) => {
  try {
    const { booking_id } = req.params;

    if (!booking_id) {
      return res.status(400).json({ error: "Booking ID is required" });
    }

    const result = await query("SELECT * FROM bookings WHERE booking_id = $1", [
      booking_id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Booking not found" });
    }

    const booking = result.rows[0];

    if (booking.webhook_processed && booking.payment_status === "SUCCESS") {
      return res.json({
        success: true,
        payment_status: "SUCCESS",
        booking_status: booking.booking_status,
        booking_id: booking.booking_id,
        message: "Payment already verified",
      });
    }

    if (booking.payment_status === "SUCCESS") {
      return res.json({
        success: true,
        payment_status: "SUCCESS",
        booking_status: booking.booking_status,
        booking_id: booking.booking_id,
      });
    }

    if (!booking.order_id) {
      return res.json({
        success: false,
        payment_status: booking.payment_status,
        booking_status: booking.booking_status,
        message: "No payment initiated yet",
      });
    }

    const mid = process.env.PAYTM_MID;
    const merchantKey = process.env.PAYTM_MERCHANT_KEY;

    if (!mid || !merchantKey) {
      return res.json({
        success: false,
        payment_status: booking.payment_status,
        booking_status: booking.booking_status,
        message: "Payment gateway not configured",
      });
    }

    const paytmBody = {
      mid: mid,
      orderId: booking.order_id,
    };

    const checksum = await PaytmChecksum.generateSignature(
      JSON.stringify(paytmBody),
      merchantKey,
    );

    const paytmBaseUrl = getPaytmBaseUrl();
    const statusResponse = await axios.post(
      `${paytmBaseUrl}/v3/order/status`,
      { body: paytmBody, head: { signature: checksum } },
      { headers: { "Content-Type": "application/json" } },
    );

    const statusBody = statusResponse.data?.body;
    let txnStatus = statusBody?.resultInfo?.resultStatus;
    const paytmStatus = statusBody?.resultInfo?.resultCode;

    console.log("=== PAYTM STATUS CHECK ===");
    console.log("Booking ID:", booking_id);
    console.log("Order ID:", booking.order_id);
    console.log("Paytm Status API Response:", JSON.stringify(statusBody?.resultInfo));
    console.log("TXN Status:", txnStatus, "| Result Code:", paytmStatus);
    console.log("Current DB payment_status:", booking.payment_status);

    const clientTxnResponse = req.body?.txnResponse || {};
    const clientStatus = clientTxnResponse.STATUS;
    console.log("Client SDK txnResponse STATUS:", clientStatus);

    if (txnStatus !== "TXN_SUCCESS" && clientStatus === "TXN_SUCCESS") {
      const isStaging = getPaytmBaseUrl().includes("stage");
      console.log("Status API returned", txnStatus, "but SDK callback says TXN_SUCCESS. Staging:", isStaging);

      if (clientTxnResponse.CHECKSUMHASH) {
        try {
          const { CHECKSUMHASH, ...txnDataWithoutChecksum } = clientTxnResponse;
          const isValid = await PaytmChecksum.verifySignature(
            txnDataWithoutChecksum,
            merchantKey,
            CHECKSUMHASH,
          );
          if (isValid) {
            console.log("SDK callback checksum VALID - trusting SDK result");
            txnStatus = "TXN_SUCCESS";
          } else {
            console.log("SDK callback checksum INVALID - ignoring SDK result");
          }
        } catch (checksumErr) {
          console.error("Checksum verification error:", checksumErr.message);
        }
      } else if (isStaging) {
        console.log("No checksum in SDK callback (staging mode) - trusting SDK result for testing");
        txnStatus = "TXN_SUCCESS";
      }
    }
    console.log("Final resolved TXN Status:", txnStatus);
    console.log("========================");

    if (txnStatus === "TXN_SUCCESS" && booking.payment_status !== "SUCCESS") {
      const txnId = statusBody.txnId || clientTxnResponse.TXNID || "";
      const txnAmount = statusBody.txnAmount || clientTxnResponse.TXNAMOUNT || booking.advance_amount;
      const paymentMode = statusBody.paymentMode || clientTxnResponse.PAYMENTMODE || "";

      const hasReferral = !!booking.referral_code;
      const commBase = parseFloat(booking.total_amount) || 0;
      let adminComm = 0;
      let referrerComm = 0;
      let commStatus = null;

      if (hasReferral) {
        const rTypeS = (booking.referral_type || '').toLowerCase();
        if (rTypeS === 'owner') {
          adminComm = Math.round(commBase * 0.05 * 100) / 100;
          referrerComm = Math.round(commBase * 0.25 * 100) / 100;
        } else if (rTypeS === 'b2b' || rTypeS === 'owners_b2b') {
          adminComm = Math.round(commBase * 0.08 * 100) / 100;
          referrerComm = Math.round(commBase * 0.22 * 100) / 100;
        } else {
          adminComm = Math.round(commBase * 0.15 * 100) / 100;
          referrerComm = Math.round(commBase * 0.15 * 100) / 100;
        }
      } else {
        adminComm = Math.round(commBase * 0.3 * 100) / 100;
      }
      commStatus = "PENDING";

      const actionToken = generateActionToken();
      const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await query(
        `UPDATE bookings SET 
          payment_status = 'SUCCESS', booking_status = 'PENDING_OWNER_CONFIRMATION', 
          transaction_id = $1, payment_method = $2, webhook_processed = true,
          admin_commission = $3, referrer_commission = $4, commission_status = $5,
          action_token = $6, action_token_used = false,
          action_token_expires_at = $7, updated_at = NOW()
        WHERE booking_id = $8`,
        [txnId, paymentMode, adminComm, referrerComm, commStatus, actionToken, tokenExpiry, booking.booking_id],
      );

      console.log("Payment verified via status API for booking:", booking.booking_id);

      try {
        const whatsapp = new WhatsAppService();
        const frontendUrl = `https://${process.env.REPLIT_DOMAINS?.split(",")[0] || "pawnahavencamp.com"}`;
        await whatsapp.sendBookingNotifications(booking, actionToken, frontendUrl);
      } catch (whatsappErr) {
        console.error("WhatsApp notification error during status verify:", whatsappErr.message, whatsappErr.stack);
      }

      return res.json({
        success: true,
        payment_status: "SUCCESS",
        booking_status: "PENDING_OWNER_CONFIRMATION",
        booking_id: booking.booking_id,
      });
    }

    const originalApiStatus = statusBody?.resultInfo?.resultStatus;
    if (originalApiStatus === "TXN_FAILURE" && txnStatus !== "TXN_SUCCESS" && booking.payment_status !== "FAILED") {
      await query(
        "UPDATE bookings SET payment_status = 'FAILED', booking_status = 'PAYMENT_FAILED', updated_at = NOW() WHERE booking_id = $1",
        [booking.booking_id],
      );
    }

    return res.json({
      success: txnStatus === "TXN_SUCCESS",
      payment_status: txnStatus === "TXN_SUCCESS" ? "SUCCESS" : txnStatus === "PENDING" ? "PENDING" : "FAILED",
      booking_status: booking.booking_status,
      booking_id: booking.booking_id,
      paytm_status: paytmStatus,
    });
  } catch (error) {
    console.error("Error verifying payment status:", error.message);
    return res.status(500).json({ error: "Failed to verify payment status" });
  }
};

const denyRefund = async (req, res) => {
  try {
    const { booking_id } = req.body;

    if (!booking_id) {
      return res.status(400).json({ error: "Booking ID is required" });
    }

    const result = await query("SELECT * FROM bookings WHERE booking_id = $1", [
      booking_id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Booking not found" });
    }

    const booking = result.rows[0];

    if (booking.refund_status === "REFUND_SUCCESSFUL") {
      return res.status(400).json({ error: "Refund already processed" });
    }

    if (booking.refund_status === "REFUND_DENIED") {
      return res.status(400).json({ error: "Refund already denied" });
    }

    if (!['REFUND_PENDING', 'REFUND_INITIATED'].includes(booking.refund_status)) {
      return res.status(400).json({ error: "No pending refund to deny" });
    }

    if (booking.booking_status !== "CANCELLED_BY_OWNER") {
      return res.status(400).json({ error: "Booking is not in a cancellable state" });
    }

    await query(
      `UPDATE bookings SET 
        refund_status = 'REFUND_DENIED', 
        booking_status = 'CANCELLED_NO_REFUND', 
        updated_at = NOW() 
      WHERE booking_id = $1`,
      [booking_id],
    );

    try {
      const whatsapp = new WhatsAppService();
      await whatsapp.sendTextMessage(
        booking.guest_phone,
        `We regret to inform you that the refund for your booking ${booking.booking_id} has been reviewed and could not be processed at this time. Please contact us for further assistance.`,
      );
      await whatsapp.sendTextMessage(
        booking.admin_phone,
        `🚫 Refund Denied\n\nBooking ID: ${booking.booking_id}\nProperty: ${booking.property_name}\nGuest: ${booking.guest_name} (${booking.guest_phone})\nAmount: ₹${booking.advance_amount}\n\nRefund has been denied. Customer notified.`,
      );
    } catch (whatsappErr) {
      console.error("WhatsApp error on refund deny:", whatsappErr.message);
    }

    return res.status(200).json({
      success: true,
      message: "Refund denied successfully",
      booking_id: booking_id,
    });
  } catch (error) {
    console.error("Error denying refund:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const getRequestHistory = async (req, res) => {
  try {
    const refundResult = await query(`
      SELECT booking_id, guest_name, guest_phone, property_name,
        advance_amount, refund_amount, refund_status, refund_id,
        booking_status, updated_at, created_at
      FROM bookings 
      WHERE refund_status IN ('REFUND_SUCCESSFUL', 'REFUND_DENIED', 'REFUND_INITIATED')
      ORDER BY updated_at DESC
    `);

    const withdrawalResult = await query(`
      SELECT rt.id, rt.amount, rt.status, rt.created_at, rt.upi_id,
        ru.username, ru.referral_otp_number
      FROM referral_transactions rt
      JOIN referral_users ru ON rt.referral_user_id = ru.id
      WHERE rt.type = 'withdrawal' AND rt.status IN ('completed', 'rejected')
      ORDER BY rt.created_at DESC
    `);

    const history = [];

    for (const r of refundResult.rows) {
      history.push({
        id: r.booking_id,
        type: "Refund",
        user: r.guest_name,
        property: r.property_name,
        amount: parseFloat(r.refund_amount || r.advance_amount),
        date: r.updated_at,
        status: r.refund_status === "REFUND_SUCCESSFUL" ? "refunded" : r.refund_status === "REFUND_INITIATED" ? "processing" : "denied",
        refund_id: r.refund_id,
      });
    }

    for (const w of withdrawalResult.rows) {
      history.push({
        id: `WD-${w.id}`,
        type: "Withdrawal",
        user: w.username,
        amount: parseFloat(w.amount),
        date: w.created_at,
        status: w.status === "completed" ? "paid" : "rejected",
        upi_id: w.upi_id,
      });
    }

    history.sort((a, b) => new Date(b.date) - new Date(a.date));

    return res.status(200).json({ success: true, history });
  } catch (error) {
    console.error("Error fetching request history:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const getWithdrawalRequests = async (req, res) => {
  try {
    const result = await query(`
      SELECT rt.id, rt.amount, rt.status, rt.created_at, rt.upi_id,
        ru.username, ru.referral_otp_number, ru.referral_code
      FROM referral_transactions rt
      JOIN referral_users ru ON rt.referral_user_id = ru.id
      WHERE rt.type = 'withdrawal' AND rt.status = 'pending'
      ORDER BY rt.created_at ASC
    `);

    return res.status(200).json({
      success: true,
      withdrawal_requests: result.rows,
    });
  } catch (error) {
    console.error("Error fetching withdrawal requests:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};


const processWithdrawal = async (req, res) => {
  try {
    const { transaction_id } = req.body;

    if (!transaction_id) {
      return res.status(400).json({ error: "Transaction ID is required" });
    }

    const result = await query(
      "SELECT rt.*, ru.username, ru.referral_otp_number FROM referral_transactions rt JOIN referral_users ru ON rt.referral_user_id = ru.id WHERE rt.id = $1",
      [transaction_id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    const txn = result.rows[0];

    if (txn.status === "completed") {
      return res.status(400).json({ error: "Withdrawal already processed" });
    }

    if (txn.status !== "pending") {
      return res.status(400).json({ error: "Withdrawal is not in pending state" });
    }

    await query(
      "UPDATE referral_transactions SET status = 'processing', updated_at = NOW() WHERE id = $1 AND status = 'pending'",
      [transaction_id],
    );

    const payoutResult = await triggerRazorpayXPayout(
      transaction_id,
      txn.amount,
      txn.upi_id,
      txn.username,
      txn.referral_otp_number,
    );

    if (payoutResult.success) {
      const finalStatus = payoutResult.mapped_status || 'processing';
      await query(
        "UPDATE referral_transactions SET status = $1, payout_id = $2, payout_status = $3, updated_at = NOW() WHERE id = $4",
        [finalStatus, payoutResult.payout_id, payoutResult.payout_status, transaction_id],
      );

      if (finalStatus === 'completed') {
        try {
          const whatsapp = new WhatsAppService();
          await whatsapp.sendTextMessage(
            txn.referral_otp_number,
            `💰 Withdrawal Successful!\n\nAmount: ₹${txn.amount}\nUPI: ${txn.upi_id || "N/A"}\n\nYour withdrawal has been processed successfully.`,
          );
        } catch (whatsappErr) {
          console.error("WhatsApp error on withdrawal process:", whatsappErr.message);
        }
      }

      return res.status(200).json({
        success: true,
        message: finalStatus === 'completed' ? "Withdrawal completed successfully" : "Withdrawal payout initiated — awaiting confirmation",
        payout_id: payoutResult.payout_id,
        payout_status: payoutResult.payout_status,
        status: finalStatus,
      });
    } else if (payoutResult.skipped) {
      await query(
        "UPDATE referral_transactions SET status = 'completed', updated_at = NOW() WHERE id = $1",
        [transaction_id],
      );
      try {
        const whatsapp = new WhatsAppService();
        await whatsapp.sendTextMessage(
          txn.referral_otp_number,
          `💰 Withdrawal Approved!\n\nAmount: ₹${txn.amount}\nUPI: ${txn.upi_id || "N/A"}\n\nYour withdrawal has been approved. Payment will be processed manually.`,
        );
      } catch (whatsappErr) {
        console.error("WhatsApp error on withdrawal approval:", whatsappErr.message);
      }
      return res.status(200).json({
        success: true,
        message: "Withdrawal approved — RazorpayX not configured, marked completed manually",
        skipped: true,
      });
    } else {
      await query(
        "UPDATE referral_transactions SET status = 'pending', payout_status = 'failed', updated_at = NOW() WHERE id = $1",
        [transaction_id],
      );
      return res.status(500).json({
        error: "Payout initiation failed",
        details: payoutResult.reason,
      });
    }
  } catch (error) {
    console.error("Error processing withdrawal:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const rejectWithdrawal = async (req, res) => {
  try {
    const { transaction_id } = req.body;

    if (!transaction_id) {
      return res.status(400).json({ error: "Transaction ID is required" });
    }

    const result = await query(
      "SELECT * FROM referral_transactions WHERE id = $1",
      [transaction_id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    if (result.rows[0].status !== "pending") {
      return res.status(400).json({ error: "Withdrawal is not in pending state" });
    }

    await query(
      "UPDATE referral_transactions SET status = 'rejected' WHERE id = $1 AND status = 'pending'",
      [transaction_id],
    );

    return res.status(200).json({
      success: true,
      message: "Withdrawal rejected",
    });
  } catch (error) {
    console.error("Error rejecting withdrawal:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const refundWebhook = async (req, res) => {
  try {
    const body = { ...req.body };
    const checksum = body.CHECKSUMHASH;
    delete body.CHECKSUMHASH;

    const merchantKey = process.env.PAYTM_MERCHANT_KEY;
    if (!merchantKey) {
      return res.status(500).json({ error: "Payment gateway not configured" });
    }

    const isValid = await PaytmChecksum.verifySignature(body, merchantKey, checksum);
    if (!isValid) {
      console.error("Refund webhook: invalid checksum");
      return res.status(400).json({ error: "Invalid checksum" });
    }

    const refundId = body.REFID;
    if (!refundId) {
      return res.status(200).json({ status: "ok" });
    }

    const result = await query(
      "SELECT * FROM bookings WHERE refund_id = $1",
      [refundId],
    );

    if (result.rows.length === 0) {
      console.log(`Refund webhook: no booking found for refund_id=${refundId}`);
      return res.status(200).json({ status: "ok" });
    }

    const booking = result.rows[0];
    const paytmStatus = body.STATUS || "";
    let newStatus;
    if (paytmStatus === "TXN_SUCCESS" || paytmStatus === "REFUND_SUCCESS") {
      newStatus = "REFUND_SUCCESSFUL";
    } else if (paytmStatus === "PENDING") {
      newStatus = "REFUND_INITIATED";
    } else {
      newStatus = "REFUND_FAILED";
    }

    await query(
      "UPDATE bookings SET refund_status = $1, updated_at = NOW() WHERE refund_id = $2",
      [newStatus, refundId],
    );

    if (newStatus === "REFUND_SUCCESSFUL" && booking.refund_status !== "REFUND_SUCCESSFUL") {
      try {
        const whatsapp = new WhatsAppService();
        await whatsapp.sendTextMessage(
          booking.guest_phone,
          `💰 Refund Credited!\n\nBooking ID: ${booking.booking_id}\nRefund Amount: ₹${booking.refund_amount || booking.advance_amount}\n\nYour refund has been successfully credited to your account. It may take 3–5 business days to reflect.`,
        );
      } catch (whatsappErr) {
        console.error("WhatsApp error on refund webhook:", whatsappErr.message);
      }
    }

    console.log(`Refund webhook processed: refund_id=${refundId}, status=${newStatus}`);
    return res.status(200).json({ status: "ok" });
  } catch (error) {
    console.error("Error in refund webhook:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const payoutWebhook = async (req, res) => {
  try {
    const rawBody = req.rawBody || JSON.stringify(req.body);
    const signature = req.headers["x-razorpay-signature"] || "";

    const isValid = verifyRazorpayWebhookSignature(rawBody, signature);
    if (!isValid) {
      console.error("[RazorpayWebhook] Invalid signature");
      return res.status(400).json({ error: "Invalid signature" });
    }

    const event = req.body;
    const eventType = event.event || "";
    const payoutData = event.payload?.payout?.entity;

    if (!payoutData) {
      return res.status(200).json({ status: "ok" });
    }

    const payoutId = payoutData.id;
    const referenceId = payoutData.reference_id;

    if (!referenceId) {
      console.log(`[RazorpayWebhook] No reference_id on payout ${payoutId}`);
      return res.status(200).json({ status: "ok" });
    }

    const result = await query(
      "SELECT rt.*, ru.username, ru.referral_otp_number FROM referral_transactions rt JOIN referral_users ru ON rt.referral_user_id = ru.id WHERE rt.id = $1 AND rt.type = 'withdrawal'",
      [referenceId],
    );

    if (result.rows.length === 0) {
      console.log(`[RazorpayWebhook] No transaction for reference_id=${referenceId}`);
      return res.status(200).json({ status: "ok" });
    }

    const txn = result.rows[0];

    if (eventType === "payout.processed") {
      await query(
        "UPDATE referral_transactions SET status = 'completed', payout_id = $1, payout_status = 'processed', updated_at = NOW() WHERE id = $2",
        [payoutId, referenceId],
      );
      try {
        const whatsapp = new WhatsAppService();
        await whatsapp.sendTextMessage(
          txn.referral_otp_number,
          `💰 Withdrawal Credited!\n\nAmount: ₹${txn.amount}\nUPI: ${txn.upi_id || "N/A"}\n\nYour withdrawal has been credited to your UPI account.`,
        );
      } catch (whatsappErr) {
        console.error("[RazorpayWebhook] WhatsApp error:", whatsappErr.message);
      }
      console.log(`[RazorpayWebhook] payout.processed for reference_id=${referenceId}`);
    } else if (eventType === "payout.reversed" || eventType === "payout.failed") {
      await query(
        "UPDATE referral_transactions SET status = 'rejected', payout_id = $1, payout_status = $2, updated_at = NOW() WHERE id = $3",
        [payoutId, payoutData.status || 'failed', referenceId],
      );
      try {
        const whatsapp = new WhatsAppService();
        await whatsapp.sendTextMessage(
          txn.referral_otp_number,
          `❌ Withdrawal Failed\n\nAmount: ₹${txn.amount}\nUPI: ${txn.upi_id || "N/A"}\n\nYour withdrawal could not be processed. Please contact admin.`,
        );
      } catch (whatsappErr) {
        console.error("[RazorpayWebhook] WhatsApp error:", whatsappErr.message);
      }
      console.log(`[RazorpayWebhook] ${eventType} for reference_id=${referenceId}`);
    } else {
      console.log(`[RazorpayWebhook] Unhandled event type: ${eventType} for reference_id=${referenceId}`);
    }

    return res.status(200).json({ status: "ok" });
  } catch (error) {
    console.error("Error in payout webhook:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const checkRefundStatus = async (req, res) => {
  try {
    const { booking_id } = req.params;
    const bookingRes = await query("SELECT * FROM bookings WHERE booking_id = $1", [booking_id]);
    if (bookingRes.rows.length === 0) return res.status(404).json({ error: "Booking not found" });
    const booking = bookingRes.rows[0];

    if (!booking.refund_id) return res.status(400).json({ error: "No refund initiated for this booking" });
    if (booking.refund_status === "REFUND_SUCCESSFUL") {
      return res.json({ status: "REFUND_SUCCESSFUL", already_complete: true });
    }

    const mid = process.env.PAYTM_MID;
    const merchantKey = process.env.PAYTM_MERCHANT_KEY;
    if (!mid || !merchantKey) return res.status(500).json({ error: "Paytm not configured" });

    const body = { mid, orderId: booking.order_id, refId: booking.refund_id };
    const checksum = await PaytmChecksum.generateSignature(JSON.stringify(body), merchantKey);
    const paytmRes = await axios.post(
      `${getPaytmBaseUrl()}/v3/refund/query`,
      { body, head: { signature: checksum } },
      { headers: { "Content-Type": "application/json" } }
    );

    const resultInfo = paytmRes.data?.body?.resultInfo;
    const txnStatus = paytmRes.data?.body?.txnType || resultInfo?.resultStatus || "";
    let newStatus;
    if (txnStatus === "REFUND" || resultInfo?.resultStatus === "TXN_SUCCESS") {
      newStatus = "REFUND_SUCCESSFUL";
    } else if (resultInfo?.resultStatus === "PENDING") {
      newStatus = "REFUND_INITIATED";
    } else if (resultInfo?.resultStatus === "FAIL") {
      newStatus = "REFUND_FAILED";
    }

    if (newStatus && newStatus !== booking.refund_status) {
      await query("UPDATE bookings SET refund_status = $1, updated_at = NOW() WHERE booking_id = $2", [newStatus, booking_id]);
      if (newStatus === "REFUND_SUCCESSFUL") {
        try {
          const whatsapp = new WhatsAppService();
          await whatsapp.sendTextMessage(
            booking.guest_phone,
            `💰 Refund Credited!\n\nBooking ID: ${booking.booking_id}\nAmount: ₹${booking.refund_amount}\n\nYour refund has been credited to your account.`,
          );
        } catch (_) {}
      }
    }

    console.log(`[RefundStatusCheck] booking=${booking_id}, paytm_status=${txnStatus}, new_status=${newStatus}`);
    return res.json({ status: newStatus || booking.refund_status, updated: !!newStatus && newStatus !== booking.refund_status });
  } catch (error) {
    console.error("[RefundStatusCheck] Error:", error.message);
    return res.status(500).json({ error: "Failed to check refund status", details: error.message });
  }
};

const checkWithdrawalStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const txnRes = await query(
      "SELECT rt.*, ru.username, ru.referral_otp_number FROM referral_transactions rt JOIN referral_users ru ON rt.referral_user_id = ru.id WHERE rt.id = $1",
      [id]
    );
    if (txnRes.rows.length === 0) return res.status(404).json({ error: "Withdrawal not found" });
    const txn = txnRes.rows[0];

    if (!txn.payout_id) {
      return res.json({ status: txn.status, payout_id: null, message: "No payout initiated yet" });
    }
    if (txn.status === "completed") {
      return res.json({ status: "completed", payout_id: txn.payout_id, already_complete: true });
    }

    let payoutStatus;
    try {
      const payoutData = await getPayoutStatus(txn.payout_id);
      payoutStatus = payoutData.status;
    } catch (err) {
      return res.status(500).json({ error: "Failed to fetch payout status from RazorpayX", details: err.message });
    }

    let newStatus;
    if (payoutStatus === "processed") {
      newStatus = "completed";
    } else if (payoutStatus === "reversed" || payoutStatus === "cancelled") {
      newStatus = "rejected";
    } else {
      newStatus = "processing";
    }

    if (newStatus !== txn.status) {
      await query(
        "UPDATE referral_transactions SET status = $1, payout_status = $2, updated_at = NOW() WHERE id = $3",
        [newStatus, payoutStatus, id]
      );
      if (newStatus === "completed") {
        try {
          const whatsapp = new WhatsAppService();
          await whatsapp.sendTextMessage(
            txn.referral_otp_number,
            `💰 Withdrawal Credited!\n\nAmount: ₹${txn.amount}\nUPI: ${txn.upi_id || "N/A"}\n\nYour withdrawal has been credited to your UPI account.`,
          );
        } catch (_) {}
      }
    }

    console.log(`[WithdrawalStatusCheck] id=${id}, razorpay_status=${payoutStatus}, new_status=${newStatus}`);
    return res.json({ status: newStatus, payout_status: payoutStatus, payout_id: txn.payout_id, updated: newStatus !== txn.status });
  } catch (error) {
    console.error("[WithdrawalStatusCheck] Error:", error.message);
    return res.status(500).json({ error: "Failed to check withdrawal status", details: error.message });
  }
};

const getAllTransactions = async (req, res) => {
  try {
    const [bookingsRes, refundsRes, withdrawalsRes, cancelledRes] = await Promise.all([
      query(`
        SELECT
          b.booking_id AS id, 'booking' AS _type,
          b.booking_id, b.guest_name AS customer_name, b.guest_phone,
          b.property_name, b.owner_name, b.owner_phone,
          b.referral_code, b.advance_amount AS amount,
          b.total_amount, b.payment_method,
          b.booking_status AS status, b.payment_status,
          b.checkin_datetime AS check_in, b.checkout_datetime AS check_out,
          b.created_at AS date, b.refund_status, b.refund_amount,
          b.referrer_commission, b.admin_commission,
          b.referral_type, b.commission_status,
          b.unit_id, b.property_id,
          ru.username AS referrer_name
        FROM bookings b
        LEFT JOIN referral_users ru ON ru.referral_code = b.referral_code
        WHERE b.payment_status = 'SUCCESS'
          AND b.booking_status NOT IN ('CANCELLED', 'DELETED', 'REFUND_INITIATED', 'CANCELLED_NO_REFUND', 'OWNER_CANCELLED', 'CANCELLED_BY_OWNER')
        ORDER BY b.created_at DESC
      `),
      query(`
        SELECT
          b.booking_id AS id, 'refund' AS _type,
          b.booking_id, b.guest_name AS customer_name, b.guest_phone,
          b.property_name, b.owner_name, b.referral_code,
          b.refund_amount AS amount,
          b.booking_status AS status, b.payment_status,
          b.checkin_datetime AS check_in, b.checkout_datetime AS check_out,
          b.updated_at AS date, b.refund_status, b.refund_amount,
          b.advance_amount AS booking_amount,
          b.payment_method, b.transaction_id, b.refund_id,
          CASE
            WHEN b.booking_status = 'CANCELLED_BY_OWNER' THEN 'Owner'
            WHEN b.booking_status IN ('CANCELLED','CANCELLED_NO_REFUND','OWNER_CANCELLED','REFUND_INITIATED') THEN 'Admin'
            ELSE 'System'
          END AS refund_initiated_by,
          b.referrer_commission, b.admin_commission, b.unit_id, b.property_id,
          b.advance_amount AS original_amount,
          ru.username AS referrer_name
        FROM bookings b
        LEFT JOIN referral_users ru ON ru.referral_code = b.referral_code
        WHERE b.payment_status = 'SUCCESS'
          AND b.refund_status IS NOT NULL
          AND b.advance_amount > 0
        ORDER BY b.updated_at DESC
      `),
      query(`
        SELECT
          rt.id::text AS id, 'withdrawal' AS _type,
          NULL AS booking_id, ru.username AS customer_name,
          NULL AS property_name, NULL AS owner_name,
          ru.referral_code, rt.amount, rt.status,
          NULL::varchar AS payment_status,
          NULL::timestamptz AS check_in, NULL::timestamptz AS check_out,
          rt.created_at AS date, NULL::varchar AS refund_status,
          NULL::numeric AS refund_amount, NULL::numeric AS referrer_commission,
          NULL::numeric AS admin_commission, NULL::integer AS unit_id,
          NULL::varchar AS property_id,
          ru.username AS referrer_name, rt.upi_id,
          ru.referral_type, ru.referral_otp_number AS mobile,
          rt.updated_at AS processed_date,
          rt.payout_id, rt.payout_status,
          COALESCE((
            SELECT SUM(rt2.amount) FROM referral_transactions rt2
            WHERE rt2.referral_user_id = ru.id AND rt2.type = 'earning' AND rt2.status = 'available'
          ), 0) -
          COALESCE((
            SELECT SUM(rt3.amount) FROM referral_transactions rt3
            WHERE rt3.referral_user_id = ru.id AND rt3.type = 'withdrawal' AND rt3.status = 'completed'
          ), 0) AS available_balance
        FROM referral_transactions rt
        JOIN referral_users ru ON ru.id = rt.referral_user_id
        WHERE rt.type = 'withdrawal'
        ORDER BY rt.created_at DESC
      `),
      query(`
        SELECT
          b.booking_id AS id, 'cancelled' AS _type,
          b.booking_id, b.guest_name AS customer_name, b.guest_phone,
          b.property_name, b.owner_name, b.owner_phone,
          b.referral_code, b.advance_amount AS amount,
          b.total_amount, b.payment_method, b.transaction_id,
          b.booking_status AS status, b.payment_status,
          b.checkin_datetime AS check_in, b.checkout_datetime AS check_out,
          b.updated_at AS date, b.refund_status, b.refund_amount,
          b.referrer_commission, b.admin_commission, b.unit_id, b.property_id,
          b.referral_type,
          CASE
            WHEN b.booking_status = 'CANCELLED_BY_OWNER' THEN 'Owner'
            WHEN b.booking_status IN ('CANCELLED','CANCELLED_NO_REFUND','OWNER_CANCELLED','REFUND_INITIATED') THEN 'Admin'
            ELSE 'System'
          END AS refund_initiated_by,
          ru.username AS referrer_name
        FROM bookings b
        LEFT JOIN referral_users ru ON ru.referral_code = b.referral_code
        WHERE b.payment_status = 'SUCCESS'
          AND b.booking_status IN ('CANCELLED', 'REFUND_INITIATED', 'CANCELLED_NO_REFUND', 'OWNER_CANCELLED', 'CANCELLED_BY_OWNER')
        ORDER BY b.updated_at DESC
      `),
    ]);

    return res.status(200).json({
      success: true,
      bookings: bookingsRes.rows,
      refunds: refundsRes.rows,
      withdrawals: withdrawalsRes.rows,
      cancelled: cancelledRes.rows,
    });
  } catch (error) {
    console.error('Error fetching all transactions:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  initiatePaytmPayment,
  paytmRedirect,
  paytmCallback,
  paytmWebhook,
  initiateRefund,
  getRefundRequests,
  getAllBookings,
  getAllTransactions,
  verifyPaymentStatus,
  denyRefund,
  getRequestHistory,
  getWithdrawalRequests,
  processWithdrawal,
  rejectWithdrawal,
  refundWebhook,
  payoutWebhook,
  checkRefundStatus,
  checkWithdrawalStatus,
  triggerCommissions,
};

async function triggerCommissions(req, res) {
  try {
    const result = await distributeCheckoutCommissions();
    return res.json({
      success: true,
      distributed: result.distributed,
      skipped: result.skipped,
      message: `Commission distribution complete. Distributed: ${result.distributed}, Skipped: ${result.skipped}`,
    });
  } catch (err) {
    console.error("[Commission] Manual trigger error:", err.message);
    return res.status(500).json({ error: "Commission distribution failed", details: err.message });
  }
}
