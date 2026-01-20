const { query, getClient } = require('../db');

// Helper function to generate slug from title
const generateSlug = (title) => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

const parsePostgresArray = (field) => {
  if (!field) return [];
  if (Array.isArray(field)) return field;
  if (typeof field === 'string') {
    let trimmed = field.trim();
    
    // Handle double-quoted JSON strings from Postgres
    if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
      trimmed = trimmed.substring(1, trimmed.length - 1).replace(/""/g, '"').replace(/\\"/g, '"');
    }

    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      return trimmed.substring(1, trimmed.length - 1).split(',').map(item => item.trim().replace(/^"(.*)"$/, '$1'));
    }
    
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (e) {
      if (trimmed.includes(',')) {
        return trimmed.split(',').map(s => s.trim());
      }
      return [trimmed];
    }
  }
  return [];
};

// Get all properties (Admin)
const getAllProperties = async (req, res) => {
  try {
    const result = await query(`
      SELECT p.*,
        (SELECT json_agg(json_build_object('id', pi.id, 'image_url', pi.image_url, 'display_order', pi.display_order) ORDER BY pi.display_order)
         FROM property_images pi WHERE pi.property_id = p.id) as images
      FROM properties p
      ORDER BY p.created_at DESC
    `);

    const properties = result.rows.map(prop => {
      const parseField = (field) => {
        if (!field) return [];
        if (Array.isArray(field)) return field;
        if (typeof field === 'string' && field.startsWith('{')) {
          // Handle PostgreSQL array format like "{item1,item2}"
          return field.substring(1, field.length - 1).split(',').map(item => item.trim().replace(/^"(.*)"$/, '$1'));
        }
        try {
          return JSON.parse(field);
        } catch (e) {
          return [];
        }
      };

      return {
        ...prop,
        amenities: parseField(prop.amenities),
        activities: parseField(prop.activities),
        highlights: parseField(prop.highlights),
        policies: parseField(prop.policies),
        schedule: parseField(prop.schedule),
        availability: parseField(prop.availability),
        images: prop.images || [],
      };
    });

    return res.status(200).json({
      success: true,
      data: properties,
    });
  } catch (error) {
    console.error('Get all properties error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch properties.',
    });
  }
};

// Get public properties (only active and handling closed categories)
const getPublicProperties = async (req, res) => {
  try {
    // Fetch category settings
    const settingsResult = await query('SELECT * FROM category_settings');
    const categorySettings = {};
    settingsResult.rows.forEach(s => {
      categorySettings[s.category] = {
        is_closed: s.is_closed,
        reason: s.closed_reason,
        from: s.closed_from,
        to: s.closed_to
      };
    });

    const result = await query(`
      SELECT p.*,
        (SELECT json_agg(json_build_object('id', pi.id, 'image_url', pi.image_url, 'display_order', pi.display_order) ORDER BY pi.display_order)
         FROM property_images pi WHERE pi.property_id = p.id) as images
      FROM properties p
      WHERE p.is_active = true
      ORDER BY p.is_available DESC, p.is_top_selling DESC, p.created_at DESC
    `);

    const properties = result.rows.map(prop => {
      const parseField = (field) => {
        if (!field) return [];
        if (Array.isArray(field)) return field;
        if (typeof field === 'string' && field.startsWith('{')) {
          // Handle PostgreSQL array format like "{item1,item2}"
          return field.substring(1, field.length - 1).split(',').map(item => item.trim().replace(/^"(.*)"$/, '$1'));
        }
        try {
          return JSON.parse(field);
        } catch (e) {
          return [];
        }
      };

      return {
        ...prop,
        amenities: parseField(prop.amenities),
        activities: parseField(prop.activities),
        highlights: parseField(prop.highlights),
        policies: parseField(prop.policies),
        schedule: parseField(prop.schedule),
        availability: parseField(prop.availability),
        images: prop.images || [],
      };
    });

    return res.status(200).json({
      success: true,
      data: properties,
      categorySettings
    });
  } catch (error) {
    console.error('Get public properties error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch properties.',
    });
  }
};

// Category Settings (Admin)
const getCategorySettings = async (req, res) => {
  try {
    const result = await query('SELECT * FROM category_settings ORDER BY category');
    return res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get category settings error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch settings.'
    });
  }
};

