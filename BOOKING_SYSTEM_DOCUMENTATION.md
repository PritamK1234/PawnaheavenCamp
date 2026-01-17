# Booking System Documentation

## Overview

Complete booking system implementation with state machine management for villa, camping, and cottage reservations. This foundation handles booking lifecycle from initiation through payment tracking, owner confirmation, and ticket generation.

## Database Schema

### Bookings Table

```sql
bookings (
  booking_id UUID PRIMARY KEY,
  property_id TEXT NOT NULL,
  property_name TEXT NOT NULL,
  property_type ENUM('VILLA', 'CAMPING', 'COTTAGE'),

  -- Contact Information
  guest_name TEXT NOT NULL,
  guest_phone TEXT NOT NULL,
  owner_phone TEXT NOT NULL,
  admin_phone TEXT NOT NULL,

  -- Dates
  checkin_datetime TIMESTAMPTZ NOT NULL,
  checkout_datetime TIMESTAMPTZ NOT NULL,

  -- Payment
  advance_amount NUMERIC(10,2) NOT NULL,

  -- Villa-specific (nullable)
  persons INTEGER,
  max_capacity INTEGER,

  -- Camping/Cottage-specific (nullable)
  veg_guest_count INTEGER,
  nonveg_guest_count INTEGER,

  -- Status Management
  payment_status ENUM('INITIATED', 'SUCCESS', 'FAILED', 'PENDING'),
  booking_status ENUM(
    'PAYMENT_PENDING',
    'PAYMENT_SUCCESS',
    'BOOKING_REQUEST_SENT_TO_OWNER',
    'OWNER_CONFIRMED',
    'OWNER_CANCELLED',
    'TICKET_GENERATED',
    'REFUND_REQUIRED'
  ),

  -- Payment Gateway
  order_id TEXT,
  transaction_id TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
)
```

### Validation Rules (Database Level)

1. **Villa Bookings:**
   - `persons` and `max_capacity` are REQUIRED
   - `persons > 0` and `persons <= max_capacity`
   - `veg_guest_count` and `nonveg_guest_count` must be NULL

2. **Camping/Cottage Bookings:**
   - `veg_guest_count` and `nonveg_guest_count` are REQUIRED
   - `veg_guest_count + nonveg_guest_count > 0`
   - `persons` and `max_capacity` must be NULL

3. **All Bookings:**
   - `checkout_datetime > checkin_datetime`
   - `advance_amount > 0`

## State Machine

### Booking Status Flow

```
PAYMENT_PENDING
    ↓
PAYMENT_SUCCESS
    ↓
BOOKING_REQUEST_SENT_TO_OWNER
    ↓
    ├── OWNER_CONFIRMED
    │       ↓
    │   TICKET_GENERATED (final)
    │
    └── OWNER_CANCELLED
            ↓
        REFUND_REQUIRED (final)
```

### Valid Transitions

| Current Status | Allowed Next Status |
|---|---|
| PAYMENT_PENDING | PAYMENT_SUCCESS |
| PAYMENT_SUCCESS | BOOKING_REQUEST_SENT_TO_OWNER |
| BOOKING_REQUEST_SENT_TO_OWNER | OWNER_CONFIRMED, OWNER_CANCELLED |
| OWNER_CONFIRMED | TICKET_GENERATED |
| OWNER_CANCELLED | REFUND_REQUIRED |
| TICKET_GENERATED | (terminal state) |
| REFUND_REQUIRED | (terminal state) |

**All other transitions are FORBIDDEN and will return 400 error.**

## API Endpoints

### 1. Initiate Booking

**Endpoint:** `POST /booking-initiate`

**Purpose:** Creates a new booking with validation

**Request Body:**

```typescript
{
  // Property info
  property_id: string;
  property_name: string;
  property_type: "VILLA" | "CAMPING" | "COTTAGE";

  // Contact info
  guest_name: string;
  guest_phone: string;
  owner_phone: string;
  admin_phone: string;

  // Dates
  checkin_datetime: string; // ISO 8601 format
  checkout_datetime: string; // ISO 8601 format

  // Payment
  advance_amount: number;

  // For VILLA only
  persons?: number;
  max_capacity?: number;

  // For CAMPING/COTTAGE only
  veg_guest_count?: number;
  nonveg_guest_count?: number;
}
```

**Success Response (201):**

```json
{
  "success": true,
  "booking": {
    "booking_id": "uuid",
    "property_id": "...",
    "booking_status": "PAYMENT_PENDING",
    "payment_status": "INITIATED",
    ...
  },
  "message": "Booking initiated successfully"
}
```

**Error Response (400):**

```json
{
  "error": "Validation error message"
}
```

**Example - Villa Booking:**

```bash
curl -X POST https://your-project.supabase.co/functions/v1/booking-initiate \
  -H "Content-Type: application/json" \
  -d '{
    "property_id": "villa-001",
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

**Example - Camping Booking:**

```bash
curl -X POST https://your-project.supabase.co/functions/v1/booking-initiate \
  -H "Content-Type: application/json" \
  -d '{
    "property_id": "camp-001",
    "property_name": "Lakeside Camping",
    "property_type": "CAMPING",
    "guest_name": "Jane Smith",
    "guest_phone": "+919876543210",
    "owner_phone": "+918806092609",
    "admin_phone": "+918806092609",
    "checkin_datetime": "2026-02-20T14:00:00Z",
    "checkout_datetime": "2026-02-21T11:00:00Z",
    "advance_amount": 2000,
    "veg_guest_count": 3,
    "nonveg_guest_count": 2
  }'
