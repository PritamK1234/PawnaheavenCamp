const express = require('express');
const router = express.Router();
const propertyController = require('../controllers/propertyController');
const authMiddleware = require('../middleware/auth');

// Public routes
router.get('/public-list', propertyController.getPublicProperties);
router.get('/public/:slug', propertyController.getPublicPropertyBySlug);

// Protected routes (require authentication)
router.get('/list', authMiddleware, propertyController.getAllProperties);
router.get('/:id', authMiddleware, propertyController.getPropertyById);
router.post('/create', authMiddleware, propertyController.createProperty);
router.put('/update/:id', authMiddleware, propertyController.updateProperty);
router.delete('/delete/:id', authMiddleware, propertyController.deleteProperty);
router.patch('/toggle-status/:id', authMiddleware, propertyController.togglePropertyStatus);

const { upload, processAndUpload, MAX_IMAGES_PER_ENTITY } = require('../utils/cloudinary');
const db = require('../db');

router.post('/upload-image', authMiddleware, (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, message: 'File too large. Maximum 50 MB allowed for upload.' });
      }
      return res.status(400).json({ success: false, message: err.message || 'Upload error' });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    console.log('Upload request received:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: `${(req.file.size / 1024 / 1024).toFixed(2)} MB`
    });

    const { property_id, unit_id } = req.body;
    if (property_id || unit_id) {
      let currentCount = 0;
      if (unit_id) {
        const unitResult = await db.query(
          `SELECT images FROM property_units WHERE id = $1`,
          [unit_id]
        );
        if (unitResult.rows.length > 0) {
          const images = unitResult.rows[0].images;
          const parsed = typeof images === 'string' ? JSON.parse(images || '[]') : (Array.isArray(images) ? images : []);
          currentCount = parsed.length;
        }
      } else if (property_id) {
        const imgResult = await db.query(
          `SELECT COUNT(*) as count FROM property_images WHERE property_id = $1`,
          [property_id]
        );
        currentCount = parseInt(imgResult.rows[0].count) || 0;
      }

      if (currentCount >= MAX_IMAGES_PER_ENTITY) {
        return res.status(400).json({
          success: false,
          message: `Maximum ${MAX_IMAGES_PER_ENTITY} images allowed. You already have ${currentCount}.`
        });
      }
    }

    const result = await processAndUpload(req.file);

    res.json({
      success: true,
      url: result.secure_url,
      public_id: result.public_id,
      width: result.width,
      height: result.height
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, message: error.message || 'Upload failed' });
  }
});

// Category Settings (Admin)
router.get('/settings/categories', authMiddleware, propertyController.getCategorySettings);
router.put('/settings/categories/:category', authMiddleware, propertyController.updateCategorySettings);

// Unit Management Routes
router.get('/:propertyId/units', authMiddleware, propertyController.getPropertyUnits);
router.post('/:propertyId/units', authMiddleware, propertyController.createPropertyUnit);
router.put('/units/:unitId', authMiddleware, propertyController.updatePropertyUnit);
router.delete('/units/:unitId', authMiddleware, propertyController.deletePropertyUnit);
router.get('/units/:unitId/calendar', propertyController.getUnitCalendarData);
router.post('/units/:unitId/calendar', authMiddleware, propertyController.updateUnitCalendarData);

// Calendar routes
router.get('/:id/calendar', propertyController.getCalendarData);
router.put('/:id/calendar', authMiddleware, propertyController.updateCalendarData);

module.exports = router;
