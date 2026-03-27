const express = require('express');
const { query: qv, validationResult } = require('express-validator');
const { query } = require('../config/database');
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

const escapeCsvField = (value) => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const toCsvRow = (fields) => fields.map(escapeCsvField).join(',');

// GET /exports/deals
router.get(
  '/deals',
  authenticate,
  requireRole('admin', 'analyst'),
  [qv('stage').optional(), qv('city').optional()],
  handleValidation,
  async (req, res, next) => {
    try {
      const conditions = ['1=1'];
      const values = [];
      let paramCount = 1;

      if (req.query.stage) {
        conditions.push(`d.stage = $${paramCount}`);
        values.push(req.query.stage);
        paramCount++;
      }
      if (req.query.city) {
        conditions.push(`LOWER(p.city) = LOWER($${paramCount})`);
        values.push(req.query.city);
        paramCount++;
      }

      const result = await query(
        `SELECT d.name as deal_name, d.deal_type, d.stage, d.priority,
          p.name as property_name, p.city, p.state, p.land_area_sqft,
          d.land_ask_price_cr, d.negotiated_price_cr,
          f.total_revenue_cr, f.total_cost_cr, f.gross_profit_cr,
          f.irr_pct, f.npv_cr, f.gross_margin_pct,
          u.name as assigned_to_name,
          d.created_at, d.updated_at
         FROM deals d
         LEFT JOIN properties p ON d.property_id = p.id
         LEFT JOIN financials f ON d.id = f.deal_id
         LEFT JOIN users u ON d.assigned_to = u.id
         WHERE ${conditions.join(' AND ')}
         ORDER BY d.updated_at DESC`,
        values
      );

      const headers = [
        'Deal Name', 'Deal Type', 'Stage', 'Priority',
        'Property', 'City', 'State', 'Land Area (sqft)',
        'Ask Price (Cr)', 'Negotiated Price (Cr)',
        'Revenue (Cr)', 'Cost (Cr)', 'Profit (Cr)',
        'IRR %', 'NPV (Cr)', 'Margin %',
        'Assigned To', 'Created', 'Updated',
      ];

      const rows = result.rows.map((r) =>
        toCsvRow([
          r.deal_name, r.deal_type, r.stage, r.priority,
          r.property_name, r.city, r.state, r.land_area_sqft,
          r.land_ask_price_cr, r.negotiated_price_cr,
          r.total_revenue_cr, r.total_cost_cr, r.gross_profit_cr,
          r.irr_pct, r.npv_cr, r.gross_margin_pct,
          r.assigned_to_name, r.created_at, r.updated_at,
        ])
      );

      const csv = [toCsvRow(headers), ...rows].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="deals-export-${Date.now()}.csv"`);
      res.send(csv);
    } catch (error) {
      next(error);
    }
  }
);

// GET /exports/comps
router.get(
  '/comps',
  authenticate,
  requireRole('admin', 'analyst'),
  async (req, res, next) => {
    try {
      const result = await query(
        `SELECT project_name, developer, city, locality, project_type,
          bhk_config, carpet_area_sqft, super_builtup_area_sqft,
          rate_per_sqft, total_units, launch_year, possession_year,
          rera_number, source, created_at
         FROM comps ORDER BY city, rate_per_sqft DESC`
      );

      const headers = [
        'Project', 'Developer', 'City', 'Locality', 'Type',
        'BHK', 'Carpet (sqft)', 'Super Built-up (sqft)',
        'Rate/sqft', 'Units', 'Launch Year', 'Possession Year',
        'RERA', 'Source', 'Added',
      ];

      const rows = result.rows.map((r) =>
        toCsvRow([
          r.project_name, r.developer, r.city, r.locality, r.project_type,
          r.bhk_config, r.carpet_area_sqft, r.super_builtup_area_sqft,
          r.rate_per_sqft, r.total_units, r.launch_year, r.possession_year,
          r.rera_number, r.source, r.created_at,
        ])
      );

      const csv = [toCsvRow(headers), ...rows].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="comps-export-${Date.now()}.csv"`);
      res.send(csv);
    } catch (error) {
      next(error);
    }
  }
);

