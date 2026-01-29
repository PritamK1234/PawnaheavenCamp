const { pool, query } = require('../db');
const { generateToken } = require('../utils/jwt');

exports.registerOwner = async (req, res) => {
  const { propertyName, propertyId, propertyType, ownerName, ownerMobile } = req.body;

  try {
    // 1. Check if Property ID exists in properties table
    const propertyCheck = await pool.query(
      'SELECT * FROM properties WHERE property_id = $1',
      [propertyId]
    );

    if (propertyCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Invalid Property ID. This property does not exist in our database.'
      });
    }

    // 2. Check if Property ID is already linked to an owner
    const ownerPropertyCheck = await pool.query(
      'SELECT * FROM owners WHERE property_id = $1',
      [propertyId]
    );

    if (ownerPropertyCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'This Property ID is already registered with another owner.'
      });
    }

    // 3. Check if mobile number is already registered
    const mobileCheck = await pool.query(
      'SELECT * FROM owners WHERE mobile_number = $1',
      [ownerMobile]
    );

    if (mobileCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'This mobile number is already registered with another property.'
      });
    }

    // 5. Register owner
    const result = await pool.query(
      `INSERT INTO owners 
       (property_id, property_name, property_type, owner_name, mobile_number) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, property_id, property_name, owner_name, mobile_number`,
      [propertyId, propertyName, propertyType, ownerName, ownerMobile]
    );

    return res.status(201).json({
      success: true,
      message: 'Owner registered successfully!',
      data: {
        ...result.rows[0],
        ownerNumber: result.rows[0].mobile_number,
        propertyName: result.rows[0].property_name
      }
    });

  } catch (error) {
    console.error('Owner registration error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during registration.'
    });
  }
};

exports.sendOTP = async (req, res) => {
  const { mobileNumber } = req.body;

  console.log('sendOTP called with mobileNumber:', mobileNumber);

  try {
    const ownerCheck = await pool.query(
      'SELECT * FROM owners WHERE mobile_number = $1',
      [mobileNumber]
    );

    console.log('Owner check result:', ownerCheck.rows.length, 'rows found');

    if (ownerCheck.rows.length === 0) {
      // Log all owners for debugging
      const allOwners = await pool.query('SELECT mobile_number FROM owners');
      console.log('All registered mobile numbers:', allOwners.rows.map(r => r.mobile_number));
      
      return res.status(404).json({
        success: false,
        message: 'This number is not registered to any property.'
      });
    }

    // For now, we use a mock OTP: 123456
    console.log(`OTP for ${mobileNumber}: 123456`);

    return res.status(200).json({
      success: true,
      message: 'OTP sent successfully!'
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error sending OTP.'
    });
  }
};

exports.verifyOTP = async (req, res) => {
  const { mobileNumber, otp } = req.body;

  try {
    // Basic verification logic
    if (otp !== '123456') {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP'
      });
    }

    const result = await pool.query(
      `SELECT o.*, p.title as property_title, p.category as property_category 
       FROM owners o 
       JOIN properties p ON o.property_id = p.property_id 
       WHERE o.mobile_number = $1`,
      [mobileNumber]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Owner not found.'
      });
    }

    const token = generateToken({ id: result.rows[0].id, mobile: mobileNumber, role: 'owner' });

    return res.status(200).json({
      success: true,
      message: 'Login successful!',
      token,
      data: {
        ...result.rows[0],
        ownerNumber: result.rows[0].mobile_number,
        propertyName: result.rows[0].property_name
      }
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error verifying OTP.'
    });
  }
};

exports.getOwnerProperty = async (req, res) => {
  const { propertyId } = req.params;

  try {
    const result = await pool.query(
      `SELECT p.*,
        (SELECT json_agg(json_build_object('id', pi.id, 'image_url', pi.image_url, 'display_order', pi.display_order) ORDER BY pi.display_order)
         FROM property_images pi WHERE pi.property_id = p.id) as images
      FROM properties p
      WHERE p.property_id = $1`,
      [propertyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Property not linked or not found.'
      });
    }

    const parsePostgresArray = (field) => {
      if (!field) return [];
      if (Array.isArray(field)) return field;
      if (typeof field === 'string') {
        if (field.startsWith('[') && field.endsWith(']')) {
          try { return JSON.parse(field); } catch (e) { return []; }
        }
        if (field.startsWith('{') && field.endsWith('}')) {
          return field.substring(1, field.length - 1).split(',').map(item => item.trim().replace(/^"(.*)"$/, '$1'));
        }
      }
      return [];
    };

    const property = {
      ...result.rows[0],
      amenities: parsePostgresArray(result.rows[0].amenities),
      activities: parsePostgresArray(result.rows[0].activities),
      highlights: parsePostgresArray(result.rows[0].highlights),
      policies: parsePostgresArray(result.rows[0].policies),
      images: result.rows[0].images || [],
    };

    return res.status(200).json({
      success: true,
      data: property
    });
  } catch (error) {
    console.error('Get owner property error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error fetching property.'
    });
  }
};
