const express = require('express');
const dashboardService = require('../services/dashboard.service');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /dashboard
router.get('/', authenticate, async (req, res, next) => {
  try {
    const stats = await dashboardService.getDashboardStats(req.user.id);
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
