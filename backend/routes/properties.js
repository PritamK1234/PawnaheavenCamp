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

const { upload } = require('../utils/cloudinary');
router.post('/upload-image', authMiddleware, upload.single('image'), (req, res) => {
  try {
    console.log('Upload request received:', {
      file: req.file ? {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path
      } : 'No file',
      body: req.body
    });

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    res.json({ success: true, url: req.file.path });
  } catch (error) {
    console.error('Detailed upload error:', error);
    res.status(500).json({ success: false, message: 'Upload failed', error: error.message });
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
router.get('/units/:unitId/calendar', authMiddleware, propertyController.getUnitCalendarData);
router.post('/units/:unitId/calendar', authMiddleware, propertyController.updateUnitCalendarData);

// Calendar routes
router.get('/:id/calendar', propertyController.getCalendarData);
router.put('/:id/calendar', authMiddleware, propertyController.updateCalendarData);

module.exports = router;
