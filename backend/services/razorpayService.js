const axios = require('axios');
const crypto = require('crypto');

const RAZORPAY_BASE_URL = 'https://api.razorpay.com/v1';

function getRazorpayAuth() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return null;
  return { username: keyId, password: keySecret };
}

async function findOrCreateContact(username, mobile) {
  const auth = getRazorpayAuth();
  if (!auth) throw new Error('RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET not configured');

  const response = await axios.post(
    `${RAZORPAY_BASE_URL}/contacts`,
    {
      name: username || 'Referral Partner',
      contact: mobile || undefined,
      type: 'employee',
    },
    { auth }
  );
  return response.data;
}

async function createFundAccount(contactId, upiId) {
  const auth = getRazorpayAuth();
  if (!auth) throw new Error('RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET not configured');

  const response = await axios.post(
    `${RAZORPAY_BASE_URL}/fund_accounts`,
    {
      contact_id: contactId,
      account_type: 'vpa',
      vpa: { address: upiId },
    },
    { auth }
  );
  return response.data;
}

async function createPayout(fundAccountId, amountInRupees, referenceId) {
  const auth = getRazorpayAuth();
  if (!auth) throw new Error('RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET not configured');

  const accountNumber = process.env.RAZORPAY_ACCOUNT_NUMBER;
  if (!accountNumber) throw new Error('RAZORPAY_ACCOUNT_NUMBER not configured');

  const amountInPaise = Math.round(parseFloat(amountInRupees) * 100);
  const idempotencyKey = `payout_${referenceId}_${Date.now()}`;

  const response = await axios.post(
    `${RAZORPAY_BASE_URL}/payouts`,
    {
      account_number: accountNumber,
      fund_account_id: fundAccountId,
      amount: amountInPaise,
      currency: 'INR',
      mode: 'UPI',
      purpose: 'payout',
      queue_if_low_balance: true,
      reference_id: String(referenceId),
      narration: 'Referral Partner Withdrawal',
    },
    {
      auth,
      headers: { 'X-Payout-Idempotency': idempotencyKey },
    }
  );
  return response.data;
}

async function getPayoutStatus(payoutId) {
  const auth = getRazorpayAuth();
  if (!auth) throw new Error('RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET not configured');

  const response = await axios.get(
    `${RAZORPAY_BASE_URL}/payouts/${payoutId}`,
    { auth }
  );
  return response.data;
}

function verifyRazorpayWebhookSignature(rawBody, signature) {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.warn('[RazorpayWebhook] RAZORPAY_WEBHOOK_SECRET not set — skipping signature verification');
    return true;
  }
  const expected = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');
  return expected === signature;
}

async function triggerRazorpayXPayout(withdrawalId, amount, upiId, username, mobile) {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const accountNumber = process.env.RAZORPAY_ACCOUNT_NUMBER;

  if (!keyId || !keySecret || !accountNumber) {
    console.warn(`[RazorpayX] Credentials not configured — payout for withdrawal #${withdrawalId} skipped (manual processing required)`);
    return { skipped: true, reason: 'not_configured' };
  }

  try {
    console.log(`[RazorpayX] Creating contact for withdrawal #${withdrawalId}...`);
    const contact = await findOrCreateContact(username, mobile);

    console.log(`[RazorpayX] Creating fund account for UPI ${upiId}...`);
    const fundAccount = await createFundAccount(contact.id, upiId);

    console.log(`[RazorpayX] Initiating payout of ₹${amount} to ${upiId}...`);
    const payout = await createPayout(fundAccount.id, amount, withdrawalId);

    const rzpStatus = payout.status;
    let mappedStatus;
    if (rzpStatus === 'processed') {
      mappedStatus = 'completed';
    } else if (rzpStatus === 'reversed' || rzpStatus === 'cancelled') {
      mappedStatus = 'rejected';
    } else {
      mappedStatus = 'processing';
    }

    console.log(`[RazorpayX] Payout created — id: ${payout.id}, status: ${rzpStatus}`);
    return {
      success: true,
      payout_id: payout.id,
      payout_status: rzpStatus,
      mapped_status: mappedStatus,
    };
  } catch (err) {
    const errMsg = err.response?.data?.description || err.response?.data?.error?.description || err.message;
    console.error(`[RazorpayX] Payout error for withdrawal #${withdrawalId}:`, errMsg);
    return { success: false, reason: errMsg };
  }
}

async function validateUpiVpa(upiId) {
  const auth = getRazorpayAuth();
  if (!auth) {
    console.warn('[RazorpayUPI] Credentials not configured — skipping VPA validation');
    return { skipped: true };
  }
  try {
    const response = await axios.post(
      `${RAZORPAY_BASE_URL}/payments/validate/vpa`,
      { value: upiId },
      { auth }
    );
    const data = response.data;
    const customerName = data.customer_name || data.name || null;
    return { valid: true, name: customerName };
  } catch (err) {
    const status = err.response?.status;
    const errData = err.response?.data;
    if (status === 400 || errData?.error?.code === 'BAD_REQUEST_ERROR') {
      return { valid: false };
    }
    console.error('[RazorpayUPI] VPA validation error:', errData || err.message);
    return { skipped: true, reason: err.message };
  }
}

module.exports = {
  triggerRazorpayXPayout,
  getPayoutStatus,
  verifyRazorpayWebhookSignature,
  validateUpiVpa,
};
