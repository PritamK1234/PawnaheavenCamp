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
       RETURNING id, property_id, owner_name, mobile_number`,
      [propertyId, propertyName, propertyType, ownerName, ownerMobile]
    );

    return res.status(201).json({
      success: true,
      message: 'Owner registered successfully!',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Owner registration error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during registration.'
    });
  }
};
