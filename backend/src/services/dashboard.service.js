const { query } = require('../config/database');

const getDashboardStats = async (userId) => {
  // Total deals stats
  const dealsStatsResult = await query(
    `SELECT
      COUNT(*) as total_deals,
      COUNT(*) FILTER (WHERE d.stage NOT IN ('closed', 'dead')) as active_deals_count,
      COUNT(*) FILTER (WHERE d.stage = 'closed' AND d.updated_at >= DATE_TRUNC('month', NOW())) as deals_closed_this_month,
      COUNT(*) FILTER (WHERE d.stage = 'dead') as dead_deals,
      COALESCE(SUM(f.total_revenue_cr) FILTER (WHERE d.stage NOT IN ('closed', 'dead')), 0) as total_pipeline_value_cr,
      AVG(f.irr_pct) FILTER (WHERE f.irr_pct IS NOT NULL AND d.stage NOT IN ('dead')) as avg_irr_pct
     FROM deals d
     LEFT JOIN financials f ON d.id = f.deal_id`
  );

  const dealsStats = dealsStatsResult.rows[0];

  // Deals by stage
  const dealsByStageResult = await query(
    `SELECT d.stage, COUNT(*) as count,
      COALESCE(SUM(f.total_revenue_cr), 0) as value_cr
     FROM deals d
     LEFT JOIN financials f ON d.id = f.deal_id
     GROUP BY d.stage
     ORDER BY CASE d.stage
       WHEN 'screening' THEN 1
       WHEN 'site_visit' THEN 2
       WHEN 'loi' THEN 3
       WHEN 'underwriting' THEN 4
       WHEN 'active' THEN 5
       WHEN 'closed' THEN 6
       WHEN 'dead' THEN 7
     END`
  );

  const dealsByStage = {};
  const stageDistribution = [];
  for (const row of dealsByStageResult.rows) {
    dealsByStage[row.stage] = {
      count: parseInt(row.count, 10),
      value_cr: parseFloat(row.value_cr) || 0,
    };
    stageDistribution.push({
      stage: row.stage,
      count: parseInt(row.count, 10),
      value_cr: parseFloat(row.value_cr) || 0,
    });
  }

  // Total properties
  const propertiesResult = await query('SELECT COUNT(*) as total FROM properties');
  const totalProperties = parseInt(propertiesResult.rows[0].total, 10);

  // Recent activities (global, last 10)
  const recentActivitiesResult = await query(
    `SELECT a.*,
      u.name as performed_by_name,
      d.name as deal_name,
      p.city as deal_city
     FROM activities a
     LEFT JOIN users u ON a.performed_by = u.id
     LEFT JOIN deals d ON a.deal_id = d.id
     LEFT JOIN properties p ON d.property_id = p.id
     ORDER BY a.activity_date DESC
     LIMIT 10`
  );

  // Top deals by IRR
  const topDealsResult = await query(
    `SELECT d.id, d.name, d.stage, p.city, f.irr_pct, f.total_revenue_cr, f.gross_margin_pct
     FROM deals d
     LEFT JOIN properties p ON d.property_id = p.id
     LEFT JOIN financials f ON d.id = f.deal_id
     WHERE f.irr_pct IS NOT NULL AND d.stage NOT IN ('dead', 'closed')
     ORDER BY f.irr_pct DESC
     LIMIT 5`
  );

  // Monthly deal activity (last 6 months)
  const monthlyActivityResult = await query(
    `SELECT
      TO_CHAR(d.created_at, 'Mon YYYY') as month,
      DATE_TRUNC('month', d.created_at) as month_date,
      COUNT(*) as new_deals,
      COUNT(*) FILTER (WHERE d.stage = 'closed') as closed_deals
     FROM deals d
     WHERE d.created_at >= NOW() - INTERVAL '6 months'
     GROUP BY DATE_TRUNC('month', d.created_at), TO_CHAR(d.created_at, 'Mon YYYY')
     ORDER BY month_date ASC`
  );

  // Cities distribution
  const citiesResult = await query(
    `SELECT p.city, COUNT(d.id) as deal_count
     FROM deals d
     LEFT JOIN properties p ON d.property_id = p.id
     WHERE d.stage NOT IN ('dead')
     GROUP BY p.city
     ORDER BY deal_count DESC
     LIMIT 8`
  );

  return {
    stats: {
      total_deals: parseInt(dealsStats.total_deals, 10),
      active_deals_count: parseInt(dealsStats.active_deals_count, 10),
      deals_closed_this_month: parseInt(dealsStats.deals_closed_this_month, 10),
      dead_deals: parseInt(dealsStats.dead_deals, 10),
      total_pipeline_value_cr: parseFloat(dealsStats.total_pipeline_value_cr) || 0,
      avg_irr_pct: dealsStats.avg_irr_pct ? parseFloat(dealsStats.avg_irr_pct) : null,
      total_properties: totalProperties,
    },
    deals_by_stage: dealsByStage,
    stage_distribution: stageDistribution,
    recent_activities: recentActivitiesResult.rows,
    top_deals_by_irr: topDealsResult.rows,
    monthly_activity: monthlyActivityResult.rows,
    cities_distribution: citiesResult.rows.map((row) => ({
      city: row.city || 'Unknown',
      deal_count: parseInt(row.deal_count, 10) || 0,
    })),
  };
};

module.exports = { getDashboardStats };
