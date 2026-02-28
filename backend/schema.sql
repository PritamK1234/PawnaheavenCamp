-- PawnaHavenCamp PostgreSQL Database Schema
-- Updated: Feb 2026
-- Production-ready schema for property booking platform

-- Create admins table
CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create properties table
CREATE TABLE IF NOT EXISTS properties (
  id SERIAL PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  slug VARCHAR(500) UNIQUE NOT NULL,
  property_id VARCHAR(50) UNIQUE,
  description TEXT NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('campings_cottages', 'villa', 'camping')),
  location VARCHAR(255) NOT NULL,
  rating DECIMAL(2,1) DEFAULT 4.5 CHECK (rating >= 0 AND rating <= 5),
  price VARCHAR(50) NOT NULL,
  weekday_price VARCHAR(50),
  weekend_price VARCHAR(50),
  price_note VARCHAR(255) NOT NULL,
  capacity INTEGER NOT NULL,
  max_capacity INTEGER,
  check_in_time VARCHAR(50) DEFAULT '2:00 PM',
  check_out_time VARCHAR(50) DEFAULT '11:00 AM',
  status VARCHAR(50) DEFAULT 'Verified',
  is_top_selling BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  is_available BOOLEAN DEFAULT true,
  contact VARCHAR(255) DEFAULT '+91 8806092609',
  owner_name VARCHAR(255),
  owner_whatsapp_number VARCHAR(255),
  owner_otp_number VARCHAR(255),
  map_link TEXT,
  referral_code VARCHAR(50),
  amenities TEXT NOT NULL,
  activities TEXT NOT NULL,
  highlights TEXT NOT NULL,
  policies TEXT,
  schedule TEXT,
  availability TEXT,
  availability_calendar JSONB,
  special_dates JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create bookings table for booking flow
CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  booking_id VARCHAR(50) UNIQUE NOT NULL,
  property_id VARCHAR(50) NOT NULL,
  property_name VARCHAR(255) NOT NULL,
  property_type VARCHAR(50) NOT NULL,
  guest_name VARCHAR(255) NOT NULL,
  guest_phone VARCHAR(20) NOT NULL,
  owner_phone VARCHAR(20) NOT NULL,
  admin_phone VARCHAR(20) NOT NULL,
  checkin_datetime TIMESTAMP NOT NULL,
  checkout_datetime TIMESTAMP NOT NULL,
  advance_amount DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(10,2),
  persons INTEGER,
  max_capacity INTEGER,
  veg_guest_count INTEGER,
  nonveg_guest_count INTEGER,
  owner_name VARCHAR(255),
  map_link TEXT,
  property_address TEXT,
  referral_code VARCHAR(50),
  referral_discount DECIMAL(10,2) DEFAULT 0,
  referral_type TEXT,
  payment_status VARCHAR(50) DEFAULT 'INITIATED',
  booking_status VARCHAR(50) DEFAULT 'PAYMENT_PENDING',
  order_id VARCHAR(100),
  transaction_id VARCHAR(100),
  refund_id VARCHAR(100),
  refund_status VARCHAR(50),
  refund_amount DECIMAL(10,2),
  payment_method VARCHAR(50),
  admin_commission DECIMAL(10,2),
  referrer_commission DECIMAL(10,2),
  commission_status VARCHAR(50),
  unit_id INTEGER,
  action_token VARCHAR(100),
  action_token_used BOOLEAN DEFAULT false,
  action_token_expires_at TIMESTAMP,
  webhook_processed BOOLEAN DEFAULT false,
  ticket_token VARCHAR(100) UNIQUE,
  whatsapp_message_ids JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  commission_paid BOOLEAN DEFAULT false,
  commission_paid_at TIMESTAMP,
  utr_number VARCHAR(100)
);

-- Create availability_calendar table (Villa property-level legacy fallback)
CREATE TABLE IF NOT EXISTS availability_calendar (
  id SERIAL PRIMARY KEY,
  calendar_id VARCHAR(50) UNIQUE,
  property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  price VARCHAR(255),
  is_booked BOOLEAN DEFAULT false,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(property_id, date)
);