const updateCategorySettings = async (req, res) => {
  try {
    const { category } = req.params;
    const { is_closed, closed_reason, closed_from, closed_to } = req.body;

    await query(
      `UPDATE category_settings 
       SET is_closed = $1, closed_reason = $2, closed_from = $3, closed_to = $4, updated_at = CURRENT_TIMESTAMP
       WHERE category = $5`,
      [is_closed, closed_reason, closed_from, closed_to, category]
    );

    return res.status(200).json({
      success: true,
      message: 'Settings updated successfully.'
    });
  } catch (error) {
    console.error('Update category settings error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update settings.'
    });
  }
};

// Get single property by ID
const getPropertyById = async (req, res) => {
  try {
    const { id } = req.params;

    // First try by alphanumeric property_id
    let result = await query(`
      SELECT p.*,
        (SELECT json_agg(json_build_object('id', pi.id, 'image_url', pi.image_url, 'display_order', pi.display_order) ORDER BY pi.display_order)
         FROM property_images pi WHERE pi.property_id = p.id) as images
      FROM properties p
      WHERE p.property_id = $1
    `, [id]);

    // If not found, try by numeric auto-increment id
    if (result.rows.length === 0) {
      result = await query(`
        SELECT p.*,
          (SELECT json_agg(json_build_object('id', pi.id, 'image_url', pi.image_url, 'display_order', pi.display_order) ORDER BY pi.display_order)
           FROM property_images pi WHERE pi.property_id = p.id) as images
        FROM properties p
        WHERE p.id::text = $1
      `, [id]);
    }

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Property not found.',
      });
    }

    const property = {
      ...result.rows[0],
      amenities: parsePostgresArray(result.rows[0].amenities),
      activities: parsePostgresArray(result.rows[0].activities),
      highlights: parsePostgresArray(result.rows[0].highlights),
      policies: parsePostgresArray(result.rows[0].policies),
      schedule: parsePostgresArray(result.rows[0].schedule),
      availability: parsePostgresArray(result.rows[0].availability),
      images: result.rows[0].images || [],
    };

    console.log('Sending property data to owner dashboard:', { 
      id: property.id, 
      property_id: property.property_id,
      amenitiesCount: property.amenities.length,
      activitiesCount: property.activities.length
    });

    return res.status(200).json({
      success: true,
      data: property,
    });
  } catch (error) {
    console.error('Get property by ID error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch property.',
    });
  }
};

// Update property by ID
const updateProperty = async (req, res) => {
  try {
    const { id } = req.params;
    const { amenities, activities, highlights, policies, schedule, description, availability } = req.body;

    const result = await query(`
      UPDATE properties 
      SET 
        amenities = $1, 
        activities = $2, 
        highlights = $3, 
        policies = $4, 
        schedule = $5, 
        description = $6,
        availability = $7,
        updated_at = CURRENT_TIMESTAMP
      WHERE property_id = $8 OR id::text = $8
      RETURNING *
    `, [
      Array.isArray(amenities) ? JSON.stringify(amenities) : (amenities || '[]'), 
      Array.isArray(activities) ? JSON.stringify(activities) : (activities || '[]'), 
      Array.isArray(highlights) ? JSON.stringify(highlights) : (highlights || '[]'), 
      Array.isArray(policies) ? JSON.stringify(policies) : (policies || '[]'), 
      Array.isArray(schedule) ? JSON.stringify(schedule) : (schedule || '[]'), 
      description,
      Array.isArray(availability) ? JSON.stringify(availability) : (availability || '[]'),
      id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Property not found.',
      });
    }

    // Sync owner table if owner details are provided in update
    const { owner_name, owner_mobile } = req.body;
    if (owner_name || owner_mobile) {
      await query(`
        UPDATE owners 
        SET 
          owner_name = COALESCE($1, owner_name),
          mobile_number = COALESCE($2, mobile_number),
          property_name = COALESCE($3, property_name)
        WHERE property_id = $4
      `, [owner_name, owner_mobile, result.rows[0].title, result.rows[0].property_id]);
    }

    return res.status(200).json({
      success: true,
      message: 'Property updated successfully.',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Update property error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update property.',
    });
  }
};

// Get single property by Slug (Public)
const getPublicPropertyBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const result = await query(`
      SELECT p.*,
        (SELECT json_agg(json_build_object('id', pi.id, 'image_url', pi.image_url, 'display_order', pi.display_order) ORDER BY pi.display_order)
         FROM property_images pi WHERE pi.property_id = p.id) as images
      FROM properties p
      WHERE p.slug = $1 AND p.is_active = true
    `, [slug]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Property not found.',
      });
    }

    const property = {
      ...result.rows[0],
      amenities: parsePostgresArray(result.rows[0].amenities),
      activities: parsePostgresArray(result.rows[0].activities),
      highlights: parsePostgresArray(result.rows[0].highlights),
      policies: parsePostgresArray(result.rows[0].policies),
      schedule: parsePostgresArray(result.rows[0].schedule),
      availability: parsePostgresArray(result.rows[0].availability),
      images: result.rows[0].images || [],
    };

    return res.status(200).json({
      success: true,
      data: property,
    });
  } catch (error) {
    console.error('Get public property by slug error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch property.',
    });
  }
};

