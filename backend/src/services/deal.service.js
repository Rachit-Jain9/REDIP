const { query, transaction } = require('../config/database');
const { createError } = require('../middleware/errorHandler');

// Valid stage transitions
const STAGE_TRANSITIONS = {
  screening: ['site_visit', 'dead'],
  site_visit: ['loi', 'screening', 'dead'],
  loi: ['underwriting', 'site_visit', 'dead'],
  underwriting: ['active', 'loi', 'dead'],
  active: ['closed', 'dead'],
  closed: [],
  dead: ['screening'], // allow reactivation
};

const createDeal = async (data, userId) => {
  const {
    propertyId, name, dealType, stage, assignedTo,
    targetLaunchDate, expectedCloseDate, landAskPriceCr,
    negotiatedPriceCr, jvSplitDeveloperPct, jvSplitLandownerPct,
    reraNumber, reraExpiryDate, notes, priority,
  } = data;

  return await transaction(async (client) => {
    // Verify property exists
    const propertyCheck = await client.query('SELECT id, name FROM properties WHERE id = $1', [propertyId]);
    if (propertyCheck.rows.length === 0) {
      throw createError('Property not found.', 404);
    }

    const result = await client.query(
      `INSERT INTO deals (
        property_id, name, deal_type, stage, assigned_to,
        target_launch_date, expected_close_date, land_ask_price_cr,
        negotiated_price_cr, jv_split_developer_pct, jv_split_landowner_pct,
        rera_number, rera_expiry_date, notes, priority, created_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
      RETURNING *`,
      [
        propertyId, name, dealType, stage || 'screening',
        assignedTo || userId, targetLaunchDate || null,
        expectedCloseDate || null, landAskPriceCr || null,
        negotiatedPriceCr || null, jvSplitDeveloperPct || null,
        jvSplitLandownerPct || null, reraNumber || null,
        reraExpiryDate || null, notes || null,
        priority || 'medium', userId,
      ]
    );

    const deal = result.rows[0];

    // Record initial stage in history
    await client.query(
      `INSERT INTO deal_stage_history (deal_id, from_stage, to_stage, changed_by, notes)
       VALUES ($1, NULL, $2, $3, 'Deal created')`,
      [deal.id, deal.stage, userId]
    );

    return deal;
  });
};

