const express = require('express');
const { body, query: qv, validationResult } = require('express-validator');
const propertyService = require('../services/property.service');
const { authenticate, requireAdminOrAnalyst } = require('../middleware/auth');
const {
  PROPERTY_TYPES,
  ZONING_TYPES,
  AREA_UNITS,
  normalizePropertyType,
  normalizeAreaUnit,
} = require('../constants/domain');

const router = express.Router();

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

// GET /properties
router.get(
  '/',
  authenticate,
  [
    qv('city').optional().trim(),
    qv('state').optional().trim(),
    qv('zoning').optional().isIn(ZONING_TYPES),
    qv('propertyType').optional().customSanitizer(normalizePropertyType).isIn(PROPERTY_TYPES),
    qv('geocodeStatus').optional().isIn(['pending', 'matched', 'approximate', 'failed', 'manual', 'insufficient_data']),
    qv('search').optional().trim(),
    qv('page').optional().isInt({ min: 1 }),
    qv('limit').optional().isInt({ min: 1, max: 200 }),
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      const filters = {
        city: req.query.city,
        state: req.query.state,
        zoning: req.query.zoning,
        propertyType: req.query.propertyType,
        geocodeStatus: req.query.geocodeStatus,
        search: req.query.search,
        minArea: req.query.minArea,
        maxArea: req.query.maxArea,
      };
      const pagination = { page: req.query.page, limit: req.query.limit };
      const result = await propertyService.getProperties(filters, pagination);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }
);

// POST /properties
router.post(
  '/',
  authenticate,
  requireAdminOrAnalyst,
  [
    body('name').optional({ values: 'falsy' }).trim().isLength({ max: 500 }),
    body('address').optional({ values: 'falsy' }).trim(),
    body('city').optional({ values: 'falsy' }).trim(),
    body('state').optional({ values: 'falsy' }).trim(),
    body('propertyType').optional().customSanitizer(normalizePropertyType).isIn(PROPERTY_TYPES).withMessage('Invalid property type'),
    body('zoning').optional().isIn(ZONING_TYPES).withMessage('Invalid zoning type'),
    body('landAreaSqft').optional().isFloat({ min: 0.01 }).withMessage('Land area must be positive'),
    body('landAreaValue').optional().isFloat({ min: 0.01 }).withMessage('Land area must be positive'),
    body('landAreaUnit').optional().customSanitizer(normalizeAreaUnit).isIn(AREA_UNITS).withMessage('Invalid land area unit'),
    body('circleRatePerSqft').optional().isFloat({ min: 0 }),
    body('permissibleFsi').optional().isFloat({ min: 0, max: 20 }),
    body('lat').optional().isFloat({ min: -90, max: 90 }),
    body('lng').optional().isFloat({ min: -180, max: 180 }),
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      const property = await propertyService.createProperty(req.body, req.user.id);
      res.status(201).json({ success: true, message: 'Property created.', data: property });
    } catch (error) {
      next(error);
    }
  }
);

// GET /properties/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const property = await propertyService.getPropertyById(req.params.id);
    res.json({ success: true, data: property });
  } catch (error) {
    next(error);
  }
});

// PUT /properties/:id
router.put(
  '/:id',
  authenticate,
  requireAdminOrAnalyst,
  [
    body('name').optional({ values: 'falsy' }).trim().isLength({ max: 500 }),
    body('address').optional({ values: 'falsy' }).trim(),
    body('city').optional({ values: 'falsy' }).trim(),
    body('state').optional({ values: 'falsy' }).trim(),
    body('propertyType').optional().customSanitizer(normalizePropertyType).isIn(PROPERTY_TYPES),
    body('zoning').optional().isIn(ZONING_TYPES),
    body('landAreaSqft').optional().isFloat({ min: 0.01 }),
    body('landAreaValue').optional().isFloat({ min: 0.01 }),
    body('landAreaUnit').optional().customSanitizer(normalizeAreaUnit).isIn(AREA_UNITS),
    body('circleRatePerSqft').optional().isFloat({ min: 0 }),
    body('permissibleFsi').optional().isFloat({ min: 0, max: 20 }),
    body('lat').optional().isFloat({ min: -90, max: 90 }),
    body('lng').optional().isFloat({ min: -180, max: 180 }),
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      const property = await propertyService.updateProperty(req.params.id, req.body);
      res.json({ success: true, message: 'Property updated.', data: property });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /properties/:id
router.delete('/:id', authenticate, requireAdminOrAnalyst, async (req, res, next) => {
  try {
    const result = await propertyService.deleteProperty(req.params.id);
    res.json({ success: true, message: 'Property deleted.', data: result });
  } catch (error) {
    next(error);
  }
});

// POST /properties/:id/geocode
router.post('/:id/geocode', authenticate, requireAdminOrAnalyst, async (req, res, next) => {
  try {
    const property = await propertyService.geocodePropertyAddress(req.params.id);
    res.json({ success: true, message: 'Property geocoded successfully.', data: property });
  } catch (error) {
    next(error);
  }
});

// POST /properties/bulk-geocode  — re-geocodes all non-manual properties (admin only)
router.post('/bulk-geocode', authenticate, requireAdminOrAnalyst, async (req, res, next) => {
  try {
    const results = await propertyService.bulkGeocodeProperties();
    res.json({ success: true, message: `Geocoded ${results.success}/${results.total} properties.`, data: results });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