// Create new property
const createProperty = async (req, res) => {
  const client = await getClient();

  try {
    const {
      title,
      description,
      category,
      location,
      rating,
      price,
      price_note,
      capacity,
      max_capacity,
      check_in_time,
      check_out_time,
      status,
      is_top_selling,
      is_active,
      is_available,
      contact,
      owner_name,
      owner_mobile,
      map_link,
      amenities,
      activities,
      highlights,
      policies,
      schedule,
      availability,
      images,
    } = req.body;

    console.log('Creating property with data:', { title, category, imageCount: images?.length });

    // Validate required fields
    if (!title || !description || !category || !location || !price || !price_note || !capacity) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields.',
      });
    }

    // Generate slug
    const slug = generateSlug(title);

    // Generate unique 5-digit property ID (e.g., AD75C) only if not provided by frontend
    const generatePropertyId = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let result = '';
      for (let i = 0; i < 5; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };
    const property_id = req.body.property_id || generatePropertyId();

    // Start transaction
    await client.query('BEGIN');

    // Insert property
    const propertyResult = await client.query(
      `INSERT INTO properties (
        title, slug, property_id, description, category, location, rating, price, price_note,
        capacity, max_capacity, check_in_time, check_out_time, status, is_top_selling, is_active, is_available,
        contact, owner_name, owner_mobile, map_link, amenities, activities, highlights, policies, schedule, availability, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, CURRENT_TIMESTAMP)
      RETURNING *`,
      [
        title,
        slug,
        property_id,
        description,
        category,
        location,
        rating || 4.5,
        price,
        price_note,
        capacity,
        max_capacity || capacity,
        check_in_time || '2:00 PM',
        check_out_time || '11:00 AM',
        status || 'Verified',
        is_top_selling || false,
        is_active !== undefined ? is_active : true,
        is_available !== undefined ? is_available : true,
        contact || '+91 8669505727',
        owner_name,
        owner_mobile,
        map_link,
        typeof amenities === 'string' ? amenities : JSON.stringify(amenities || []),
        typeof activities === 'string' ? activities : JSON.stringify(activities || []),
        typeof highlights === 'string' ? highlights : JSON.stringify(highlights || []),
        typeof policies === 'string' ? policies : JSON.stringify(policies || []),
        typeof schedule === 'string' ? schedule : JSON.stringify(schedule || []),
        typeof availability === 'string' ? availability : JSON.stringify(availability || []),
      ]
    );

    const newProperty = propertyResult.rows[0];

    // Insert images if provided
    if (images && images.length > 0) {
      for (let i = 0; i < images.length; i++) {
        await client.query(
          'INSERT INTO property_images (property_id, image_url, display_order) VALUES ($1, $2, $3)',
          [newProperty.id, images[i], i]
        );
      }
    }

    // Commit transaction
    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      message: 'Property created successfully.',
      data: {
        id: newProperty.id,
        slug: newProperty.slug,
      },
    });
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    console.error('Detailed Create property error:', error);

    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        message: 'Property with this title already exists.',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to update property.',
      error: error.message
    });
  } finally {
    if (client) client.release();
  }
};

// Update property

// Delete property
const deleteProperty = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query('DELETE FROM properties WHERE id = $1', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Property not found.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Property deleted successfully.',
    });
  } catch (error) {
    console.error('Delete property error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete property.',
    });
  }
};

// Toggle property status (active/inactive or top selling)
const togglePropertyStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { field, value } = req.body;

    if (!field || value === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Field and value are required.',
      });
    }

    if (!['is_active', 'is_top_selling', 'is_available'].includes(field)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid field. Only is_active, is_top_selling and is_available can be toggled.',
      });
    }

    const updateQuery = `UPDATE properties SET ${field} = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`;
    const result = await query(updateQuery, [value, id]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Property not found.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Property status updated successfully.',
    });
  } catch (error) {
    console.error('Toggle property status error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update property status.',
    });
  }
};

module.exports = {
  getAllProperties,
  getPublicProperties,
  getPublicPropertyBySlug,
  getPropertyById,
  createProperty,
  updateProperty,
  deleteProperty,
  togglePropertyStatus,
  getCategorySettings,
  updateCategorySettings
};
