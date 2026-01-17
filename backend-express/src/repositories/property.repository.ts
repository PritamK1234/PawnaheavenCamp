import { pool } from '../config/database';

export interface Property {
  id: number;
  title: string;
  slug: string;
  description: string;
  category: 'camping' | 'cottage' | 'villa';
  location: string;
  rating: number;
  price: string;
  price_note: string;
  capacity: number;
  max_capacity?: number;
  check_in_time: string;
  check_out_time: string;
  status: string;
  is_top_selling: boolean;
  is_active: boolean;
  is_available: boolean;
  contact: string;
  owner_mobile?: string;
  map_link?: string;
  amenities: string | string[];
  activities: string | string[];
  highlights: string | string[];
  policies?: string | string[];
  created_at: Date;
  updated_at: Date;
}

export interface PropertyImage {
  id: number;
  property_id: number;
  image_url: string;
  display_order: number;
  created_at: Date;
}

export class PropertyRepository {
  async findAll(): Promise<Property[]> {
    const result = await pool.query(
      `SELECT * FROM properties WHERE is_active = true ORDER BY created_at DESC`
    );
    return result.rows;
  }

  async findBySlug(slug: string): Promise<Property | null> {
    const result = await pool.query(
      `SELECT * FROM properties WHERE slug = $1 AND is_active = true`,
      [slug]
    );
    return result.rows[0] || null;
  }

  async findImagesByPropertyId(propertyId: number): Promise<PropertyImage[]> {
    const result = await pool.query(
      `SELECT * FROM property_images WHERE property_id = $1 ORDER BY display_order`,
      [propertyId]
    );
    return result.rows;
  }
}
