const { query } = require('../config/database');
const { createError } = require('../middleware/errorHandler');

const VALID_ACTIVITY_TYPES = ['call', 'site_visit', 'meeting', 'loi_sent', 'offer_received', 'email', 'note'];

const logActivity = async (dealId, type, description, userId, activityDate = null, nextFollowUp = null, isImportant = false) => {
  // Verify deal exists
  const dealResult = await query('SELECT id FROM deals WHERE id = $1', [dealId]);
  if (dealResult.rows.length === 0) {
    throw createError('Deal not found.', 404);
  }

  if (!VALID_ACTIVITY_TYPES.includes(type)) {
    throw createError(`Invalid activity type. Must be one of: ${VALID_ACTIVITY_TYPES.join(', ')}`, 400);
  }

  if (!description || description.trim().length === 0) {
    throw createError('Activity description is required.', 400);
  }

  const date = activityDate ? new Date(activityDate) : new Date();
  if (isNaN(date.getTime())) {
    throw createError('Invalid activity date provided.', 400);
  }

  const result = await query(
    `INSERT INTO activities (deal_id, activity_type, description, performed_by, activity_date, next_follow_up, is_important)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [dealId, type, description.trim(), userId, date, nextFollowUp || null, isImportant || false]
  );

  const activity = result.rows[0];

  // Get performer name
  const userResult = await query('SELECT name FROM users WHERE id = $1', [userId]);
  activity.performed_by_name = userResult.rows[0]?.name || 'Unknown';

  // Update deal's updated_at
  await query('UPDATE deals SET updated_at = NOW() WHERE id = $1', [dealId]);

  return activity;
};

const getActivities = async (dealId, filters = {}, pagination = {}) => {
  // Verify deal exists
  const dealResult = await query('SELECT id FROM deals WHERE id = $1', [dealId]);
  if (dealResult.rows.length === 0) {
    throw createError('Deal not found.', 404);
  }

  const conditions = ['a.deal_id = $1'];
  const values = [dealId];
  let paramCount = 2;

  if (filters.type) {
    conditions.push(`a.activity_type = $${paramCount}`);
    values.push(filters.type);
    paramCount++;
  }

  if (filters.performedBy) {
    conditions.push(`a.performed_by = $${paramCount}`);
    values.push(filters.performedBy);
    paramCount++;
  }

  if (filters.isImportant) {
    conditions.push(`a.is_important = true`);
  }

  const page = parseInt(pagination.page, 10) || 1;
  const limit = Math.min(parseInt(pagination.limit, 10) || 50, 200);
  const offset = (page - 1) * limit;

  const whereClause = conditions.join(' AND ');

  const countResult = await query(
    `SELECT COUNT(*) FROM activities a WHERE ${whereClause}`,
    values
  );

  const dataResult = await query(
    `SELECT a.*, u.name as performed_by_name
     FROM activities a
     LEFT JOIN users u ON a.performed_by = u.id
     WHERE ${whereClause}
     ORDER BY a.activity_date DESC
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

const getRecentActivities = async (userId = null, limit = 20) => {
  const conditions = ['1=1'];
  const values = [];
  let paramCount = 1;

  if (userId) {
    conditions.push(`a.performed_by = $${paramCount}`);
    values.push(userId);
    paramCount++;
  }

  const safeLimit = Math.min(parseInt(limit, 10) || 20, 100);

  const result = await query(
    `SELECT a.*,
      u.name as performed_by_name,
      d.name as deal_name,
      p.city as deal_city,
      p.name as property_name
     FROM activities a
     LEFT JOIN users u ON a.performed_by = u.id
     LEFT JOIN deals d ON a.deal_id = d.id
     LEFT JOIN properties p ON d.property_id = p.id
     WHERE ${conditions.join(' AND ')}
     ORDER BY a.activity_date DESC
     LIMIT $${paramCount}`,
    [...values, safeLimit]
  );

  return result.rows;
};

const deleteActivity = async (activityId, userId, userRole) => {
  const result = await query('SELECT * FROM activities WHERE id = $1', [activityId]);

  if (result.rows.length === 0) {
    throw createError('Activity not found.', 404);
  }

  const activity = result.rows[0];

  // Only the creator or admin can delete
  if (activity.performed_by !== userId && userRole !== 'admin') {
    throw createError('You do not have permission to delete this activity.', 403);
  }

  await query('DELETE FROM activities WHERE id = $1', [activityId]);
  return { deleted: true, id: activityId };
};

module.exports = {
  logActivity,
  getActivities,
  getRecentActivities,
  deleteActivity,
};
