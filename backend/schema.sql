-- LoonCamp PostgreSQL Database Schema
-- Production-ready schema for property booking admin panel

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

-- Insert default category settings
INSERT INTO category_settings (category, is_active, base_price, description)
VALUES 
  ('camping', true, '₹1,499', 'Outdoor tent stay experiences'),
  ('cottage', true, '₹3,999', 'Cozy wooden cottage stays'),
  ('villa', true, '₹8,999', 'Luxury private villa stays')
ON CONFLICT (category) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_properties_slug ON properties(slug);
CREATE INDEX IF NOT EXISTS idx_properties_category ON properties(category);
CREATE INDEX IF NOT EXISTS idx_properties_is_active ON properties(is_active);
CREATE INDEX IF NOT EXISTS idx_property_images_property_id ON property_images(property_id);

-- Insert initial admin user
INSERT INTO admins (email, password_hash)
VALUES ('admin@looncamp.shop', '$2b$10$8k31lpb.NzzVqV0Pq5iJKuauiTJY2Bdnb4APYKM2MvLPsRYtV9WEu')
ON CONFLICT (email) DO NOTHING;

-- Sample property data (optional - for testing)
-- You can remove this section in production
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
