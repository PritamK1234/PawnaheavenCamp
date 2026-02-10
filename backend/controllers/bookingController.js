const crypto = require('crypto');
const { query } = require('../db');
const { WhatsAppService } = require('../utils/whatsappService');

const VALID_TRANSITIONS = {
  'PAYMENT_PENDING': ['PAYMENT_SUCCESS', 'PAYMENT_FAILED'],
  'PAYMENT_SUCCESS': ['PENDING_OWNER_CONFIRMATION', 'BOOKING_REQUEST_SENT_TO_OWNER'],
  'PENDING_OWNER_CONFIRMATION': ['CONFIRMED', 'CANCELLED_BY_OWNER', 'BOOKING_REQUEST_SENT_TO_OWNER'],
  'BOOKING_REQUEST_SENT_TO_OWNER': ['OWNER_CONFIRMED', 'OWNER_CANCELLED', 'CONFIRMED', 'CANCELLED_BY_OWNER'],
  'OWNER_CONFIRMED': ['TICKET_GENERATED', 'CONFIRMED'],
  'CONFIRMED': ['TICKET_GENERATED'],
  'OWNER_CANCELLED': ['REFUND_REQUIRED', 'REFUND_INITIATED', 'CANCELLED_NO_REFUND', 'CANCELLED_BY_OWNER'],
  'CANCELLED_BY_OWNER': ['REFUND_REQUIRED', 'REFUND_INITIATED', 'CANCELLED_NO_REFUND'],
  'TICKET_GENERATED': [],
  'REFUND_REQUIRED': ['REFUND_INITIATED', 'REFUND_FAILED'],
  'REFUND_INITIATED': [],
  'REFUND_FAILED': [],
  'CANCELLED_NO_REFUND': [],
  'PAYMENT_FAILED': [],
};

function generateBookingId() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `PHC-${timestamp}-${random}`;
}

function generateActionToken() {
  return crypto.randomBytes(32).toString('hex');
}

function isValidTransition(currentStatus, newStatus) {
  const allowedTransitions = VALID_TRANSITIONS[currentStatus] || [];
  return allowedTransitions.includes(newStatus);
}

function validateBookingRequest(req) {
  if (!req.property_id || !req.property_name || !req.property_type) {
    return { valid: false, error: 'Missing required property fields' };
  }

  if (!req.guest_name || !req.guest_phone) {
    return { valid: false, error: 'Missing required guest information' };
  }

  if (!req.owner_phone || !req.admin_phone) {
    return { valid: false, error: 'Missing required contact information' };
  }

  if (!req.checkin_datetime || !req.checkout_datetime) {
    return { valid: false, error: 'Missing required booking dates' };
  }

  if (!req.advance_amount || req.advance_amount <= 0) {
    return { valid: false, error: 'Advance amount must be greater than 0' };
  }

  const checkin = new Date(req.checkin_datetime);
  const checkout = new Date(req.checkout_datetime);
  if (checkout <= checkin) {
    return { valid: false, error: 'Checkout must be after checkin' };
  }

  if (req.property_type === 'VILLA') {
    if (!req.persons || !req.max_capacity) {
      return { valid: false, error: 'VILLA bookings require persons and max_capacity' };
    }
    if (req.persons <= 0 || req.persons > req.max_capacity) {
      return { valid: false, error: 'Persons must be between 1 and max_capacity' };
    }
  } else if (req.property_type === 'CAMPING' || req.property_type === 'COTTAGE') {
    if (req.veg_guest_count === undefined || req.nonveg_guest_count === undefined) {
      return { valid: false, error: 'CAMPING/COTTAGE bookings require veg and nonveg guest counts' };
    }
    if ((req.veg_guest_count + req.nonveg_guest_count) <= 0) {
      return { valid: false, error: 'Total guest count must be greater than 0' };
    }
  } else {
    return { valid: false, error: 'Invalid property_type' };
  }

  return { valid: true };
}

