const { query, getClient } = require('../db');

/**
 * SHARED/ADMIN CONTROLLER - DO NOT DELETE
 * 
 * STATUS (Feb 2026): This controller contains essential shared/admin functions.
 * 
 * FUNCTIONS TO KEEP HERE (not type-specific):
 * - getAllProperties - Admin listing (all property types)
 * - getPublicProperties - Public listing with category settings
 * - getCategorySettings/updateCategorySettings - Category management
 * - createProperty - Creates both villa & camping properties
 * - deleteProperty - Deletes any property
 * - togglePropertyStatus - Toggle active/top-selling status
 * - getCalendarData/updateCalendarData - General calendar fallback
 * 
 * MIGRATED TO TYPE-SPECIFIC CONTROLLERS:
 * - getPropertyById → villa/camping controllers
 * - updateProperty → villa/camping controllers  
 * - getPublicPropertyBySlug → villa/camping controllers
 * - Unit management → camping controller
 * 
 * For type-specific operations use:
 * - /api/villa/* endpoints (villaController.js)
 * - /api/camping_Cottages/* endpoints (camping_CottagesController.js)
 */

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
        units: prop.units || [],
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

      // Ensure starting price is used if available from units (either calendar or base unit price)
      const displayPrice = prop.unit_starting_price || prop.unit_base_starting_price || prop.price || 'Price on Selection';

      return {
        ...prop,
        price: String(displayPrice),
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

    const propData = result.rows[0];
    let units = [];

    // If category is campings_cottages, fetch units and their calendar
    if (propData.category === 'campings_cottages') {
      const unitsResult = await query(`
        SELECT pu.*,
          (
            SELECT json_agg(json_build_object(
              'date', d.date,
              'price', COALESCE(uc.price, CASE WHEN d.is_weekend THEN p.weekend_price ELSE p.weekday_price END),
              'is_booked', COALESCE((
              SELECT SUM(persons) 
              FROM ledger_entries le
              WHERE le.unit_id = pu.id 
              AND le.check_in <= d.date 
              AND le.check_out > d.date
            ), 0) >= pu.total_persons,
            'available_quantity', pu.total_persons - COALESCE((
              SELECT SUM(persons) 
              FROM ledger_entries le
              WHERE le.unit_id = pu.id 
              AND le.check_in <= d.date 
              AND le.check_out > d.date
            ), 0),
              'total_capacity', pu.total_persons,
              'is_weekend', d.is_weekend,
              'is_special', EXISTS(SELECT 1 FROM jsonb_array_elements(p.special_dates) sd WHERE (sd->>'date')::date = d.date)
            ) ORDER BY d.date)
            FROM (
              SELECT generate_series(CURRENT_DATE, CURRENT_DATE + interval '30 days', interval '1 day')::date as date,
                     extract(dow from generate_series(CURRENT_DATE, CURRENT_DATE + interval '30 days', interval '1 day')) IN (0, 6) as is_weekend
            ) d
            CROSS JOIN (SELECT p.* FROM properties p WHERE p.id = $1) p
            LEFT JOIN unit_calendar uc ON uc.unit_id = pu.id AND uc.date = d.date
          ) as calendar
        FROM property_units pu
        WHERE pu.property_id = $1
      `, [propData.id]);
      units = unitsResult.rows;
    } else if (propData.category === 'villa') {
       // Add villa-specific calendar logic
       const villaCalendarResult = await query(`
            SELECT json_agg(json_build_object(
              'date', d.date,
              'price', COALESCE(ac.price, CASE WHEN d.is_weekend THEN p.weekend_price ELSE p.weekday_price END),
              'is_booked', COALESCE((
          SELECT COUNT(*) 
          FROM ledger_entries le
          WHERE (le.property_id = p.id::text OR le.property_id = p.property_id)
          AND le.check_in <= d.date 
          AND le.check_out > d.date
        ), 0) > 0,
              'available_quantity', p.max_capacity - COALESCE((
                SELECT SUM(persons) 
                FROM ledger_entries le
                JOIN properties p_inner ON (p_inner.id::text = le.property_id OR p_inner.property_id = le.property_id)
                WHERE p_inner.id = p.id
                AND le.check_in <= d.date 
                AND le.check_out > d.date
              ), 0),
              'total_capacity', p.max_capacity,
              'weekday_price', p.weekday_price,
              'weekend_price', p.weekend_price,
              'special_dates', p.special_dates
            ) ORDER BY d.date) as calendar
            FROM properties p
            CROSS JOIN (
              SELECT generate_series(CURRENT_DATE, CURRENT_DATE + interval '30 days', interval '1 day')::date as date,
                     extract(dow from generate_series(CURRENT_DATE, CURRENT_DATE + interval '30 days', interval '1 day')) IN (0, 6) as is_weekend
            ) d
            LEFT JOIN availability_calendar ac ON ac.property_id = p.id AND ac.date = d.date
            WHERE p.id = $1
       `, [propData.id]);
       propData.calendar = villaCalendarResult.rows[0]?.calendar || [];
    }

    const property = {
      ...propData,
      amenities: parsePostgresArray(propData.amenities),
      activities: parsePostgresArray(propData.activities),
      highlights: parsePostgresArray(propData.highlights),
      policies: parsePostgresArray(propData.policies),
      schedule: parsePostgresArray(propData.schedule),
      availability: parsePostgresArray(propData.availability),
      special_dates: propData.special_dates ? (typeof propData.special_dates === 'string' ? JSON.parse(propData.special_dates) : propData.special_dates) : [],
      images: propData.images || [],
      units: units
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

// Update property by ID
const updateProperty = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      amenities, activities, highlights, policies, schedule, 
      description, availability, weekday_price, weekend_price, 
      price_note, price, special_dates, special_prices, images 
    } = req.body;

    console.log('Update property request received for ID:', id);
    console.log('Update payload:', JSON.stringify(req.body, null, 2));

    const result = await query(`
      UPDATE properties 
      SET 
        amenities = COALESCE($1, amenities), 
        activities = COALESCE($2, activities), 
        highlights = COALESCE($3, highlights), 
        policies = COALESCE($4, policies), 
        schedule = COALESCE($5, schedule), 
        description = COALESCE($6, description),
        availability = COALESCE($7, availability),
        weekday_price = COALESCE(NULLIF($8, ''), weekday_price),
        weekend_price = COALESCE(NULLIF($9, ''), weekend_price),
        price_note = COALESCE($10, price_note),
        price = COALESCE(NULLIF($11, ''), price),
        special_dates = COALESCE($12, special_dates),
        updated_at = CURRENT_TIMESTAMP
      WHERE property_id = $13 OR id::text = $13
      RETURNING *
    `, [
      Array.isArray(amenities) ? JSON.stringify(amenities) : (amenities || null), 
      Array.isArray(activities) ? JSON.stringify(activities) : (activities || null), 
      Array.isArray(highlights) ? JSON.stringify(highlights) : (highlights || null), 
      Array.isArray(policies) ? JSON.stringify(policies) : (policies || null), 
      Array.isArray(schedule) ? JSON.stringify(schedule) : (schedule || null), 
      description || null,
      Array.isArray(availability) ? JSON.stringify(availability) : (availability || null),
      weekday_price !== undefined ? String(weekday_price) : null,
      weekend_price !== undefined ? String(weekend_price) : null,
      price_note || null,
      price !== undefined ? String(price) : null,
      (Array.isArray(special_dates) ? JSON.stringify(special_dates) : (special_dates || (Array.isArray(special_prices) ? JSON.stringify(special_prices) : null))),
      id
    ]);

    console.log('Rows updated:', result.rowCount);
    if (result.rows.length > 0) {
      console.log('New column values - Weekday:', result.rows[0].weekday_price, 'Weekend:', result.rows[0].weekend_price);
    }

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Property not found.',
      });
    }

    const propertyId = result.rows[0].id;

    if (images && Array.isArray(images)) {
      await query('DELETE FROM property_images WHERE property_id = $1', [propertyId]);
      for (let i = 0; i < images.length; i++) {
        const imgUrl = typeof images[i] === 'string' ? images[i] : images[i].image_url;
        if (imgUrl) {
          await query(
            'INSERT INTO property_images (property_id, image_url, display_order) VALUES ($1, $2, $3)',
            [propertyId, imgUrl, i]
          );
        }
      }
      console.log('Updated property images:', images.length);
    }

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

    const propData = result.rows[0];
    let units = [];

    // If category is campings_cottages, fetch units and their calendar
    if (propData.category === 'campings_cottages') {
      const unitsResult = await query(`
        SELECT pu.*,
          (
            SELECT json_agg(json_build_object(
              'date', d.date,
              'price', COALESCE(uc.price, CASE WHEN d.is_weekend THEN p.weekend_price ELSE p.weekday_price END),
              'is_booked', COALESCE((
              SELECT SUM(persons) 
              FROM ledger_entries le
              WHERE le.unit_id = pu.id 
              AND le.check_in <= d.date 
              AND le.check_out > d.date
            ), 0) >= pu.total_persons,
            'available_quantity', pu.total_persons - COALESCE((
              SELECT SUM(persons) 
              FROM ledger_entries le
              WHERE le.unit_id = pu.id 
              AND le.check_in <= d.date 
              AND le.check_out > d.date
            ), 0),
              'total_capacity', pu.total_persons,
              'is_weekend', d.is_weekend,
              'is_special', EXISTS(SELECT 1 FROM jsonb_array_elements(p.special_dates) sd WHERE (sd->>'date')::date = d.date)
            ) ORDER BY d.date)
            FROM (
              SELECT generate_series(CURRENT_DATE, CURRENT_DATE + interval '30 days', interval '1 day')::date as date,
                     extract(dow from generate_series(CURRENT_DATE, CURRENT_DATE + interval '30 days', interval '1 day')) IN (0, 6) as is_weekend
            ) d
            CROSS JOIN (SELECT p.* FROM properties p WHERE p.id = $1) p
            LEFT JOIN unit_calendar uc ON uc.unit_id = pu.id AND uc.date = d.date
          ) as calendar
        FROM property_units pu
        WHERE pu.property_id = $1
      `, [propData.id]);
      units = unitsResult.rows;
    } else if (propData.category === 'villa') {
       // Add villa-specific calendar logic
       const villaCalendarResult = await query(`
            SELECT json_agg(json_build_object(
              'date', d.date,
              'price', COALESCE(ac.price, CASE WHEN d.is_weekend THEN p.weekend_price ELSE p.weekday_price END),
              'is_booked', COALESCE((
          SELECT COUNT(*) 
          FROM ledger_entries le
          WHERE (le.property_id = p.id::text OR le.property_id = p.property_id)
          AND le.check_in <= d.date 
          AND le.check_out > d.date
        ), 0) > 0,
              'available_quantity', p.max_capacity - COALESCE((
                SELECT SUM(persons) 
                FROM ledger_entries le
                JOIN properties p_inner ON (p_inner.id::text = le.property_id OR p_inner.property_id = le.property_id)
                WHERE p_inner.id = p.id
                AND le.check_in <= d.date 
                AND le.check_out > d.date
              ), 0),
              'total_capacity', p.max_capacity,
              'weekday_price', p.weekday_price,
              'weekend_price', p.weekend_price,
              'special_dates', p.special_dates
            ) ORDER BY d.date) as calendar
            FROM properties p
            CROSS JOIN (
              SELECT generate_series(CURRENT_DATE, CURRENT_DATE + interval '30 days', interval '1 day')::date as date,
                     extract(dow from generate_series(CURRENT_DATE, CURRENT_DATE + interval '30 days', interval '1 day')) IN (0, 6) as is_weekend
            ) d
            LEFT JOIN availability_calendar ac ON ac.property_id = p.id AND ac.date = d.date
            WHERE p.id = $1
       `, [propData.id]);
       propData.calendar = villaCalendarResult.rows[0]?.calendar || [];
    }

    const property = {
      ...propData,
      amenities: parsePostgresArray(propData.amenities),
      activities: parsePostgresArray(propData.activities),
      highlights: parsePostgresArray(propData.highlights),
      policies: parsePostgresArray(propData.policies),
      schedule: parsePostgresArray(propData.schedule),
      availability: parsePostgresArray(propData.availability),
      special_dates: propData.special_dates ? (typeof propData.special_dates === 'string' ? JSON.parse(propData.special_dates) : propData.special_dates) : [],
      images: propData.images || [],
      units: units
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
      weekday_price,
      weekend_price,
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
    if (!title || !description || !category || !location || !price_note || !capacity) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields.',
      });
    }

    // Ensure price is present for villa, or use a placeholder for campings_cottages if backend requires it
    const finalPrice = price || (category === 'campings_cottages' ? 'Price on Selection' : null);
    
    if (!finalPrice && category === 'villa') {
        return res.status(400).json({
          success: false,
          message: 'Price is required for villas.',
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
        title, slug, property_id, description, category, location, rating, price, weekday_price, weekend_price, price_note,
        capacity, max_capacity, check_in_time, check_out_time, status, is_top_selling, is_active, is_available,
        contact, owner_name, owner_mobile, map_link, amenities, activities, highlights, policies, schedule, availability, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, CURRENT_TIMESTAMP)
      RETURNING *`,
      [
        title,
        slug,
        property_id,
        description,
        category,
        location,
        rating || 4.5,
        finalPrice,
        weekday_price,
        weekend_price,
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

// --- Unit Management APIs ---

const getPropertyUnits = async (req, res) => {
  try {
    const { propertyId } = req.params;
    
    // First find the property internal numeric ID
    const propResult = await query(`
      SELECT id FROM properties WHERE property_id = $1 OR id::text = $1
    `, [propertyId]);

    if (propResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    const internalId = propResult.rows[0].id;

    const result = await query(
      'SELECT * FROM property_units WHERE property_id = $1 ORDER BY id ASC',
      [internalId]
    );
    return res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get property units error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch units.' });
  }
};

const createPropertyUnit = async (req, res) => {
  try {
    const { propertyId } = req.params;
    const { 
      name, amenities, images,
      price_per_person, available_persons, total_persons,
      weekday_price, weekend_price, special_price, special_dates
    } = req.body;

    const result = await query(
      `INSERT INTO property_units (
        property_id, name, available_persons, total_persons, 
        amenities, images, price_per_person
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        propertyId, name, available_persons || 0, total_persons || 0,
        JSON.stringify(amenities || []), JSON.stringify(images || []),
        price_per_person || 0
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Unit created successfully.',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Create property unit error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create unit.' });
  }
};

