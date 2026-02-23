const { pool, query } = require('../db');
const { generateToken } = require('../utils/jwt');
const OtpService = require('../services/otpService');

exports.registerOwner = async (req, res) => {
  const { propertyId, ownerMobile } = req.body;

  if (!propertyId || !ownerMobile) {
    return res.status(400).json({
      success: false,
      message: 'Property ID and Mobile Number are required.'
    });
  }

  try {
    const propertyCheck = await pool.query(
      'SELECT property_id, title, category, owner_name, owner_whatsapp_number FROM properties WHERE property_id = $1',
      [propertyId]
    );

    if (propertyCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Invalid Property ID. This property does not exist in our database.'
      });
    }

    const property = propertyCheck.rows[0];

    const ownerPropertyCheck = await pool.query(
      'SELECT * FROM owners WHERE property_id = $1',
      [propertyId]
    );

    if (ownerPropertyCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Owner already registered for this Property ID. Please login.'
      });
    }

    const mobileCheck = await pool.query(
      'SELECT * FROM owners WHERE owner_otp_number = $1',
      [ownerMobile]
    );

    if (mobileCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'This mobile number is already registered with another property.'
      });
    }

    const result = await pool.query(
      `INSERT INTO owners 
       (property_id, property_name, property_type, owner_name, owner_otp_number, owner_whatsapp_number) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, property_id, property_name, owner_name, owner_otp_number, owner_whatsapp_number`,
      [propertyId, property.title, property.category, property.owner_name || '', ownerMobile, property.owner_whatsapp_number || '']
    );

    await pool.query(
      'UPDATE properties SET owner_otp_number = $1 WHERE property_id = $2 AND (owner_otp_number IS NULL OR owner_otp_number = \'\')',
      [ownerMobile, propertyId]
    );

    return res.status(201).json({
      success: true,
      message: 'Owner registered successfully!',
      data: {
        ...result.rows[0],
        ownerNumber: result.rows[0].owner_otp_number,
        propertyName: result.rows[0].property_name
      }
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Internal server error during registration.'
    });
  }
};

exports.sendOTP = async (req, res) => {
  const { mobileNumber } = req.body;

  try {
    const result = await OtpService.sendOtp(mobileNumber, "owner_login");

    if (!result.success) {
      return res.status(result.status || 400).json({
        success: false,
        message: result.message
      });
    }

    return res.status(200).json({
      success: true,
      message: 'OTP sent successfully!'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error sending OTP.'
    });
  }
};

exports.verifyOTP = async (req, res) => {
  const { mobileNumber, otp } = req.body;

  try {
    const verifyResult = await OtpService.verifyOtp(mobileNumber, otp, "owner_login");

    if (!verifyResult.success) {
      return res.status(verifyResult.status || 401).json({
        success: false,
        message: verifyResult.message
      });
    }

    const cleanMobile = mobileNumber.replace(/\s+/g, "").replace(/^(\+91|91)/, "");

    const result = await pool.query(
      `SELECT o.*, p.title as property_title, p.category as property_category 
       FROM owners o 
       JOIN properties p ON o.property_id = p.property_id 
       WHERE o.owner_otp_number = $1`,
      [cleanMobile]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Owner not found.'
      });
    }

    const token = generateToken({ id: result.rows[0].id, mobile: cleanMobile, role: 'owner' });

    return res.status(200).json({
      success: true,
      message: 'Login successful!',
      token,
      data: {
        ...result.rows[0],
        ownerNumber: result.rows[0].owner_otp_number,
        propertyName: result.rows[0].property_name
      }
    });
  } catch (error) {
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
    return res.status(500).json({
      success: false,
      message: 'Internal server error fetching property.'
    });
  }
};
