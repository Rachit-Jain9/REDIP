const express = require('express');
const { body, query: qv, validationResult } = require('express-validator');
const propertyService = require('../services/property.service');
const { authenticate, requireAdminOrAnalyst } = require('../middleware/auth');

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
    qv('zoning').optional().isIn(['residential', 'commercial', 'mixed_use', 'industrial', 'agricultural']),
    qv('search').optional().trim(),
    qv('page').optional().isInt({ min: 1 }),
    qv('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      const filters = {
        city: req.query.city,
        state: req.query.state,
        zoning: req.query.zoning,
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
    body('name').trim().notEmpty().withMessage('Property name is required').isLength({ max: 500 }),
    body('address').trim().notEmpty().withMessage('Address is required'),
    body('city').trim().notEmpty().withMessage('City is required'),
    body('state').trim().notEmpty().withMessage('State is required'),
    body('zoning').isIn(['residential', 'commercial', 'mixed_use', 'industrial', 'agricultural']).withMessage('Invalid zoning type'),
    body('landAreaSqft').optional().isFloat({ min: 1 }).withMessage('Land area must be positive'),
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
    body('name').optional().trim().notEmpty().isLength({ max: 500 }),
    body('zoning').optional().isIn(['residential', 'commercial', 'mixed_use', 'industrial', 'agricultural']),
    body('landAreaSqft').optional().isFloat({ min: 1 }),
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

module.exports = router;
