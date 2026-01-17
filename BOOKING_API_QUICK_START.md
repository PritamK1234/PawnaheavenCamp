# Booking System - Quick Start Guide

## Your API Endpoints

Base URL: `https://rgcnuvfbntpgcurstnpb.supabase.co/functions/v1`

### Available Endpoints

1. **Create Booking:** `POST /booking-initiate`
2. **Get Booking:** `GET /booking-get/{booking_id}`
3. **Update Status:** `PUT /booking-update-status`

---

## Quick Test Examples

### 1. Create a Villa Booking

```bash
curl -X POST https://rgcnuvfbntpgcurstnpb.supabase.co/functions/v1/booking-initiate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnY251dmZibnRwZ2N1cnN0bnBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2Mzg3MjEsImV4cCI6MjA4NDIxNDcyMX0.qFvhv9N0zLAY8kmsj2313b1l6YyGzNbpm7l5eXFg_xA" \
  -d '{
    "property_id": "villa-luxury-001",
    "property_name": "Luxury Modern Villa",
    "property_type": "VILLA",
    "guest_name": "John Doe",
    "guest_phone": "+919876543210",
    "owner_phone": "+918806092609",
    "admin_phone": "+918806092609",
    "checkin_datetime": "2026-02-15T14:00:00Z",
    "checkout_datetime": "2026-02-16T11:00:00Z",
    "advance_amount": 5000,
    "persons": 4,
    "max_capacity": 6
  }'
```

### 2. Create a Camping Booking

```bash
curl -X POST https://rgcnuvfbntpgcurstnpb.supabase.co/functions/v1/booking-initiate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnY251dmZibnRwZ2N1cnN0bnBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2Mzg3MjEsImV4cCI6MjA4NDIxNDcyMX0.qFvhv9N0zLAY8kmsj2313b1l6YyGzNbpm7l5eXFg_xA" \
  -d '{
    "property_id": "camping-pawna-001",
    "property_name": "Pawna Lake Camping",
    "property_type": "CAMPING",
    "guest_name": "Jane Smith",
    "guest_phone": "+919123456789",
    "owner_phone": "+918806092609",
    "admin_phone": "+918806092609",
    "checkin_datetime": "2026-02-20T14:00:00Z",
    "checkout_datetime": "2026-02-21T11:00:00Z",
    "advance_amount": 2000,
    "veg_guest_count": 3,
    "nonveg_guest_count": 2
  }'
```

### 3. Get Booking Details

```bash
curl -X GET https://rgcnuvfbntpgcurstnpb.supabase.co/functions/v1/booking-get/YOUR_BOOKING_ID \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnY251dmZibnRwZ2N1cnN0bnBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2Mzg3MjEsImV4cCI6MjA4NDIxNDcyMX0.qFvhv9N0zLAY8kmsj2313b1l6YyGzNbpm7l5eXFg_xA"
```

### 4. Update Booking Status (Payment Success)

```bash
curl -X PUT https://rgcnuvfbntpgcurstnpb.supabase.co/functions/v1/booking-update-status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnY251dmZibnRwZ2N1cnN0bnBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2Mzg3MjEsImV4cCI6MjA4NDIxNDcyMX0.qFvhv9N0zLAY8kmsj2313b1l6YyGzNbpm7l5eXFg_xA" \
  -d '{
    "booking_id": "YOUR_BOOKING_ID",
    "payment_status": "SUCCESS",
    "booking_status": "PAYMENT_SUCCESS",
    "transaction_id": "TXN123456789"
  }'
```

---

## JavaScript/TypeScript Integration

### Frontend Integration

```typescript
const SUPABASE_URL = 'https://rgcnuvfbntpgcurstnpb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnY251dmZibnRwZ2N1cnN0bnBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2Mzg3MjEsImV4cCI6MjA4NDIxNDcyMX0.qFvhv9N0zLAY8kmsj2313b1l6YyGzNbpm7l5eXFg_xA';

// Create a booking
async function createBooking(bookingData) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/booking-initiate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    },
    body: JSON.stringify(bookingData)
  });

  return await response.json();
}

// Get booking details
async function getBooking(bookingId) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/booking-get/${bookingId}`, {
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    }
  });

  return await response.json();
}

// Update booking status
async function updateBookingStatus(bookingId, status) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/booking-update-status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    },
    body: JSON.stringify({
      booking_id: bookingId,
      booking_status: status
    })
  });

  return await response.json();
}
```

### Usage Example

```typescript
// Example: Create a villa booking
const result = await createBooking({
  property_id: 'villa-001',
  property_name: 'Luxury Villa',
  property_type: 'VILLA',
  guest_name: 'John Doe',
  guest_phone: '+919876543210',
  owner_phone: '+918806092609',
  admin_phone: '+918806092609',
  checkin_datetime: '2026-02-15T14:00:00Z',
  checkout_datetime: '2026-02-16T11:00:00Z',
  advance_amount: 5000,
  persons: 4,
  max_capacity: 6
});

console.log('Booking created:', result.booking.booking_id);

// Get booking details
const booking = await getBooking(result.booking.booking_id);
console.log('Current status:', booking.booking.booking_status);

// Update to payment success
await updateBookingStatus(result.booking.booking_id, 'PAYMENT_SUCCESS');
```

---

## State Machine Flow

```
PAYMENT_PENDING → PAYMENT_SUCCESS → BOOKING_REQUEST_SENT_TO_OWNER
                                              ↓
                                    ┌─────────┴─────────┐
                                    ↓                   ↓
                            OWNER_CONFIRMED    OWNER_CANCELLED
                                    ↓                   ↓
                            TICKET_GENERATED    REFUND_REQUIRED
```

---

## Validation Rules

### Villa Bookings
- ✓ Must include `persons` and `max_capacity`
- ✓ `persons` must be ≤ `max_capacity`
- ✗ Cannot include `veg_guest_count` or `nonveg_guest_count`

### Camping/Cottage Bookings
- ✓ Must include `veg_guest_count` and `nonveg_guest_count`
- ✓ Total guests must be > 0
- ✗ Cannot include `persons` or `max_capacity`

### All Bookings
- ✓ `checkout_datetime` must be after `checkin_datetime`
- ✓ `advance_amount` must be > 0

---

## Next Steps

1. Test the endpoints using the curl commands above
2. Integrate with your frontend booking form
3. Ready for payment gateway integration (future)
4. Ready for WhatsApp notifications (future)
5. Ready for e-ticket generation (future)

---

## Support

For detailed documentation, see `BOOKING_SYSTEM_DOCUMENTATION.md`
