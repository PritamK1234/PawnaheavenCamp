const crypto = require("crypto");
const axios = require("axios");
const { query } = require("../db");
const PaytmChecksum = require("paytmchecksum");
const { WhatsAppService } = require("../utils/whatsappService");

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
    const advanceAmt = parseFloat(booking.advance_amount);
    let adminComm = 0;
    let referrerComm = 0;
    let commStatus = null;

    if (status === "TXN_SUCCESS") {
      if (hasReferral) {
        adminComm = Math.round(advanceAmt * 0.15 * 100) / 100;
        referrerComm = Math.round(advanceAmt * 0.15 * 100) / 100;
      } else {
        adminComm = Math.round(advanceAmt * 0.3 * 100) / 100;
        referrerComm = 0;
      }
      commStatus = "PENDING";
    }

    const actionToken = generateActionToken();
    const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000);

    await query(
      `UPDATE bookings SET 
        payment_status = $1, booking_status = $2, transaction_id = $3,
        payment_method = $4, webhook_processed = true, 
        admin_commission = $5, referrer_commission = $6, commission_status = $7,
        action_token = $8, action_token_used = false, 
        action_token_expires_at = $9, updated_at = NOW()
      WHERE booking_id = $10`,
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
        booking.booking_id,
      ],
    );

    console.log("Booking updated successfully:", {
      booking_id: booking.booking_id,
      order_id: orderId,
      payment_status: updatePaymentStatus,
      booking_status: updateBookingStatus,
    });

    if (status === "TXN_SUCCESS") {
      const whatsapp = new WhatsAppService();

      await whatsapp.sendTextMessage(
        booking.guest_phone,
        `✅ Payment Successful!\n\nBooking ID: ${booking.booking_id}\nAmount Paid: ₹${txnAmount}\n\nYour booking is received. You will get confirmation within 1 hour.`,
      );

      const checkinDate = new Date(booking.checkin_datetime).toLocaleString(
        "en-IN",
        {
          dateStyle: "medium",
          timeStyle: "short",
        },
      );
      const checkoutDate = new Date(booking.checkout_datetime).toLocaleString(
        "en-IN",
        {
          dateStyle: "medium",
          timeStyle: "short",
        },
      );

      const dueAmount = (booking.total_amount || 0) - booking.advance_amount;
      const frontendUrl = `https://${getPublicDomain(req)}`;
      const confirmUrl = `${frontendUrl}/api/bookings/owner-action?token=${actionToken}&action=CONFIRM`;
      const cancelUrl = `${frontendUrl}/api/bookings/owner-action?token=${actionToken}&action=CANCEL`;

      const ownerMessage = `🔔 New Booking Request\n\nProperty: ${booking.property_name}\nGuest: ${booking.guest_name} (${booking.guest_phone})\nCheck-in: ${checkinDate}\nCheck-out: ${checkoutDate}\nPersons: ${booking.persons || 0}\nAdvance Paid: ₹${booking.advance_amount}\nDue Amount: ₹${dueAmount}\n\nPlease confirm or cancel this booking:`;

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
        `📋 New Booking Alert\n\nBooking ID: ${booking.booking_id}\nProperty: ${booking.property_name}\nOwner: ${booking.owner_phone}\nGuest: ${booking.guest_name} (${booking.guest_phone})\nAdvance: ₹${booking.advance_amount}\nDue: ₹${dueAmount}\nStatus: Waiting for owner confirmation\n\nConfirm: ${confirmUrl}\nCancel: ${cancelUrl}`,
      );

      console.log(
        "WhatsApp notifications sent for booking:",
        booking.booking_id,
      );
    }

    const frontendUrl = `https://${getPublicDomain(req)}`;
    const redirectUrl =
      status === "TXN_SUCCESS"
        ? `${frontendUrl}/ticket?booking_id=${booking.booking_id}`
        : `${frontendUrl}`;

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
            <p>Redirecting to your booking ticket...</p>
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
          <a href="${redirectUrl}" class="btn">${status === "TXN_SUCCESS" ? "View Ticket" : "Back to Home"}</a>
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
    const advanceAmount = parseFloat(booking.advance_amount);
    let adminCommission = 0;
    let referrerCommission = 0;
    let commissionStatus = null;

    if (status === "TXN_SUCCESS") {
      if (hasReferral) {
        adminCommission = Math.round(advanceAmount * 0.15 * 100) / 100;
        referrerCommission = Math.round(advanceAmount * 0.15 * 100) / 100;
      } else {
        adminCommission = Math.round(advanceAmount * 0.3 * 100) / 100;
        referrerCommission = 0;
      }
      commissionStatus = "PENDING";
    }

    const actionToken = generateActionToken();
    const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000);

    await query(
      `UPDATE bookings SET 
        payment_status = $1, booking_status = $2, transaction_id = $3,
        payment_method = $4, webhook_processed = true,
        admin_commission = $5, referrer_commission = $6, commission_status = $7,
        action_token = $8, action_token_used = false, action_token_expires_at = $9,
        updated_at = NOW()
      WHERE booking_id = $10`,
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
        booking.booking_id,
      ],
    );

    console.log("Webhook: Booking updated:", {
      booking_id: booking.booking_id,
      payment_status: updatePaymentStatus,
      booking_status: updateBookingStatus,
      commission: { admin: adminCommission, referrer: referrerCommission },
    });

    if (status === "TXN_SUCCESS") {
      const whatsapp = new WhatsAppService();

      await whatsapp.sendTextMessage(
        booking.guest_phone,
        `✅ Payment Successful!\n\nBooking ID: ${booking.booking_id}\nAmount Paid: ₹${txnAmount}\n\nYour booking request has been received.\nOwner confirmation is pending.\nTicket will be shared within 1 hour.`,
      );

      const checkinDate = new Date(booking.checkin_datetime).toLocaleString(
        "en-IN",
        { dateStyle: "medium", timeStyle: "short" },
      );
      const checkoutDate = new Date(booking.checkout_datetime).toLocaleString(
        "en-IN",
        { dateStyle: "medium", timeStyle: "short" },
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

      if (refundStatus === "REFUND_SUCCESSFUL") {
        const whatsapp = new WhatsAppService();
        await whatsapp.sendTextMessage(
          booking.guest_phone,
          `💰 Refund Successful!\n\nBooking ID: ${booking.booking_id}\nRefund Amount: ₹${refundAmount}\n\nYour refund has been successfully credited to your account.`,
        );
        await whatsapp.sendTextMessage(
          booking.admin_phone,
          `✅ Refund Completed\n\nBooking ID: ${booking.booking_id}\nGuest: ${booking.guest_name} (${booking.guest_phone})\nRefund Amount: ₹${refundAmount}\nRefund ID: ${refundId}`,
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
        AND (refund_status IS NULL OR refund_status NOT IN ('REFUND_SUCCESSFUL'))
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
    const txnStatus = statusBody?.resultInfo?.resultStatus;
    const paytmStatus = statusBody?.resultInfo?.resultCode;

    console.log("Paytm status check for", booking_id, ":", statusBody?.resultInfo);

    if (txnStatus === "TXN_SUCCESS" && booking.payment_status !== "SUCCESS") {
      const txnId = statusBody.txnId || "";
      const txnAmount = statusBody.txnAmount || booking.advance_amount;
      const paymentMode = statusBody.paymentMode || "";

      const hasReferral = !!booking.referral_code;
      const advanceAmt = parseFloat(booking.advance_amount);
      let adminComm = 0;
      let referrerComm = 0;
      let commStatus = null;

      if (hasReferral) {
        adminComm = Math.round(advanceAmt * 0.15 * 100) / 100;
        referrerComm = Math.round(advanceAmt * 0.15 * 100) / 100;
      } else {
        adminComm = Math.round(advanceAmt * 0.3 * 100) / 100;
      }
      commStatus = "PENDING";

      const actionToken = generateActionToken();
      const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000);

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
        const checkinDate = new Date(booking.checkin_datetime).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
        const checkoutDate = new Date(booking.checkout_datetime).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
        const dueAmount = (booking.total_amount || 0) - booking.advance_amount;
        const frontendUrl = `https://${process.env.REPLIT_DOMAINS?.split(",")[0] || "pawnahavencamp.com"}`;
        const confirmUrl = `${frontendUrl}/api/bookings/owner-action?token=${actionToken}&action=CONFIRM`;
        const cancelUrl = `${frontendUrl}/api/bookings/owner-action?token=${actionToken}&action=CANCEL`;

        await whatsapp.sendTextMessage(
          booking.guest_phone,
          `✅ Payment Successful!\n\nBooking ID: ${booking.booking_id}\nAmount Paid: ₹${txnAmount}\n\nYour booking is received. You will get confirmation within 1 hour.`,
        );

        await whatsapp.sendInteractiveButtons(booking.owner_phone,
          `🔔 New Booking Request\n\nProperty: ${booking.property_name}\nGuest: ${booking.guest_name} (${booking.guest_phone})\nCheck-in: ${checkinDate}\nCheck-out: ${checkoutDate}\nPersons: ${booking.persons || 0}\nAdvance Paid: ₹${booking.advance_amount}\nDue Amount: ₹${dueAmount}\n\nPlease confirm or cancel this booking:`,
          [
            { id: JSON.stringify({ token: actionToken, action: "CONFIRM" }), title: "✅ Confirm" },
            { id: JSON.stringify({ token: actionToken, action: "CANCEL" }), title: "❌ Cancel" },
          ],
        );

        await whatsapp.sendTextMessage(
          booking.admin_phone,
          `📋 New Booking Alert\n\nBooking ID: ${booking.booking_id}\nProperty: ${booking.property_name}\nGuest: ${booking.guest_name} (${booking.guest_phone})\nAdvance: ₹${booking.advance_amount}\nDue: ₹${dueAmount}\nStatus: Waiting for owner confirmation\n\nConfirm: ${confirmUrl}\nCancel: ${cancelUrl}`,
        );
      } catch (whatsappErr) {
        console.error("WhatsApp notification error during status verify:", whatsappErr.message);
      }

      return res.json({
        success: true,
        payment_status: "SUCCESS",
        booking_status: "PENDING_OWNER_CONFIRMATION",
        booking_id: booking.booking_id,
      });
    }

    if (txnStatus === "TXN_FAILURE" && booking.payment_status !== "FAILED") {
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

module.exports = {
  initiatePaytmPayment,
  paytmRedirect,
  paytmCallback,
  paytmWebhook,
  initiateRefund,
  getRefundRequests,
  getAllBookings,
  verifyPaymentStatus,
};
