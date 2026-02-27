const { query } = require('../db');

// Create e-ticket
const createETicket = async (req, res) => {
  console.log('Received e-ticket creation request:', req.body);
  try {
    const { 
      ticket_id, 
      property_id, 
      guest_name, 
      check_in_date, 
      check_out_date, 
      paid_amount, 
      due_amount 
    } = req.body;

    if (!ticket_id || !property_id || !guest_name || !check_in_date || !check_out_date) {
      console.log('Missing fields:', { ticket_id, property_id, guest_name, check_in_date, check_out_date });
      return res.status(400).json({
        success: false,
        message: 'Missing required fields for e-ticket.'
      });
    }

    console.log('Executing INSERT query for ticket:', ticket_id);
    const result = await query(
      `INSERT INTO etickets (
        ticket_id, property_id, guest_name, check_in_date, check_out_date, paid_amount, due_amount
      ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [ticket_id, property_id, guest_name, check_in_date, check_out_date, paid_amount, due_amount]
    );
    console.log('INSERT query successful:', result.rows[0]?.id);

    // Fetch property name for WhatsApp message
    console.log('Fetching property name for ID:', property_id);
    const propResult = await query('SELECT title FROM properties WHERE id = $1', [property_id]);
    const propertyName = propResult.rows[0]?.title || 'Property';
    console.log('Property name fetched:', propertyName);

    // Simulate sending SMS/Text Message for testing
    console.log(`\n--- SMS SENT TO 8669505727 ---`);
    console.log(`LoonCamp E-Ticket for ${guest_name}: ${process.env.FRONTEND_URL || 'http://localhost:5000'}/ticket/${ticket_id}`);
    console.log(`------------------------------\n`);

    return res.status(201).json({
      success: true,
      message: 'E-ticket created successfully.',
      data: {
        ...result.rows[0],
        property_name: propertyName
      }
    });
  } catch (error) {
    console.error('Create e-ticket error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create e-ticket.'
    });
  }
};

// Get e-ticket by ID
const getETicketById = async (req, res) => {
  try {
    const { ticketId } = req.params;

    const result = await query(
      `SELECT e.*, p.title as property_name, p.map_link 
       FROM etickets e 
       JOIN properties p ON e.property_id = p.id 
       WHERE e.ticket_id = $1`,
      [ticketId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'E-ticket not found.'
      });
    }

    return res.status(200).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Get e-ticket error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch e-ticket.'
    });
  }
};

// Check if the request carries a valid admin JWT
function isAdminRequest(req) {
  try {
    const authHeader = req.headers['authorization'] || '';
    if (!authHeader.startsWith('Bearer ')) return false;
    const token = authHeader.slice(7);
    const jwt = require('jsonwebtoken');
    const secret = process.env.JWT_SECRET || 'your-secret-key';
    const decoded = jwt.verify(token, secret);
    return decoded && (decoded.role === 'admin' || decoded.email);
  } catch (_) {
    return false;
  }
}

// Get booking e-ticket (for the new booking flow)
// Supports both ?booking_id=... and ?token=... (secure tokenized URL)
const getBookingETicket = async (req, res) => {
  try {
    const bookingId = req.query.booking_id;
    const ticketToken = req.query.token;

    if (!bookingId && !ticketToken) {
      return res.status(400).json({ error: 'booking_id or token is required' });
    }

    let result;
    if (ticketToken) {
      result = await query(
        'SELECT * FROM bookings WHERE ticket_token = $1',
        [ticketToken]
      );
    } else {
      result = await query(
        'SELECT * FROM bookings WHERE booking_id = $1',
        [bookingId]
      );
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = result.rows[0];

    // Expiry check — admin users bypass this
    const now = new Date();
    const checkoutDate = new Date(booking.checkout_datetime);
    const isExpired = now > checkoutDate;
    const adminAccess = isAdminRequest(req);

    if (isExpired && !adminAccess) {
      return res.status(410).json({
        error: 'Booking expired',
        message: 'This booking has expired',
        booking_id: booking.booking_id,
        checkout_datetime: booking.checkout_datetime,
      });
    }

    const pendingStatuses = ['PENDING_OWNER_CONFIRMATION', 'BOOKING_REQUEST_SENT_TO_OWNER', 'PAYMENT_SUCCESS'];
    if (pendingStatuses.includes(booking.booking_status)) {
      const dueAmount = (booking.total_amount || 0) - booking.advance_amount;
      return res.status(200).json({
        booking_id: booking.booking_id,
        property_name: booking.property_name,
        guest_name: booking.guest_name,
        advance_amount: booking.advance_amount,
        due_amount: dueAmount,
        booking_status: booking.booking_status,
        created_at: booking.created_at,
      });
    }

    const failedStatuses = ['PAYMENT_FAILED', 'PAYMENT_PENDING', 'CANCELLED_BY_OWNER', 'CANCELLED_NO_REFUND'];
    if (failedStatuses.includes(booking.booking_status)) {
      return res.status(403).json({
        error: 'Ticket not available',
        message: booking.booking_status === 'CANCELLED_BY_OWNER'
          ? 'This booking was cancelled by the property owner'
          : 'E-ticket is not available for this booking',
        current_status: booking.booking_status,
      });
    }

    if (booking.booking_status !== 'TICKET_GENERATED' &&
        booking.booking_status !== 'OWNER_CONFIRMED' &&
        booking.booking_status !== 'CONFIRMED') {
      return res.status(403).json({
        error: 'Ticket not available',
        message: 'E-ticket is not yet available for this booking',
        current_status: booking.booking_status,
      });
    }

    const dueAmount = (booking.total_amount || 0) - booking.advance_amount;

    const ticketData = {
      booking_id: booking.booking_id,
      property_name: booking.property_name,
      guest_name: booking.guest_name,
      guest_phone: booking.guest_phone,
      checkin_datetime: booking.checkin_datetime,
      checkout_datetime: booking.checkout_datetime,
      advance_amount: booking.advance_amount,
      due_amount: dueAmount,
      total_amount: booking.total_amount,
      owner_name: booking.owner_name,
      owner_phone: booking.owner_phone,
      map_link: booking.map_link,
      property_address: booking.property_address,
      persons: booking.persons,
      booking_status: booking.booking_status,
      payment_status: booking.payment_status,
      transaction_id: booking.transaction_id,
      order_id: booking.order_id,
      created_at: booking.created_at,
    };

    return res.status(200).json(ticketData);
  } catch (error) {
    console.error('Error fetching booking e-ticket:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
};

module.exports = {
  createETicket,
  getETicketById,
  getBookingETicket
};
