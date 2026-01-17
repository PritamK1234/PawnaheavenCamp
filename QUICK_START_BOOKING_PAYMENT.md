# Quick Start: Complete Booking + Payment Flow

## Overview

This guide demonstrates the complete end-to-end flow from booking creation to Paytm payment completion.

---

## Step 1: Create a Booking

```bash
curl -X POST https://rgcnuvfbntpgcurstnpb.supabase.co/functions/v1/booking-initiate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnY251dmZibnRwZ2N1cnN0bnBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2Mzg3MjEsImV4cCI6MjA4NDIxNDcyMX0.qFvhv9N0zLAY8kmsj2313b1l6YyGzNbpm7l5eXFg_xA" \
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
    "advance_amount": 100,
    "persons": 4,
    "max_capacity": 6
  }'
```

**Response:**

```json
{
  "success": true,
  "booking": {
    "booking_id": "abc-123-def-456",
    "booking_status": "PAYMENT_PENDING",
    "payment_status": "INITIATED",
    "advance_amount": 100,
    ...
  }
}
```

**Save the `booking_id` for the next step!**

---

## Step 2: Initiate Payment

```bash
curl -X POST https://rgcnuvfbntpgcurstnpb.supabase.co/functions/v1/payment-paytm-initiate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnY251dmZibnRwZ2N1cnN0bnBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2Mzg3MjEsImV4cCI6MjA4NDIxNDcyMX0.qFvhv9N0zLAY8kmsj2313b1l6YyGzNbpm7l5eXFg_xA" \
  -d '{
    "booking_id": "YOUR_BOOKING_ID_FROM_STEP_1",
    "channel_id": "WEB"
  }'
```

**Response:**

```json
{
  "success": true,
  "paytm_params": {
    "MID": "SpwYpD36833569776448",
    "ORDER_ID": "PAYTM_1705489234567_8234",
    "TXN_AMOUNT": "100.00",
    "CHECKSUMHASH": "...",
    ...
  },
  "gateway_url": "https://securegw-stage.paytm.in/order/process",
  "order_id": "PAYTM_1705489234567_8234",
  "booking_id": "abc-123-def-456",
  "amount": 100
}
```

---

## Step 3: Redirect to Paytm (Frontend)

Create an HTML form and auto-submit to Paytm:

```html
<!DOCTYPE html>
<html>
<body>
  <form id="paytmForm" method="POST" action="https://securegw-stage.paytm.in/order/process">
    <input type="hidden" name="MID" value="SpwYpD36833569776448">
    <input type="hidden" name="WEBSITE" value="WEBSTAGING">
    <input type="hidden" name="INDUSTRY_TYPE_ID" value="Retail">
    <input type="hidden" name="CHANNEL_ID" value="WEB">
    <input type="hidden" name="ORDER_ID" value="PAYTM_1705489234567_8234">
    <input type="hidden" name="CUST_ID" value="+919876543210">
    <input type="hidden" name="MOBILE_NO" value="+919876543210">
    <input type="hidden" name="EMAIL" value="+919876543210@guest.com">
    <input type="hidden" name="TXN_AMOUNT" value="100.00">
    <input type="hidden" name="CALLBACK_URL" value="https://rgcnuvfbntpgcurstnpb.supabase.co/functions/v1/payment-paytm-callback">
    <input type="hidden" name="CHECKSUMHASH" value="YOUR_CHECKSUM_HERE">
  </form>

  <script>
    document.getElementById('paytmForm').submit();
  </script>
</body>
</html>
```

**Or use the frontend helper:**

```typescript
import { PaytmPaymentService } from "@/lib/paytmPayment";

// One-liner: initiate and redirect
await PaytmPaymentService.initiateAndRedirect(bookingId);
```

---

## Step 4: Complete Payment on Paytm

Use these **TEST** card details:

**Credit Card:**
- Card Number: `4111111111111111`
- CVV: `123`
- Expiry: `12/26` (any future date)
- OTP: `489871`

**Debit Card:**
- Card Number: `5123456789012346`
- CVV: `123`
- Expiry: `12/26`
- OTP: `489871`

---

## Step 5: Automatic Callback

Paytm will automatically send a POST request to:

```
https://rgcnuvfbntpgcurstnpb.supabase.co/functions/v1/payment-paytm-callback
```

**What happens:**

1. Callback verifies checksum
2. Updates booking:
   - `payment_status = SUCCESS`
   - `booking_status = PAYMENT_SUCCESS`
   - `transaction_id = <txn_id_from_paytm>`
3. Displays success/failure page

---

## Step 6: Verify Booking Status

```bash
curl -X GET https://rgcnuvfbntpgcurstnpb.supabase.co/functions/v1/booking-get/YOUR_BOOKING_ID \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnY251dmZibnRwZ2N1cnN0bnBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2Mzg3MjEsImV4cCI6MjA4NDIxNDcyMX0.qFvhv9N0zLAY8kmsj2313b1l6YyGzNbpm7l5eXFg_xA"
```

**Expected Response (After Successful Payment):**

```json
{
  "success": true,
  "booking": {
    "booking_id": "abc-123-def-456",
    "order_id": "PAYTM_1705489234567_8234",
    "transaction_id": "20260117123456789",
    "payment_status": "SUCCESS",
    "booking_status": "PAYMENT_SUCCESS",
    "advance_amount": 100,
    ...
  }
}
```

---

## Complete Frontend Integration Example

