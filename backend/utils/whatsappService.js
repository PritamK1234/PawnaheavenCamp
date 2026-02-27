const crypto = require('crypto');

class WhatsAppService {
  constructor() {
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    this.appSecret = process.env.WHATSAPP_APP_SECRET;
    this.isConfigured = !!(this.phoneNumberId && this.accessToken);

    if (!this.isConfigured) {
      console.warn('WhatsApp not configured. Missing WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN');
    }
  }

  formatPhone(phone) {
    let cleaned = (phone || '').replace(/[\s\-\(\)]/g, '').replace(/^\+/, '');
    if (cleaned.length === 10) {
      cleaned = '91' + cleaned;
    }
    return cleaned;
  }

  logMessage(type, to, payload) {
    console.log(`[WhatsApp ${type}] Would send to ${to}:`, JSON.stringify(payload, null, 2));
  }

  verifySignature(rawBody, signatureHeader) {
    if (!this.appSecret) {
      console.warn('[WhatsApp] WHATSAPP_APP_SECRET not set — skipping signature verification');
      return true;
    }

    if (!signatureHeader) {
      console.warn('[WhatsApp] No x-hub-signature-256 header present');
      return false;
    }

    const expected = 'sha256=' + crypto
      .createHmac('sha256', this.appSecret)
      .update(rawBody)
      .digest('hex');

    try {
      return crypto.timingSafeEqual(
        Buffer.from(signatureHeader),
        Buffer.from(expected)
      );
    } catch (_) {
      return false;
    }
  }

