const { query } = require('../config/database');
const { createError } = require('../middleware/errorHandler');
const { calculateFullFinancials } = require('../engines/financial.engine');

const INCOME_CLASSES = ['commercial_office', 'retail', 'industrial'];

const calculateAndSave = async (dealId, inputData) => {
  const dealResult = await query('SELECT id FROM deals WHERE id = $1', [dealId]);
  if (dealResult.rows.length === 0) throw createError('Deal not found.', 404);

  const computed = calculateFullFinancials(inputData);
  const assetClass = computed.assetClass;
  const leg = computed._legacy || {};

  const existing = await query('SELECT id FROM financials WHERE deal_id = $1', [dealId]);
  let result;

  if (existing.rows.length > 0) {
    result = await query(
      `UPDATE financials SET
        asset_class = $1,
        model_params = $2,
        land_cost_cr = $3,
        plot_area_sqft = $4,
        fsi = $5,
        loading_factor = $6,
        construction_cost_per_sqft = $7,
        selling_rate_per_sqft = $8,
        approval_cost_cr = $9,
        marketing_cost_pct = $10,
        finance_cost_pct = $11,
        developer_margin_pct = $12,
        project_duration_months = $13,
        gross_area_sqft = $14,
        saleable_area_sqft = $15,
        carpet_area_sqft = $16,
        super_builtup_area_sqft = $17,
        total_construction_cost_cr = $18,
        gst_cost_cr = $19,
        stamp_duty_cr = $20,
        marketing_cost_cr = $21,
        finance_cost_cr = $22,
        total_cost_cr = $23,
        total_revenue_cr = $24,
        gross_profit_cr = $25,
        gross_margin_pct = $26,
        developer_profit_cr = $27,
        npv_cr = $28,
        irr_pct = $29,
        residual_land_value_cr = $30,
        equity_multiple = $31,
        noi_cr = $32,
        yield_on_cost_pct = $33,
        exit_value_cr = $34,
        entry_value_cr = $35,
        dscr = $36,
        stabilized_noi_cr = $37,
        cash_flows = $38,
        sensitivity_matrix = $39,
        discount_rate_pct = $40,
        updated_at = NOW()
      WHERE deal_id = $41
      RETURNING *`,
      buildParams(computed, leg, assetClass, dealId, true)
    );
  } else {
    result = await query(
      `INSERT INTO financials (
        deal_id, asset_class, model_params,
        land_cost_cr, plot_area_sqft, fsi, loading_factor,
        construction_cost_per_sqft, selling_rate_per_sqft,
        approval_cost_cr, marketing_cost_pct, finance_cost_pct,
        developer_margin_pct, project_duration_months,
        gross_area_sqft, saleable_area_sqft, carpet_area_sqft,
        super_builtup_area_sqft, total_construction_cost_cr,
        gst_cost_cr, stamp_duty_cr, marketing_cost_cr,
        finance_cost_cr, total_cost_cr, total_revenue_cr,
        gross_profit_cr, gross_margin_pct, developer_profit_cr,
        npv_cr, irr_pct, residual_land_value_cr, equity_multiple,
        noi_cr, yield_on_cost_pct, exit_value_cr, entry_value_cr,
        dscr, stabilized_noi_cr,
        cash_flows, sensitivity_matrix, discount_rate_pct
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,
        $16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,
        $29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39,$40,$41
      ) RETURNING *`,
      buildParams(computed, leg, assetClass, dealId, false)
    );
  }

  return { ...result.rows[0], computed };
};

function buildParams(computed, leg, assetClass, dealId, isUpdate) {
  const kpis = computed.kpis || {};
  const costs = computed.costs || {};
  const areas = computed.areas || {};

  const common = [
    assetClass,
    JSON.stringify({ inputs: computed.inputs, kpis, areas, costs, revenue: computed.revenue }),
    leg.land_cost_cr ?? null,
    leg.plot_area_sqft ?? null,
    leg.fsi ?? null,
    leg.loading_factor ?? null,
    leg.construction_cost_per_sqft ?? null,
    leg.selling_rate_per_sqft ?? null,
    leg.approval_cost_cr ?? null,
    leg.marketing_cost_pct ?? null,
    leg.finance_cost_pct ?? null,
    leg.developer_margin_pct ?? null,
    leg.project_duration_months ?? null,
    areas.grossBuiltUp ?? null,
    areas.saleable ?? null,
    areas.carpet ?? null,
    areas.superBuiltUp ?? null,
    costs.construction ?? null,
    costs.gst ?? null,
    costs.stampDuty ?? null,
    costs.marketing ?? null,
    costs.finance ?? null,
    costs.total ?? null,
    leg.total_revenue_cr ?? null,
    leg.gross_profit_cr ?? null,
    leg.gross_margin_pct ?? null,
    leg.developer_profit_cr ?? null,
    kpis.npv ?? null,
    kpis.irr ?? null,
    kpis.rlv ?? null,
    kpis.equityMultiple ?? null,
    kpis.noi ?? null,
    kpis.yieldOnCost ?? null,
    kpis.exitValue ?? null,
    kpis.entryValue ?? null,
    kpis.dscr ?? null,
    kpis.noi ?? null,                        // stabilized_noi_cr
    JSON.stringify(computed.cashFlows),
    JSON.stringify(computed.sensitivityMatrix),
    leg.discount_rate_pct ?? null,
  ];

  return isUpdate ? [...common, dealId] : [dealId, ...common];
}

const getFinancials = async (dealId) => {
  const result = await query('SELECT * FROM financials WHERE deal_id = $1', [dealId]);
  if (result.rows.length === 0) throw createError('Financials not found for this deal.', 404);
  return result.rows[0];
};

const updateFinancials = async (dealId, inputData) => {
  return calculateAndSave(dealId, inputData);
};

const runSensitivity = async (dealId, params) => {
  const fin = await getFinancials(dealId);
  const assetClass = fin.asset_class || 'residential_apartments';
  const baseParams = {
    assetClass,
    plotAreaSqft: params.plotAreaSqft || fin.plot_area_sqft,
    fsi: params.fsi || fin.fsi,
    loadingFactor: params.loadingFactor || fin.loading_factor,
    constructionCostPerSqft: params.constructionCostPerSqft || fin.construction_cost_per_sqft,
    sellingRatePerSqft: params.sellingRatePerSqft || fin.selling_rate_per_sqft,
    landCostCr: params.landCostCr || fin.land_cost_cr || 0,
    approvalCostCr: params.approvalCostCr || fin.approval_cost_cr || 0,
    marketingCostPct: params.marketingCostPct || fin.marketing_cost_pct || 3.5,
    financeCostPct: params.financeCostPct || fin.finance_cost_pct || 12,
    projectDurationMonths: params.projectDurationMonths || fin.project_duration_months || 36,
    discountRatePct: params.discountRatePct || fin.discount_rate_pct || 12,
    developerMarginPct: params.developerMarginPct || fin.developer_margin_pct || 20,
    ...(fin.model_params?.inputs || {}),
    ...params,
  };
  const result = calculateFullFinancials(baseParams);
  const matrix = result.sensitivityMatrix;
  await query(
    'UPDATE financials SET sensitivity_matrix = $1, updated_at = NOW() WHERE deal_id = $2',
    [JSON.stringify(matrix), dealId]
  );
  return matrix;
};

module.exports = { calculateAndSave, getFinancials, updateFinancials, runSensitivity };
