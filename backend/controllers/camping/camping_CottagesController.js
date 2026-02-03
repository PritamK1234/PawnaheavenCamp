const { query, getClient, parsePostgresArray, formatPropertyResponse } = require('../shared/basePropertyController');

const getCampingById = async (req, res) => {
  try {
    const { id } = req.params;

    let result = await query(`
      SELECT p.*,
        (SELECT json_agg(json_build_object('id', pi.id, 'image_url', pi.image_url, 'display_order', pi.display_order) ORDER BY pi.display_order)
         FROM property_images pi WHERE pi.property_id = p.id) as images
      FROM properties p
      WHERE (p.property_id = $1 OR p.id::text = $1) AND p.category = 'campings_cottages'
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Camping property not found.',
      });
    }

    const propData = result.rows[0];

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

    const property = {
      ...propData,
      amenities: parsePostgresArray(propData.amenities),
      activities: parsePostgresArray(propData.activities),
      highlights: parsePostgresArray(propData.highlights),
      policies: parsePostgresArray(propData.policies),
      schedule: parsePostgresArray(propData.schedule),
      availability: parsePostgresArray(propData.availability),
      weekday_price: propData.weekday_price || '',
      weekend_price: propData.weekend_price || '',
      special_dates: propData.special_dates ? (typeof propData.special_dates === 'string' ? JSON.parse(propData.special_dates) : propData.special_dates) : [],
      images: propData.images || [],
      units: unitsResult.rows.map(unit => ({
        ...unit,
        amenities: parsePostgresArray(unit.amenities),
        images: parsePostgresArray(unit.images),
        special_dates: unit.special_dates ? (typeof unit.special_dates === 'string' ? JSON.parse(unit.special_dates) : unit.special_dates) : [],
        weekday_price: unit.weekday_price || '',
        weekend_price: unit.weekend_price || '',
      }))
    };

    return res.status(200).json({
      success: true,
      data: property,
    });
  } catch (error) {
    console.error('Get camping by ID error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch camping property.',
    });
  }
};

const getPublicCampingBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const result = await query(`
      SELECT p.*,
        (SELECT json_agg(json_build_object('id', pi.id, 'image_url', pi.image_url, 'display_order', pi.display_order) ORDER BY pi.display_order)
         FROM property_images pi WHERE pi.property_id = p.id) as images
      FROM properties p
      WHERE p.slug = $1 AND p.is_active = true AND p.category = 'campings_cottages'
    `, [slug]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Camping property not found.',
      });
    }

    const propData = result.rows[0];

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

    const property = {
      ...propData,
      amenities: parsePostgresArray(propData.amenities),
      activities: parsePostgresArray(propData.activities),
      highlights: parsePostgresArray(propData.highlights),
      policies: parsePostgresArray(propData.policies),
      schedule: parsePostgresArray(propData.schedule),
      availability: parsePostgresArray(propData.availability),
      weekday_price: propData.weekday_price || '',
      weekend_price: propData.weekend_price || '',
      special_dates: propData.special_dates ? (typeof propData.special_dates === 'string' ? JSON.parse(propData.special_dates) : propData.special_dates) : [],
      images: propData.images || [],
      units: unitsResult.rows.map(unit => ({
        ...unit,
        amenities: parsePostgresArray(unit.amenities),
        images: parsePostgresArray(unit.images),
        special_dates: unit.special_dates ? (typeof unit.special_dates === 'string' ? JSON.parse(unit.special_dates) : unit.special_dates) : [],
        weekday_price: unit.weekday_price || '',
        weekend_price: unit.weekend_price || '',
      }))
    };

    return res.status(200).json({
      success: true,
      data: property,
    });
  } catch (error) {
    console.error('Get public camping by slug error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch camping property.',
    });
  }
};

const updateCamping = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      amenities, activities, highlights, policies, schedule, 
      description, availability, weekday_price, weekend_price, 
      price_note, price, special_dates, special_prices,
      owner_name, owner_mobile
    } = req.body;

    console.log('Update camping request received for ID:', id);

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
      WHERE (property_id = $13 OR id::text = $13) AND category = 'campings_cottages'
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
        message: 'Camping property not found.',
      });
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
      message: 'Camping property updated successfully.',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Update camping error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update camping property.',
    });
  }
};

const getPropertyUnits = async (req, res) => {
  try {
    const { propertyId } = req.params;

    const propertyCheck = await query(
      `SELECT id FROM properties WHERE (property_id = $1 OR id::text = $1) AND category = 'campings_cottages'`,
      [propertyId]
    );

    if (propertyCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Camping property not found.'
      });
    }

    const result = await query(
      `SELECT * FROM property_units WHERE property_id = $1 ORDER BY id`,
      [propertyCheck.rows[0].id]
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
    const { name, available_persons, total_persons, amenities, images, price_per_person, weekday_price, weekend_price, special_price, special_dates } = req.body;

    const propertyCheck = await query(
      `SELECT id FROM properties WHERE (property_id = $1 OR id::text = $1) AND category = 'campings_cottages'`,
      [propertyId]
    );

    if (propertyCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Camping property not found.'
      });
    }

    const result = await query(
      `INSERT INTO property_units (property_id, name, available_persons, total_persons, amenities, images, price_per_person, weekday_price, weekend_price, special_price, special_dates)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        propertyCheck.rows[0].id, 
        name, 
        available_persons, 
        total_persons || available_persons, 
        Array.isArray(amenities) ? JSON.stringify(amenities) : (amenities || null), 
        Array.isArray(images) ? JSON.stringify(images) : (images || null), 
        price_per_person,
        weekday_price,
        weekend_price,
        special_price,
        Array.isArray(special_dates) ? JSON.stringify(special_dates) : (special_dates || '[]')
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Unit created successfully.',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Create unit error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create unit.' });
  }
};

