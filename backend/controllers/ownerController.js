const { pool } = require('../db');

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

  try {
    const ownerCheck = await pool.query(
      'SELECT * FROM owners WHERE mobile_number = $1',
      [mobileNumber]
    );

    if (ownerCheck.rows.length === 0) {
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

    return res.status(200).json({
      success: true,
      message: 'Login successful!',
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