-- Create property_images table
CREATE TABLE IF NOT EXISTS property_images (
  id SERIAL PRIMARY KEY,
  property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create owners table
CREATE TABLE IF NOT EXISTS owners (
  id SERIAL PRIMARY KEY,
  property_id VARCHAR(50) UNIQUE NOT NULL,
  property_name VARCHAR(255) NOT NULL,
  property_type VARCHAR(50) NOT NULL,
  owner_name VARCHAR(255) NOT NULL,
  owner_otp_number VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  owner_whatsapp_number VARCHAR(255)
);

-- Create category_settings table
CREATE TABLE IF NOT EXISTS category_settings (
  id SERIAL PRIMARY KEY,
  category VARCHAR(50) UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  is_closed BOOLEAN DEFAULT false,
  closed_reason TEXT,
  closed_from TEXT,
  closed_to TEXT,
  base_price VARCHAR(50),
  description TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create referral_users table
CREATE TABLE IF NOT EXISTS referral_users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) NOT NULL,
  referral_otp_number VARCHAR(20) NOT NULL,
  referral_code VARCHAR(50) UNIQUE NOT NULL,
  referral_url VARCHAR(500),
  balance DECIMAL(10,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active',
  referral_type VARCHAR(20) DEFAULT 'public',
  linked_property_id INTEGER,
  linked_property_slug VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  property_id VARCHAR(50)
);

-- Create referral_transactions table
CREATE TABLE IF NOT EXISTS referral_transactions (
  id SERIAL PRIMARY KEY,
  referral_user_id INTEGER NOT NULL REFERENCES referral_users(id),
  booking_id INTEGER,
  amount DECIMAL(10,2) NOT NULL,
  type VARCHAR(20) NOT NULL,
  status VARCHAR(20) DEFAULT 'completed',
  source VARCHAR(50),
  upi_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create property_units table (used by both villa and campings_cottages)
CREATE TABLE IF NOT EXISTS property_units (
  id SERIAL PRIMARY KEY,
  property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  available_persons INTEGER NOT NULL,
  total_persons INTEGER DEFAULT 0,
  amenities TEXT,
  images TEXT,
  price_per_person VARCHAR(50),
  weekday_price VARCHAR(50),
  weekend_price VARCHAR(50),
  special_price VARCHAR(50),
  special_dates JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  description TEXT,
  check_in_time VARCHAR(50),
  check_out_time VARCHAR(50),
  highlights TEXT,
  activities TEXT,
  policies TEXT,
  schedule TEXT,
  rating DECIMAL(2,1) DEFAULT 4.5,
  price_note VARCHAR(255),
  location VARCHAR(255),
  google_maps_link TEXT,
  title VARCHAR(500)
);

-- Create otp_verifications table
CREATE TABLE IF NOT EXISTS otp_verifications (
  id SERIAL PRIMARY KEY,
  mobile_number VARCHAR(20) NOT NULL,
  otp_code VARCHAR(6) NOT NULL,
  purpose VARCHAR(20) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default category settings
INSERT INTO category_settings (category, is_active, base_price, description)
VALUES 
  ('campings_cottages', true, '₹1,499', 'Outdoor tent and cottage stay experiences'),
  ('villa', true, '₹8,999', 'Luxury private villa stays')
ON CONFLICT (category) DO NOTHING;

-- Create unit_calendar table (unit-level availability for both categories)
CREATE TABLE IF NOT EXISTS unit_calendar (
  id SERIAL PRIMARY KEY,
  calendar_id VARCHAR(50) UNIQUE,
  unit_id INTEGER NOT NULL REFERENCES property_units(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  price VARCHAR(255),
  available_quantity INTEGER NOT NULL,
  is_weekend BOOLEAN DEFAULT false,
  is_special BOOLEAN DEFAULT false,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(unit_id, date)
);

-- Create ledger_entries table for booking records
CREATE TABLE IF NOT EXISTS ledger_entries (
  id SERIAL PRIMARY KEY,
  property_id TEXT NOT NULL,
  unit_id INTEGER,
  customer_name TEXT NOT NULL,
  persons INTEGER NOT NULL,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  payment_mode TEXT NOT NULL CHECK (payment_mode = ANY (ARRAY['online'::text, 'offline'::text])),
  amount NUMERIC NOT NULL,
  booking_id VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for unit management
CREATE INDEX IF NOT EXISTS idx_property_units_property_id ON property_units(property_id);
CREATE INDEX IF NOT EXISTS idx_unit_calendar_unit_id ON unit_calendar(unit_id);
CREATE INDEX IF NOT EXISTS idx_unit_calendar_date ON unit_calendar(date);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_properties_slug ON properties(slug);
CREATE INDEX IF NOT EXISTS idx_properties_category ON properties(category);
CREATE INDEX IF NOT EXISTS idx_properties_is_active ON properties(is_active);
CREATE INDEX IF NOT EXISTS idx_property_images_property_id ON property_images(property_id);
CREATE INDEX IF NOT EXISTS idx_referral_users_code ON referral_users(referral_code);
CREATE INDEX IF NOT EXISTS idx_referral_transactions_user ON referral_transactions(referral_user_id);
CREATE INDEX IF NOT EXISTS idx_otp_verifications_mobile ON otp_verifications(mobile_number);

CREATE INDEX IF NOT EXISTS idx_bookings_booking_id ON bookings(booking_id);
CREATE INDEX IF NOT EXISTS idx_bookings_order_id ON bookings(order_id);
CREATE INDEX IF NOT EXISTS idx_bookings_guest_phone ON bookings(guest_phone);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(booking_status);
CREATE INDEX IF NOT EXISTS idx_bookings_action_token ON bookings(action_token);

CREATE INDEX IF NOT EXISTS idx_ledger_entries_property_id ON ledger_entries(property_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_check_in ON ledger_entries(check_in);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_booking_id ON ledger_entries(booking_id);

-- Create webhook_events table for logging all incoming webhook events
CREATE TABLE IF NOT EXISTS webhook_events (
  id SERIAL PRIMARY KEY,
  event_type VARCHAR(100),
  payload JSONB,
  processed BOOLEAN DEFAULT false,
  booking_id VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_booking_id ON webhook_events(booking_id);
CREATE INDEX IF NOT EXISTS idx_bookings_ticket_token ON bookings(ticket_token);

-- Insert initial admin user
INSERT INTO admins (email, password_hash)
VALUES ('admin@looncamp.shop', '$2b$10$8k31lpb.NzzVqV0Pq5iJKuauiTJY2Bdnb4APYKM2MvLPsRYtV9WEu')
ON CONFLICT (email) DO NOTHING;