const initiateBooking = async (req, res) => {
  try {
    const bookingRequest = req.body;

    const validation = validateBookingRequest(bookingRequest);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const bookingId = generateBookingId();
    let referralDiscount = 0;

    if (bookingRequest.referral_code) {
      const refResult = await query(
        "SELECT * FROM referral_users WHERE referral_code = $1 AND status = 'active'",
        [bookingRequest.referral_code.toUpperCase()]
      );
      if (refResult.rows.length > 0) {
        referralDiscount = Math.round(bookingRequest.advance_amount * 0.05);
        bookingRequest.advance_amount = bookingRequest.advance_amount - referralDiscount;
      }
    }

    const totalPersons = bookingRequest.property_type === 'VILLA'
      ? bookingRequest.persons
      : (bookingRequest.veg_guest_count || 0) + (bookingRequest.nonveg_guest_count || 0);

    const insertQuery = `
      INSERT INTO bookings (
        booking_id, property_id, property_name, property_type,
        guest_name, guest_phone, owner_phone, admin_phone,
        checkin_datetime, checkout_datetime, advance_amount,
        total_amount, persons, max_capacity,
        veg_guest_count, nonveg_guest_count,
        owner_name, map_link, property_address,
        referral_code, referral_discount,
        payment_status, booking_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, 'INITIATED', 'PAYMENT_PENDING')
      RETURNING *
    `;
    const values = [
      bookingId,
      bookingRequest.property_id,
      bookingRequest.property_name,
      bookingRequest.property_type,
      bookingRequest.guest_name,
      bookingRequest.guest_phone,
      bookingRequest.owner_phone,
      bookingRequest.admin_phone,
      bookingRequest.checkin_datetime,
      bookingRequest.checkout_datetime,
      bookingRequest.advance_amount,
      bookingRequest.total_amount || null,
      totalPersons,
      bookingRequest.max_capacity || null,
      bookingRequest.veg_guest_count || null,
      bookingRequest.nonveg_guest_count || null,
      bookingRequest.owner_name || null,
      bookingRequest.map_link || null,
      bookingRequest.property_address || null,
      bookingRequest.referral_code ? bookingRequest.referral_code.toUpperCase() : null,
      referralDiscount,
    ];

    const result = await query(insertQuery, values);

    setTimeout(async () => {
      try {
        const checkResult = await query(
          "SELECT * FROM bookings WHERE booking_id = $1 AND booking_status = 'PAYMENT_PENDING'",
          [bookingId]
        );
        if (checkResult.rows.length > 0) {
          const whatsapp = new WhatsAppService();
          await whatsapp.sendTextMessage(
            bookingRequest.admin_phone,
            `⚠️ Payment Pending Alert\n\nBooking ID: ${bookingId}\nGuest: ${bookingRequest.guest_name} (${bookingRequest.guest_phone})\nProperty: ${bookingRequest.property_name}\nAmount: ₹${bookingRequest.advance_amount}\n\nPayment has been pending for 15 minutes.`
          );
          console.log('15-min payment pending alert sent for booking:', bookingId);
        }
      } catch (err) {
        console.error('Error in payment timeout check:', err);
      }
    }, 15 * 60 * 1000);

    return res.status(201).json({
      success: true,
      booking: result.rows[0],
      message: 'Booking initiated successfully'
    });
  } catch (error) {
    console.error('Error initiating booking:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
};

const getBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;

    if (!bookingId) {
      return res.status(400).json({ error: 'Booking ID is required' });
    }

    const result = await query(
      'SELECT * FROM bookings WHERE booking_id = $1',
      [bookingId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    return res.status(200).json({
      success: true,
      booking: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching booking:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
};

const updateBookingStatus = async (req, res) => {
  try {
    const { booking_id, booking_status, payment_status, order_id, transaction_id } = req.body;

    if (!booking_id) {
      return res.status(400).json({ error: 'Booking ID is required' });
    }

    const currentResult = await query(
      'SELECT booking_status, payment_status FROM bookings WHERE booking_id = $1',
      [booking_id]
    );

    if (currentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const currentBooking = currentResult.rows[0];

    if (booking_status) {
      const currentStatus = currentBooking.booking_status;

      if (currentStatus === booking_status) {
        return res.status(200).json({
          success: true,
          message: 'Booking already in requested status',
          booking_status: currentStatus
        });
      }

      if (!isValidTransition(currentStatus, booking_status)) {
        return res.status(400).json({
          error: 'Invalid state transition',
          current_status: currentStatus,
          requested_status: booking_status,
          allowed_transitions: VALID_TRANSITIONS[currentStatus]
        });
      }
    }

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (booking_status) {
      updates.push(`booking_status = $${paramCount}`);
      values.push(booking_status);
      paramCount++;
    }

    if (payment_status) {
      updates.push(`payment_status = $${paramCount}`);
      values.push(payment_status);
      paramCount++;
    }

    if (order_id) {
      updates.push(`order_id = $${paramCount}`);
      values.push(order_id);
      paramCount++;
    }

    if (transaction_id) {
      updates.push(`transaction_id = $${paramCount}`);
      values.push(transaction_id);
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(booking_id);
    const updateQuery = `UPDATE bookings SET ${updates.join(', ')} WHERE booking_id = $${paramCount} RETURNING *`;

    const result = await query(updateQuery, values);

    return res.status(200).json({
      success: true,
      booking: result.rows[0],
      message: 'Booking status updated successfully'
    });
  } catch (error) {
    console.error('Error updating booking status:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
};

const processConfirmedBooking = async (req, res) => {
  try {
    const { booking_id } = req.body;

    if (!booking_id) {
      return res.status(400).json({ error: 'booking_id is required' });
    }

    const result = await query(
      'SELECT * FROM bookings WHERE booking_id = $1',
      [booking_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = result.rows[0];

    if (booking.booking_status !== 'OWNER_CONFIRMED') {
      return res.status(400).json({
        error: 'Invalid status',
        current_status: booking.booking_status,
        message: 'Booking must be in OWNER_CONFIRMED status'
      });
    }

    await query(
      "UPDATE bookings SET booking_status = 'TICKET_GENERATED' WHERE booking_id = $1",
      [booking_id]
    );

    const whatsapp = new WhatsAppService();
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5000';
    const ticketUrl = `${frontendUrl}/ticket?booking_id=${booking_id}`;

    const customerMessage = `🎉 Booking Confirmed!\n\nYour booking has been confirmed.\n\nBooking ID: ${booking_id}\nProperty: ${booking.property_name}\n\nView your e-ticket:\n${ticketUrl}`;
    await whatsapp.sendTextMessage(booking.guest_phone, customerMessage);

    const dueAmount = (booking.total_amount || 0) - booking.advance_amount;
    const adminMessage = `✅ Booking Confirmed & Ticket Generated\n\nBooking ID: ${booking_id}\nProperty: ${booking.property_name}\nGuest: ${booking.guest_name} (${booking.guest_phone})\nOwner: ${booking.owner_phone}\nAdvance: ₹${booking.advance_amount}\nDue: ₹${dueAmount}\n\nE-ticket: ${ticketUrl}`;
    await whatsapp.sendTextMessage(booking.admin_phone, adminMessage);

    console.log('E-ticket activated for booking:', booking_id);

    return res.status(200).json({
      success: true,
      booking_id,
      status: 'TICKET_GENERATED',
      ticket_url: ticketUrl
    });
  } catch (error) {
    console.error('Error processing confirmed booking:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
};

const processCancelledBooking = async (req, res) => {
  try {
    const { booking_id } = req.body;

    if (!booking_id) {
      return res.status(400).json({ error: 'booking_id is required' });
    }

    const result = await query(
      'SELECT * FROM bookings WHERE booking_id = $1',
      [booking_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = result.rows[0];

    if (booking.booking_status !== 'OWNER_CANCELLED') {
      return res.status(400).json({
        error: 'Invalid status',
        current_status: booking.booking_status,
        message: 'Booking must be in OWNER_CANCELLED status'
      });
    }

    if (booking.refund_id) {
      console.log('Refund already processed for booking:', booking_id);
      return res.status(200).json({
        success: true,
        message: 'Refund already processed',
        refund_id: booking.refund_id,
      });
    }

    const whatsapp = new WhatsAppService();

    if (booking.payment_status === 'SUCCESS') {
      const refundId = `MOCK_REFUND_${Date.now()}`;

      await query(
        "UPDATE bookings SET booking_status = 'REFUND_INITIATED', refund_id = $1 WHERE booking_id = $2",
        [refundId, booking_id]
      );

      const customerMessage = `❌ Booking Cancelled\n\nYour booking has been cancelled by the property owner.\n\nBooking ID: ${booking_id}\nRefund Amount: ₹${booking.advance_amount}\n\nYour refund has been initiated and will be credited to your payment account within 5-7 business days.`;
      await whatsapp.sendTextMessage(booking.guest_phone, customerMessage);

      const adminMessage = `❌ Booking Cancelled - Refund Initiated\n\nBooking ID: ${booking_id}\nProperty: ${booking.property_name}\nGuest: ${booking.guest_name} (${booking.guest_phone})\nRefund Amount: ₹${booking.advance_amount}\nRefund ID: ${refundId}\n\nStatus: Refund initiated successfully`;
      await whatsapp.sendTextMessage(booking.admin_phone, adminMessage);

      console.log('Refund initiated for booking:', booking_id);

      return res.status(200).json({
        success: true,
        booking_id,
        status: 'REFUND_INITIATED',
        refund_id: refundId,
      });
    } else {
      await query(
        "UPDATE bookings SET booking_status = 'CANCELLED_NO_REFUND' WHERE booking_id = $1",
        [booking_id]
      );

      const customerMessage = `❌ Booking Cancelled\n\nYour booking has been cancelled.\n\nBooking ID: ${booking_id}\n\nNo payment was processed, so no refund is needed.`;
      await whatsapp.sendTextMessage(booking.guest_phone, customerMessage);

      const adminMessage = `❌ Booking Cancelled - No Refund Required\n\nBooking ID: ${booking_id}\nProperty: ${booking.property_name}\nGuest: ${booking.guest_name}\n\nPayment Status: ${booking.payment_status}\nNo refund required.`;
      await whatsapp.sendTextMessage(booking.admin_phone, adminMessage);

      return res.status(200).json({
        success: true,
        booking_id,
        status: 'CANCELLED_NO_REFUND',
        message: 'No refund required - payment was not successful',
      });
    }
  } catch (error) {
    console.error('Error processing cancelled booking:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
};

const getLedgerEntries = async (req, res) => {
  try {
    const { property_id, unit_id, date } = req.query;
    // Join with properties to match against either the auto-increment ID or the alphanumeric property_id
    let queryText = `
      SELECT le.* 
      FROM ledger_entries le
      JOIN properties p ON (p.id::text = le.property_id OR p.property_id = le.property_id)
      WHERE (p.id::text = $1 OR p.property_id = $1)
      AND le.check_in <= $2 AND le.check_out > $2
    `;
    let params = [property_id, date];

    if (unit_id && unit_id !== 'null' && unit_id !== 'undefined') {
      queryText += ' AND le.unit_id = $3';
      params.push(unit_id);
    }

    const result = await query(queryText, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching ledger entries:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const addLedgerEntry = async (req, res) => {
  try {
    const { property_id, unit_id, customer_name, persons, check_in, check_out, payment_mode, amount } = req.body;
    
    // 1. Calculate dates in the range (excluding check-out day)
    const dates = [];
    let current = new Date(check_in);
    const end = new Date(check_out);
    while (current < end) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }

    // 2. Ensure unit_calendar entries exist and update availability
    if (unit_id) {
      for (const date of dates) {
        // Check if entry exists, if not create it with total capacity first
        const existing = await query('SELECT available_quantity FROM unit_calendar WHERE unit_id = $1 AND date = $2', [unit_id, date]);
        
        if (existing.rows.length === 0) {
          const unitResult = await query('SELECT total_persons FROM property_units WHERE id = $1', [unit_id]);
          const totalCapacity = unitResult.rows[0].total_persons;
          await query(
            'INSERT INTO unit_calendar (unit_id, date, available_quantity) VALUES ($1, $2, $3)',
            [unit_id, date, totalCapacity]
          );
        }

        // Subtract persons from availability
        await query(
          `UPDATE unit_calendar 
           SET available_quantity = GREATEST(0, available_quantity - $1)
           WHERE unit_id = $2 AND date = $3`,
          [persons, unit_id, date]
        );
      }
    }

    // 3. Insert the ledger entry
    const result = await query(
      `INSERT INTO ledger_entries 
       (property_id, unit_id, customer_name, persons, check_in, check_out, payment_mode, amount) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [property_id, unit_id, customer_name, persons, check_in, check_out, payment_mode, amount]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error adding ledger entry:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const updateLedgerEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const { customer_name, persons, check_in, check_out, payment_mode, amount } = req.body;
    
    // Get old entry to handle availability reversal
    const oldEntry = await query('SELECT * FROM ledger_entries WHERE id = $1', [id]);
    if (oldEntry.rows.length === 0) return res.status(404).json({ success: false, message: 'Entry not found' });
    
    const old = oldEntry.rows[0];
    
    // Reverse old availability
    if (old.unit_id) {
      let current = new Date(old.check_in);
      const end = new Date(old.check_out);
      while (current < end) {
        await query(
          'UPDATE unit_calendar SET available_quantity = available_quantity + $1 WHERE unit_id = $2 AND date = $3',
          [old.persons, old.unit_id, current.toISOString().split('T')[0]]
        );
        current.setDate(current.getDate() + 1);
      }
    }

    // Apply new availability
    if (old.unit_id) {
      let current = new Date(check_in);
      const end = new Date(check_out);
      while (current < end) {
        await query(
          'UPDATE unit_calendar SET available_quantity = GREATEST(0, available_quantity - $1) WHERE unit_id = $2 AND date = $3',
          [persons, old.unit_id, current.toISOString().split('T')[0]]
        );
        current.setDate(current.getDate() + 1);
      }
    }

    const result = await query(
      `UPDATE ledger_entries 
       SET customer_name = $1, persons = $2, check_in = $3, check_out = $4, payment_mode = $5, amount = $6
       WHERE id = $7 RETURNING *`,
      [customer_name, persons, check_in, check_out, payment_mode, amount, id]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating ledger entry:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const deleteLedgerEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const entry = await query('SELECT * FROM ledger_entries WHERE id = $1', [id]);
    if (entry.rows.length === 0) return res.status(404).json({ success: false, message: 'Entry not found' });
    
    const old = entry.rows[0];
    
    // Restore availability
    if (old.unit_id) {
      let current = new Date(old.check_in);
      const end = new Date(old.check_out);
      while (current < end) {
        await query(
          'UPDATE unit_calendar SET available_quantity = available_quantity + $1 WHERE unit_id = $2 AND date = $3',
          [old.persons, old.unit_id, current.toISOString().split('T')[0]]
        );
        current.setDate(current.getDate() + 1);
      }
    }

    await query('DELETE FROM ledger_entries WHERE id = $1', [id]);
    res.json({ success: true, message: 'Entry deleted' });
  } catch (error) {
    console.error('Error deleting ledger entry:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const getMonthlyLedger = async (req, res) => {
  try {
    const { property_id, unit_id, month, year } = req.query;
    const startDate = `${year}-${month}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    let queryText = `
      SELECT * FROM ledger_entries 
      WHERE property_id = $1 
      AND (
        (check_in BETWEEN $2 AND $3) OR 
        (check_out BETWEEN $2 AND $3) OR
        (check_in <= $2 AND check_out >= $3)
      )
    `;
    let params = [property_id, startDate, endDate];

    if (unit_id && unit_id !== 'null' && unit_id !== 'undefined') {
      queryText += ' AND unit_id = $4';
      params.push(unit_id);
    }

    queryText += ' ORDER BY check_in ASC';

    const result = await query(queryText, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching monthly ledger:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const handleOwnerAction = async (req, res) => {
  try {
    const { token, action } = req.query;

    if (!token || !action) {
      return res.status(400).json({ error: 'Token and action are required' });
    }

    if (!['CONFIRM', 'CANCEL'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Must be CONFIRM or CANCEL' });
    }

    const result = await query(
      'SELECT * FROM bookings WHERE action_token = $1',
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid or expired token' });
    }

    const booking = result.rows[0];

    if (booking.action_token_used) {
      return res.status(400).json({ error: 'This action has already been taken', booking_status: booking.booking_status });
    }

    if (new Date() > new Date(booking.action_token_expires_at)) {
      return res.status(400).json({ error: 'Action token has expired' });
    }

    const validStatuses = ['PENDING_OWNER_CONFIRMATION', 'BOOKING_REQUEST_SENT_TO_OWNER'];
    if (!validStatuses.includes(booking.booking_status)) {
      return res.status(400).json({
        error: 'Booking is not in a state that allows this action',
        current_status: booking.booking_status,
      });
    }

    if (booking.payment_status !== 'SUCCESS') {
      return res.status(400).json({
        error: 'Cannot process action - payment not confirmed',
        payment_status: booking.payment_status,
      });
    }

    const whatsapp = new WhatsAppService();
    const frontendUrl = process.env.FRONTEND_URL || `https://${req.get('x-forwarded-host') || req.get('host')}`;

    if (action === 'CONFIRM') {
      await query(
        "UPDATE bookings SET booking_status = 'TICKET_GENERATED', action_token_used = true, commission_status = CASE WHEN commission_status = 'PENDING' THEN 'CONFIRMED' ELSE commission_status END, updated_at = NOW() WHERE booking_id = $1",
        [booking.booking_id]
      );

      const ticketUrl = `${frontendUrl}/ticket?booking_id=${booking.booking_id}`;

      await whatsapp.sendTextMessage(
        booking.guest_phone,
        `🎉 Booking Confirmed!\n\nYour booking has been confirmed by the property owner.\n\nBooking ID: ${booking.booking_id}\nProperty: ${booking.property_name}\n\nView your e-ticket:\n${ticketUrl}`
      );

      const dueAmount = (booking.total_amount || 0) - booking.advance_amount;
      await whatsapp.sendTextMessage(
        booking.admin_phone,
        `✅ Booking Confirmed & Ticket Generated\n\nBooking ID: ${booking.booking_id}\nProperty: ${booking.property_name}\nGuest: ${booking.guest_name} (${booking.guest_phone})\nAdvance: ₹${booking.advance_amount}\nDue: ₹${dueAmount}\n\nE-ticket: ${ticketUrl}`
      );

      if (booking.referral_code) {
        try {
          const refUser = await query(
            "SELECT * FROM referral_users WHERE referral_code = $1 AND status = 'active'",
            [booking.referral_code]
          );
          if (refUser.rows.length > 0) {
            const commission = Math.round(parseFloat(booking.advance_amount) * 0.05);
            const existingTxn = await query(
              "SELECT id FROM referral_transactions WHERE booking_id = $1",
              [booking.id]
            );
            if (existingTxn.rows.length === 0) {
              await query(
                "INSERT INTO referral_transactions (referral_user_id, booking_id, amount, type, status, source) VALUES ($1, $2, $3, 'earning', 'pending', 'booking')",
                [refUser.rows[0].id, booking.id, commission]
              );
              console.log('Referral commission (PENDING) created for booking:', booking.booking_id);
            }
          }
        } catch (refErr) {
          console.error('Error creating referral commission:', refErr);
        }
      }

      return res.status(200).send(`
        <!DOCTYPE html><html><head><title>Booking Confirmed</title>
        <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>body{font-family:Arial,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#0a0a0a;color:white;}.container{background:#1a1a1a;padding:2rem;border-radius:16px;border:1px solid #10b98130;text-align:center;max-width:400px;}.icon{font-size:4rem;margin-bottom:1rem;color:#10b981;}h1{color:#10b981;}p{color:#999;}</style>
        </head><body><div class="container"><div class="icon">✅</div><h1>Booking Confirmed!</h1><p>Guest: ${booking.guest_name}</p><p>Property: ${booking.property_name}</p><p>Ticket has been sent to the customer.</p></div></body></html>
      `);
    } else {
      await query(
        "UPDATE bookings SET booking_status = 'CANCELLED_BY_OWNER', action_token_used = true, commission_status = CASE WHEN commission_status = 'PENDING' THEN 'CANCELLED' ELSE commission_status END, refund_status = CASE WHEN payment_status = 'SUCCESS' THEN 'REFUND_INITIATED' ELSE refund_status END, refund_amount = CASE WHEN payment_status = 'SUCCESS' THEN advance_amount ELSE refund_amount END, updated_at = NOW() WHERE booking_id = $1",
        [booking.booking_id]
      );

      if (booking.payment_status === 'SUCCESS') {
        await whatsapp.sendTextMessage(
          booking.guest_phone,
          `❌ Booking Cancelled\n\nYour booking for ${booking.property_name} has been cancelled by the property owner.\n\nBooking ID: ${booking.booking_id}\nRefund Amount: ₹${booking.advance_amount}\n\nYour refund will be processed shortly.`
        );

        await whatsapp.sendTextMessage(
          booking.admin_phone,
          `❌ Booking Cancelled by Owner - Refund Required\n\nBooking ID: ${booking.booking_id}\nProperty: ${booking.property_name}\nGuest: ${booking.guest_name} (${booking.guest_phone})\nRefund Amount: ₹${booking.advance_amount}\n\nPlease process refund from Admin Panel → Referrals → Requests.`
        );
      }

      if (booking.referral_code) {
        try {
          await query(
            "DELETE FROM referral_transactions WHERE booking_id = $1 AND status = 'pending'",
            [booking.id]
          );
        } catch (refErr) {
          console.error('Error cancelling referral commission:', refErr);
        }
      }

      return res.status(200).send(`
        <!DOCTYPE html><html><head><title>Booking Cancelled</title>
        <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>body{font-family:Arial,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#0a0a0a;color:white;}.container{background:#1a1a1a;padding:2rem;border-radius:16px;border:1px solid #ef444430;text-align:center;max-width:400px;}.icon{font-size:4rem;margin-bottom:1rem;color:#ef4444;}h1{color:#ef4444;}p{color:#999;}</style>
        </head><body><div class="container"><div class="icon">❌</div><h1>Booking Cancelled</h1><p>Guest: ${booking.guest_name}</p><p>Property: ${booking.property_name}</p><p>Customer and admin have been notified.</p></div></body></html>
      `);
    }
  } catch (error) {
    console.error('Error handling owner action:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

const handleWhatsAppWebhook = async (req, res) => {
  try {
    const whatsapp = new WhatsAppService();

    if (req.method === 'GET') {
      const mode = req.query['hub.mode'];
      const token = req.query['hub.verify_token'];
      const challenge = req.query['hub.challenge'];

      const result = whatsapp.verifyWebhook(mode, token, challenge);
      if (result) {
        return res.status(200).send(result);
      }
      return res.status(403).send('Forbidden');
    }

    const buttonResponse = whatsapp.extractButtonResponse(req.body);

    if (buttonResponse) {
      try {
        const payload = JSON.parse(buttonResponse.buttonId);
        const { token, action } = payload;

        if (token && action) {
          const result = await query(
            'SELECT * FROM bookings WHERE action_token = $1',
            [token]
          );

          if (result.rows.length > 0) {
            const booking = result.rows[0];

            if (booking.action_token_used) {
              await whatsapp.sendTextMessage(buttonResponse.from, '⚠️ This action has already been taken.');
              return res.status(200).json({ status: 'ok' });
            }

            if (new Date() > new Date(booking.action_token_expires_at)) {
              await whatsapp.sendTextMessage(buttonResponse.from, '⚠️ This action link has expired.');
              return res.status(200).json({ status: 'ok' });
            }

            const frontendUrl = process.env.FRONTEND_URL || 'https://pawnahavencamp.com';

            if (booking.payment_status !== 'SUCCESS') {
              await whatsapp.sendTextMessage(buttonResponse.from, '⚠️ Cannot process - payment not confirmed for this booking.');
              return res.status(200).json({ status: 'ok' });
            }

            if (action === 'CONFIRM') {
              await query(
                "UPDATE bookings SET booking_status = 'TICKET_GENERATED', action_token_used = true, commission_status = CASE WHEN commission_status = 'PENDING' THEN 'CONFIRMED' ELSE commission_status END, updated_at = NOW() WHERE booking_id = $1",
                [booking.booking_id]
              );

              const ticketUrl = `${frontendUrl}/ticket?booking_id=${booking.booking_id}`;

              await whatsapp.sendTextMessage(
                booking.guest_phone,
                `🎉 Booking Confirmed!\n\nBooking ID: ${booking.booking_id}\nProperty: ${booking.property_name}\n\nView your e-ticket:\n${ticketUrl}`
              );

              await whatsapp.sendTextMessage(
                booking.admin_phone,
                `✅ Booking Confirmed\n\nBooking ID: ${booking.booking_id}\nProperty: ${booking.property_name}\nGuest: ${booking.guest_name}\n\nE-ticket: ${ticketUrl}`
              );

              await whatsapp.sendTextMessage(buttonResponse.from, `✅ Booking ${booking.booking_id} confirmed! Guest has been notified.`);

              if (booking.referral_code) {
                try {
                  const refUser = await query(
                    "SELECT * FROM referral_users WHERE referral_code = $1 AND status = 'active'",
                    [booking.referral_code]
                  );
                  if (refUser.rows.length > 0) {
                    const commission = Math.round(parseFloat(booking.advance_amount) * 0.05);
                    const existingTxn = await query(
                      "SELECT id FROM referral_transactions WHERE booking_id = $1",
                      [booking.id]
                    );
                    if (existingTxn.rows.length === 0) {
                      await query(
                        "INSERT INTO referral_transactions (referral_user_id, booking_id, amount, type, status, source) VALUES ($1, $2, $3, 'earning', 'pending', 'booking')",
                        [refUser.rows[0].id, booking.id, commission]
                      );
                    }
                  }
                } catch (refErr) {
                  console.error('Error creating referral commission:', refErr);
                }
              }
            } else if (action === 'CANCEL') {
              await query(
                "UPDATE bookings SET booking_status = 'CANCELLED_BY_OWNER', action_token_used = true, commission_status = CASE WHEN commission_status = 'PENDING' THEN 'CANCELLED' ELSE commission_status END, refund_status = CASE WHEN payment_status = 'SUCCESS' THEN 'REFUND_INITIATED' ELSE refund_status END, refund_amount = CASE WHEN payment_status = 'SUCCESS' THEN advance_amount ELSE refund_amount END, updated_at = NOW() WHERE booking_id = $1",
                [booking.booking_id]
              );

              if (booking.payment_status === 'SUCCESS') {
                await whatsapp.sendTextMessage(
                  booking.guest_phone,
                  `❌ Booking Cancelled\n\nYour booking for ${booking.property_name} has been cancelled.\nRefund of ₹${booking.advance_amount} will be processed shortly.`
                );
              }

              await whatsapp.sendTextMessage(
                booking.admin_phone,
                `❌ Booking Cancelled by Owner - Refund Required\n\nBooking ID: ${booking.booking_id}\nGuest: ${booking.guest_name}\nRefund: ₹${booking.advance_amount}\n\nPlease process from Admin Panel → Referrals → Requests.`
              );

              await whatsapp.sendTextMessage(buttonResponse.from, `❌ Booking ${booking.booking_id} cancelled. Customer notified.`);

              if (booking.referral_code) {
                try {
                  await query("DELETE FROM referral_transactions WHERE booking_id = $1 AND status = 'pending'", [booking.id]);
                } catch (refErr) {
                  console.error('Error cancelling referral:', refErr);
                }
              }
            }
          }
        }
      } catch (parseErr) {
        console.error('Error parsing button response:', parseErr);
      }
    }

    return res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error('WhatsApp webhook error:', error);
    return res.status(200).json({ status: 'ok' });
  }
};

module.exports = {
  getLedgerEntries,
  addLedgerEntry,
  getMonthlyLedger,
  initiateBooking,
  getBooking,
  updateBookingStatus,
  processConfirmedBooking,
  processCancelledBooking,
  updateLedgerEntry,
  deleteLedgerEntry,
  handleOwnerAction,
  handleWhatsAppWebhook,
};
