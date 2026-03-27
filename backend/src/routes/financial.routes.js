const express = require('express');
const { body, validationResult } = require('express-validator');
const financialService = require('../services/financial.service');
const { authenticate, requireRole } = require('../middleware/auth');

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

const financialInputValidation = [
  body('plotAreaSqft').isFloat({ min: 1 }).withMessage('Plot area must be positive'),
  body('fsi').isFloat({ min: 0.1, max: 20 }).withMessage('FSI must be between 0.1 and 20'),
  body('constructionCostPerSqft').isFloat({ min: 1 }).withMessage('Construction cost must be positive'),
  body('sellingRatePerSqft').isFloat({ min: 1 }).withMessage('Selling rate must be positive'),
  body('landCostCr').optional().isFloat({ min: 0 }),
  body('loadingFactor').optional().isFloat({ min: 0.1, max: 1 }),
  body('approvalCostCr').optional().isFloat({ min: 0 }),
  body('marketingCostPct').optional().isFloat({ min: 0, max: 100 }),
  body('financeCostPct').optional().isFloat({ min: 0, max: 100 }),
  body('developerMarginPct').optional().isFloat({ min: 0, max: 100 }),
  body('projectDurationMonths').optional().isInt({ min: 6, max: 120 }),
  body('discountRatePct').optional().isFloat({ min: 0, max: 100 }),
];

// POST /financials/:dealId/calculate
router.post(
  '/:dealId/calculate',
  authenticate,
  requireRole('admin', 'analyst'),
  financialInputValidation,
  handleValidation,
  async (req, res, next) => {
    try {
      const result = await financialService.calculateAndSave(req.params.dealId, req.body);
      res.status(201).json({ success: true, message: 'Financials calculated and saved.', data: result });
    } catch (error) {
      next(error);
    }
  }
);

// GET /financials/:dealId
router.get('/:dealId', authenticate, async (req, res, next) => {
  try {
    const financials = await financialService.getFinancials(req.params.dealId);
    res.json({ success: true, data: financials });
  } catch (error) {
    next(error);
  }
});

// PUT /financials/:dealId
router.put(
  '/:dealId',
  authenticate,
  requireRole('admin', 'analyst'),
  financialInputValidation,
  handleValidation,
  async (req, res, next) => {
    try {
      const result = await financialService.updateFinancials(req.params.dealId, req.body);
      res.json({ success: true, message: 'Financials updated.', data: result });
    } catch (error) {
      next(error);
    }
  }
);

// POST /financials/:dealId/sensitivity
router.post(
  '/:dealId/sensitivity',
  authenticate,
  async (req, res, next) => {
    try {
      const matrix = await financialService.runSensitivity(req.params.dealId, req.body);
      res.json({ success: true, data: matrix });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
