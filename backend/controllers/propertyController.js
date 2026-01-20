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
  if (typeof field === 'string' && field.startsWith('{')) {
    return field.substring(1, field.length - 1).split(',').map(item => item.trim().replace(/^"(.*)"$/, '$1'));
  }
  try {
    return JSON.parse(field);
  } catch (e) {
    return [];
  }
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

    const result = await query(`
      SELECT p.*,
        (SELECT json_agg(json_build_object('id', pi.id, 'image_url', pi.image_url, 'display_order', pi.display_order) ORDER BY pi.display_order)
         FROM property_images pi WHERE pi.property_id = p.id) as images
      FROM properties p
      WHERE p.id = $1
    `, [id]);

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
      images: result.rows[0].images || [],
    };

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

    // Generate unique 5-digit property ID (e.g., AD75C)
    const generatePropertyId = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let result = '';
      for (let i = 0; i < 5; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };
    const property_id = generatePropertyId();

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
      message: 'Failed to create property.',
      error: error.message
    });
  } finally {
    if (client) client.release();
  }
};

// Update property
const updateProperty = async (req, res) => {
  const client = await getClient();

  try {
    const { id } = req.params;
    const {
      title,
      description,
      category,
      location,
      rating,
      price,
      price_note,
      capacity,
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
      images,
    } = req.body;

    console.log('Updating property with data:', { id, title, category, imageCount: images?.length });

    // Check if property exists
    const checkResult = await query('SELECT id FROM properties WHERE id = $1', [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Property not found.',
      });
    }

    // Generate slug if title is provided
    const slug = title ? generateSlug(title) : null;

    // Start transaction
    await client.query('BEGIN');

    // Build update query dynamically
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramCount}`);
      values.push(title);
      paramCount++;
      updates.push(`slug = $${paramCount}`);
      values.push(slug);
      paramCount++;
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount}`);
      values.push(description);
      paramCount++;
    }
    if (category !== undefined) {
      updates.push(`category = $${paramCount}`);
      values.push(category);
      paramCount++;
    }
    if (location !== undefined) {
      updates.push(`location = $${paramCount}`);
      values.push(location);
      paramCount++;
    }
    if (rating !== undefined) {
      updates.push(`rating = $${paramCount}`);
      values.push(rating);
      paramCount++;
    }
    if (price !== undefined) {
      updates.push(`price = $${paramCount}`);
      values.push(price);
      paramCount++;
    }
    if (price_note !== undefined) {
      updates.push(`price_note = $${paramCount}`);
      values.push(price_note);
      paramCount++;
    }
    if (capacity !== undefined) {
      updates.push(`capacity = $${paramCount}`);
      values.push(capacity);
      paramCount++;
    }
    if (req.body.max_capacity !== undefined) {
      updates.push(`max_capacity = $${paramCount}`);
      values.push(req.body.max_capacity);
      paramCount++;
    }
    if (check_in_time !== undefined) {
      updates.push(`check_in_time = $${paramCount}`);
      values.push(check_in_time);
      paramCount++;
    }
    if (check_out_time !== undefined) {
      updates.push(`check_out_time = $${paramCount}`);
      values.push(check_out_time);
      paramCount++;
    }
    if (status !== undefined) {
      updates.push(`status = $${paramCount}`);
      values.push(status);
      paramCount++;
    }
    if (is_top_selling !== undefined) {
      updates.push(`is_top_selling = $${paramCount}`);
      values.push(is_top_selling);
      paramCount++;
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramCount}`);
      values.push(is_active);
      paramCount++;
    }
    if (is_available !== undefined) {
      updates.push(`is_available = $${paramCount}`);
      values.push(is_available);
      paramCount++;
    }
    if (contact !== undefined) {
      updates.push(`contact = $${paramCount}`);
      values.push(contact);
      paramCount++;
    }
    if (owner_name !== undefined) {
      updates.push(`owner_name = $${paramCount}`);
      values.push(owner_name);
      paramCount++;
    }
    if (owner_mobile !== undefined) {
      updates.push(`owner_mobile = $${paramCount}`);
      values.push(owner_mobile);
      paramCount++;
    }
    if (map_link !== undefined) {
      updates.push(`map_link = $${paramCount}`);
      values.push(map_link);
      paramCount++;
    }
    if (amenities !== undefined) {
      updates.push(`amenities = $${paramCount}`);
      values.push(typeof amenities === 'string' ? amenities : JSON.stringify(amenities));
      paramCount++;
    }
    if (activities !== undefined) {
      updates.push(`activities = $${paramCount}`);
      values.push(typeof activities === 'string' ? activities : JSON.stringify(activities));
      paramCount++;
    }
    if (highlights !== undefined) {
      updates.push(`highlights = $${paramCount}`);
      values.push(typeof highlights === 'string' ? highlights : JSON.stringify(highlights));
      paramCount++;
    }
    if (policies !== undefined) {
      updates.push(`policies = $${paramCount}`);
      values.push(typeof policies === 'string' ? policies : JSON.stringify(policies));
      paramCount++;
    }
    if (req.body.schedule !== undefined) {
      updates.push(`schedule = $${paramCount}`);
      values.push(typeof req.body.schedule === 'string' ? req.body.schedule : JSON.stringify(req.body.schedule));
      paramCount++;
    }
    if (req.body.availability !== undefined) {
      updates.push(`availability = $${paramCount}`);
      values.push(typeof req.body.availability === 'string' ? req.body.availability : JSON.stringify(req.body.availability));
      paramCount++;
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    values.push(id);

    const updateQuery = `UPDATE properties SET ${updates.join(', ')} WHERE id = $${paramCount}`;

    await client.query(updateQuery, values);

    // Update images if provided
    if (images !== undefined) {
      // Delete old images
      await client.query('DELETE FROM property_images WHERE property_id = $1', [id]);

      // Insert new images
      if (images.length > 0) {
        for (let i = 0; i < images.length; i++) {
          await client.query(
            'INSERT INTO property_images (property_id, image_url, display_order) VALUES ($1, $2, $3)',
            [id, images[i], i]
          );
        }
      }
    }

    // Commit transaction
    await client.query('COMMIT');

    return res.status(200).json({
      success: true,
      message: 'Property updated successfully.',
    });
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    console.error('Detailed Update property error:', error);

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
