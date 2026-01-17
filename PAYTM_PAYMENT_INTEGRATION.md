# Paytm All-in-One Payment Integration (TEST MODE)

## Overview

Complete Paytm payment gateway integration with checksum generation, payment redirect, and callback handling. Currently configured for TEST mode with staging credentials.

---

## Configuration

### Environment Variables

All Paytm credentials are pre-configured in `.env`:

```bash
# Paytm Test Credentials
PAYTM_MID=SpwYpD36833569776448
PAYTM_MERCHANT_KEY=j@D7fI3pAMAl7nQC
PAYTM_WEBSITE=WEBSTAGING
PAYTM_INDUSTRY_TYPE=Retail
PAYTM_CHANNEL_ID=WEB
PAYTM_CHANNEL_ID_MOBILE=WAP
PAYTM_GATEWAY_URL=https://securegw-stage.paytm.in/order/process
PAYTM_CALLBACK_URL=https://rgcnuvfbntpgcurstnpb.supabase.co/functions/v1/payment-paytm-callback
```

### Switching to Production

To switch to LIVE mode, update these values:

```bash
PAYTM_MID=<your_production_mid>
PAYTM_MERCHANT_KEY=<your_production_key>
PAYTM_WEBSITE=DEFAULT
PAYTM_GATEWAY_URL=https://securegw.paytm.in/order/process
```

**No code changes needed!**

---

## Architecture

### Payment Flow

```
User → Frontend (Create Booking) → Backend (booking-initiate)
                                           ↓
                                    Booking Created
                                    (PAYMENT_PENDING)
                                           ↓
Frontend → Backend (payment-paytm-initiate) → Generate Order ID
                                           ↓
                                    Save Order ID to DB
                                           ↓
                                    Generate Checksum
                                           ↓
Frontend ← Return Paytm Parameters
    ↓
Redirect to Paytm Gateway (Auto-submit Form)
    ↓
User Completes Payment
    ↓
Paytm → Backend (payment-paytm-callback)
                        ↓
                Verify Checksum
                        ↓
                Update Booking Status
                        ↓
        Display Success/Failure Page
```

---

## API Endpoints

### 1. Initiate Payment

**Endpoint:** `POST /payment-paytm-initiate`

**Purpose:** Generate Paytm order ID, save to database, create checksum, return payment parameters

**Request:**

```json
{
  "booking_id": "abc-123-def-456",
  "channel_id": "WEB"
}
```

**channel_id Options:**
- `"WEB"` - For desktop/web browsers (default)
- `"WAP"` - For mobile browsers

**Response (200):**

```json
{
  "success": true,
  "paytm_params": {
    "MID": "SpwYpD36833569776448",
    "WEBSITE": "WEBSTAGING",
    "INDUSTRY_TYPE_ID": "Retail",
    "CHANNEL_ID": "WEB",
    "ORDER_ID": "PAYTM_1234567890_1234",
    "CUST_ID": "+919876543210",
    "MOBILE_NO": "+919876543210",
    "EMAIL": "+919876543210@guest.com",
    "TXN_AMOUNT": "5000.00",
    "CALLBACK_URL": "https://...",
    "CHECKSUMHASH": "generated_checksum_here"
  },
  "gateway_url": "https://securegw-stage.paytm.in/order/process",
  "order_id": "PAYTM_1234567890_1234",
  "booking_id": "abc-123-def-456",
  "amount": 5000
}
```

**Error Responses:**

```json
// Booking not found (404)
{
  "error": "Booking not found"
}

// Payment already completed (400)
{
  "error": "Payment already completed for this booking"
}
```

### 2. Payment Callback

**Endpoint:** `POST /payment-paytm-callback`

**Purpose:** Receive payment status from Paytm, verify checksum, update booking

**Content-Type:** `application/x-www-form-urlencoded` (sent by Paytm)

**Paytm Parameters:**

```
ORDERID=PAYTM_1234567890_1234
TXNID=20260117123456789
TXNAMOUNT=5000.00
STATUS=TXN_SUCCESS
RESPCODE=01
RESPMSG=Txn Success
CHECKSUMHASH=...
```

**Status Values:**
- `TXN_SUCCESS` - Payment successful
- `TXN_FAILURE` - Payment failed
- `PENDING` - Payment pending

**Behavior:**