const updatePropertyUnit = async (req, res) => {
  try {
    const { unitId } = req.params;
    const { name, available_persons, total_persons, amenities, images, price_per_person, weekday_price, weekend_price, special_price, special_dates } = req.body;

    const result = await query(
      `UPDATE property_units 
       SET name = COALESCE($1, name), 
           available_persons = COALESCE($2, available_persons), 
           total_persons = COALESCE($3, total_persons),
           amenities = COALESCE($4, amenities),
           images = COALESCE($5, images),
           price_per_person = COALESCE($6, price_per_person),
           weekday_price = COALESCE($7, weekday_price),
           weekend_price = COALESCE($8, weekend_price),
           special_price = COALESCE($9, special_price),
           special_dates = COALESCE($10, special_dates),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $11
       RETURNING *`,
      [
        name, 
        available_persons, 
        total_persons, 
        Array.isArray(amenities) ? JSON.stringify(amenities) : (amenities || null), 
        Array.isArray(images) ? JSON.stringify(images) : (images || null), 
        price_per_person,
        weekday_price,
        weekend_price,
        special_price,
        Array.isArray(special_dates) ? JSON.stringify(special_dates) : (special_dates || null),
        unitId
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Unit not found.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Unit updated successfully.',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Update unit error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update unit.' });
  }
};

const deletePropertyUnit = async (req, res) => {
  try {
    const { unitId } = req.params;

    await query('DELETE FROM unit_calendar WHERE unit_id = $1', [unitId]);

    const result = await query('DELETE FROM property_units WHERE id = $1 RETURNING *', [unitId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Unit not found.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Unit deleted successfully.'
    });
  } catch (error) {
    console.error('Delete unit error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete unit.' });
  }
};

const getUnitCalendarData = async (req, res) => {
  try {
    const { unitId } = req.params;
    const result = await query(
      'SELECT calendar_id, date, price, available_quantity, is_weekend, is_special FROM unit_calendar WHERE unit_id = $1',
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

const generateUnitCalendarId = (unitId, date) => {
  const dateStr = new Date(date).toISOString().split('T')[0].replace(/-/g, '');
  return `UCAL-${unitId}-${dateStr}`;
};

const updateUnitCalendarData = async (req, res) => {
  try {
    const { unitId } = req.params;
    const { date, price, available_quantity, is_weekend, is_special } = req.body;

    let finalAvailableQuantity = available_quantity;
    if (finalAvailableQuantity === undefined) {
      const unitResult = await query('SELECT total_persons FROM property_units WHERE id = $1', [unitId]);
      if (unitResult.rows.length > 0) {
        finalAvailableQuantity = unitResult.rows[0].total_persons;
      } else {
        finalAvailableQuantity = 0;
      }
    }

    const calendarId = generateUnitCalendarId(unitId, date);

    const result = await query(
      `INSERT INTO unit_calendar (unit_id, date, price, available_quantity, is_weekend, is_special, calendar_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (unit_id, date) 
       DO UPDATE SET 
         price = EXCLUDED.price, 
         available_quantity = EXCLUDED.available_quantity,
         is_weekend = EXCLUDED.is_weekend,
         is_special = EXCLUDED.is_special,
         calendar_id = EXCLUDED.calendar_id
       RETURNING calendar_id`,
      [unitId, date, price, finalAvailableQuantity, is_weekend, is_special, calendarId]
    );

    return res.status(200).json({
      success: true,
      message: 'Unit calendar updated successfully.',
      calendar_id: result.rows[0]?.calendar_id
    });
  } catch (error) {
    console.error('Update unit calendar error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update unit calendar.' });
  }
};

module.exports = {
  getCampingById,
  getPublicCampingBySlug,
  updateCamping,
  getPropertyUnits,
  createPropertyUnit,
  updatePropertyUnit,
  deletePropertyUnit,
  getUnitCalendarData,
  updateUnitCalendarData
};