const getDeals = async (filters = {}, pagination = {}) => {
  const conditions = ['1=1'];
  const values = [];
  let paramCount = 1;

  if (filters.stage) {
    conditions.push(`d.stage = $${paramCount}`);
    values.push(filters.stage);
    paramCount++;
  }

  if (filters.dealType) {
    conditions.push(`d.deal_type = $${paramCount}`);
    values.push(filters.dealType);
    paramCount++;
  }

  if (filters.assignedTo) {
    conditions.push(`d.assigned_to = $${paramCount}`);
    values.push(filters.assignedTo);
    paramCount++;
  }

  if (filters.city) {
    conditions.push(`LOWER(p.city) = LOWER($${paramCount})`);
    values.push(filters.city);
    paramCount++;
  }

  if (filters.search) {
    conditions.push(`(d.name ILIKE $${paramCount} OR p.name ILIKE $${paramCount} OR p.city ILIKE $${paramCount})`);
    values.push(`%${filters.search}%`);
    paramCount++;
  }

  if (filters.priority) {
    conditions.push(`d.priority = $${paramCount}`);
    values.push(filters.priority);
    paramCount++;
  }

  const page = parseInt(pagination.page, 10) || 1;
  const limit = Math.min(parseInt(pagination.limit, 10) || 20, 100);
  const offset = (page - 1) * limit;

  const whereClause = conditions.join(' AND ');

  const countResult = await query(
    `SELECT COUNT(*) FROM deals d
     LEFT JOIN properties p ON d.property_id = p.id
     WHERE ${whereClause}`,
    values
  );

  const dataResult = await query(
    `SELECT d.*,
      p.name as property_name, p.city, p.state, p.lat, p.lng,
      p.land_area_sqft, p.zoning, p.address as property_address,
      u.name as assigned_to_name,
      creator.name as created_by_name,
      f.irr_pct, f.gross_margin_pct, f.total_revenue_cr, f.saleable_area_sqft,
      (SELECT activity_date FROM activities WHERE deal_id = d.id ORDER BY activity_date DESC LIMIT 1) as last_activity_date
     FROM deals d
     LEFT JOIN properties p ON d.property_id = p.id
     LEFT JOIN users u ON d.assigned_to = u.id
     LEFT JOIN users creator ON d.created_by = creator.id
     LEFT JOIN financials f ON d.id = f.deal_id
     WHERE ${whereClause}
     ORDER BY d.updated_at DESC
     LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
    [...values, limit, offset]
  );

  return {
    data: dataResult.rows,
    pagination: {
      total: parseInt(countResult.rows[0].count, 10),
      page,
      limit,
      totalPages: Math.ceil(parseInt(countResult.rows[0].count, 10) / limit),
    },
  };
};

const getDealById = async (id) => {
  const result = await query(
    `SELECT d.*,
      p.name as property_name, p.city, p.state, p.lat, p.lng,
      p.land_area_sqft, p.zoning, p.address as property_address,
      p.survey_number, p.owner_name, p.circle_rate_per_sqft,
      p.permissible_fsi, p.road_width_mtrs,
      u.name as assigned_to_name, u.email as assigned_to_email,
      creator.name as created_by_name
     FROM deals d
     LEFT JOIN properties p ON d.property_id = p.id
     LEFT JOIN users u ON d.assigned_to = u.id
     LEFT JOIN users creator ON d.created_by = creator.id
     WHERE d.id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    throw createError('Deal not found.', 404);
  }

  const deal = result.rows[0];

  // Get financials
  const financialsResult = await query('SELECT * FROM financials WHERE deal_id = $1', [id]);
  deal.financials = financialsResult.rows[0] || null;

  // Get recent activities (last 10)
  const activitiesResult = await query(
    `SELECT a.*, u.name as performed_by_name
     FROM activities a
     LEFT JOIN users u ON a.performed_by = u.id
     WHERE a.deal_id = $1
     ORDER BY a.activity_date DESC
     LIMIT 10`,
    [id]
  );
  deal.recent_activities = activitiesResult.rows;

  // Get stage history
  const historyResult = await query(
    `SELECT dsh.*, u.name as changed_by_name
     FROM deal_stage_history dsh
     LEFT JOIN users u ON dsh.changed_by = u.id
     WHERE dsh.deal_id = $1
     ORDER BY dsh.changed_at ASC`,
    [id]
  );
  deal.stage_history = historyResult.rows;

  // Get document count
  const docCount = await query('SELECT COUNT(*) FROM documents WHERE deal_id = $1', [id]);
  deal.document_count = parseInt(docCount.rows[0].count, 10);

  return deal;
};

const updateDeal = async (id, data) => {
  const allowedFields = [
    'name', 'deal_type', 'assigned_to', 'target_launch_date',
    'expected_close_date', 'land_ask_price_cr', 'negotiated_price_cr',
    'jv_split_developer_pct', 'jv_split_landowner_pct',
    'rera_number', 'rera_expiry_date', 'notes', 'priority',
  ];

  const fieldMap = {
    dealType: 'deal_type',
    assignedTo: 'assigned_to',
    targetLaunchDate: 'target_launch_date',
    expectedCloseDate: 'expected_close_date',
    landAskPriceCr: 'land_ask_price_cr',
    negotiatedPriceCr: 'negotiated_price_cr',
    jvSplitDeveloperPct: 'jv_split_developer_pct',
    jvSplitLandownerPct: 'jv_split_landowner_pct',
    reraNumber: 'rera_number',
    reraExpiryDate: 'rera_expiry_date',
  };

  const updates = [];
  const values = [];
  let paramCount = 1;

  for (const [camel, snake] of Object.entries(fieldMap)) {
    if (data[camel] !== undefined) {
      updates.push(`${snake} = $${paramCount}`);
      values.push(data[camel]);
      paramCount++;
    }
  }

  for (const field of ['name', 'notes', 'priority']) {
    if (data[field] !== undefined) {
      updates.push(`${field} = $${paramCount}`);
      values.push(data[field]);
      paramCount++;
    }
  }

  if (updates.length === 0) {
    throw createError('No valid fields to update.', 400);
  }

  updates.push(`updated_at = NOW()`);
  values.push(id);

  const result = await query(
    `UPDATE deals SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
    values
  );

  if (result.rows.length === 0) {
    throw createError('Deal not found.', 404);
  }

  return result.rows[0];
};

const transitionStage = async (dealId, newStage, userId, notes = '') => {
  const dealResult = await query('SELECT id, stage FROM deals WHERE id = $1', [dealId]);

  if (dealResult.rows.length === 0) {
    throw createError('Deal not found.', 404);
  }

  const currentStage = dealResult.rows[0].stage;

  if (currentStage === newStage) {
    throw createError(`Deal is already in stage: ${newStage}`, 400);
  }

  const allowedTransitions = STAGE_TRANSITIONS[currentStage] || [];
  if (!allowedTransitions.includes(newStage)) {
    throw createError(
      `Invalid stage transition from '${currentStage}' to '${newStage}'. Allowed: ${allowedTransitions.join(', ') || 'none'}`,
      400
    );
  }

  return await transaction(async (client) => {
    // Update deal stage
    const dealUpdateResult = await client.query(
      `UPDATE deals SET stage = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [newStage, dealId]
    );

    // Record history
    await client.query(
      `INSERT INTO deal_stage_history (deal_id, from_stage, to_stage, changed_by, notes)
       VALUES ($1, $2, $3, $4, $5)`,
      [dealId, currentStage, newStage, userId, notes || null]
    );

    return dealUpdateResult.rows[0];
  });
};

