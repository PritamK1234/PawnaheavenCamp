const { query, getClient, parsePostgresArray, formatPropertyResponse } = require('../shared/basePropertyController');

const getVillaById = async (req, res) => {
  try {
    const { id } = req.params;

    let result = await query(`
      SELECT p.*,
        (SELECT json_agg(json_build_object('id', pi.id, 'image_url', pi.image_url, 'display_order', pi.display_order) ORDER BY pi.display_order)
         FROM property_images pi WHERE pi.property_id = p.id) as images
      FROM properties p
      WHERE (p.property_id = $1 OR p.id::text = $1) AND p.category = 'villa'
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Villa not found.',
      });
    }

    const propData = result.rows[0];

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
      units: []
    };

    return res.status(200).json({
      success: true,
      data: property,
    });
  } catch (error) {
    console.error('Get villa by ID error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch villa.',
    });
  }
};

const getPublicVillaBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const result = await query(`
      SELECT p.*,
        (SELECT json_agg(json_build_object('id', pi.id, 'image_url', pi.image_url, 'display_order', pi.display_order) ORDER BY pi.display_order)
         FROM property_images pi WHERE pi.property_id = p.id) as images
      FROM properties p
      WHERE p.slug = $1 AND p.is_active = true AND p.category = 'villa'
    `, [slug]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Villa not found.',
      });
    }

    const propData = result.rows[0];

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
      units: []
    };

    return res.status(200).json({
      success: true,
      data: property,
    });
  } catch (error) {
    console.error('Get public villa by slug error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch villa.',
    });
  }
};

const updateVilla = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      amenities, activities, highlights, policies, schedule, 
      description, availability, weekday_price, weekend_price, 
      price_note, price, special_dates, special_prices, images,
      owner_name, owner_mobile
    } = req.body;

    console.log('Update villa request received for ID:', id);

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
      WHERE (property_id = $13 OR id::text = $13) AND category = 'villa'
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

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Villa not found.',
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
      console.log('Updated villa images:', images.length);
    }

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
      message: 'Villa updated successfully.',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Update villa error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update villa.',
    });
  }
};

const getVillaCalendarData = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT ac.calendar_id, ac.date, ac.price, ac.is_booked 
       FROM availability_calendar ac
       JOIN properties p ON ac.property_id = p.id
       WHERE (p.property_id = $1 OR p.id::text = $1) AND p.category = 'villa'`,
      [id]
    );
    return res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get villa calendar data error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch calendar data.' });
  }
};

const generateVillaCalendarId = (propertyId, date) => {
  const dateStr = new Date(date).toISOString().split('T')[0].replace(/-/g, '');
  return `VCAL-${propertyId}-${dateStr}`;
};

const updateVillaCalendarData = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, price, is_booked } = req.body;

    const propertyCheck = await query(
      `SELECT id FROM properties WHERE (property_id = $1 OR id::text = $1) AND category = 'villa'`,
      [id]
    );

    if (propertyCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Villa not found.'
      });
    }

    const calendarId = generateVillaCalendarId(propertyCheck.rows[0].id, date);

    const result = await query(
      `INSERT INTO availability_calendar (property_id, date, price, is_booked, calendar_id, updated_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
       ON CONFLICT (property_id, date) 
       DO UPDATE SET price = EXCLUDED.price, is_booked = EXCLUDED.is_booked, calendar_id = EXCLUDED.calendar_id, updated_at = CURRENT_TIMESTAMP
       RETURNING calendar_id`,
      [propertyCheck.rows[0].id, date, price, is_booked, calendarId]
    );

    return res.status(200).json({
      success: true,
      message: 'Villa calendar updated successfully.',
      calendar_id: result.rows[0]?.calendar_id
    });
  } catch (error) {
    console.error('Update villa calendar data error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update calendar.' });
  }
};

module.exports = {
  getVillaById,
  getPublicVillaBySlug,
  updateVilla,
  getVillaCalendarData,
  updateVillaCalendarData
};
