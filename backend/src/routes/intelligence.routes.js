const express = require('express');
const intelligenceService = require('../services/intelligence.service');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/daily-brief', authenticate, async (req, res, next) => {
  try {
    const brief = await intelligenceService.getDailyBrief(req.user.id, req.query.date);
    res.json({ success: true, data: brief });
  } catch (error) {
    next(error);
  }
});

router.post('/daily-brief', authenticate, requireRole('admin', 'analyst'), async (req, res, next) => {
  try {
    const brief = await intelligenceService.getDailyBrief(req.user.id, req.body?.date || req.query.date);
    res.json({ success: true, data: brief });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
