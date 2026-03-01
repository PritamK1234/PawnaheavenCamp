const { pool } = require('../db');

const REFERRAL_RATES = {
  owner:      { referrer: 0.25, admin: 0.05 },
  b2b:        { referrer: 0.22, admin: 0.08 },
  owners_b2b: { referrer: 0.22, admin: 0.08 },
  public:     { referrer: 0.15, admin: 0.15 },
};

function calcCommission(totalAmount, referralType) {
  const type = (referralType || '').toLowerCase();
  const rates = REFERRAL_RATES[type] || REFERRAL_RATES.public;
  return {
    referrerAmount: Math.round(totalAmount * rates.referrer * 100) / 100,
    adminAmount:    Math.round(totalAmount * rates.admin    * 100) / 100,
  };
}

function resolveTotalAmount(booking) {
  const total   = parseFloat(booking.total_amount);
  const advance = parseFloat(booking.advance_amount);
  if (total && total > 0) return total;
  if (advance && advance > 0) return Math.round((advance / 0.30) * 100) / 100;
  return 0;
}

async function distributeCheckoutCommissions() {
  const client = await pool.connect();
  let distributed = 0;
  let skipped = 0;

  try {
    const eligible = await client.query(
      `SELECT b.id, b.booking_id, b.property_name, b.guest_name,
              b.advance_amount, b.total_amount, b.referral_code,
              b.referral_type, b.checkout_datetime
       FROM bookings b
       WHERE b.booking_status  = 'TICKET_GENERATED'
         AND b.checkout_datetime < NOW()
         AND (b.commission_paid IS NULL OR b.commission_paid = false)
       ORDER BY b.checkout_datetime ASC`
    );

    for (const booking of eligible.rows) {
      const totalAmount = resolveTotalAmount(booking);

      if (totalAmount <= 0) {
        console.warn(`[Commission] Skipping booking ${booking.booking_id} — cannot resolve total_amount`);
        skipped++;
        continue;
      }

      await client.query('BEGIN');

      try {
        const alreadyPaid = await client.query(
          `SELECT commission_paid FROM bookings WHERE id = $1 FOR UPDATE`,
          [booking.id]
        );
        if (alreadyPaid.rows[0]?.commission_paid === true) {
          await client.query('ROLLBACK');
          skipped++;
          continue;
        }

        if (booking.referral_code) {
          const referrerRes = await client.query(
            `SELECT id FROM referral_users WHERE referral_code = $1 AND status = 'active'`,
            [booking.referral_code]
          );

          if (referrerRes.rows.length === 0) {
            console.warn(`[Commission] No active referrer found for code ${booking.referral_code} — booking ${booking.booking_id}`);
            await client.query(
              `UPDATE bookings
               SET commission_paid = true, commission_paid_at = NOW(),
                   commission_status = 'DISTRIBUTED_NO_REFERRER', updated_at = NOW()
               WHERE id = $1`,
              [booking.id]
            );
            await client.query('COMMIT');
            distributed++;
            continue;
          }

          const referrerId = referrerRes.rows[0].id;
          const { referrerAmount, adminAmount } = calcCommission(totalAmount, booking.referral_type);

          await client.query(
            `INSERT INTO referral_transactions
               (referral_user_id, booking_id, amount, type, status, source)
             VALUES ($1, $2, $3, 'earning', 'completed', 'booking_checkout')`,
            [referrerId, booking.id, referrerAmount]
          );

          await client.query(
            `UPDATE referral_users
             SET balance = balance + $1
             WHERE id = $2`,
            [referrerAmount, referrerId]
          );

          await client.query(
            `UPDATE bookings
             SET commission_paid      = true,
                 commission_paid_at   = NOW(),
                 commission_status    = 'DISTRIBUTED',
                 admin_commission     = $1,
                 referrer_commission  = $2,
                 updated_at           = NOW()
             WHERE id = $3`,
            [adminAmount, referrerAmount, booking.id]
          );

          console.log(`[Commission] Distributed for booking ${booking.booking_id} — referrer ₹${referrerAmount}, admin ₹${adminAmount}`);
        } else {
          const adminAmount = Math.round(totalAmount * 0.30 * 100) / 100;

          await client.query(
            `UPDATE bookings
             SET commission_paid     = true,
                 commission_paid_at  = NOW(),
                 commission_status   = 'DISTRIBUTED',
                 admin_commission    = $1,
                 referrer_commission = 0,
                 updated_at          = NOW()
             WHERE id = $2`,
            [adminAmount, booking.id]
          );

          console.log(`[Commission] No-referral booking ${booking.booking_id} — admin ₹${adminAmount}`);
        }

        await client.query('COMMIT');
        distributed++;
      } catch (innerErr) {
        await client.query('ROLLBACK');
        console.error(`[Commission] Error processing booking ${booking.booking_id}:`, innerErr.message);
      }
    }

    console.log(`[Commission] Cycle complete — distributed: ${distributed}, skipped: ${skipped}`);
    return { distributed, skipped };
  } finally {
    client.release();
  }
}

module.exports = { distributeCheckoutCommissions };
