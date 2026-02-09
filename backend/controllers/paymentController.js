const crypto = require('crypto');
const { query } = require('../db');
const { PaytmChecksum } = require('../utils/paytmChecksum');
const { WhatsAppService } = require('../utils/whatsappService');

function generatePaytmOrderId() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `PAYTM_${timestamp}_${random}`;
}

function generateActionToken() {
  return crypto.randomBytes(32).toString('hex');
}

const initiatePaytmPayment = async (req, res) => {
  try {
    const { booking_id, channel_id } = req.body;

    if (!booking_id) {
      return res.status(400).json({ error: 'Booking ID is required' });
    }

    const result = await query(
      'SELECT * FROM bookings WHERE booking_id = $1',
      [booking_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = result.rows[0];

    if (booking.payment_status === 'SUCCESS') {
      return res.status(400).json({ error: 'Payment already completed for this booking' });
    }

    const paytmOrderId = generatePaytmOrderId();
    const channelId = channel_id || process.env.PAYTM_CHANNEL_ID || 'WEB';

    const mid = process.env.PAYTM_MID || 'SpwYpD36833569776448';
    const website = process.env.PAYTM_WEBSITE || 'WEBSTAGING';
    const industryType = process.env.PAYTM_INDUSTRY_TYPE || 'Retail';
    const merchantKey = process.env.PAYTM_MERCHANT_KEY || 'j@D7fI3pAMAl7nQC';
    const rawDomain = process.env.REPLIT_DOMAINS || process.env.REPLIT_DEV_DOMAIN || '';
    const publicDomain = (rawDomain.includes(',') ? rawDomain.split(',')[0] : rawDomain) || req.get('x-forwarded-host') || req.get('host');
    const callbackUrl = `https://${publicDomain}/api/payments/paytm/callback`;
    const gatewayUrl = process.env.PAYTM_GATEWAY_URL || 'https://securegw-stage.paytm.in/order/process';
    
    res.setHeader('Content-Security-Policy', "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; img-src * data: blob:; frame-ancestors *; script-src * 'unsafe-inline' 'unsafe-eval'; connect-src *;");
    res.setHeader('X-Frame-Options', 'ALLOWALL');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (!mid || !website || !industryType || !merchantKey) {
      console.error('Missing Paytm configuration');
      return res.status(500).json({ error: 'Payment gateway not configured' });
    }

    const paytmParams = {
      MID: String(mid),
      WEBSITE: String(website),
      INDUSTRY_TYPE_ID: String(industryType),
      CHANNEL_ID: String(channelId),
      ORDER_ID: String(paytmOrderId),
      CUST_ID: String(booking.guest_phone || 'GUEST'),
      MOBILE_NO: String(booking.guest_phone || '0000000000'),
      EMAIL: String(`${booking.guest_phone || 'guest'}@guest.com`),
      TXN_AMOUNT: String(parseFloat(booking.advance_amount).toFixed(2)),
      CALLBACK_URL: String(callbackUrl),
    };

    const checksum = await PaytmChecksum.generateChecksum(paytmParams, merchantKey);

    console.log('Payment Parameters:', {
      mid,
      website,
      industryType,
      orderId: paytmOrderId,
      amount: booking.advance_amount,
      gatewayUrl,
    });

    await query(
      'UPDATE bookings SET order_id = $1 WHERE booking_id = $2',
      [paytmOrderId, booking_id]
    );

    return res.status(200).json({
      success: true,
      paytm_params: {
        ...paytmParams,
        CHECKSUMHASH: checksum,
      },
      gateway_url: gatewayUrl,
      order_id: paytmOrderId,
      booking_id: booking_id,
      amount: booking.advance_amount,
    });
  } catch (error) {
    console.error('Error initiating payment:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
};

const paytmCallback = async (req, res) => {
  try {
    const contentType = req.headers['content-type'] || '';
    let paytmResponse;

    if (contentType.includes('application/x-www-form-urlencoded')) {
      paytmResponse = req.body;
    } else if (contentType.includes('application/json')) {
      paytmResponse = req.body;
    } else {
      return res.status(400).json({ error: 'Unsupported content type' });
    }

    console.log('Paytm callback received:', paytmResponse);

    const checksumHash = paytmResponse.CHECKSUMHASH;
    if (!checksumHash) {
      return res.status(400).json({ error: 'Checksum not found in response' });
    }

    const merchantKey = process.env.PAYTM_MERCHANT_KEY || 'j@D7fI3pAMAl7nQC';
    const isValidChecksum = await PaytmChecksum.verifyChecksumByObject(
      paytmResponse,
      merchantKey,
      checksumHash
    );

    if (!isValidChecksum) {
      console.error('Invalid checksum received from Paytm');
      return res.status(400).json({ error: 'Invalid checksum - payment verification failed' });
    }

    const orderId = paytmResponse.ORDERID;
    const txnId = paytmResponse.TXNID || '';
    const txnAmount = paytmResponse.TXNAMOUNT || '';
    const status = paytmResponse.STATUS || '';
    const respMsg = paytmResponse.RESPMSG || '';

    const result = await query(
      'SELECT * FROM bookings WHERE order_id = $1',
      [orderId]
    );

    if (result.rows.length === 0) {
      console.error('Booking not found for order_id:', orderId);
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = result.rows[0];

    if (booking.webhook_processed && booking.payment_status === 'SUCCESS') {
      console.log('Webhook already processed for booking:', booking.booking_id);
      const frontendUrl = process.env.FRONTEND_URL || `https://${req.get('x-forwarded-host') || req.get('host')}`;
      return res.redirect(`${frontendUrl}/ticket?booking_id=${booking.booking_id}`);
    }

    if (parseFloat(txnAmount) !== parseFloat(booking.advance_amount)) {
      console.error('Amount mismatch:', { expected: booking.advance_amount, received: txnAmount });
      return res.status(400).json({ error: 'Amount mismatch detected' });
    }

    let updatePaymentStatus = 'FAILED';
    let updateBookingStatus = 'PAYMENT_FAILED';

    if (status === 'TXN_SUCCESS') {
      updatePaymentStatus = 'SUCCESS';
      updateBookingStatus = 'PENDING_OWNER_CONFIRMATION';
    } else if (status === 'PENDING') {
      updatePaymentStatus = 'PENDING';
      updateBookingStatus = 'PAYMENT_PENDING';
    }

    const actionToken = generateActionToken();
    const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000);

    await query(
      `UPDATE bookings SET 
        payment_status = $1, booking_status = $2, transaction_id = $3,
        webhook_processed = true, action_token = $4, action_token_used = false, 
        action_token_expires_at = $5, updated_at = NOW()
      WHERE booking_id = $6`,
      [updatePaymentStatus, updateBookingStatus, txnId, actionToken, tokenExpiry, booking.booking_id]
    );

    console.log('Booking updated successfully:', {
      booking_id: booking.booking_id,
      order_id: orderId,
      payment_status: updatePaymentStatus,
      booking_status: updateBookingStatus,
    });

    if (status === 'TXN_SUCCESS') {
      const whatsapp = new WhatsAppService();

      await whatsapp.sendTextMessage(
        booking.guest_phone,
        `✅ Payment Successful!\n\nBooking ID: ${booking.booking_id}\nAmount Paid: ₹${txnAmount}\n\nYour booking is received. You will get confirmation within 1 hour.`
      );

      const checkinDate = new Date(booking.checkin_datetime).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
      const checkoutDate = new Date(booking.checkout_datetime).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });

      const dueAmount = (booking.total_amount || 0) - booking.advance_amount;
      const frontendUrl = process.env.FRONTEND_URL || `https://${req.get('x-forwarded-host') || req.get('host')}`;
      const confirmUrl = `${frontendUrl}/api/bookings/owner-action?token=${actionToken}&action=CONFIRM`;
      const cancelUrl = `${frontendUrl}/api/bookings/owner-action?token=${actionToken}&action=CANCEL`;

      const ownerMessage = `🔔 New Booking Request\n\nProperty: ${booking.property_name}\nGuest: ${booking.guest_name} (${booking.guest_phone})\nCheck-in: ${checkinDate}\nCheck-out: ${checkoutDate}\nPersons: ${booking.persons || 0}\nAdvance Paid: ₹${booking.advance_amount}\nDue Amount: ₹${dueAmount}\n\nPlease confirm or cancel this booking:`;

      await whatsapp.sendInteractiveButtons(
        booking.owner_phone,
        ownerMessage,
        [
          {
            id: JSON.stringify({ token: actionToken, action: 'CONFIRM' }),
            title: '✅ Confirm',
          },
          {
            id: JSON.stringify({ token: actionToken, action: 'CANCEL' }),
            title: '❌ Cancel',
          },
        ]
      );

      await whatsapp.sendTextMessage(
        booking.admin_phone,
        `📋 New Booking Alert\n\nBooking ID: ${booking.booking_id}\nProperty: ${booking.property_name}\nOwner: ${booking.owner_phone}\nGuest: ${booking.guest_name} (${booking.guest_phone})\nAdvance: ₹${booking.advance_amount}\nDue: ₹${dueAmount}\nStatus: Waiting for owner confirmation\n\nConfirm: ${confirmUrl}\nCancel: ${cancelUrl}`
      );

      console.log('WhatsApp notifications sent for booking:', booking.booking_id);
    }

    const frontendUrl = process.env.FRONTEND_URL || `https://${req.get('x-forwarded-host') || req.get('host')}`;
    const redirectUrl = status === 'TXN_SUCCESS'
      ? `${frontendUrl}/ticket?booking_id=${booking.booking_id}`
      : `${frontendUrl}`;

    return res.status(200).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payment ${status === 'TXN_SUCCESS' ? 'Success' : 'Failed'}</title>
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
          ${status === 'TXN_SUCCESS' ? `
            <div class="icon success">✓</div>
            <h1 class="success">Payment Successful!</h1>
            <p>Redirecting to your booking ticket...</p>
          ` : `
            <div class="icon failed">✗</div>
            <h1 class="failed">Payment Failed</h1>
            <p>${respMsg}</p>
          `}
          <div class="details">
            <p><strong>Booking ID:</strong> ${booking.booking_id}</p>
            <p><strong>Order ID:</strong> ${orderId}</p>
            ${txnId ? `<p><strong>Transaction ID:</strong> ${txnId}</p>` : ''}
            <p><strong>Amount:</strong> ₹${txnAmount}</p>
            <p><strong>Status:</strong> ${status}</p>
          </div>
          <a href="${redirectUrl}" class="btn">${status === 'TXN_SUCCESS' ? 'View Ticket' : 'Back to Home'}</a>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Error in Paytm callback:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
};

module.exports = {
  initiatePaytmPayment,
  paytmCallback,
};