```

### 2. Get Booking Details

**Endpoint:** `GET /booking-get/{booking_id}`

**Purpose:** Retrieves complete booking information

**Success Response (200):**

```json
{
  "success": true,
  "booking": {
    "booking_id": "uuid",
    "property_id": "...",
    "booking_status": "OWNER_CONFIRMED",
    "payment_status": "SUCCESS",
    ...
  }
}
```

**Error Response (404):**

```json
{
  "error": "Booking not found"
}
```

**Example:**

```bash
curl -X GET https://your-project.supabase.co/functions/v1/booking-get/abc-123-def-456
```

### 3. Update Booking Status

**Endpoint:** `PUT /booking-update-status` or `POST /booking-update-status`

**Purpose:** Updates booking status with state machine validation (INTERNAL USE ONLY)

**Request Body:**

```typescript
{
  booking_id: string;
  booking_status?: BookingStatus;
  payment_status?: PaymentStatus;
  order_id?: string;
  transaction_id?: string;
}
```

**Success Response (200):**

```json
{
  "success": true,
  "booking": { ... },
  "message": "Booking status updated successfully"
}
```

**Error Response - Invalid Transition (400):**

```json
{
  "error": "Invalid state transition",
  "current_status": "PAYMENT_PENDING",
  "requested_status": "OWNER_CONFIRMED",
  "allowed_transitions": ["PAYMENT_SUCCESS"]
}
```

**Example - Mark Payment Success:**

```bash
curl -X PUT https://your-project.supabase.co/functions/v1/booking-update-status \
  -H "Content-Type: application/json" \
  -d '{
    "booking_id": "abc-123-def-456",
    "payment_status": "SUCCESS",
    "booking_status": "PAYMENT_SUCCESS",
    "transaction_id": "TXN123456789"
  }'
```

**Example - Owner Confirmation:**

```bash
curl -X PUT https://your-project.supabase.co/functions/v1/booking-update-status \
  -H "Content-Type: application/json" \
  -d '{
    "booking_id": "abc-123-def-456",
    "booking_status": "OWNER_CONFIRMED"
  }'
```

## Usage Flow

### Typical Booking Lifecycle

1. **User Initiates Booking**
   ```
   POST /booking-initiate
   → booking_status: PAYMENT_PENDING
   → payment_status: INITIATED
   ```

2. **Payment Gateway Integration** (future step)
   ```
   Payment success callback
   → PUT /booking-update-status
   → payment_status: SUCCESS
   → booking_status: PAYMENT_SUCCESS
   ```

3. **Send to Owner** (future step)
   ```
   WhatsApp notification sent
   → PUT /booking-update-status
   → booking_status: BOOKING_REQUEST_SENT_TO_OWNER
   ```

4. **Owner Response** (future step)
   ```
   Owner confirms via WhatsApp
   → PUT /booking-update-status
   → booking_status: OWNER_CONFIRMED
   ```

5. **Generate Ticket** (future step)
   ```
   E-ticket generation
   → PUT /booking-update-status
   → booking_status: TICKET_GENERATED
   ```

### Error Handling

**Validation Errors (400):**
- Missing required fields
- Invalid property_type
- Invalid guest counts
- Checkout before checkin
- Invalid state transitions

**Not Found Errors (404):**
- Booking ID doesn't exist

**Server Errors (500):**
- Database connection issues
- Constraint violations

## Security

### Row Level Security (RLS)

1. **Service Role** - Full access to all operations
2. **Authenticated Users** - Can read all bookings
3. **Anonymous Users** - Can create new bookings
4. **Updates** - Only service role can update (enforces state machine)

### Data Validation

- Database-level constraints prevent invalid data
- Application-level validation in edge functions
- State machine prevents invalid transitions
- Phone number and date validation

## Next Steps (Out of Scope)

This foundation is ready for:
1. Payment gateway integration (Paytm/Razorpay)
2. WhatsApp notification system
3. E-ticket generation
4. Refund processing
5. Admin dashboard integration

## Testing

### Test Villa Booking

```javascript
const response = await fetch('https://your-project.supabase.co/functions/v1/booking-initiate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    property_id: 'test-villa-001',
    property_name: 'Test Villa',
    property_type: 'VILLA',
    guest_name: 'Test User',
    guest_phone: '+919999999999',
    owner_phone: '+918806092609',
    admin_phone: '+918806092609',
    checkin_datetime: new Date(Date.now() + 86400000).toISOString(),
    checkout_datetime: new Date(Date.now() + 172800000).toISOString(),
    advance_amount: 5000,
    persons: 4,
    max_capacity: 6
  })
});
```

### Test State Transitions

```javascript
// 1. Create booking (PAYMENT_PENDING)
const booking = await createBooking();

// 2. Mark payment success (valid)
await updateStatus(booking.booking_id, 'PAYMENT_SUCCESS'); // ✓

// 3. Try invalid transition
await updateStatus(booking.booking_id, 'TICKET_GENERATED'); // ✗ Error

// 4. Follow valid path
await updateStatus(booking.booking_id, 'BOOKING_REQUEST_SENT_TO_OWNER'); // ✓
await updateStatus(booking.booking_id, 'OWNER_CONFIRMED'); // ✓
await updateStatus(booking.booking_id, 'TICKET_GENERATED'); // ✓
```

## Database Queries

### Get All Bookings by Status

```sql
SELECT * FROM bookings
WHERE booking_status = 'OWNER_CONFIRMED'
ORDER BY created_at DESC;
```

### Get Bookings for a Guest

```sql
SELECT * FROM bookings
WHERE guest_phone = '+919876543210'
ORDER BY created_at DESC;
```

### Get Pending Owner Confirmations

```sql
SELECT * FROM bookings
WHERE booking_status = 'BOOKING_REQUEST_SENT_TO_OWNER'
AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at ASC;
```

## Configuration

All environment variables are automatically configured:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

No manual configuration required.
