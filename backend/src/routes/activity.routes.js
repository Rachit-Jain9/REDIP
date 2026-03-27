const express = require('express');
const { body, query: qv, validationResult } = require('express-validator');
const activityService = require('../services/activity.service');
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

// GET /activities/recent
router.get('/recent', authenticate, async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 20;
    const activities = await activityService.getRecentActivities(null, limit);
    res.json({ success: true, data: activities });
  } catch (error) {
    next(error);
  }
});

// GET /activities/my
router.get('/my', authenticate, async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 20;
    const activities = await activityService.getRecentActivities(req.user.id, limit);
    res.json({ success: true, data: activities });
  } catch (error) {
    next(error);
  }
});

// GET /activities/:dealId
router.get(
  '/:dealId',
  authenticate,
  [
    qv('type').optional().isIn(['call', 'site_visit', 'meeting', 'loi_sent', 'offer_received', 'email', 'note']),
    qv('page').optional().isInt({ min: 1 }),
    qv('limit').optional().isInt({ min: 1, max: 200 }),
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      const filters = {
        type: req.query.type,
        performedBy: req.query.performedBy,
        isImportant: req.query.isImportant === 'true',
      };
      const pagination = { page: req.query.page, limit: req.query.limit };
      const result = await activityService.getActivities(req.params.dealId, filters, pagination);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }
);

// POST /activities/:dealId
router.post(
  '/:dealId',
  authenticate,
  requireRole('admin', 'analyst'),
  [
    body('type').isIn(['call', 'site_visit', 'meeting', 'loi_sent', 'offer_received', 'email', 'note'])
      .withMessage('Invalid activity type'),
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('activityDate').optional().isISO8601(),
    body('nextFollowUp').optional().isISO8601(),
    body('isImportant').optional().isBoolean(),
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      const activity = await activityService.logActivity(
        req.params.dealId,
        req.body.type,
        req.body.description,
        req.user.id,
        req.body.activityDate,
        req.body.nextFollowUp,
        req.body.isImportant
      );
      res.status(201).json({ success: true, message: 'Activity logged.', data: activity });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /activities/entry/:activityId
router.delete('/entry/:activityId', authenticate, async (req, res, next) => {
  try {
    const result = await activityService.deleteActivity(req.params.activityId, req.user.id, req.user.role);
    res.json({ success: true, message: 'Activity deleted.', data: result });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