const updatePropertyUnit = async (req, res) => {
  try {
    const { unitId } = req.params;
    const { 
      name, available_persons, total_persons, 
      amenities, images, price_per_person,
      weekday_price, weekend_price, special_price, special_dates
    } = req.body;

    const result = await query(
      `UPDATE property_units 
       SET 
         name = COALESCE($1, name),
         available_persons = COALESCE($2, available_persons),
         total_persons = COALESCE($3, total_persons),
         amenities = COALESCE($4, amenities),
         images = COALESCE($5, images),
         price_per_person = COALESCE($6, price_per_person),
         weekday_price = COALESCE(NULLIF($7, ''), weekday_price),
         weekend_price = COALESCE(NULLIF($8, ''), weekend_price),
         special_dates = COALESCE($9, special_dates),
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $10 RETURNING *`,
      [
        name, 
        available_persons !== undefined ? parseInt(available_persons) : null, 
        total_persons !== undefined ? parseInt(total_persons) : null,
        Array.isArray(amenities) ? JSON.stringify(amenities) : (amenities || null),
        Array.isArray(images) ? JSON.stringify(images) : (images || null),
        price_per_person !== undefined ? String(price_per_person) : null,
        weekday_price !== undefined ? String(weekday_price) : null,
        weekend_price !== undefined ? String(weekend_price) : null,
        (Array.isArray(special_dates) ? JSON.stringify(special_dates) : (special_dates || null)),
        unitId
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Unit not found.' });
    }

    // Since pricing is managed at property level, update the parent property's rates
    if (weekday_price !== undefined || weekend_price !== undefined || special_dates !== undefined) {
      const propertyId = result.rows[0].property_id;
      // Also fetch property's internal ID if result.rows[0].property_id is alphanumeric
      const propLookup = await query('SELECT id FROM properties WHERE property_id = $1 OR id::text = $1', [propertyId]);
      const internalPropId = propLookup.rows[0]?.id || propertyId;

      await query(`
        UPDATE properties
        SET
          weekday_price = COALESCE(NULLIF($1, ''), weekday_price),
          weekend_price = COALESCE(NULLIF($2, ''), weekend_price),
          special_dates = COALESCE($3, special_dates),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
      `, [
        weekday_price !== undefined ? String(weekday_price) : null,
        weekend_price !== undefined ? String(weekend_price) : null,
        (Array.isArray(special_dates) ? JSON.stringify(special_dates) : (special_dates || null)),
        internalPropId
      ]);
    }

    return res.status(200).json({
      success: true,
      message: 'Unit updated successfully.',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Update property unit error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update unit.' });
  }
};

const deletePropertyUnit = async (req, res) => {
  try {
    const { unitId } = req.params;
    const result = await query('DELETE FROM property_units WHERE id = $1', [unitId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Unit not found.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Unit deleted successfully.'
    });
  } catch (error) {
    console.error('Delete property unit error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete unit.' });
  }
};

const getUnitCalendarData = async (req, res) => {
  try {
    const { unitId } = req.params;
    const result = await query(
      'SELECT date, price, available_quantity, is_weekend, is_special FROM unit_calendar WHERE unit_id = $1',
      [unitId]
    );
    return res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get unit calendar error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch unit calendar.' });
  }
};

const updateUnitCalendarData = async (req, res) => {
  try {
    const { unitId } = req.params;
    const { date, price, available_quantity, is_weekend, is_special } = req.body;

    // Fetch total capacity if available_quantity is not provided
    let finalAvailableQuantity = available_quantity;
    if (finalAvailableQuantity === undefined || finalAvailableQuantity === null) {
      const unitResult = await query('SELECT total_persons FROM property_units WHERE id = $1', [unitId]);
      if (unitResult.rows.length > 0) {
        finalAvailableQuantity = unitResult.rows[0].total_persons;
      } else {
        finalAvailableQuantity = 0;
      }
    }

    await query(
      `INSERT INTO unit_calendar (unit_id, date, price, available_quantity, is_weekend, is_special)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (unit_id, date) 
       DO UPDATE SET 
         price = EXCLUDED.price, 
         available_quantity = EXCLUDED.available_quantity,
         is_weekend = EXCLUDED.is_weekend,
         is_special = EXCLUDED.is_special`,
      [unitId, date, price, finalAvailableQuantity, is_weekend, is_special]
    );

    return res.status(200).json({
      success: true,
      message: 'Unit calendar updated successfully.'
    });
  } catch (error) {
    console.error('Update unit calendar error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update unit calendar.' });
  }
};

// Get calendar data for a property
const getCalendarData = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      'SELECT date, price, is_booked FROM availability_calendar WHERE property_id = (SELECT id FROM properties WHERE property_id = $1 OR id::text = $1)',
      [id]
    );
    return res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get calendar data error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch calendar data.' });
  }
};

// Update calendar data for a property
const updateCalendarData = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, price, is_booked } = req.body;

    await query(
      `INSERT INTO availability_calendar (property_id, date, price, is_booked, updated_at)
       VALUES ((SELECT id FROM properties WHERE property_id = $1 OR id::text = $1), $2, $3, $4, CURRENT_TIMESTAMP)
       ON CONFLICT (property_id, date) 
       DO UPDATE SET price = EXCLUDED.price, is_booked = EXCLUDED.is_booked, updated_at = CURRENT_TIMESTAMP`,
      [id, date, price, is_booked]
    );

    return res.status(200).json({
      success: true,
      message: 'Calendar updated successfully.'
    });
  } catch (error) {
    console.error('Update calendar data error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update calendar.' });
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
  updateCategorySettings,
  getCalendarData,
  updateCalendarData,
  // Unit Management
  getPropertyUnits,
  createPropertyUnit,
  updatePropertyUnit,
  deletePropertyUnit,
  getUnitCalendarData,
  updateUnitCalendarData
};
