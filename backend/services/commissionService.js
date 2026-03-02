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
  let legacy = 0;
  let skipped = 0;

  try {
    const inProcessRows = await client.query(
      `SELECT rt.id AS rt_id, rt.referral_user_id, rt.amount,
              b.id AS booking_db_id, b.booking_id, b.checkout_datetime,
              b.referral_code, b.referral_type, b.total_amount, b.advance_amount
       FROM referral_transactions rt
       JOIN bookings b ON b.id = rt.booking_id
       WHERE rt.type = 'earning'
         AND rt.status = 'in_process'
         AND b.checkout_datetime < NOW()
       ORDER BY b.checkout_datetime ASC`
    );

    for (const row of inProcessRows.rows) {
      await client.query('BEGIN');
      try {
        const locked = await client.query(
          `SELECT id, status FROM referral_transactions WHERE id = $1 FOR UPDATE`,
          [row.rt_id]
        );
        if (locked.rows[0]?.status !== 'in_process') {
          await client.query('ROLLBACK');
          skipped++;
          continue;
        }

        await client.query(
          `UPDATE referral_transactions SET status = 'available', updated_at = NOW() WHERE id = $1`,
          [row.rt_id]
        );
        await client.query(
          `UPDATE referral_users SET balance = balance + $1 WHERE id = $2`,
          [row.amount, row.referral_user_id]
        );
        await client.query(
          `UPDATE bookings
           SET commission_paid = true, commission_paid_at = NOW(),
               commission_status = 'AVAILABLE', updated_at = NOW()
           WHERE id = $1`,
          [row.booking_db_id]
        );

        await client.query('COMMIT');
        distributed++;
        console.log(`[Commission] in_process → available for booking ${row.booking_id} — ₹${row.amount}`);
      } catch (innerErr) {
        await client.query('ROLLBACK');
        console.error(`[Commission] Error transitioning rt_id=${row.rt_id}:`, innerErr.message);
        skipped++;
      }
    }

    const legacyRows = await client.query(
      `SELECT b.id, b.booking_id, b.referral_code, b.referral_type,
              b.total_amount, b.advance_amount, b.checkout_datetime
       FROM bookings b
       WHERE b.booking_status = 'TICKET_GENERATED'
         AND b.checkout_datetime < NOW()
         AND (b.commission_paid IS NULL OR b.commission_paid = false)
         AND NOT EXISTS (
           SELECT 1 FROM referral_transactions rt
           WHERE rt.booking_id = b.id AND rt.type = 'earning'
         )
       ORDER BY b.checkout_datetime ASC`
    );

    for (const booking of legacyRows.rows) {
      const totalAmount = resolveTotalAmount(booking);
      if (totalAmount <= 0) { skipped++; continue; }

      await client.query('BEGIN');
      try {
        const lockCheck = await client.query(
          `SELECT commission_paid FROM bookings WHERE id = $1 FOR UPDATE`,
          [booking.id]
        );
        if (lockCheck.rows[0]?.commission_paid === true) {
          await client.query('ROLLBACK');
          skipped++;
          continue;
        }

        if (booking.referral_code) {
          const refRes = await client.query(
            `SELECT id FROM referral_users WHERE referral_code = $1 AND status = 'active'`,
            [booking.referral_code]
          );
          if (refRes.rows.length === 0) {
            await client.query(
              `UPDATE bookings SET commission_paid = true, commission_paid_at = NOW(),
               commission_status = 'DISTRIBUTED_NO_REFERRER', updated_at = NOW() WHERE id = $1`,
              [booking.id]
            );
            await client.query('COMMIT');
            legacy++;
            continue;
          }
          const referrerId = refRes.rows[0].id;
          const { referrerAmount, adminAmount } = calcCommission(totalAmount, booking.referral_type);
          await client.query(
            `INSERT INTO referral_transactions
               (referral_user_id, booking_id, amount, type, status, source)
             VALUES ($1, $2, $3, 'earning', 'available', 'legacy_checkout')`,
            [referrerId, booking.id, referrerAmount]
          );
          await client.query(
            `UPDATE referral_users SET balance = balance + $1 WHERE id = $2`,
            [referrerAmount, referrerId]
          );
          await client.query(
            `UPDATE bookings
             SET commission_paid = true, commission_paid_at = NOW(),
                 commission_status = 'AVAILABLE',
                 admin_commission = $1, referrer_commission = $2, updated_at = NOW()
             WHERE id = $3`,
            [adminAmount, referrerAmount, booking.id]
          );
          console.log(`[Commission] Legacy booking ${booking.booking_id} — referrer ₹${referrerAmount}`);
        } else {
          const adminAmount = Math.round(totalAmount * 0.30 * 100) / 100;
          await client.query(
            `UPDATE bookings
             SET commission_paid = true, commission_paid_at = NOW(),
                 commission_status = 'DISTRIBUTED',
                 admin_commission = $1, referrer_commission = 0, updated_at = NOW()
             WHERE id = $2`,
            [adminAmount, booking.id]
          );
          console.log(`[Commission] Legacy no-referral booking ${booking.booking_id} — admin ₹${adminAmount}`);
        }

        await client.query('COMMIT');
        legacy++;
      } catch (innerErr) {
        await client.query('ROLLBACK');
        console.error(`[Commission] Legacy error for booking ${booking.booking_id}:`, innerErr.message);
        skipped++;
      }
    }

    console.log(`[Commission] Cycle complete — distributed: ${distributed}, legacy: ${legacy}, skipped: ${skipped}`);
    return { distributed, legacy, skipped };
  } finally {
    client.release();
  }
}

module.exports = { distributeCheckoutCommissions };