1. **On TXN_SUCCESS:**
   - Verify checksum
   - Update `payment_status = SUCCESS`
   - Update `booking_status = PAYMENT_SUCCESS`
   - Save `transaction_id`
   - Display success page

2. **On TXN_FAILURE or PENDING:**
   - Verify checksum
   - Update `payment_status = FAILED` or `PENDING`
   - Keep `booking_status` unchanged
   - Display failure page

**Response:** HTML page with payment status

---

## Frontend Integration

### Using PaytmPaymentService

```typescript
import { PaytmPaymentService } from "@/lib/paytmPayment";

// Method 1: Initiate and redirect in one call
async function handlePayment(bookingId: string) {
  try {
    await PaytmPaymentService.initiateAndRedirect(bookingId, "WEB");
    // User is now redirected to Paytm
  } catch (error) {
    console.error("Payment failed:", error);
    alert("Failed to initiate payment. Please try again.");
  }
}

// Method 2: Step by step
async function handlePaymentManual(bookingId: string) {
  try {
    const response = await PaytmPaymentService.initiatePayment(bookingId, "WEB");

    console.log("Order ID:", response.order_id);
    console.log("Amount:", response.amount);

    // Redirect to Paytm
    PaytmPaymentService.redirectToPaytm(
      response.paytm_params,
      response.gateway_url
    );
  } catch (error) {
    console.error("Payment failed:", error);
  }
}
```

### Complete Booking + Payment Flow

```typescript
// Step 1: Create booking
const bookingResponse = await fetch(
  `${SUPABASE_URL}/functions/v1/booking-initiate`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
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
      advance_amount: 5000,
      persons: 4,
      max_capacity: 6,
    }),
  }
);

const { booking } = await bookingResponse.json();

// Step 2: Initiate payment and redirect
await PaytmPaymentService.initiateAndRedirect(booking.booking_id);
```

### React Component Example

```tsx
import { useState } from "react";
import { PaytmPaymentService } from "@/lib/paytmPayment";
import { Button } from "@/components/ui/button";

export function PaymentButton({ bookingId }: { bookingId: string }) {
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    setLoading(true);
    try {
      await PaytmPaymentService.initiateAndRedirect(bookingId);
    } catch (error) {
      console.error("Payment error:", error);
      alert("Failed to initiate payment. Please try again.");
      setLoading(false);
    }
  };

  return (
    <Button onClick={handlePayment} disabled={loading}>
      {loading ? "Processing..." : "Pay & Confirm Booking"}
    </Button>
  );
}
```

---

## Database Integration

### Order ID Generation

Order IDs are automatically generated in the format:

```
PAYTM_<timestamp>_<random>
```

Example: `PAYTM_1705489234567_8234`

**Important:**
- Order ID is different from Booking ID
- Order ID is saved to `bookings.order_id` before redirect
- Order ID is used to match callback with booking

### Database Updates

**On Payment Initiation:**

```sql
UPDATE bookings
SET order_id = 'PAYTM_1705489234567_8234'
WHERE booking_id = 'abc-123-def-456';
```

**On Successful Payment:**

```sql
UPDATE bookings
SET
  payment_status = 'SUCCESS',
  booking_status = 'PAYMENT_SUCCESS',
  transaction_id = '20260117123456789'
WHERE order_id = 'PAYTM_1705489234567_8234';
```

**On Failed Payment:**

```sql
UPDATE bookings
SET
  payment_status = 'FAILED',
  transaction_id = '20260117123456789'
WHERE order_id = 'PAYTM_1705489234567_8234';
```

---

## Security

### Checksum Verification

All Paytm responses are verified using:

1. **Checksum Generation:**
   - Sort parameters alphabetically
   - Generate signature using HMAC-SHA256
   - Add random salt
   - Encrypt with AES-256-CBC

2. **Checksum Verification:**
   - Decrypt received checksum
   - Extract salt
   - Regenerate signature
   - Compare with received signature

**Implementation:** `supabase/functions/_shared/paytmChecksum.ts`

### Data Integrity

- Amount is fetched from database (not from frontend)
- Callback verifies checksum before updating database
- Invalid checksums are rejected
- All updates use database transactions

---

## Testing

### Test Card Details (Paytm Staging)

For testing in STAGING mode, use these test cards:

