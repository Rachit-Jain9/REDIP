const express = require('express');
const { body, validationResult } = require('express-validator');
const financialService = require('../services/financial.service');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

const ASSET_CLASSES = ['residential_apartments', 'plotted_development', 'commercial_office', 'retail', 'industrial'];

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

const baseValidation = [
  body('assetClass').optional().isIn(ASSET_CLASSES).withMessage('Invalid asset class'),
];

// Residential / Plotted validation
const residentialValidation = [
  body('plotAreaSqft').if(body('assetClass').not().isIn(['plotted_development', 'commercial_office', 'retail', 'industrial']))
    .isFloat({ min: 1 }).withMessage('Plot area must be positive'),
  body('fsi').optional().isFloat({ min: 0.1, max: 20 }),
  body('loadingFactor').optional().isFloat({ min: 0.05, max: 1 }),
  body('constructionCostPerSqft').optional().isFloat({ min: 1 }),
  body('sellingRatePerSqft').optional().isFloat({ min: 1 }),
  body('landCostCr').optional().isFloat({ min: 0 }),
  body('approvalCostCr').optional().isFloat({ min: 0 }),
  body('approvalCostPerSqft').optional().isFloat({ min: 0 }),
  body('constructionStartMonths').optional().isInt({ min: 0, max: 60 }),
  body('constructionEndMonths').optional().isInt({ min: 1, max: 120 }),
  body('marketingCostPct').optional().isFloat({ min: 0, max: 100 }),
  body('financeCostPct').optional().isFloat({ min: 0, max: 100 }),
  body('developerMarginPct').optional().isFloat({ min: 0, max: 100 }),
  body('projectDurationMonths').optional().isInt({ min: 6, max: 120 }),
  body('discountRatePct').optional().isFloat({ min: 0, max: 100 }),
  body('pricingEscalationPct').optional().isFloat({ min: 0, max: 50 }),
  // Plotted-specific
  body('totalLandSqft').optional().isFloat({ min: 1 }),
  body('saleableLandPct').optional().isFloat({ min: 10, max: 90 }),
  body('avgPlotSizeSqft').optional().isFloat({ min: 100 }),
  body('sellingRatePerSqyd').optional().isFloat({ min: 1 }),
  body('devCostPerSqft').optional().isFloat({ min: 0 }),
  // Income-specific
  body('leasableAreaSqft').optional().isFloat({ min: 1 }),
  body('baseRentPerSqftMonth').optional().isFloat({ min: 1 }),
  body('rentEscalationPct').optional().isFloat({ min: 0, max: 30 }),
  body('vacancyPct').optional().isFloat({ min: 0, max: 100 }),
  body('opexPct').optional().isFloat({ min: 0, max: 100 }),
  body('tiPerSqft').optional().isFloat({ min: 0 }),
  body('lcMonths').optional().isFloat({ min: 0, max: 24 }),
  body('entryCapRate').optional().isFloat({ min: 1, max: 30 }),
  body('exitCapRate').optional().isFloat({ min: 1, max: 30 }),
  body('holdPeriodYears').optional().isInt({ min: 1, max: 20 }),
  body('debtCoverage').optional().isFloat({ min: 0, max: 1 }),
  body('interestRatePct').optional().isFloat({ min: 0, max: 50 }),
  body('anchorPct').optional().isFloat({ min: 0, max: 100 }),
  body('anchorRentDiscount').optional().isFloat({ min: 0, max: 80 }),
];

// POST /financials/:dealId/calculate
router.post(
  '/:dealId/calculate',
  authenticate,
  requireRole('admin', 'analyst'),
  [...baseValidation, ...residentialValidation],
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
  [...baseValidation, ...residentialValidation],
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
router.post('/:dealId/sensitivity', authenticate, async (req, res, next) => {
  try {
    const matrix = await financialService.runSensitivity(req.params.dealId, req.body);
    res.json({ success: true, data: matrix });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
