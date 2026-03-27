const { query } = require('../config/database');
const { createError } = require('../middleware/errorHandler');
const { geocodeAddress } = require('../utils/geocode');

const createProperty = async (data, userId) => {
  const {
    name, address, city, state, pincode, lat, lng,
    surveyNumber, ownerName, landAreaSqft, zoning,
    circleRatePerSqft, permissibleFsi, roadWidthMtrs,
    ownershipType, encumbranceStatus, notes,
  } = data;

  const result = await query(
    `INSERT INTO properties (
      name, address, city, state, pincode, lat, lng,
      survey_number, owner_name, land_area_sqft, zoning,
      circle_rate_per_sqft, permissible_fsi, road_width_mtrs,
      ownership_type, encumbrance_status, notes, created_by
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
    RETURNING *`,
    [
      name, address, city, state, pincode || null,
      lat || null, lng || null,
      surveyNumber || null, ownerName || null,
      landAreaSqft || null, zoning || 'residential',
      circleRatePerSqft || null, permissibleFsi || null,
      roadWidthMtrs || null, ownershipType || null,
      encumbranceStatus || null, notes || null, userId,
    ]
  );

  return result.rows[0];
};

const getProperties = async (filters = {}, pagination = {}) => {
  const conditions = ['1=1'];
  const values = [];
  let paramCount = 1;

  if (filters.city) {
    conditions.push(`LOWER(city) = LOWER($${paramCount})`);
    values.push(filters.city);
    paramCount++;
  }

  if (filters.state) {
    conditions.push(`LOWER(state) = LOWER($${paramCount})`);
    values.push(filters.state);
    paramCount++;
  }

  if (filters.zoning) {
    conditions.push(`zoning = $${paramCount}`);
    values.push(filters.zoning);
    paramCount++;
  }

  if (filters.search) {
    conditions.push(`(name ILIKE $${paramCount} OR address ILIKE $${paramCount} OR owner_name ILIKE $${paramCount})`);
    values.push(`%${filters.search}%`);
    paramCount++;
  }

  if (filters.minArea) {
    conditions.push(`land_area_sqft >= $${paramCount}`);
    values.push(filters.minArea);
    paramCount++;
  }

  if (filters.maxArea) {
    conditions.push(`land_area_sqft <= $${paramCount}`);
    values.push(filters.maxArea);
    paramCount++;
  }

  const page = parseInt(pagination.page, 10) || 1;
  const limit = Math.min(parseInt(pagination.limit, 10) || 20, 100);
  const offset = (page - 1) * limit;

  const whereClause = conditions.join(' AND ');
  const orderBy = 'ORDER BY created_at DESC';

  const countResult = await query(
    `SELECT COUNT(*) FROM properties WHERE ${whereClause}`,
    values
  );

  const dataResult = await query(
    `SELECT p.*, u.name as created_by_name
     FROM properties p
     LEFT JOIN users u ON p.created_by = u.id
     WHERE ${whereClause}
     ${orderBy}
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

const getPropertyById = async (id) => {
  const result = await query(
    `SELECT p.*, u.name as created_by_name,
     (SELECT COUNT(*) FROM deals WHERE property_id = p.id) as deal_count
     FROM properties p
     LEFT JOIN users u ON p.created_by = u.id
     WHERE p.id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    throw createError('Property not found.', 404);
  }

  return result.rows[0];
};

const updateProperty = async (id, data) => {
  const allowedFields = [
    'name', 'address', 'city', 'state', 'pincode', 'lat', 'lng',
    'survey_number', 'owner_name', 'land_area_sqft', 'zoning',
    'circle_rate_per_sqft', 'permissible_fsi', 'road_width_mtrs',
    'ownership_type', 'encumbrance_status', 'notes',
  ];

  // Map camelCase to snake_case
  const fieldMap = {
    surveyNumber: 'survey_number',
    ownerName: 'owner_name',
    landAreaSqft: 'land_area_sqft',
    circleRatePerSqft: 'circle_rate_per_sqft',
    permissibleFsi: 'permissible_fsi',
    roadWidthMtrs: 'road_width_mtrs',
    ownershipType: 'ownership_type',
    encumbranceStatus: 'encumbrance_status',
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

  for (const field of ['name', 'address', 'city', 'state', 'pincode', 'lat', 'lng', 'zoning', 'notes']) {
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
    `UPDATE properties SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
    values
  );

  if (result.rows.length === 0) {
    throw createError('Property not found.', 404);
  }

  return result.rows[0];
};

const deleteProperty = async (id) => {
  // Check if property has active deals
  const dealsResult = await query(
    "SELECT COUNT(*) FROM deals WHERE property_id = $1 AND stage NOT IN ('closed', 'dead')",
    [id]
  );

  if (parseInt(dealsResult.rows[0].count, 10) > 0) {
    throw createError('Cannot delete property with active deals. Please close or archive all deals first.', 409);
  }

  const result = await query('DELETE FROM properties WHERE id = $1 RETURNING id', [id]);

  if (result.rows.length === 0) {
    throw createError('Property not found.', 404);
  }

  return { deleted: true, id };
};

const geocodePropertyAddress = async (propertyId) => {
  const property = await getPropertyById(propertyId);

  const coords = await geocodeAddress(
    property.address,
    property.city,
    property.state,
    property.pincode
  );

  if (!coords) {
    throw createError('Could not geocode the property address. Please check the address details.', 422);
  }

  const result = await query(
    'UPDATE properties SET lat = $1, lng = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
    [coords.lat, coords.lng, propertyId]
  );

  return result.rows[0];
};

module.exports = {
  createProperty,
  getProperties,
  getPropertyById,
  updateProperty,
  deleteProperty,
  geocodePropertyAddress,
};
