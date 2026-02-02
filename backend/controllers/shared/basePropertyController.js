const { query, getClient } = require('../../db');

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

const parseField = (field) => {
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

const formatPropertyResponse = (prop) => {
  return {
    ...prop,
    amenities: parsePostgresArray(prop.amenities),
    activities: parsePostgresArray(prop.activities),
    highlights: parsePostgresArray(prop.highlights),
    policies: parsePostgresArray(prop.policies),
    schedule: parsePostgresArray(prop.schedule),
    availability: parsePostgresArray(prop.availability),
    special_dates: prop.special_dates ? (typeof prop.special_dates === 'string' ? JSON.parse(prop.special_dates) : prop.special_dates) : [],
    images: prop.images || [],
    units: prop.units || [],
  };
};

const getAllProperties = async (req, res) => {
  try {
    const result = await query(`
      SELECT p.*,
        (SELECT json_agg(json_build_object('id', pi.id, 'image_url', pi.image_url, 'display_order', pi.display_order) ORDER BY pi.display_order)
         FROM property_images pi WHERE pi.property_id = p.id) as images,
        (SELECT json_agg(json_build_object(
            'id', pu.id, 
            'name', pu.name, 
            'available_persons', pu.available_persons, 
            'total_persons', pu.total_persons,
            'weekday_price', p.weekday_price,
            'weekend_price', p.weekend_price,
            'special_price', p.price,
            'special_dates', p.special_dates
          )) 
         FROM property_units pu WHERE pu.property_id = p.id) as units
      FROM properties p
      ORDER BY p.created_at DESC
    `);

    const properties = result.rows.map(formatPropertyResponse);

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

const getPublicProperties = async (req, res) => {
  try {
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
         FROM property_images pi WHERE pi.property_id = p.id) as images,
        (SELECT json_agg(json_build_object(
            'id', pu.id, 
            'name', pu.name, 
            'available_persons', pu.available_persons, 
            'total_persons', pu.total_persons,
            'weekday_price', p.weekday_price,
            'weekend_price', p.weekend_price,
            'special_price', p.price,
            'special_dates', p.special_dates
          )) 
         FROM property_units pu WHERE pu.property_id = p.id) as units,
        (
          SELECT MIN(uc.price)
          FROM property_units pu
          JOIN unit_calendar uc ON uc.unit_id = pu.id
          WHERE pu.property_id = p.id
          AND uc.date >= CURRENT_DATE
          AND uc.price IS NOT NULL
        ) as unit_starting_price,
        (
          SELECT MIN(pu.weekday_price::numeric)
          FROM property_units pu
          WHERE pu.property_id = p.id
          AND pu.weekday_price IS NOT NULL AND pu.weekday_price != ''
        ) as unit_base_starting_price
      FROM properties p
      WHERE p.is_active = true
      ORDER BY p.is_available DESC, p.is_top_selling DESC, p.created_at DESC
    `);

    const properties = result.rows.map(prop => {
      const displayPrice = prop.unit_starting_price || prop.unit_base_starting_price || prop.price || 'Price on Selection';
      return {
        ...formatPropertyResponse(prop),
        price: String(displayPrice),
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

const deleteProperty = async (req, res) => {
  const client = await getClient();
  
  try {
    const { id } = req.params;

    await client.query('BEGIN');

    await client.query('DELETE FROM property_images WHERE property_id = (SELECT id FROM properties WHERE property_id = $1 OR id::text = $1)', [id]);
    await client.query('DELETE FROM property_units WHERE property_id = (SELECT id FROM properties WHERE property_id = $1 OR id::text = $1)', [id]);
    
    const result = await client.query('DELETE FROM properties WHERE property_id = $1 OR id::text = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Property not found.',
      });
    }

    await client.query('DELETE FROM owners WHERE property_id = $1', [result.rows[0].property_id]);

    await client.query('COMMIT');

    return res.status(200).json({
      success: true,
      message: 'Property deleted successfully.',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Delete property error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete property.',
    });
  } finally {
    client.release();
  }
};

const togglePropertyStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { field, value } = req.body;

    const allowedFields = ['is_active', 'is_available', 'is_top_selling'];
    if (!allowedFields.includes(field)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid field.',
      });
    }

    const result = await query(
      `UPDATE properties SET ${field} = $1, updated_at = CURRENT_TIMESTAMP WHERE property_id = $2 OR id::text = $2 RETURNING *`,
      [value, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Property not found.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Property status updated successfully.',
      data: result.rows[0]
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
  query,
  getClient,
  generateSlug,
  parsePostgresArray,
  parseField,
  formatPropertyResponse,
  getAllProperties,
  getPublicProperties,
  getCategorySettings,
  updateCategorySettings,
  deleteProperty,
  togglePropertyStatus
};