  async callWhatsAppAPI(payload, label) {
    if (!this.isConfigured) {
      this.logMessage(label, payload.to, payload);
      return { success: true, simulated: true, messageId: null };
    }

    try {
      console.log(`[WhatsApp ${label}] Sending to ${payload.to}...`);
      const response = await fetch(
        `https://graph.facebook.com/v21.0/${this.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      const responseText = await response.text();
      let responseData;
      try { responseData = JSON.parse(responseText); } catch (_) { responseData = responseText; }

      if (!response.ok) {
        console.error(`[WhatsApp ${label}] API ERROR (HTTP ${response.status}):`, JSON.stringify(responseData, null, 2));
        const errorCode = responseData?.error?.code;
        const errorMsg = responseData?.error?.message;
        console.error(`[WhatsApp ${label}] Error code: ${errorCode}, Message: ${errorMsg}`);
        return { success: false, error: responseData, httpStatus: response.status, messageId: null };
      }

      const messageId = responseData?.messages?.[0]?.id || null;
      console.log(`[WhatsApp ${label}] SUCCESS — messageId: ${messageId}`);
      return { success: true, data: responseData, messageId };
    } catch (error) {
      console.error(`[WhatsApp ${label}] NETWORK ERROR:`, error.message);
      return { success: false, error: error.message, messageId: null };
    }
  }

  async sendTextMessage(to, text) {
    const phone = this.formatPhone(to);
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phone,
      type: 'text',
      text: { body: text },
    };
    const result = await this.callWhatsAppAPI(payload, 'TEXT');
    return { success: result.success, messageId: result.messageId };
  }

  async sendTemplateMessage(to, templateName, languageCode = 'en_US', components = []) {
    const phone = this.formatPhone(to);
    const payload = {
      messaging_product: 'whatsapp',
      to: phone,
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
      },
    };
    if (components.length > 0) {
      payload.template.components = components;
    }
    const result = await this.callWhatsAppAPI(payload, `TEMPLATE:${templateName}`);
    return result;
  }

  async sendBookingNotifications(booking, actionToken, frontendUrl) {
    const checkinDate = new Date(booking.checkin_datetime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
    const checkoutDate = new Date(booking.checkout_datetime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
    const dueAmount = (booking.total_amount || 0) - booking.advance_amount;
    const confirmUrl = `${frontendUrl}/api/bookings/owner-action?token=${actionToken}&action=CONFIRM`;
    const cancelUrl = `${frontendUrl}/api/bookings/owner-action?token=${actionToken}&action=CANCEL`;

    console.log('=== SENDING WHATSAPP NOTIFICATIONS ===');
    console.log('WhatsApp configured:', this.isConfigured);
    console.log('Phone Number ID:', this.phoneNumberId ? `${this.phoneNumberId.substring(0, 5)}...` : 'MISSING');
    console.log('Access Token:', this.accessToken ? `${this.accessToken.substring(0, 10)}...` : 'MISSING');

    console.log('--- Guest notification ---');
    const guestResult = await this.sendTextMessage(
      booking.guest_phone,
      `✅ Payment Successful!\n\nBooking ID: ${booking.booking_id}\nAmount Paid: ₹${booking.advance_amount}\n\nYour booking is received. You will get confirmation within 1 hour.`,
    );
    console.log('Guest result:', guestResult);

    console.log('--- Owner notification ---');
    const ownerResult = await this.sendInteractiveButtons(booking.owner_phone,
      `🔔 New Booking Request\n\nProperty: ${booking.property_name}\nGuest: ${booking.guest_name} (${booking.guest_phone})\nCheck-in: ${checkinDate}\nCheck-out: ${checkoutDate}\nPersons: ${booking.persons || (booking.veg_guest_count || 0) + (booking.nonveg_guest_count || 0)}\nAdvance Paid: ₹${booking.advance_amount}\nDue Amount: ₹${dueAmount}\n\nPlease confirm or cancel this booking:`,
      [
        { id: JSON.stringify({ token: actionToken, action: 'CONFIRM' }), title: '✅ Confirm' },
        { id: JSON.stringify({ token: actionToken, action: 'CANCEL' }), title: '❌ Cancel' },
      ],
    );
    console.log('Owner result:', ownerResult);

    console.log('--- Admin notification ---');
    const adminResult = await this.sendTextMessage(
      booking.admin_phone,
      `📋 New Booking Alert\n\nBooking ID: ${booking.booking_id}\nProperty: ${booking.property_name}\nGuest: ${booking.guest_name} (${booking.guest_phone})\nAdvance: ₹${booking.advance_amount}\nDue: ₹${dueAmount}\nStatus: Waiting for owner confirmation\n\nConfirm: ${confirmUrl}\nCancel: ${cancelUrl}`,
    );
    console.log('Admin result:', adminResult);
    console.log('=== WHATSAPP NOTIFICATIONS COMPLETE ===');

    return { guest: guestResult, owner: ownerResult, admin: adminResult };
  }

  async sendInteractiveButtons(to, bodyText, buttons) {
    const phone = this.formatPhone(to);
    const interactiveButtons = buttons.map((btn) => ({
      type: 'reply',
      reply: {
        id: btn.id,
        title: btn.title,
      },
    }));

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phone,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: bodyText },
        action: {
          buttons: interactiveButtons,
        },
      },
    };

    const result = await this.callWhatsAppAPI(payload, 'INTERACTIVE');
    return { success: result.success, messageId: result.messageId };
  }

  extractButtonResponse(webhookPayload) {
    try {
      const entry = webhookPayload?.entry?.[0];
      const change = entry?.changes?.[0];
      const message = change?.value?.messages?.[0];

      if (!message || message.type !== 'interactive') {
        return null;
      }

      const buttonReply = message.interactive?.button_reply;
      if (!buttonReply) {
        return null;
      }

      return {
        from: message.from,
        buttonId: buttonReply.id,
        messageId: message.id,
      };
    } catch (error) {
      console.error('Failed to extract button response:', error);
      return null;
    }
  }

  verifyWebhook(mode, token, challenge) {
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'villa_booking_verify_2025';

    if (mode === 'subscribe' && token === verifyToken) {
      return challenge;
    }

    return null;
  }
}

module.exports = { WhatsAppService };
