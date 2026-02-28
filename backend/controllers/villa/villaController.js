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

    const unitsResult = await query(`
      SELECT pu.*,
        (
          SELECT json_agg(json_build_object(
            'date', d.date,
            'price', COALESCE(uc.price, CASE WHEN d.is_weekend THEN p.weekend_price ELSE p.weekday_price END),
            'is_booked', (
              COALESCE((
                SELECT COUNT(*) 
                FROM ledger_entries le
                WHERE le.unit_id = pu.id 
                AND le.check_in <= d.date 
                AND le.check_out > d.date
              ), 0) + COALESCE((
                SELECT COUNT(*)
                FROM bookings b
                WHERE b.unit_id = pu.id
                AND b.booking_status IN ('PENDING_OWNER_CONFIRMATION', 'BOOKING_REQUEST_SENT_TO_OWNER', 'OWNER_CONFIRMED', 'TICKET_GENERATED')
                AND b.checkin_datetime::date <= d.date
                AND b.checkout_datetime::date > d.date
              ), 0)
            ) > 0,
            'available_quantity', CASE WHEN (
              COALESCE((
                SELECT COUNT(*) 
                FROM ledger_entries le
                WHERE le.unit_id = pu.id 
                AND le.check_in <= d.date 
                AND le.check_out > d.date
              ), 0) + COALESCE((
                SELECT COUNT(*)
                FROM bookings b
                WHERE b.unit_id = pu.id
                AND b.booking_status IN ('PENDING_OWNER_CONFIRMATION', 'BOOKING_REQUEST_SENT_TO_OWNER', 'OWNER_CONFIRMED', 'TICKET_GENERATED')
                AND b.checkin_datetime::date <= d.date
                AND b.checkout_datetime::date > d.date
              ), 0)
            ) > 0 THEN 0 ELSE pu.total_persons END,
            'total_capacity', pu.total_persons,
            'is_weekend', d.is_weekend,
            'is_special', EXISTS(SELECT 1 FROM jsonb_array_elements(p.special_dates) sd WHERE (sd->>'date')::date = d.date),
            'is_soft_locked', (
              SELECT COUNT(*) > 0 FROM bookings b2
              WHERE b2.unit_id = pu.id
                AND b2.booking_status = 'PAYMENT_PENDING'
                AND b2.created_at > NOW() - INTERVAL '30 minutes'
                AND b2.checkin_datetime::date <= d.date
                AND b2.checkout_datetime::date > d.date
            ),
            'soft_available_quantity', CASE WHEN (
              SELECT COUNT(*) > 0 FROM bookings b2
              WHERE b2.unit_id = pu.id
                AND b2.booking_status = 'PAYMENT_PENDING'
                AND b2.created_at > NOW() - INTERVAL '30 minutes'
                AND b2.checkin_datetime::date <= d.date
                AND b2.checkout_datetime::date > d.date
            ) THEN 0 ELSE pu.total_persons END
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

    let legacyCalendar = [];
    if (unitsResult.rows.length === 0) {
      const villaCalendarResult = await query(`
        SELECT json_agg(json_build_object(
          'date', d.date,
          'price', COALESCE(ac.price, CASE WHEN d.is_weekend THEN p.weekend_price ELSE p.weekday_price END),
          'is_booked', (
            COALESCE((
              SELECT COUNT(*) 
              FROM ledger_entries le
              WHERE (le.property_id = p.id::text OR le.property_id = p.property_id)
              AND le.check_in <= d.date 
              AND le.check_out > d.date
            ), 0) + COALESCE((
              SELECT COUNT(*)
              FROM bookings b
              WHERE (b.property_id = p.id::text OR b.property_id = p.property_id)
              AND b.booking_status IN ('PENDING_OWNER_CONFIRMATION', 'BOOKING_REQUEST_SENT_TO_OWNER', 'OWNER_CONFIRMED', 'TICKET_GENERATED')
              AND b.checkin_datetime::date <= d.date
              AND b.checkout_datetime::date > d.date
            ), 0)
          ) > 0,
          'available_quantity', p.max_capacity - (
            COALESCE((
              SELECT SUM(persons) 
              FROM ledger_entries le
              JOIN properties p_inner ON (p_inner.id::text = le.property_id OR p_inner.property_id = le.property_id)
              WHERE p_inner.id = p.id
              AND le.check_in <= d.date 
              AND le.check_out > d.date
            ), 0) + COALESCE((
              SELECT SUM(COALESCE(b.persons, 1))
              FROM bookings b
              WHERE (b.property_id = p.id::text OR b.property_id = p.property_id)
              AND b.booking_status IN ('PENDING_OWNER_CONFIRMATION', 'BOOKING_REQUEST_SENT_TO_OWNER', 'OWNER_CONFIRMED', 'TICKET_GENERATED')
              AND b.checkin_datetime::date <= d.date
              AND b.checkout_datetime::date > d.date
            ), 0)
          ),
          'total_capacity', p.max_capacity,
          'weekday_price', p.weekday_price,
          'weekend_price', p.weekend_price,
          'special_dates', p.special_dates,
          'is_soft_locked', (
            SELECT COUNT(*) > 0 FROM bookings b2
            WHERE (b2.property_id = p.id::text OR b2.property_id = p.property_id)
              AND b2.booking_status = 'PAYMENT_PENDING'
              AND b2.created_at > NOW() - INTERVAL '30 minutes'
              AND b2.checkin_datetime::date <= d.date
              AND b2.checkout_datetime::date > d.date
          )
        ) ORDER BY d.date) as calendar
        FROM properties p
        CROSS JOIN (
          SELECT generate_series(CURRENT_DATE, CURRENT_DATE + interval '30 days', interval '1 day')::date as date,
                 extract(dow from generate_series(CURRENT_DATE, CURRENT_DATE + interval '30 days', interval '1 day')) IN (0, 6) as is_weekend
        ) d
        LEFT JOIN availability_calendar ac ON ac.property_id = p.id AND ac.date = d.date
        WHERE p.id = $1
      `, [propData.id]);
      legacyCalendar = villaCalendarResult.rows[0]?.calendar || [];
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
      calendar: legacyCalendar,
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

    const unitsResult = await query(`
      SELECT pu.*,
        (
          SELECT json_agg(json_build_object(
            'date', d.date,
            'price', COALESCE(uc.price, CASE WHEN d.is_weekend THEN p.weekend_price ELSE p.weekday_price END),
            'is_booked', (
              COALESCE((
                SELECT COUNT(*) 
                FROM ledger_entries le
                WHERE le.unit_id = pu.id 
                AND le.check_in <= d.date 
                AND le.check_out > d.date
              ), 0) + COALESCE((
                SELECT COUNT(*)
                FROM bookings b
                WHERE b.unit_id = pu.id
                AND b.booking_status IN ('PENDING_OWNER_CONFIRMATION', 'BOOKING_REQUEST_SENT_TO_OWNER', 'OWNER_CONFIRMED', 'TICKET_GENERATED')
                AND b.checkin_datetime::date <= d.date
                AND b.checkout_datetime::date > d.date
              ), 0)
            ) > 0,
            'available_quantity', CASE WHEN (
              COALESCE((
                SELECT COUNT(*) 
                FROM ledger_entries le
                WHERE le.unit_id = pu.id 
                AND le.check_in <= d.date 
                AND le.check_out > d.date
              ), 0) + COALESCE((
                SELECT COUNT(*)
                FROM bookings b
                WHERE b.unit_id = pu.id
                AND b.booking_status IN ('PENDING_OWNER_CONFIRMATION', 'BOOKING_REQUEST_SENT_TO_OWNER', 'OWNER_CONFIRMED', 'TICKET_GENERATED')
                AND b.checkin_datetime::date <= d.date
                AND b.checkout_datetime::date > d.date
              ), 0)
            ) > 0 THEN 0 ELSE pu.total_persons END,
            'total_capacity', pu.total_persons,
            'is_weekend', d.is_weekend,
            'is_special', EXISTS(SELECT 1 FROM jsonb_array_elements(p.special_dates) sd WHERE (sd->>'date')::date = d.date),
            'is_soft_locked', (
              SELECT COUNT(*) > 0 FROM bookings b2
              WHERE b2.unit_id = pu.id
                AND b2.booking_status = 'PAYMENT_PENDING'
                AND b2.created_at > NOW() - INTERVAL '30 minutes'
                AND b2.checkin_datetime::date <= d.date
                AND b2.checkout_datetime::date > d.date
            ),
            'soft_available_quantity', CASE WHEN (
              SELECT COUNT(*) > 0 FROM bookings b2
              WHERE b2.unit_id = pu.id
                AND b2.booking_status = 'PAYMENT_PENDING'
                AND b2.created_at > NOW() - INTERVAL '30 minutes'
                AND b2.checkin_datetime::date <= d.date
                AND b2.checkout_datetime::date > d.date
            ) THEN 0 ELSE pu.total_persons END
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

    let legacyCalendar = [];
    if (unitsResult.rows.length === 0) {
      const villaCalendarResult = await query(`
        SELECT json_agg(json_build_object(
          'date', d.date,
          'price', COALESCE(ac.price, CASE WHEN d.is_weekend THEN p.weekend_price ELSE p.weekday_price END),
          'is_booked', (
            COALESCE((
              SELECT COUNT(*) 
              FROM ledger_entries le
              WHERE (le.property_id = p.id::text OR le.property_id = p.property_id)
              AND le.check_in <= d.date 
              AND le.check_out > d.date
            ), 0) + COALESCE((
              SELECT COUNT(*)
              FROM bookings b
              WHERE (b.property_id = p.id::text OR b.property_id = p.property_id)
              AND b.booking_status IN ('PENDING_OWNER_CONFIRMATION', 'BOOKING_REQUEST_SENT_TO_OWNER', 'OWNER_CONFIRMED', 'TICKET_GENERATED')
              AND b.checkin_datetime::date <= d.date
              AND b.checkout_datetime::date > d.date
            ), 0)
          ) > 0,
          'available_quantity', p.max_capacity - (
            COALESCE((
              SELECT SUM(persons) 
              FROM ledger_entries le
              JOIN properties p_inner ON (p_inner.id::text = le.property_id OR p_inner.property_id = le.property_id)
              WHERE p_inner.id = p.id
              AND le.check_in <= d.date 
              AND le.check_out > d.date
            ), 0) + COALESCE((
              SELECT SUM(COALESCE(b.persons, 1))
              FROM bookings b
              WHERE (b.property_id = p.id::text OR b.property_id = p.property_id)
              AND b.booking_status IN ('PENDING_OWNER_CONFIRMATION', 'BOOKING_REQUEST_SENT_TO_OWNER', 'OWNER_CONFIRMED', 'TICKET_GENERATED')
              AND b.checkin_datetime::date <= d.date
              AND b.checkout_datetime::date > d.date
            ), 0)
          ),
          'total_capacity', p.max_capacity,
          'weekday_price', p.weekday_price,
          'weekend_price', p.weekend_price,
          'special_dates', p.special_dates,
          'is_soft_locked', (
            SELECT COUNT(*) > 0 FROM bookings b2
            WHERE (b2.property_id = p.id::text OR b2.property_id = p.property_id)
              AND b2.booking_status = 'PAYMENT_PENDING'
              AND b2.created_at > NOW() - INTERVAL '30 minutes'
              AND b2.checkin_datetime::date <= d.date
              AND b2.checkout_datetime::date > d.date
          )
        ) ORDER BY d.date) as calendar
        FROM properties p
        CROSS JOIN (
          SELECT generate_series(CURRENT_DATE, CURRENT_DATE + interval '30 days', interval '1 day')::date as date,
                 extract(dow from generate_series(CURRENT_DATE, CURRENT_DATE + interval '30 days', interval '1 day')) IN (0, 6) as is_weekend
        ) d
        LEFT JOIN availability_calendar ac ON ac.property_id = p.id AND ac.date = d.date
        WHERE p.id = $1
      `, [propData.id]);
      legacyCalendar = villaCalendarResult.rows[0]?.calendar || [];
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
      calendar: legacyCalendar,
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
      owner_name, owner_whatsapp_number
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

const getVillaUnits = async (req, res) => {
  try {
    const { propertyId } = req.params;

    const propertyCheck = await query(
      `SELECT id FROM properties WHERE (property_id = $1 OR id::text = $1) AND category = 'villa'`,
      [propertyId]
    );

    if (propertyCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Villa property not found.'
      });
    }

    const result = await query(
      `SELECT pu.*, 
        EXISTS(
          SELECT 1 FROM ledger_entries le 
          WHERE le.unit_id = pu.id 
          AND CURRENT_DATE >= le.check_in 
          AND CURRENT_DATE < le.check_out
        ) as has_booking
      FROM property_units pu 
      WHERE pu.property_id = $1 
      ORDER BY pu.id`,
      [propertyCheck.rows[0].id]
    );

    return res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get villa units error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch villa units.' });
  }
};

const createVillaUnit = async (req, res) => {
  try {
    const { propertyId } = req.params;
    const { name, available_persons, total_persons, amenities, images, price_per_person, weekday_price, weekend_price, special_price, special_dates, description, check_in_time, check_out_time, highlights, activities, policies, schedule, rating, price_note, location, google_maps_link, title } = req.body;

    const propertyCheck = await query(
      `SELECT id FROM properties WHERE (property_id = $1 OR id::text = $1) AND category = 'villa'`,
      [propertyId]
    );

    if (propertyCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Villa property not found.'
      });
    }

    const result = await query(
      `INSERT INTO property_units (property_id, name, available_persons, total_persons, amenities, images, price_per_person, weekday_price, weekend_price, special_price, special_dates, description, check_in_time, check_out_time, highlights, activities, policies, schedule, rating, price_note, location, google_maps_link, title)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
       RETURNING *`,
      [
        propertyCheck.rows[0].id, 
        name, 
        parseInt(available_persons) || 0, 
        parseInt(total_persons) || parseInt(available_persons) || 0, 
        Array.isArray(amenities) ? JSON.stringify(amenities) : (amenities || '[]'), 
        Array.isArray(images) ? JSON.stringify(images) : (images || '[]'), 
        String(price_per_person || '0'),
        String(weekday_price || '0'),
        String(weekend_price || '0'),
        String(special_price || '0'),
        Array.isArray(special_dates) ? JSON.stringify(special_dates) : (special_dates || '[]'),
        description || null,
        check_in_time || null,
        check_out_time || null,
        Array.isArray(highlights) ? JSON.stringify(highlights) : (highlights || '[]'),
        Array.isArray(activities) ? JSON.stringify(activities) : (activities || '[]'),
        Array.isArray(policies) ? JSON.stringify(policies) : (policies || '[]'),
        Array.isArray(schedule) ? JSON.stringify(schedule) : (schedule || '[]'),
        parseFloat(rating) || 4.5,
        price_note || null,
        location || null,
        google_maps_link || null,
        title || null
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Villa unit created successfully.',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Create villa unit error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create villa unit.' });
  }
};

const updateVillaUnit = async (req, res) => {
  try {
    const { unitId } = req.params;
    const { name, available_persons, total_persons, amenities, images, price_per_person, weekday_price, weekend_price, special_price, special_dates, description, check_in_time, check_out_time, highlights, activities, policies, schedule, rating, price_note, location, google_maps_link, title } = req.body;

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
           description = COALESCE($12, description),
           check_in_time = COALESCE($13, check_in_time),
           check_out_time = COALESCE($14, check_out_time),
           highlights = COALESCE($15, highlights),
           activities = COALESCE($16, activities),
           policies = COALESCE($17, policies),
           schedule = COALESCE($18, schedule),
           rating = COALESCE($19, rating),
           price_note = COALESCE($20, price_note),
           location = COALESCE($21, location),
           google_maps_link = COALESCE($22, google_maps_link),
           title = COALESCE($23, title),
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
        unitId,
        description !== undefined ? description : null,
        check_in_time !== undefined ? check_in_time : null,
        check_out_time !== undefined ? check_out_time : null,
        highlights !== undefined ? (Array.isArray(highlights) ? JSON.stringify(highlights) : highlights) : null,
        activities !== undefined ? (Array.isArray(activities) ? JSON.stringify(activities) : activities) : null,
        policies !== undefined ? (Array.isArray(policies) ? JSON.stringify(policies) : policies) : null,
        schedule !== undefined ? (Array.isArray(schedule) ? JSON.stringify(schedule) : schedule) : null,
        rating !== undefined ? parseFloat(rating) : null,
        price_note !== undefined ? price_note : null,
        location !== undefined ? location : null,
        google_maps_link !== undefined ? google_maps_link : null,
        title !== undefined ? title : null
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Villa unit not found.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Villa unit updated successfully.',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Update villa unit error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update villa unit.' });
  }
};

