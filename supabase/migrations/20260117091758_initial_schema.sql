/*
  # Initial LoonCamp Database Schema
  
  ## Overview
  This migration creates the complete database schema for the LoonCamp property booking platform,
  including tables for admin authentication, properties, property images, and category settings.
  
  ## New Tables
  
  ### `admins`
  - `id` (serial, primary key) - Unique identifier for admin users
  - `email` (varchar, unique) - Admin email address for login
  - `password_hash` (varchar) - Bcrypt hashed password
  - `created_at` (timestamp) - Account creation timestamp
  
  ### `properties`
  - `id` (serial, primary key) - Unique property identifier
  - `title` (varchar) - Property name/title
  - `slug` (varchar, unique) - URL-friendly identifier
  - `description` (text) - Detailed property description
  - `category` (varchar) - Property type: camping, cottage, or villa
  - `location` (varchar) - Property location
  - `rating` (decimal) - Property rating (0-5)
  - `price` (varchar) - Display price
  - `price_note` (varchar) - Price explanation (e.g., "per person with meal")
  - `capacity` (integer) - Standard guest capacity
  - `max_capacity` (integer) - Maximum guest capacity
  - `check_in_time` (varchar) - Check-in time
  - `check_out_time` (varchar) - Check-out time
  - `status` (varchar) - Verification status
  - `is_top_selling` (boolean) - Featured property flag
  - `is_active` (boolean) - Active listing flag
  - `is_available` (boolean) - Availability flag
  - `contact` (varchar) - Contact number
  - `owner_mobile` (varchar) - Property owner contact
  - `map_link` (text) - Google Maps link
  - `amenities` (text) - JSON array of amenities
  - `activities` (text) - JSON array of activities
  - `highlights` (text) - JSON array of highlights
  - `policies` (text) - JSON array of policies
  - `created_at` (timestamp) - Creation timestamp
  - `updated_at` (timestamp) - Last update timestamp
  
  ### `property_images`
  - `id` (serial, primary key) - Unique image identifier
  - `property_id` (integer, foreign key) - References properties table
  - `image_url` (text) - Image URL
  - `display_order` (integer) - Sort order for display
  - `created_at` (timestamp) - Upload timestamp
  
  ### `category_settings`
  - `id` (serial, primary key) - Unique identifier
  - `category` (varchar, unique) - Category name
  - `is_active` (boolean) - Category active status
  - `is_closed` (boolean) - Category closed status
  - `closed_reason` (text) - Reason for closure
  - `closed_from` (text) - Closure start date
  - `closed_to` (text) - Closure end date
  - `base_price` (varchar) - Base price for category
  - `description` (text) - Category description
  - `updated_at` (timestamp) - Last update timestamp
  
  ## Security
  
  ### Row Level Security (RLS)
  - All tables have RLS enabled
  - Public read access for properties, property_images, and category_settings
  - Restricted write access (requires authentication)
  - Admin table is fully restricted
  
  ## Indexes
  - Performance indexes on slug, category, active status, and foreign keys
  
  ## Sample Data
  - Default admin user (admin@looncamp.shop)
  - Default category settings for camping, cottage, and villa
  - Sample property for testing
*/

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
  description TEXT NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('camping', 'cottage', 'villa')),
  location VARCHAR(255) NOT NULL,
  rating DECIMAL(2,1) DEFAULT 4.5 CHECK (rating >= 0 AND rating <= 5),
  price VARCHAR(50) NOT NULL,
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
  owner_mobile VARCHAR(20),
  map_link TEXT,
  amenities TEXT NOT NULL,
  activities TEXT NOT NULL,
  highlights TEXT NOT NULL,
  policies TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create property_images table
CREATE TABLE IF NOT EXISTS property_images (
  id SERIAL PRIMARY KEY,
  property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_properties_slug ON properties(slug);
CREATE INDEX IF NOT EXISTS idx_properties_category ON properties(category);
CREATE INDEX IF NOT EXISTS idx_properties_is_active ON properties(is_active);
CREATE INDEX IF NOT EXISTS idx_property_images_property_id ON property_images(property_id);

-- Enable Row Level Security
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admins table (fully restricted)
CREATE POLICY "Admins table is not publicly accessible"
  ON admins
  FOR ALL
  TO public
  USING (false);

-- RLS Policies for properties table
CREATE POLICY "Properties are viewable by everyone"
  ON properties
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can insert properties"
  ON properties
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update properties"
  ON properties
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete properties"
  ON properties
  FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for property_images table
CREATE POLICY "Property images are viewable by everyone"
  ON property_images
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can insert property images"
  ON property_images
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update property images"
  ON property_images
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete property images"
  ON property_images
  FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for category_settings table
CREATE POLICY "Category settings are viewable by everyone"
  ON category_settings
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can insert category settings"
  ON category_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update category settings"
  ON category_settings
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete category settings"
  ON category_settings
  FOR DELETE
  TO authenticated
  USING (true);

-- Insert default category settings
INSERT INTO category_settings (category, is_active, base_price, description)
VALUES 
  ('camping', true, '₹1,499', 'Outdoor tent stay experiences'),
  ('cottage', true, '₹3,999', 'Cozy wooden cottage stays'),
  ('villa', true, '₹8,999', 'Luxury private villa stays')
ON CONFLICT (category) DO NOTHING;

-- Insert initial admin user
INSERT INTO admins (email, password_hash)
VALUES ('admin@looncamp.shop', '$2b$10$8k31lpb.NzzVqV0Pq5iJKuauiTJY2Bdnb4APYKM2MvLPsRYtV9WEu')
ON CONFLICT (email) DO NOTHING;

-- Sample property data (for testing)
INSERT INTO properties (
  title, slug, description, category, location, rating, price, price_note,
  capacity, amenities, activities, highlights, policies
) VALUES (
  'Luxury Dome Resort',
  'luxury-dome-resort',
  'Experience ultimate luxury at our lakeside retreat with panoramic views.',
  'camping',
  'Pawna Lake, Maharashtra',
  4.9,
  '₹7,499',
  'per person with meal',
  4,
  '["Private Washroom", "AC", "Mini Fridge", "BBQ", "Food Included", "Lake Access"]',
  '["Boating", "Swimming", "Bonfire", "Stargazing"]',
  '["Panoramic lake views", "Private facilities", "Gourmet dining", "Water sports"]',
  '["Free cancellation up to 7 days", "50% refund for 3-7 days", "No refund within 3 days"]'
) ON CONFLICT (slug) DO NOTHING;