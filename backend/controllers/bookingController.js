const { query } = require('../db');
const { WhatsAppService } = require('../utils/whatsappService');

const VALID_TRANSITIONS = {
  'PAYMENT_PENDING': ['PAYMENT_SUCCESS'],
  'PAYMENT_SUCCESS': ['BOOKING_REQUEST_SENT_TO_OWNER'],
  'BOOKING_REQUEST_SENT_TO_OWNER': ['OWNER_CONFIRMED', 'OWNER_CANCELLED'],
  'OWNER_CONFIRMED': ['TICKET_GENERATED'],
  'OWNER_CANCELLED': ['REFUND_REQUIRED', 'REFUND_INITIATED', 'CANCELLED_NO_REFUND'],
  'TICKET_GENERATED': [],
  'REFUND_REQUIRED': ['REFUND_INITIATED', 'REFUND_FAILED'],
  'REFUND_INITIATED': [],
  'REFUND_FAILED': [],
  'CANCELLED_NO_REFUND': [],
};

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

    let insertQuery;
    let values;

    if (bookingRequest.property_type === 'VILLA') {
      insertQuery = `
        INSERT INTO bookings (
          property_id, property_name, property_type,
          guest_name, guest_phone, owner_phone, admin_phone,
          checkin_datetime, checkout_datetime, advance_amount,
          persons, max_capacity,
          owner_name, map_link, property_address, total_amount,
          payment_status, booking_status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'INITIATED', 'PAYMENT_PENDING')
        RETURNING *
      `;
      values = [
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
        bookingRequest.persons,
        bookingRequest.max_capacity,
        bookingRequest.owner_name || null,
        bookingRequest.map_link || null,
        bookingRequest.property_address || null,
        bookingRequest.total_amount || null,
      ];
    } else {
      insertQuery = `
        INSERT INTO bookings (
          property_id, property_name, property_type,
          guest_name, guest_phone, owner_phone, admin_phone,
          checkin_datetime, checkout_datetime, advance_amount,
          veg_guest_count, nonveg_guest_count,
          owner_name, map_link, property_address, total_amount,
          payment_status, booking_status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'INITIATED', 'PAYMENT_PENDING')
        RETURNING *
      `;
      values = [
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
        bookingRequest.veg_guest_count,
        bookingRequest.nonveg_guest_count,
        bookingRequest.owner_name || null,
        bookingRequest.map_link || null,
        bookingRequest.property_address || null,
        bookingRequest.total_amount || null,
      ];
    }

    const result = await query(insertQuery, values);

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
    let queryText = 'SELECT * FROM ledger_entries WHERE property_id = $1 AND check_in <= $2 AND check_out > $2';
    let params = [property_id, date];

    if (unit_id && unit_id !== 'null' && unit_id !== 'undefined') {
      queryText += ' AND unit_id = $3';
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
};