// GET /exports/ic-report/:dealId
router.get(
  '/ic-report/:dealId',
  authenticate,
  requireRole('admin', 'analyst'),
  async (req, res, next) => {
    try {
      const dealResult = await query(
        `SELECT d.*, p.name as property_name, p.city, p.state,
          p.land_area_sqft, p.zoning, p.address, p.survey_number,
          p.circle_rate_per_sqft, p.permissible_fsi,
          u.name as assigned_to_name,
          f.*
         FROM deals d
         LEFT JOIN properties p ON d.property_id = p.id
         LEFT JOIN users u ON d.assigned_to = u.id
         LEFT JOIN financials f ON d.id = f.deal_id
         WHERE d.id = $1`,
        [req.params.dealId]
      );

      if (dealResult.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Deal not found.' });
      }

      const deal = dealResult.rows[0];

      // Get activities
      const activitiesResult = await query(
        `SELECT a.*, u.name as performed_by_name
         FROM activities a LEFT JOIN users u ON a.performed_by = u.id
         WHERE a.deal_id = $1 ORDER BY a.activity_date DESC LIMIT 20`,
        [req.params.dealId]
      );

      // Get stage history
      const historyResult = await query(
        `SELECT dsh.*, u.name as changed_by_name
         FROM deal_stage_history dsh LEFT JOIN users u ON dsh.changed_by = u.id
         WHERE dsh.deal_id = $1 ORDER BY dsh.changed_at ASC`,
        [req.params.dealId]
      );

      // Risk assessment
      const risks = [];
      if (deal.irr_pct && deal.irr_pct < 15) risks.push({ level: 'high', factor: 'Low IRR', detail: `IRR at ${deal.irr_pct}% is below 15% threshold` });
      if (deal.gross_margin_pct && deal.gross_margin_pct < 10) risks.push({ level: 'high', factor: 'Thin margins', detail: `Gross margin at ${deal.gross_margin_pct}%` });
      if (deal.land_ask_price_cr && deal.residual_land_value_cr && deal.land_ask_price_cr > deal.residual_land_value_cr) {
        risks.push({ level: 'medium', factor: 'Land price above RLV', detail: `Ask ₹${deal.land_ask_price_cr} Cr vs RLV ₹${deal.residual_land_value_cr} Cr` });
      }
      if (!deal.rera_number) risks.push({ level: 'low', factor: 'No RERA registration', detail: 'RERA number not provided' });

      // Recommendation
      let recommendation = 'PROCEED';
      if (risks.filter((r) => r.level === 'high').length >= 2) recommendation = 'REJECT';
      else if (risks.filter((r) => r.level === 'high').length >= 1) recommendation = 'PROCEED WITH CAUTION';

      const report = {
        report_type: 'IC Report',
        generated_at: new Date().toISOString(),
        generated_by: req.user.name,
        deal: {
          name: deal.name,
          type: deal.deal_type,
          stage: deal.stage,
          priority: deal.priority,
          property: deal.property_name,
          city: deal.city,
          state: deal.state,
          land_area_sqft: deal.land_area_sqft,
          zoning: deal.zoning,
        },
        financials: {
          land_cost_cr: deal.land_cost_cr,
          total_revenue_cr: deal.total_revenue_cr,
          total_cost_cr: deal.total_cost_cr,
          gross_profit_cr: deal.gross_profit_cr,
          gross_margin_pct: deal.gross_margin_pct,
          irr_pct: deal.irr_pct,
          npv_cr: deal.npv_cr,
          equity_multiple: deal.equity_multiple,
          residual_land_value_cr: deal.residual_land_value_cr,
        },
        risk_assessment: risks,
        recommendation,
        stage_history: historyResult.rows,
        recent_activities: activitiesResult.rows,
      };

      res.json({ success: true, data: report });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
