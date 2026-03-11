const WithdrawalRepository = require('../repositories/withdrawalRepository');
const { query } = require('../db');
const { triggerRazorpayXPayout } = require('./razorpayService');
const { WhatsAppService } = require('../utils/whatsappService');

const WithdrawalService = {
  async requestWithdrawal(userId, amount, upiId) {
    // 1. Get user info and check status
    const userResult = await query(
      'SELECT id, username, status, referral_otp_number FROM referral_users WHERE id = $1',
      [userId]
    );
    const user = userResult.rows[0];

    if (!user || user.status !== 'active') {
      throw new Error('User is not active or not found');
    }

    // 2. Minimum withdrawal check
    if (amount < 500) {
      throw new Error('Minimum withdrawal amount is ₹500');
    }

    // 3. Dynamic balance check (deduct pending + processing withdrawals too)
    const stats = await WithdrawalRepository.getDashboardStats(userId);
    const availableBalance =
      parseFloat(stats.total_earnings) -
      parseFloat(stats.total_withdrawals) -
      parseFloat(stats.pending_withdrawals);

    if (amount > availableBalance) {
      throw new Error('Insufficient balance');
    }

    // 4. Block duplicate in-flight withdrawal
    const inFlight = await WithdrawalRepository.getInFlightWithdrawal(userId);
    if (inFlight) {
      throw new Error('You already have a withdrawal in progress');
    }

    // 5. Create the withdrawal record as 'processing'
    const txn = await WithdrawalRepository.createWithdrawal(userId, amount, upiId, 'processing');

    // 6. Trigger RazorpayX payout immediately
    const payoutResult = await triggerRazorpayXPayout(
      txn.id,
      amount,
      upiId,
      user.username,
      user.referral_otp_number
    );

    if (payoutResult.success) {
      const finalStatus = payoutResult.mapped_status || 'processing';
      await query(
        'UPDATE referral_transactions SET status = $1, payout_id = $2, payout_status = $3, updated_at = NOW() WHERE id = $4',
        [finalStatus, payoutResult.payout_id, payoutResult.payout_status, txn.id]
      );

      if (finalStatus === 'completed') {
        try {
          const whatsapp = new WhatsAppService();
          await whatsapp.sendTextMessage(
            user.referral_otp_number,
            `💰 Withdrawal Successful!\n\nAmount: ₹${amount}\nUPI: ${upiId}\n\nYour withdrawal has been processed and will be credited to your UPI account shortly.`
          );
        } catch (_) {}
      }

      return {
        ...txn,
        status: finalStatus,
        payout_id: payoutResult.payout_id,
        payout_status: payoutResult.payout_status,
        message: finalStatus === 'completed'
          ? 'Withdrawal processed successfully!'
          : 'Withdrawal initiated — payout is being processed by RazorpayX.',
      };
    } else if (payoutResult.skipped) {
      // RazorpayX not configured — keep as 'pending' for admin to process manually
      await query(
        "UPDATE referral_transactions SET status = 'pending', updated_at = NOW() WHERE id = $1",
        [txn.id]
      );
      return {
        ...txn,
        status: 'pending',
        message: 'Withdrawal request submitted. It will be processed within 24 hours.',
      };
    } else {
      // Payout failed — mark as failed so user can retry
      await query(
        "UPDATE referral_transactions SET status = 'failed', payout_status = 'failed', updated_at = NOW() WHERE id = $1",
        [txn.id]
      );
      throw new Error(payoutResult.reason || 'Payout failed. Please try again or contact support.');
    }
  }
};

module.exports = WithdrawalService;