const deleteVillaUnit = async (req, res) => {
  try {
    const { unitId } = req.params;

    await query('DELETE FROM unit_calendar WHERE unit_id = $1', [unitId]);

    const result = await query('DELETE FROM property_units WHERE id = $1 RETURNING *', [unitId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Villa unit not found.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Villa unit deleted successfully.'
    });
  } catch (error) {
    console.error('Delete villa unit error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete villa unit.' });
  }
};

const getVillaUnitCalendarData = async (req, res) => {
  try {
    const { unitId } = req.params;

    const unitResult = await query('SELECT id, total_persons, property_id FROM property_units WHERE id = $1', [unitId]);
    if (unitResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Villa unit not found' });
    }
    const unit = unitResult.rows[0];
    const totalCapacity = unit.total_persons || 0;

    const calResult = await query(
      'SELECT calendar_id, date, price, available_quantity, is_weekend, is_special FROM unit_calendar WHERE unit_id = $1',
      [unitId]
    );

    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    const endDate = new Date(today.getFullYear(), today.getMonth() + 3, 0);

    const propertyInternalId = unit.property_id;

    const ledgerResult = await query(
      `SELECT check_in, check_out, persons FROM ledger_entries
       WHERE (unit_id = $1 OR (unit_id IS NULL AND property_id = $4::text))
         AND check_out >= $2 AND check_in <= $3`,
      [unitId, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0], propertyInternalId]
    );

    const bookingResult = await query(
      `SELECT checkin_datetime, checkout_datetime, COALESCE(persons, 1) as persons FROM bookings
       WHERE (unit_id = $1 OR (unit_id IS NULL AND property_id = $4::text))
         AND booking_status IN ('PENDING_OWNER_CONFIRMATION', 'BOOKING_REQUEST_SENT_TO_OWNER', 'OWNER_CONFIRMED', 'TICKET_GENERATED')
         AND checkout_datetime >= $2 AND checkin_datetime <= $3`,
      [unitId, startDate.toISOString(), endDate.toISOString(), propertyInternalId]
    );

    const softLockResult = await query(
      `SELECT checkin_datetime, checkout_datetime, booking_status FROM bookings
       WHERE (unit_id = $1 OR (unit_id IS NULL AND property_id = $4::text))
         AND (
           (booking_status = 'PAYMENT_PENDING' AND created_at > NOW() - INTERVAL '30 minutes')
           OR booking_status IN ('PENDING_OWNER_CONFIRMATION', 'BOOKING_REQUEST_SENT_TO_OWNER')
         )
         AND checkout_datetime >= $2 AND checkin_datetime <= $3`,
      [unitId, startDate.toISOString(), endDate.toISOString(), propertyInternalId]
    );

    const calendarMap = {};
    for (const row of calResult.rows) {
      const dateStr = new Date(row.date).toISOString().split('T')[0];
      calendarMap[dateStr] = {
        date: dateStr, price: row.price, is_booked: false,
        available_quantity: totalCapacity, total_capacity: totalCapacity,
        is_weekend: row.is_weekend, is_special: row.is_special, calendar_id: row.calendar_id,
        is_soft_locked: false, soft_available_quantity: totalCapacity
      };
    }

    const ensureDate = (dateStr) => {
      if (!calendarMap[dateStr]) {
        calendarMap[dateStr] = {
          date: dateStr, price: null, is_booked: false,
          available_quantity: totalCapacity, total_capacity: totalCapacity,
          is_soft_locked: false, soft_available_quantity: totalCapacity
        };
      }
    };

    for (const entry of ledgerResult.rows) {
      let d = new Date(entry.check_in);
      const end = new Date(entry.check_out);
      while (d < end) {
        const ds = d.toISOString().split('T')[0];
        ensureDate(ds);
        calendarMap[ds].is_booked = true;
        calendarMap[ds].available_quantity = 0;
        d.setDate(d.getDate() + 1);
      }
    }

    for (const booking of bookingResult.rows) {
      let d = new Date(booking.checkin_datetime);
      const end = new Date(booking.checkout_datetime);
      while (d < end) {
        const ds = d.toISOString().split('T')[0];
        ensureDate(ds);
        calendarMap[ds].is_booked = true;
        calendarMap[ds].available_quantity = 0;
        d.setDate(d.getDate() + 1);
      }
    }

    for (const ds of Object.keys(calendarMap)) {
      calendarMap[ds].soft_available_quantity = calendarMap[ds].available_quantity;
    }

    for (const booking of softLockResult.rows) {
      let d = new Date(booking.checkin_datetime);
      const end = new Date(booking.checkout_datetime);
      while (d < end) {
        const ds = d.toISOString().split('T')[0];
        ensureDate(ds);
        calendarMap[ds].is_soft_locked = true;
        if (booking.booking_status === 'PAYMENT_PENDING') {
          calendarMap[ds].soft_available_quantity = 0;
        }
        d.setDate(d.getDate() + 1);
      }
    }

    return res.status(200).json({
      success: true,
      data: Object.values(calendarMap),
      meta: { totalCapacity, isVilla: true }
    });
  } catch (error) {
    console.error('Get villa unit calendar error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch villa unit calendar.' });
  }
};

const generateUnitCalendarId = (unitId, date) => {
  const dateStr = new Date(date).toISOString().split('T')[0].replace(/-/g, '');
  return `UCAL-${unitId}-${dateStr}`;
};

const updateVillaUnitCalendarData = async (req, res) => {
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
      message: 'Villa unit calendar updated successfully.',
      calendar_id: result.rows[0]?.calendar_id
    });
  } catch (error) {
    console.error('Update villa unit calendar error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update villa unit calendar.' });
  }
};

module.exports = {
  getVillaById,
  getPublicVillaBySlug,
  updateVilla,
  getVillaCalendarData,
  updateVillaCalendarData,
  getVillaUnits,
  createVillaUnit,
  updateVillaUnit,
  deleteVillaUnit,
  getVillaUnitCalendarData,
  updateVillaUnitCalendarData
};