**Credit Card:**
- Card Number: `4111111111111111`
- CVV: `123`
- Expiry: Any future date
- OTP: `489871`

**Debit Card:**
- Card Number: `5123456789012346`
- CVV: `123`
- Expiry: Any future date
- OTP: `489871`

**Net Banking:**
- Select any bank
- Use test credentials (provided by Paytm)

### Testing Flow

1. **Create a test booking:**

```bash
curl -X POST https://rgcnuvfbntpgcurstnpb.supabase.co/functions/v1/booking-initiate \
  -H "Content-Type: application/json" \
  -d '{
    "property_id": "test-villa",
    "property_name": "Test Villa",
    "property_type": "VILLA",
    "guest_name": "Test User",
    "guest_phone": "+919999999999",
    "owner_phone": "+918806092609",
    "admin_phone": "+918806092609",
    "checkin_datetime": "2026-02-20T14:00:00Z",
    "checkout_datetime": "2026-02-21T11:00:00Z",
    "advance_amount": 100,
    "persons": 2,
    "max_capacity": 4
  }'
```

2. **Initiate payment:**

```bash
curl -X POST https://rgcnuvfbntpgcurstnpb.supabase.co/functions/v1/payment-paytm-initiate \
  -H "Content-Type: application/json" \
  -d '{
    "booking_id": "YOUR_BOOKING_ID",
    "channel_id": "WEB"
  }'
```

3. **Test scenarios:**
   - Successful payment (use test card above)
   - Failed payment (enter wrong OTP)
   - Pending payment (cancel the transaction)

---

## Troubleshooting

### Common Issues

**1. Checksum Mismatch**

```
Error: Invalid checksum
```

**Solution:** Verify merchant key is correct in `.env`

**2. Booking Not Found**

```
Error: Booking not found
```

**Solution:** Ensure `order_id` was saved before redirect

**3. Payment Already Completed**

```
Error: Payment already completed for this booking
```

**Solution:** This is expected behavior. Each booking can only be paid once.

**4. Callback Not Received**

**Solution:**
- Check callback URL in `.env`
- Ensure edge function is deployed
- Check Supabase function logs

### Debugging

**Check Payment Status:**

```bash
curl https://rgcnuvfbntpgcurstnpb.supabase.co/functions/v1/booking-get/YOUR_BOOKING_ID
```

**View Callback Logs:**

```bash
# In Supabase Dashboard:
# Functions → payment-paytm-callback → Logs
```

---

## Going Live

### Production Checklist

1. **Get Production Credentials:**
   - Contact Paytm for production MID and Key
   - Complete KYC verification
   - Set up settlement account

2. **Update Environment Variables:**

```bash
PAYTM_MID=<production_mid>
PAYTM_MERCHANT_KEY=<production_key>
PAYTM_WEBSITE=DEFAULT
PAYTM_GATEWAY_URL=https://securegw.paytm.in/order/process
```

3. **Update Callback URL:**
   - Ensure callback URL is accessible
   - Update in Paytm merchant dashboard

4. **Test in Production:**
   - Test with small amount first
   - Verify callback handling
   - Check database updates

5. **Monitor:**
   - Set up alerts for failed payments
   - Monitor checksum verification failures
   - Track callback response times

---

## Next Steps (Out of Scope)

This payment integration is ready for:

1. WhatsApp notifications after payment success
2. E-ticket generation after owner confirmation
3. Refund processing for cancelled bookings
4. Payment status webhooks
5. Admin dashboard payment tracking

---

## API URLs

**Base URL:** `https://rgcnuvfbntpgcurstnpb.supabase.co/functions/v1`

**Endpoints:**
- Payment Initiate: `/payment-paytm-initiate`
- Payment Callback: `/payment-paytm-callback`
- Get Booking: `/booking-get/{booking_id}`
- Update Status: `/booking-update-status`

**Paytm Gateway (TEST):** `https://securegw-stage.paytm.in/order/process`

**Paytm Gateway (LIVE):** `https://securegw.paytm.in/order/process`

---

## Support

For issues:
1. Check Supabase function logs
2. Verify checksum generation
3. Ensure callback URL is correct
4. Test with Paytm staging cards

For Paytm-specific issues:
- Paytm Developer Docs: https://developer.paytm.com/
- Paytm Support: https://paytm.com/care