const getDealsByStage = async (userId = null) => {
  const stages = ['screening', 'site_visit', 'loi', 'underwriting', 'active', 'closed', 'dead'];

  const result = await query(
    `SELECT d.stage,
      COUNT(*) as deal_count,
      SUM(COALESCE(f.total_revenue_cr, 0)) as total_value_cr,
      AVG(f.irr_pct) as avg_irr_pct,
      json_agg(
        json_build_object(
          'id', d.id,
          'name', d.name,
          'property_name', p.name,
          'city', p.city,
          'land_area_sqft', p.land_area_sqft,
          'deal_type', d.deal_type,
          'priority', d.priority,
          'irr_pct', f.irr_pct,
          'total_revenue_cr', f.total_revenue_cr,
          'assigned_to_name', u.name,
          'updated_at', d.updated_at
        ) ORDER BY d.updated_at DESC
      ) as deals
     FROM deals d
     LEFT JOIN properties p ON d.property_id = p.id
     LEFT JOIN users u ON d.assigned_to = u.id
     LEFT JOIN financials f ON d.id = f.deal_id
     GROUP BY d.stage`,
    []
  );

  // Organize by stage maintaining order
  const stageMap = {};
  for (const stage of stages) {
    stageMap[stage] = {
      stage,
      deal_count: 0,
      total_value_cr: 0,
      avg_irr_pct: null,
      deals: [],
    };
  }

  for (const row of result.rows) {
    stageMap[row.stage] = {
      ...row,
      deal_count: parseInt(row.deal_count, 10),
      total_value_cr: parseFloat(row.total_value_cr) || 0,
      avg_irr_pct: row.avg_irr_pct ? parseFloat(row.avg_irr_pct) : null,
    };
  }

  return stages.map((s) => stageMap[s]);
};

const getPipelineSummary = async () => {
  const summaryResult = await query(
    `SELECT
      COUNT(*) as total_deals,
      COUNT(*) FILTER (WHERE stage NOT IN ('closed', 'dead')) as active_deals,
      COUNT(*) FILTER (WHERE stage = 'closed') as closed_deals,
      COUNT(*) FILTER (WHERE stage = 'dead') as dead_deals,
      COALESCE(SUM(f.total_revenue_cr) FILTER (WHERE d.stage NOT IN ('closed', 'dead')), 0) as pipeline_value_cr,
      AVG(f.irr_pct) FILTER (WHERE f.irr_pct IS NOT NULL) as avg_irr_pct
     FROM deals d
     LEFT JOIN financials f ON d.id = f.deal_id`
  );

  const stageResult = await query(
    `SELECT stage, COUNT(*) as count FROM deals GROUP BY stage`
  );

  const stageDistribution = {};
  for (const row of stageResult.rows) {
    stageDistribution[row.stage] = parseInt(row.count, 10);
  }

  const summary = summaryResult.rows[0];
  return {
    total_deals: parseInt(summary.total_deals, 10),
    active_deals: parseInt(summary.active_deals, 10),
    closed_deals: parseInt(summary.closed_deals, 10),
    dead_deals: parseInt(summary.dead_deals, 10),
    pipeline_value_cr: parseFloat(summary.pipeline_value_cr) || 0,
    avg_irr_pct: summary.avg_irr_pct ? parseFloat(summary.avg_irr_pct) : null,
    stage_distribution: stageDistribution,
  };
};

const deleteDeal = async (id) => {
  const result = await query('DELETE FROM deals WHERE id = $1 RETURNING id', [id]);
  if (result.rows.length === 0) {
    throw createError('Deal not found.', 404);
  }
  return { deleted: true, id };
};

module.exports = {
  createDeal,
  getDeals,
  getDealById,
  updateDeal,
  transitionStage,
  getDealsByStage,
  getPipelineSummary,
  deleteDeal,
};
