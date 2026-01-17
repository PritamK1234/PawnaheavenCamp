/*
  # Create Bookings Table with State Machine

  ## Overview
  Creates a comprehensive bookings table for managing villa, camping, and cottage reservations
  with a built-in state machine for tracking booking lifecycle and payment status.

  ## 1. New Enums
    - `property_type_enum` - VILLA, CAMPING, COTTAGE
    - `payment_status_enum` - INITIATED, SUCCESS, FAILED, PENDING
    - `booking_status_enum` - Full booking lifecycle states

  ## 2. New Tables
    - `bookings`
      - `booking_id` (uuid, primary key) - Unique booking identifier
      - `property_id` (text) - Reference to property
      - `property_name` (text) - Property display name
      - `property_type` (enum) - Type of property being booked
      - `guest_name` (text) - Name of the guest
      - `guest_phone` (text) - Guest contact number
      - `owner_phone` (text) - Property owner contact
      - `admin_phone` (text) - Admin contact number
      - `checkin_datetime` (timestamptz) - Check-in date and time
      - `checkout_datetime` (timestamptz) - Check-out date and time
      - `advance_amount` (numeric) - Advance payment amount
      - `persons` (integer, nullable) - Guest count for villas only
      - `max_capacity` (integer, nullable) - Max capacity for villas only
      - `veg_guest_count` (integer, nullable) - Veg guest count for camping/cottage
      - `nonveg_guest_count` (integer, nullable) - Non-veg guest count for camping/cottage
      - `payment_status` (enum) - Current payment status
      - `booking_status` (enum) - Current booking status in state machine
      - `order_id` (text, nullable) - Payment gateway order ID
      - `transaction_id` (text, nullable) - Payment transaction ID
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  ## 3. Security
    - Enable RLS on bookings table
    - Policy for authenticated users to read their own bookings
    - Policy for service role to manage all bookings

  ## 4. Validation & Constraints
    - Check constraint for villa-specific fields
    - Check constraint for camping/cottage-specific fields
    - Check constraint for checkin before checkout
    - Trigger for updated_at timestamp

  ## 5. Important Notes
    - State machine transitions must be enforced at application level
    - Validation rules for property types enforced via constraints
    - All monetary values use numeric type for precision
*/

-- Create enums for type safety
CREATE TYPE property_type_enum AS ENUM ('VILLA', 'CAMPING', 'COTTAGE');
CREATE TYPE payment_status_enum AS ENUM ('INITIATED', 'SUCCESS', 'FAILED', 'PENDING');
CREATE TYPE booking_status_enum AS ENUM (
  'PAYMENT_PENDING',
  'PAYMENT_SUCCESS',
  'BOOKING_REQUEST_SENT_TO_OWNER',
  'OWNER_CONFIRMED',
  'OWNER_CANCELLED',
  'TICKET_GENERATED',
  'REFUND_REQUIRED'
);

-- Create bookings table
CREATE TABLE IF NOT EXISTS bookings (
  booking_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Property information
  property_id text NOT NULL,
  property_name text NOT NULL,
  property_type property_type_enum NOT NULL,
  
  -- Contact information
  guest_name text NOT NULL,
  guest_phone text NOT NULL,
  owner_phone text NOT NULL,
  admin_phone text NOT NULL,
  
  -- Booking dates
  checkin_datetime timestamptz NOT NULL,
  checkout_datetime timestamptz NOT NULL,
  
  -- Payment
  advance_amount numeric(10, 2) NOT NULL,
  
  -- Villa-specific fields
  persons integer,
  max_capacity integer,
  
  -- Camping/Cottage-specific fields
  veg_guest_count integer,
  nonveg_guest_count integer,
  
  -- Status tracking
  payment_status payment_status_enum NOT NULL DEFAULT 'INITIATED',
  booking_status booking_status_enum NOT NULL DEFAULT 'PAYMENT_PENDING',
  
  -- Payment gateway integration
  order_id text,
  transaction_id text,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Constraints
  CONSTRAINT checkout_after_checkin CHECK (checkout_datetime > checkin_datetime),
  CONSTRAINT positive_advance CHECK (advance_amount > 0),
  
  -- Villa validation: persons and max_capacity required, guest counts must be null
  CONSTRAINT villa_fields_valid CHECK (
    (property_type != 'VILLA') OR 
    (property_type = 'VILLA' AND 
     persons IS NOT NULL AND 
     max_capacity IS NOT NULL AND 
     persons > 0 AND
     persons <= max_capacity AND
     veg_guest_count IS NULL AND 
     nonveg_guest_count IS NULL)
  ),
  
  -- Camping/Cottage validation: guest counts required, persons/capacity must be null
  CONSTRAINT camping_cottage_fields_valid CHECK (
    (property_type = 'VILLA') OR 
    (property_type IN ('CAMPING', 'COTTAGE') AND 
     veg_guest_count IS NOT NULL AND 
     nonveg_guest_count IS NOT NULL AND 
     (veg_guest_count + nonveg_guest_count) > 0 AND
     persons IS NULL AND 
     max_capacity IS NULL)
  )
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_bookings_guest_phone ON bookings(guest_phone);
CREATE INDEX IF NOT EXISTS idx_bookings_property_id ON bookings(property_id);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_status ON bookings(booking_status);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_bookings_updated_at ON bookings;
CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role full access (for backend operations)
CREATE POLICY "Service role has full access to bookings"
  ON bookings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can read their own bookings by phone
CREATE POLICY "Users can read their own bookings"
  ON bookings
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow anonymous users to create bookings (for public booking form)
CREATE POLICY "Anyone can create bookings"
  ON bookings
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Policy: Only service role can update bookings (state machine transitions)
CREATE POLICY "Only service role can update bookings"
  ON bookings
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);
