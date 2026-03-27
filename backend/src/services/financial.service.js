const { query } = require('../config/database');
const { createError } = require('../middleware/errorHandler');
const { calculateFullFinancials, buildSensitivityMatrix } = require('../engines/financial.engine');

const calculateAndSave = async (dealId, inputData) => {
  // Verify deal exists
  const dealResult = await query('SELECT id FROM deals WHERE id = $1', [dealId]);
  if (dealResult.rows.length === 0) {
    throw createError('Deal not found.', 404);
  }

  // Run financial engine
  const computed = calculateFullFinancials(inputData);

  // Check if financials already exist for this deal
  const existing = await query('SELECT id FROM financials WHERE deal_id = $1', [dealId]);

  let result;
  if (existing.rows.length > 0) {
    // Update
    result = await query(
      `UPDATE financials SET
        land_cost_cr = $1, plot_area_sqft = $2, fsi = $3,
        loading_factor = $4, construction_cost_per_sqft = $5,
        selling_rate_per_sqft = $6, approval_cost_cr = $7,
        marketing_cost_pct = $8, finance_cost_pct = $9,
        developer_margin_pct = $10, project_duration_months = $11,
        gross_area_sqft = $12, saleable_area_sqft = $13,
        carpet_area_sqft = $14, super_builtup_area_sqft = $15,
        total_construction_cost_cr = $16, gst_cost_cr = $17,
        stamp_duty_cr = $18, marketing_cost_cr = $19,
        finance_cost_cr = $20, total_cost_cr = $21,
        total_revenue_cr = $22, gross_profit_cr = $23,
        gross_margin_pct = $24, developer_profit_cr = $25,
        npv_cr = $26, irr_pct = $27, residual_land_value_cr = $28,
        equity_multiple = $29, cash_flows = $30,
        sensitivity_matrix = $31, discount_rate_pct = $32,
        updated_at = NOW()
       WHERE deal_id = $33
       RETURNING *`,
      [
        computed.inputs.landCostCr, computed.inputs.plotAreaSqft,
        computed.inputs.fsi, computed.inputs.loadingFactor,
        computed.inputs.constructionCostPerSqft, computed.inputs.sellingRatePerSqft,
        computed.inputs.approvalCostCr, computed.inputs.marketingCostPct,
        computed.inputs.financeCostPct, computed.inputs.developerMarginPct,
        computed.inputs.projectDurationMonths,
        computed.grossAreaSqft, computed.saleableAreaSqft,
        computed.carpetAreaSqft, computed.superBuiltupAreaSqft,
        computed.totalConstructionCostCr, computed.gstCostCr,
        computed.stampDutyCr, computed.marketingCostCr,
        computed.financeCostCr, computed.totalCostCr,
        computed.totalRevenueCr, computed.grossProfitCr,
        computed.grossMarginPct, computed.developerProfitCr,
        computed.npvCr, computed.irrPct, computed.residualLandValueCr,
        computed.equityMultiple,
        JSON.stringify(computed.cashFlows),
        JSON.stringify(computed.sensitivityMatrix),
        computed.inputs.discountRatePct,
        dealId,
      ]
    );
  } else {
    // Insert
    result = await query(
      `INSERT INTO financials (
        deal_id, land_cost_cr, plot_area_sqft, fsi,
        loading_factor, construction_cost_per_sqft, selling_rate_per_sqft,
        approval_cost_cr, marketing_cost_pct, finance_cost_pct,
        developer_margin_pct, project_duration_months,
        gross_area_sqft, saleable_area_sqft, carpet_area_sqft,
        super_builtup_area_sqft, total_construction_cost_cr,
        gst_cost_cr, stamp_duty_cr, marketing_cost_cr,
        finance_cost_cr, total_cost_cr, total_revenue_cr,
        gross_profit_cr, gross_margin_pct, developer_profit_cr,
        npv_cr, irr_pct, residual_land_value_cr,
        equity_multiple, cash_flows, sensitivity_matrix, discount_rate_pct
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,
        $16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,
        $29,$30,$31,$32,$33
      ) RETURNING *`,
      [
        dealId,
        computed.inputs.landCostCr, computed.inputs.plotAreaSqft,
        computed.inputs.fsi, computed.inputs.loadingFactor,
        computed.inputs.constructionCostPerSqft, computed.inputs.sellingRatePerSqft,
        computed.inputs.approvalCostCr, computed.inputs.marketingCostPct,
        computed.inputs.financeCostPct, computed.inputs.developerMarginPct,
        computed.inputs.projectDurationMonths,
        computed.grossAreaSqft, computed.saleableAreaSqft,
        computed.carpetAreaSqft, computed.superBuiltupAreaSqft,
        computed.totalConstructionCostCr, computed.gstCostCr,
        computed.stampDutyCr, computed.marketingCostCr,
        computed.financeCostCr, computed.totalCostCr,
        computed.totalRevenueCr, computed.grossProfitCr,
        computed.grossMarginPct, computed.developerProfitCr,
        computed.npvCr, computed.irrPct, computed.residualLandValueCr,
        computed.equityMultiple,
        JSON.stringify(computed.cashFlows),
        JSON.stringify(computed.sensitivityMatrix),
        computed.inputs.discountRatePct,
      ]
    );
  }

  return {
    ...result.rows[0],
    computed, // Return full computed result including cash flows
  };
};

const getFinancials = async (dealId) => {
  const result = await query('SELECT * FROM financials WHERE deal_id = $1', [dealId]);

  if (result.rows.length === 0) {
    throw createError('Financials not found for this deal.', 404);
  }

  return result.rows[0];
};

const updateFinancials = async (dealId, inputData) => {
  return calculateAndSave(dealId, inputData);
};

const runSensitivity = async (dealId, params) => {
  const financials = await getFinancials(dealId);

  const baseParams = {
    plotAreaSqft: params.plotAreaSqft || financials.plot_area_sqft,
    fsi: params.fsi || financials.fsi,
    loadingFactor: params.loadingFactor || financials.loading_factor,
    constructionCostPerSqft: params.constructionCostPerSqft || financials.construction_cost_per_sqft,
    sellingRatePerSqft: params.sellingRatePerSqft || financials.selling_rate_per_sqft,
    landCostCr: params.landCostCr || financials.land_cost_cr || 0,
    approvalCostCr: params.approvalCostCr || financials.approval_cost_cr || 0,
    marketingCostPct: params.marketingCostPct || financials.marketing_cost_pct || 3.5,
    financeCostPct: params.financeCostPct || financials.finance_cost_pct || 12,
    projectDurationMonths: params.projectDurationMonths || financials.project_duration_months || 36,
    discountRatePct: params.discountRatePct || financials.discount_rate_pct || 12,
    developerMarginPct: params.developerMarginPct || financials.developer_margin_pct || 20,
  };

  const matrix = buildSensitivityMatrix(baseParams);

  // Update sensitivity matrix in DB
  await query(
    'UPDATE financials SET sensitivity_matrix = $1, updated_at = NOW() WHERE deal_id = $2',
    [JSON.stringify(matrix), dealId]
  );

  return matrix;
};

module.exports = {
  calculateAndSave,
  getFinancials,
  updateFinancials,
  runSensitivity,
};