```typescript
import { PaytmPaymentService } from "@/lib/paytmPayment";

async function completeBookingFlow() {
  try {
    // Step 1: Create booking
    const bookingResponse = await fetch(
      "https://rgcnuvfbntpgcurstnpb.supabase.co/functions/v1/booking-initiate",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        },
        body: JSON.stringify({
          property_id: "villa-001",
          property_name: "Luxury Villa",
          property_type: "VILLA",
          guest_name: "John Doe",
          guest_phone: "+919876543210",
          owner_phone: "+918806092609",
          admin_phone: "+918806092609",
          checkin_datetime: "2026-02-15T14:00:00Z",
          checkout_datetime: "2026-02-16T11:00:00Z",
          advance_amount: 100,
          persons: 4,
          max_capacity: 6,
        }),
      }
    );

    const { booking } = await bookingResponse.json();
    console.log("Booking created:", booking.booking_id);

    // Step 2: Redirect to payment
    await PaytmPaymentService.initiateAndRedirect(booking.booking_id);

    // User is now on Paytm payment page
    // After payment, they'll be redirected back with status
  } catch (error) {
    console.error("Error:", error);
    alert("Booking failed. Please try again.");
  }
}
```

---

## React Component Example

```tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PaytmPaymentService } from "@/lib/paytmPayment";

export function BookingForm() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    guest_name: "",
    guest_phone: "",
    persons: 2,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create booking
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/booking-initiate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            property_id: "villa-001",
            property_name: "Luxury Villa",
            property_type: "VILLA",
            guest_name: formData.guest_name,
            guest_phone: formData.guest_phone,
            owner_phone: "+918806092609",
            admin_phone: "+918806092609",
            checkin_datetime: "2026-02-15T14:00:00Z",
            checkout_datetime: "2026-02-16T11:00:00Z",
            advance_amount: 5000,
            persons: formData.persons,
            max_capacity: 6,
          }),
        }
      );

      const { booking } = await response.json();

      // Redirect to payment
      await PaytmPaymentService.initiateAndRedirect(booking.booking_id);
    } catch (error) {
      console.error("Error:", error);
      alert("Booking failed. Please try again.");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        placeholder="Your Name"
        value={formData.guest_name}
        onChange={(e) => setFormData({ ...formData, guest_name: e.target.value })}
        required
      />
      <Input
        placeholder="Phone Number"
        value={formData.guest_phone}
        onChange={(e) => setFormData({ ...formData, guest_phone: e.target.value })}
        required
      />
      <Input
        type="number"
        placeholder="Number of Persons"
        value={formData.persons}
        onChange={(e) => setFormData({ ...formData, persons: parseInt(e.target.value) })}
        required
      />
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Processing..." : "Book & Pay ₹5000"}
      </Button>
    </form>
  );
}
```

---

## State Flow Diagram

```
User fills booking form
        ↓
POST /booking-initiate
        ↓
Booking Created
(PAYMENT_PENDING, payment_status: INITIATED)
        ↓
POST /payment-paytm-initiate
        ↓
Order ID generated & saved
Checksum generated
        ↓
Redirect to Paytm Gateway
        ↓
User enters card details
        ↓
Payment Success/Failure
        ↓
Paytm → POST /payment-paytm-callback
        ↓
Verify checksum
        ↓
Update booking
(PAYMENT_SUCCESS, payment_status: SUCCESS)
        ↓
Display result page
        ↓
Next: Send to owner for confirmation
```

---

## Testing Checklist

- [ ] Create a villa booking
- [ ] Create a camping booking
- [ ] Initiate payment with valid booking ID
- [ ] Complete payment with test card (success)
- [ ] Verify booking status updated to PAYMENT_SUCCESS
- [ ] Try payment with wrong booking ID (should fail)
- [ ] Try payment for already paid booking (should fail)
- [ ] Cancel payment (status should be FAILED)
- [ ] Check order_id is saved before redirect
- [ ] Check transaction_id is saved after callback

---

## API Endpoints Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/booking-initiate` | POST | Create new booking |
| `/booking-get/{id}` | GET | Get booking details |
| `/booking-update-status` | PUT | Update booking status (internal) |
| `/payment-paytm-initiate` | POST | Generate payment parameters |
| `/payment-paytm-callback` | POST | Receive payment status from Paytm |

---

## Environment Variables

All configured in `.env`:

```bash
# Supabase
VITE_SUPABASE_URL=https://rgcnuvfbntpgcurstnpb.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Paytm Test
PAYTM_MID=SpwYpD36833569776448
PAYTM_MERCHANT_KEY=j@D7fI3pAMAl7nQC
PAYTM_WEBSITE=WEBSTAGING
PAYTM_GATEWAY_URL=https://securegw-stage.paytm.in/order/process
```

---

## Documentation

- **Full Booking Documentation:** `BOOKING_SYSTEM_DOCUMENTATION.md`
- **Full Payment Documentation:** `PAYTM_PAYMENT_INTEGRATION.md`
- **API Reference:** `BOOKING_API_QUICK_START.md`

---

## Next Steps

The system is now ready for:

1. ✅ Create bookings
2. ✅ Accept payments via Paytm
3. ⏳ Send WhatsApp notifications to owner
4. ⏳ Owner confirmation/cancellation
5. ⏳ Generate e-tickets
6. ⏳ Process refunds

**Current Status:** Payment flow complete and ready for testing!
