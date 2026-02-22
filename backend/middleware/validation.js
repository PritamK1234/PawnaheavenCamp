const { errorCodes, sendError } = require('./errorHandler');

const validatePropertyId = (req, res, next) => {
  const { id, propertyId } = req.params;
  const propId = id || propertyId;
  
  if (!propId) {
    return sendError(res, errorCodes.MISSING_REQUIRED_FIELD, { field: 'id' });
  }
  
  req.propertyId = propId;
  next();
};

const validateUnitId = (req, res, next) => {
  const { unitId } = req.params;
  
  if (!unitId) {
    return sendError(res, errorCodes.MISSING_REQUIRED_FIELD, { field: 'unitId' });
  }
  
  const parsedId = parseInt(unitId, 10);
  if (isNaN(parsedId) || parsedId <= 0) {
    return sendError(res, errorCodes.UNIT_NOT_FOUND, { unitId });
  }
  
  req.unitId = parsedId;
  next();
};

const validateCalendarData = (req, res, next) => {
  const { date, price } = req.body;
  
  if (!date) {
    return sendError(res, errorCodes.MISSING_REQUIRED_FIELD, { field: 'date' });
  }
  
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) {
    return sendError(res, errorCodes.INVALID_DATE, { date });
  }
  
  if (price !== undefined && price !== null) {
    const priceStr = String(price).replace(/[₹,\s]/g, '');
    if (priceStr && isNaN(parseFloat(priceStr))) {
      return sendError(res, errorCodes.INVALID_PRICE, { price });
    }
  }
  
  next();
};

const validateUnitData = (req, res, next) => {
  const { name, available_persons, total_persons } = req.body;
  
  if (req.method === 'POST') {
    if (!name || !name.trim()) {
      return sendError(res, errorCodes.MISSING_REQUIRED_FIELD, { field: 'name' });
    }
    
    const isVillaRoute = req.baseUrl && req.baseUrl.includes('/villa');
    if (!isVillaRoute && (available_persons === undefined || available_persons === null)) {
      return sendError(res, errorCodes.MISSING_REQUIRED_FIELD, { field: 'available_persons' });
    }
  }
  
  if (available_persons !== undefined) {
    const parsedAvailable = parseInt(available_persons, 10);
    if (isNaN(parsedAvailable) || parsedAvailable < 0) {
      return sendError(res, errorCodes.MISSING_REQUIRED_FIELD, { field: 'available_persons', message: 'Must be a non-negative number' });
    }
    req.body.available_persons = parsedAvailable;
  }
  
  if (total_persons !== undefined) {
    const parsedTotal = parseInt(total_persons, 10);
    if (isNaN(parsedTotal) || parsedTotal < 0) {
      return sendError(res, errorCodes.MISSING_REQUIRED_FIELD, { field: 'total_persons', message: 'Must be a non-negative number' });
    }
    req.body.total_persons = parsedTotal;
  }
  
  next();
};

const validatePropertyUpdate = (req, res, next) => {
  const updateFields = [
    'title', 'description', 'location', 'price', 'capacity',
    'amenities', 'activities', 'highlights', 'policies', 'schedule',
    'weekday_price', 'weekend_price', 'special_dates', 'images'
  ];
  
  const providedFields = Object.keys(req.body);
  const invalidFields = providedFields.filter(
    f => !updateFields.includes(f) && !f.startsWith('_')
  );
  
  if (invalidFields.length > 0) {
    console.warn(`Warning: Unknown fields in update request: ${invalidFields.join(', ')}`);
  }
  
  next();
};

module.exports = {
  validatePropertyId,
  validateUnitId,
  validateCalendarData,
  validateUnitData,
  validatePropertyUpdate
};
