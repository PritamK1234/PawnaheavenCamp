const express = require('express');
const router = express.Router();
const campingController = require('../controllers/camping/camping_CottagesController');
const authMiddleware = require('../middleware/auth');
const { validatePropertyId, validateUnitId, validateCalendarData, validateUnitData, validatePropertyUpdate } = require('../middleware/validation');

router.get('/public/:slug', campingController.getPublicCampingBySlug);

router.get('/:id', validatePropertyId, campingController.getCampingById);
router.put('/update/:id', authMiddleware, validatePropertyId, validatePropertyUpdate, campingController.updateCamping);
router.put('/:id', authMiddleware, validatePropertyId, validatePropertyUpdate, campingController.updateCamping);

router.get('/:propertyId/units', campingController.getPropertyUnits);
router.post('/:propertyId/units', authMiddleware, validateUnitData, campingController.createPropertyUnit);
router.put('/units/:unitId', authMiddleware, validateUnitId, campingController.updatePropertyUnit);
router.delete('/units/:unitId', authMiddleware, validateUnitId, campingController.deletePropertyUnit);

router.get('/units/:unitId/calendar', authMiddleware, validateUnitId, campingController.getUnitCalendarData);
router.post('/units/:unitId/calendar', authMiddleware, validateUnitId, validateCalendarData, campingController.updateUnitCalendarData);

module.exports = router;
