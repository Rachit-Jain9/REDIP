import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Calculator, TrendingUp, DollarSign, BarChart3,
  Grid3X3, IndianRupee, Percent, Building2, ChevronDown,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts';
import { useFinancials, useCalculateFinancials } from '../hooks/useFinancials';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import PageHeader from '../components/common/PageHeader';
import StatCard from '../components/common/StatCard';
import { formatCrores, formatPct, formatINR, formatArea } from '../utils/format';

// ─── ASSET CLASS CONFIG ────────────────────────────────────────────────────

const ASSET_CLASSES = [
  { value: 'residential_apartments', label: 'Residential Apartments' },
  { value: 'plotted_development',    label: 'Plotted Development' },
  { value: 'commercial_office',      label: 'Commercial Office' },
  { value: 'retail',                 label: 'Retail' },
  { value: 'industrial',             label: 'Industrial' },
];

const INCOME_CLASSES = new Set(['commercial_office', 'retail', 'industrial']);

// Per-class input field definitions
const FIELD_DEFS = {
  residential_apartments: [
    { name: 'plotAreaSqft',           label: 'Plot Area (sqft)',               type: 'number', placeholder: '50000' },
    { name: 'fsi',                    label: 'FSI / FAR',                      type: 'number', step: '0.1',  placeholder: '2.5' },
    { name: 'loadingFactor',          label: 'Loading Factor (saleable %)',     type: 'number', step: '0.01', placeholder: '0.65', hint: 'Saleable / Gross Built-Up (typically 0.60–0.72)' },
    { name: 'constructionCostPerSqft',label: 'Construction Cost (₹/sqft)',      type: 'number', placeholder: '4500' },
    { name: 'sellingRatePerSqft',     label: 'Selling Rate (₹/sqft)',           type: 'number', placeholder: '8000' },
    { name: 'landCostCr',             label: 'Land Cost (₹ Cr)',                type: 'number', step: '0.01', placeholder: '25' },
    { name: 'approvalCostCr',         label: 'Approval Cost (₹ Cr)',            type: 'number', step: '0.01', placeholder: '2' },
    { name: 'marketingCostPct',       label: 'Marketing Cost (% of revenue)',   type: 'number', step: '0.1',  placeholder: '5' },
    { name: 'financeCostPct',         label: 'Finance Cost (% pa)',             type: 'number', step: '0.1',  placeholder: '12' },
    { name: 'developerMarginPct',     label: 'Developer Margin (%)',            type: 'number', step: '0.1',  placeholder: '20' },
    { name: 'pricingEscalationPct',   label: 'Pricing Escalation (% pa)',       type: 'number', step: '0.1',  placeholder: '0', hint: 'Expected annual price appreciation during project' },
    { name: 'projectDurationMonths',  label: 'Project Duration (months)',       type: 'number', placeholder: '36' },
    { name: 'discountRatePct',        label: 'Discount Rate (%)',               type: 'number', step: '0.1',  placeholder: '14' },
  ],
  plotted_development: [
    { name: 'totalLandSqft',          label: 'Total Land Area (sqft)',          type: 'number', placeholder: '435600', hint: '1 acre = 43,560 sqft' },
    { name: 'saleableLandPct',        label: 'Saleable Land (%)',               type: 'number', step: '1',    placeholder: '55', hint: 'After roads, parks & amenities (typically 50–60%)' },
    { name: 'avgPlotSizeSqft',        label: 'Avg Plot Size (sqft)',            type: 'number', placeholder: '1200', hint: '1200 sqft = ~133 sqyd' },
    { name: 'sellingRatePerSqyd',     label: 'Selling Rate (₹/sqyd)',           type: 'number', placeholder: '12000' },
    { name: 'landCostCr',             label: 'Land Cost (₹ Cr)',                type: 'number', step: '0.01', placeholder: '20' },
    { name: 'devCostPerSqft',         label: 'Development Cost (₹/sqft land)', type: 'number', placeholder: '250', hint: 'Roads, utilities, landscaping on total land area' },
    { name: 'approvalCostCr',         label: 'Approval Cost (₹ Cr)',            type: 'number', step: '0.01', placeholder: '1.5' },
    { name: 'marketingCostPct',       label: 'Marketing Cost (% of revenue)',   type: 'number', step: '0.1',  placeholder: '4' },
    { name: 'financeCostPct',         label: 'Finance Cost (% pa)',             type: 'number', step: '0.1',  placeholder: '12' },
    { name: 'projectDurationMonths',  label: 'Project Duration (months)',       type: 'number', placeholder: '24' },
    { name: 'discountRatePct',        label: 'Discount Rate (%)',               type: 'number', step: '0.1',  placeholder: '14' },
  ],
  commercial_office: [
    { name: 'leasableAreaSqft',       label: 'Leasable Area (sqft)',            type: 'number', placeholder: '100000' },
    { name: 'constructionCostPerSqft',label: 'Construction Cost (₹/sqft)',      type: 'number', placeholder: '6000', hint: 'Grade A office: ₹5,000–8,000/sqft' },
    { name: 'landCostCr',             label: 'Land Cost (₹ Cr)',                type: 'number', step: '0.01', placeholder: '40' },
    { name: 'approvalCostCr',         label: 'Approval Cost (₹ Cr)',            type: 'number', step: '0.01', placeholder: '3' },
    { name: 'baseRentPerSqftMonth',   label: 'Base Rent (₹/sqft/month)',        type: 'number', placeholder: '85', hint: 'Bengaluru Grade A: ₹70–120/sqft/month' },
    { name: 'rentEscalationPct',      label: 'Rent Escalation (% pa)',          type: 'number', step: '0.5',  placeholder: '5' },
    { name: 'vacancyPct',             label: 'Vacancy (%)',                     type: 'number', step: '1',    placeholder: '10' },
    { name: 'opexPct',                label: 'Operating Expenses (% of EGR)',   type: 'number', step: '1',    placeholder: '20', hint: 'Property management, maintenance, insurance' },
    { name: 'tiPerSqft',              label: 'Tenant Improvements (₹/sqft)',    type: 'number', placeholder: '500', hint: 'Fit-out contribution to tenant' },
    { name: 'lcMonths',               label: 'Leasing Commissions (months)',    type: 'number', step: '0.5',  placeholder: '2', hint: 'Months of base rent paid to broker' },
    { name: 'entryCapRate',           label: 'Entry Cap Rate (%)',              type: 'number', step: '0.25', placeholder: '7', hint: 'Prime Bengaluru office: 6.5–8%' },
    { name: 'exitCapRate',            label: 'Exit Cap Rate (%)',               type: 'number', step: '0.25', placeholder: '7.5', hint: 'Typically 25–50 bps wider than entry' },
    { name: 'holdPeriodYears',        label: 'Hold Period (years)',             type: 'number', step: '1',    placeholder: '5' },
    { name: 'projectDurationMonths',  label: 'Construction Duration (months)',  type: 'number', placeholder: '36' },
    { name: 'debtCoverage',           label: 'Debt Coverage (LTV, 0–1)',        type: 'number', step: '0.05', placeholder: '0.65' },
    { name: 'interestRatePct',        label: 'Interest Rate (% pa)',            type: 'number', step: '0.25', placeholder: '10' },
    { name: 'discountRatePct',        label: 'Discount Rate (%)',               type: 'number', step: '0.1',  placeholder: '14' },
  ],
  retail: [
    { name: 'leasableAreaSqft',       label: 'Leasable Area (sqft)',            type: 'number', placeholder: '80000' },
    { name: 'constructionCostPerSqft',label: 'Construction Cost (₹/sqft)',      type: 'number', placeholder: '5500', hint: 'Retail mall: ₹4,500–7,000/sqft' },
    { name: 'landCostCr',             label: 'Land Cost (₹ Cr)',                type: 'number', step: '0.01', placeholder: '30' },
    { name: 'approvalCostCr',         label: 'Approval Cost (₹ Cr)',            type: 'number', step: '0.01', placeholder: '2.5' },
    { name: 'baseRentPerSqftMonth',   label: 'Inline Tenant Rent (₹/sqft/mo)', type: 'number', placeholder: '120', hint: 'Non-anchor inline stores' },
    { name: 'anchorPct',              label: 'Anchor Tenant Area (%)',          type: 'number', step: '5',    placeholder: '40', hint: 'Anchor tenants get lower rent (typically 30–50% of area)' },
    { name: 'anchorRentDiscount',     label: 'Anchor Rent Discount (%)',        type: 'number', step: '5',    placeholder: '20', hint: 'Discount applied to anchor tenant rent vs inline rate' },
    { name: 'rentEscalationPct',      label: 'Rent Escalation (% pa)',          type: 'number', step: '0.5',  placeholder: '5' },
    { name: 'vacancyPct',             label: 'Vacancy (%)',                     type: 'number', step: '1',    placeholder: '12' },
    { name: 'opexPct',                label: 'Operating Expenses (% of EGR)',   type: 'number', step: '1',    placeholder: '22' },
    { name: 'tiPerSqft',              label: 'Tenant Improvements (₹/sqft)',    type: 'number', placeholder: '800' },
    { name: 'lcMonths',               label: 'Leasing Commissions (months)',    type: 'number', step: '0.5',  placeholder: '2' },
    { name: 'exitCapRate',            label: 'Exit Cap Rate (%)',               type: 'number', step: '0.25', placeholder: '8', hint: 'Retail: 7.5–9%' },
    { name: 'holdPeriodYears',        label: 'Hold Period (years)',             type: 'number', step: '1',    placeholder: '7' },
    { name: 'projectDurationMonths',  label: 'Construction Duration (months)',  type: 'number', placeholder: '36' },
    { name: 'debtCoverage',           label: 'Debt Coverage (LTV)',             type: 'number', step: '0.05', placeholder: '0.60' },
    { name: 'interestRatePct',        label: 'Interest Rate (% pa)',            type: 'number', step: '0.25', placeholder: '10.5' },
    { name: 'discountRatePct',        label: 'Discount Rate (%)',               type: 'number', step: '0.1',  placeholder: '15' },
  ],
  industrial: [
    { name: 'leasableAreaSqft',       label: 'Industrial Floor Area (sqft)',    type: 'number', placeholder: '200000' },
    { name: 'constructionCostPerSqft',label: 'Construction Cost (₹/sqft)',      type: 'number', placeholder: '1800', hint: 'Industrial shed/warehouse: ₹1,200–2,500/sqft' },
    { name: 'landCostCr',             label: 'Land Cost (₹ Cr)',                type: 'number', step: '0.01', placeholder: '25' },
    { name: 'approvalCostCr',         label: 'Approval Cost (₹ Cr)',            type: 'number', step: '0.01', placeholder: '2' },
    { name: 'baseRentPerSqftMonth',   label: 'Base Rent (₹/sqft/month)',        type: 'number', placeholder: '28', hint: 'Bengaluru industrial: ₹18–40/sqft/month' },
    { name: 'rentEscalationPct',      label: 'Rent Escalation (% pa)',          type: 'number', step: '0.5',  placeholder: '4', hint: 'Industrial leases: typically 3-5% pa or 15% every 3 years' },
    { name: 'vacancyPct',             label: 'Vacancy (%)',                     type: 'number', step: '1',    placeholder: '7', hint: 'Industrial: typically 5–10% in strong markets' },
    { name: 'opexPct',                label: 'Operating Expenses (% of EGR)',   type: 'number', step: '1',    placeholder: '15', hint: 'Industrial is lower opex than office' },
    { name: 'exitCapRate',            label: 'Exit Cap Rate (%)',               type: 'number', step: '0.25', placeholder: '8.5', hint: 'Warehousing/logistics: 7.5–9.5%' },
    { name: 'holdPeriodYears',        label: 'Hold Period (years)',             type: 'number', step: '1',    placeholder: '7' },
    { name: 'projectDurationMonths',  label: 'Construction Duration (months)',  type: 'number', placeholder: '18' },
    { name: 'debtCoverage',           label: 'Debt Coverage (LTV)',             type: 'number', step: '0.05', placeholder: '0.65' },
    { name: 'interestRatePct',        label: 'Interest Rate (% pa)',            type: 'number', step: '0.25', placeholder: '10' },
    { name: 'discountRatePct',        label: 'Discount Rate (%)',               type: 'number', step: '0.1',  placeholder: '13' },
  ],
};

const DEFAULT_VALUES = {
  residential_apartments: {
    loadingFactor: '0.65', marketingCostPct: '5', financeCostPct: '12',
    developerMarginPct: '20', pricingEscalationPct: '0',
    projectDurationMonths: '36', discountRatePct: '14',
  },
  plotted_development: {
    saleableLandPct: '55', avgPlotSizeSqft: '1200', devCostPerSqft: '250',
    marketingCostPct: '4', financeCostPct: '12',
    projectDurationMonths: '24', discountRatePct: '14',
  },
  commercial_office: {
    rentEscalationPct: '5', vacancyPct: '10', opexPct: '20',
    tiPerSqft: '500', lcMonths: '2',
    entryCapRate: '7', exitCapRate: '7.5', holdPeriodYears: '5',
    projectDurationMonths: '36', debtCoverage: '0.65', interestRatePct: '10', discountRatePct: '14',
  },
  retail: {
    anchorPct: '40', anchorRentDiscount: '20',
    rentEscalationPct: '5', vacancyPct: '12', opexPct: '22',
    tiPerSqft: '800', lcMonths: '2',
    exitCapRate: '8', holdPeriodYears: '7',
    projectDurationMonths: '36', debtCoverage: '0.60', interestRatePct: '10.5', discountRatePct: '15',
  },
  industrial: {
    rentEscalationPct: '4', vacancyPct: '7', opexPct: '15',
    exitCapRate: '8.5', holdPeriodYears: '7',
    projectDurationMonths: '18', debtCoverage: '0.65', interestRatePct: '10', discountRatePct: '13',
  },
};

// ─── HELPERS ───────────────────────────────────────────────────────────────

const toNumber = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
};

function buildInitialInputs(financials, targetClass) {
  const assetClass = targetClass || financials?.asset_class || 'residential_apartments';
  const defaults = DEFAULT_VALUES[assetClass] || {};
  const stored = financials?.model_params?.inputs || {};

  if (assetClass === 'residential_apartments' && !targetClass && financials) {
    return {
      plotAreaSqft: financials.plot_area_sqft ?? '',
      fsi: financials.fsi ?? '',
      loadingFactor: financials.loading_factor ?? defaults.loadingFactor,
      constructionCostPerSqft: financials.construction_cost_per_sqft ?? '',
      sellingRatePerSqft: financials.selling_rate_per_sqft ?? '',
      landCostCr: financials.land_cost_cr ?? '',
      approvalCostCr: financials.approval_cost_cr ?? '',
      marketingCostPct: financials.marketing_cost_pct ?? defaults.marketingCostPct,
      financeCostPct: financials.finance_cost_pct ?? defaults.financeCostPct,
      developerMarginPct: financials.developer_margin_pct ?? defaults.developerMarginPct,
      pricingEscalationPct: stored.pricingEscalationPct ?? defaults.pricingEscalationPct,
      projectDurationMonths: financials.project_duration_months ?? defaults.projectDurationMonths,
      discountRatePct: financials.discount_rate_pct ?? defaults.discountRatePct,
    };
  }

  // For any class: merge stored inputs with defaults, blank out anything not set
  const fields = FIELD_DEFS[assetClass] || [];
  const out = {};
  for (const f of fields) {
    out[f.name] = stored[f.name] ?? defaults[f.name] ?? '';
  }
  return out;
}

function normalizeFinancials(financials) {
  if (!financials) return null;
  const mp = financials.model_params || {};
  const kpis = mp.kpis || {};
  const areas = mp.areas || {};
  const costs = mp.costs || {};
  const revenue = mp.revenue || {};
  const assetClass = financials.asset_class || 'residential_apartments';

  const cashFlowSeries = financials.cash_flows?.quarterly || [];
  const sm = financials.sensitivity_matrix || {};

  return {
    assetClass,
    kpis: {
      irr: toNumber(kpis.irr ?? financials.irr_pct),
      npv: toNumber(kpis.npv ?? financials.npv_cr),
      equityMultiple: toNumber(kpis.equityMultiple ?? financials.equity_multiple),
      rlv: toNumber(kpis.rlv ?? financials.residual_land_value_cr),
      grossMarginPct: toNumber(kpis.grossMarginPct ?? financials.gross_margin_pct),
      noi: toNumber(kpis.noi ?? financials.noi_cr),
      yieldOnCost: toNumber(kpis.yieldOnCost ?? financials.yield_on_cost_pct),
      dscr: toNumber(kpis.dscr ?? financials.dscr),
      exitValue: toNumber(kpis.exitValue ?? financials.exit_value_cr),
      entryValue: toNumber(kpis.entryValue ?? financials.entry_value_cr),
    },
    areas: {
      grossBuiltUp: toNumber(areas.grossBuiltUp ?? financials.gross_area_sqft),
      saleable: toNumber(areas.saleable ?? financials.saleable_area_sqft),
      carpet: toNumber(areas.carpet ?? financials.carpet_area_sqft),
      superBuiltUp: toNumber(areas.superBuiltUp ?? financials.super_builtup_area_sqft),
      leasable: toNumber(areas.leasable),
      totalPlots: areas.totalPlots,
      avgPlotSizeSqft: toNumber(areas.avgPlotSizeSqft),
    },
    costs: {
      land: toNumber(costs.land ?? financials.land_cost_cr),
      construction: toNumber(costs.construction ?? financials.total_construction_cost_cr),
      gst: toNumber(costs.gst ?? financials.gst_cost_cr),
      stampDuty: toNumber(costs.stampDuty ?? financials.stamp_duty_cr),
      approval: toNumber(costs.approval ?? financials.approval_cost_cr),
      marketing: toNumber(costs.marketing ?? financials.marketing_cost_cr),
      finance: toNumber(costs.finance ?? financials.finance_cost_cr),
      tenantImprovements: toNumber(costs.tenantImprovements),
      leasingCommissions: toNumber(costs.leasingCommissions),
      total: toNumber(costs.total ?? financials.total_cost_cr),
    },
    revenue: {
      totalRevenue: toNumber(revenue.totalRevenueCr ?? financials.total_revenue_cr),
      profit: toNumber(revenue.grossProfitCr ?? financials.gross_profit_cr),
      margin: toNumber(revenue.grossMarginPct ?? financials.gross_margin_pct),
      annualNOI: toNumber(revenue.annualNOI ?? financials.noi_cr),
      stabilizedNOI: toNumber(revenue.stabilizedNOI ?? financials.stabilized_noi_cr),
      exitValue: toNumber(revenue.exitValue ?? financials.exit_value_cr),
    },
    cashFlows: cashFlowSeries.map((cf, i) => ({ quarter: cf.quarter ?? i, value: toNumber(cf.net) ?? 0 })),
    sensitivity: {
      sellingRates: sm.sellingRates || [],
      constructionCosts: sm.constructionCosts || [],
      grid: sm.irrGrid || [],
      axis: sm.axis || ['Constr. Cost', 'Selling Rate'],
    },
  };
}

// ─── SUB-COMPONENTS ────────────────────────────────────────────────────────

function InputForm({ initialValues, assetClass, onSubmit, isLoading }) {
  const [inputs, setInputs] = useState(() => buildInitialInputs(null, assetClass));
  const [hintOpen, setHintOpen] = useState(null);

  useEffect(() => {
    if (initialValues) setInputs(buildInitialInputs(initialValues, assetClass));
    else setInputs(buildInitialInputs(null, assetClass));
  }, [initialValues, assetClass]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setInputs((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { assetClass };
    for (const [k, v] of Object.entries(inputs)) {
      data[k] = v === '' ? undefined : Number(v);
    }
    onSubmit(data);
  };

  const fields = FIELD_DEFS[assetClass] || [];

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Calculator size={18} className="text-primary-600" />
        Model Inputs
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {fields.map((field) => (
          <div key={field.name}>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor={field.name} className="text-sm font-medium text-gray-700">
                {field.label}
              </label>
              {field.hint && (
                <button
                  type="button"
                  onClick={() => setHintOpen(hintOpen === field.name ? null : field.name)}
                  className="text-xs text-gray-400 hover:text-primary-600"
                >
                  ?
                </button>
              )}
            </div>
            {hintOpen === field.name && field.hint && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 mb-1">
                {field.hint}
              </p>
            )}
            <input
              id={field.name}
              name={field.name}
              type={field.type}
              step={field.step}
              placeholder={field.placeholder}
              value={inputs[field.name] ?? ''}
              onChange={handleChange}
              className="input w-full"
            />
          </div>
        ))}
      </div>
      <div className="mt-6 flex justify-end">
        <button type="submit" disabled={isLoading} className="btn btn-primary">
          {isLoading ? 'Calculating...' : 'Calculate'}
        </button>
      </div>
    </form>
  );
}

function KPICards({ kpis, assetClass }) {
  const isIncome = INCOME_CLASSES.has(assetClass);

  if (isIncome) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Stabilized NOI" value={formatCrores(kpis.noi)} subtitle="Net Operating Income / yr" icon={IndianRupee} />
        <StatCard title="Yield on Cost" value={kpis.yieldOnCost != null ? `${kpis.yieldOnCost.toFixed(2)}%` : '-'} subtitle="NOI / Total Dev. Cost" icon={Percent} />
        <StatCard title="IRR" value={formatPct(kpis.irr)} subtitle="Unlevered, through exit" icon={TrendingUp} />
        <StatCard title="Exit Value" value={formatCrores(kpis.exitValue)} subtitle="At exit cap rate" icon={DollarSign} />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard title="IRR" value={formatPct(kpis.irr)} subtitle="Internal Rate of Return" icon={TrendingUp} />
      <StatCard title="NPV" value={formatCrores(kpis.npv)} subtitle="Net Present Value" icon={IndianRupee} />
      <StatCard
        title={assetClass === 'plotted_development' ? 'Equity Multiple' : 'Equity Multiple'}
        value={kpis.equityMultiple != null ? `${kpis.equityMultiple.toFixed(2)}x` : '-'}
        subtitle="Return on equity invested"
        icon={DollarSign}
      />
      <StatCard
        title={assetClass === 'plotted_development' ? 'RLV' : 'RLV'}
        value={formatCrores(kpis.rlv)}
        subtitle="Residual Land Value"
        icon={Percent}
      />
    </div>
  );
}

function AreaBreakdown({ areas, assetClass }) {
  const rows = [];
  if (assetClass === 'plotted_development') {
    rows.push({ label: 'Total Land Area', value: formatArea(areas.grossBuiltUp) });
    rows.push({ label: 'Saleable Land', value: formatArea(areas.saleable) });
    if (areas.totalPlots) rows.push({ label: 'Total Plots', value: areas.totalPlots.toLocaleString('en-IN') });
    if (areas.avgPlotSizeSqft) rows.push({ label: 'Avg Plot Size', value: formatArea(areas.avgPlotSizeSqft) });
  } else if (INCOME_CLASSES.has(assetClass)) {
    rows.push({ label: 'Leasable Area', value: formatArea(areas.leasable) });
    rows.push({ label: 'Gross Built-Up (est.)', value: formatArea(areas.grossBuiltUp) });
  } else {
    rows.push({ label: 'Gross Built-Up Area', value: formatArea(areas.grossBuiltUp) });
    rows.push({ label: 'Saleable Area', value: formatArea(areas.saleable) });
    rows.push({ label: 'Carpet Area', value: formatArea(areas.carpet) });
    rows.push({ label: 'Super Built-Up Area', value: formatArea(areas.superBuiltUp) });
  }
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Area Breakdown</h3>
      <div className="space-y-2">
        {rows.filter((r) => r.value && r.value !== '-').map((row) => (
          <div key={row.label} className="flex justify-between text-sm">
            <span className="text-gray-500">{row.label}</span>
            <span className="font-medium text-gray-900">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CostBreakdown({ costs, assetClass }) {
  const rows = [
    { label: 'Land Cost',              value: costs.land },
    { label: assetClass === 'plotted_development' ? 'Development Cost' : 'Construction Cost', value: costs.construction },
    { label: 'GST',                    value: costs.gst },
    { label: 'Stamp Duty',             value: costs.stampDuty },
    { label: 'Approval Cost',          value: costs.approval },
    { label: 'Marketing Cost',         value: costs.marketing },
    { label: 'Finance Cost',           value: costs.finance },
    { label: 'Tenant Improvements',    value: costs.tenantImprovements },
    { label: 'Leasing Commissions',    value: costs.leasingCommissions },
  ].filter((r) => r.value != null && r.value > 0);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Cost Breakdown</h3>
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between text-sm">
            <span className="text-gray-500">{row.label}</span>
            <span className="font-medium text-gray-900">{formatCrores(row.value)}</span>
          </div>
        ))}
        <div className="border-t pt-2 flex justify-between text-sm font-semibold">
          <span className="text-gray-700">Total Cost</span>
          <span className="text-gray-900">{formatCrores(costs.total)}</span>
        </div>
      </div>
    </div>
  );
}

function RevenuePanel({ revenue, kpis, assetClass }) {
  const isIncome = INCOME_CLASSES.has(assetClass);
  const rows = isIncome
    ? [
        { label: 'Annual NOI (Stabilized)', value: formatCrores(revenue.annualNOI) },
        { label: 'Entry Value',              value: formatCrores(kpis.entryValue) },
        { label: 'Exit Value',               value: formatCrores(kpis.exitValue) },
        ...(kpis.dscr != null ? [{ label: 'DSCR', value: `${kpis.dscr.toFixed(2)}x` }] : []),
      ]
    : [
        { label: 'Revenue',  value: formatCrores(revenue.totalRevenue) },
        { label: 'Profit',   value: formatCrores(revenue.profit) },
        { label: 'Margin',   value: formatPct(revenue.margin) },
      ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">
        {isIncome ? 'Operating Summary' : 'Revenue & Profit'}
      </h3>
      <div className="space-y-2">
        {rows.filter((r) => r.value && r.value !== '-').map((row) => (
          <div key={row.label} className="flex justify-between text-sm">
            <span className="text-gray-500">{row.label}</span>
            <span className="font-medium text-gray-900">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CashFlowChart({ cashFlows, assetClass }) {
  if (!cashFlows || cashFlows.length === 0) return null;
  const isIncome = INCOME_CLASSES.has(assetClass);
  const data = cashFlows.map((cf) => ({ name: `Q${cf.quarter}`, value: cf.value }));
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <BarChart3 size={16} className="text-primary-600" />
        {isIncome ? 'Development + Operating Cash Flows (Quarterly)' : 'Quarterly Cash Flows'}
      </h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={isIncome ? 3 : 1} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v.toFixed(0)} Cr`} />
            <Tooltip formatter={(v) => [formatCrores(v), 'Cash Flow']} contentStyle={{ borderRadius: '8px', fontSize: '13px' }} />
            <ReferenceLine y={0} stroke="#94a3b8" />
            <Bar dataKey="value" radius={[3, 3, 0, 0]}>
              {data.map((entry, i) => <Cell key={i} fill={entry.value >= 0 ? '#22c55e' : '#ef4444'} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function getIRRColor(irr) {
  if (irr == null) return 'bg-gray-50 text-gray-400';
  if (irr >= 25)  return 'bg-emerald-100 text-emerald-800';
  if (irr >= 18)  return 'bg-green-50 text-green-700';
  if (irr >= 12)  return 'bg-yellow-50 text-yellow-700';
  if (irr >= 5)   return 'bg-orange-50 text-orange-700';
  return 'bg-red-100 text-red-800';
}

function SensitivityTable({ sensitivity, assetClass }) {
  if (!sensitivity?.grid?.length) return null;
  const { sellingRates, constructionCosts, grid, axis } = sensitivity;
  const isIncome = INCOME_CLASSES.has(assetClass);
  const rowLabel  = axis?.[0] || (isIncome ? 'Exit Cap Rate (%)' : 'Constr. Cost/sqft');
  const colHeader = axis?.[1] || (isIncome ? 'Base Rent/sqft/mo' : 'Selling Rate/sqft');

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-2">
        <Grid3X3 size={16} className="text-primary-600" />
        Sensitivity Analysis — IRR (%)
      </h3>
      <p className="text-xs text-gray-500 mb-3">Rows: {rowLabel} | Columns: {colHeader}</p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="px-2 py-1.5 text-left font-medium text-gray-500 border-b whitespace-nowrap">↓ {rowLabel.split(' ')[0]} \ {colHeader.split(' ')[0]} →</th>
              {sellingRates.map((r) => (
                <th key={r} className="px-2 py-1.5 text-center font-medium text-gray-500 border-b whitespace-nowrap">
                  {isIncome ? r : formatINR(r, 0)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {constructionCosts.map((cost, ri) => (
              <tr key={cost}>
                <td className="px-2 py-1.5 font-medium text-gray-700 border-b whitespace-nowrap">
                  {isIncome ? `${cost}%` : formatINR(cost, 0)}
                </td>
                {grid[ri]?.map((irr, ci) => (
                  <td key={ci} className={`px-2 py-1.5 text-center font-medium border-b ${getIRRColor(irr)}`}>
                    {irr != null ? `${irr.toFixed(1)}%` : '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ─────────────────────────────────────────────────────────────

export default function FinancialsPage() {
  const { dealId } = useParams();
  const { data: financials, isLoading, error } = useFinancials(dealId);
  const calculateMutation = useCalculateFinancials();

  const existingClass = financials?.asset_class || 'residential_apartments';
  const [selectedClass, setSelectedClass] = useState(null); // null = use stored
  const activeClass = selectedClass || existingClass;

  const normalizedFinancials = useMemo(() => normalizeFinancials(financials), [financials]);
  const hasResults = !!normalizedFinancials;

  const handleCalculate = (data) => {
    calculateMutation.mutate({ dealId, data });
  };

  const handleClassChange = (cls) => {
    setSelectedClass(cls);
  };

  if (isLoading) return <div className="py-20"><LoadingSpinner size="lg" /></div>;

  const shouldShowError = error && error?.response?.status !== 404;

  return (
    <div className="space-y-6">
      <PageHeader
        title="DCF Underwriting"
        description="Multi-asset-class financial modeling"
        actions={
          <Link to={`/deals/${dealId}`} className="btn btn-secondary flex items-center gap-1.5">
            <ArrowLeft size={16} /> Back to Deal
          </Link>
        }
      />

      {/* Asset Class Selector */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Building2 size={16} className="text-primary-600" />
            Asset Class
          </div>
          <div className="relative">
            <select
              value={activeClass}
              onChange={(e) => handleClassChange(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 border border-gray-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
            >
              {ASSET_CLASSES.map((ac) => (
                <option key={ac.value} value={ac.value}>{ac.label}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
          {hasResults && normalizedFinancials.assetClass !== activeClass && (
            <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200">
              Switching class — current results shown above are for {ASSET_CLASSES.find((a) => a.value === normalizedFinancials.assetClass)?.label}
            </span>
          )}
        </div>
      </div>

      {/* Results for existing financials */}
      {hasResults && (
        <>
          <KPICards kpis={normalizedFinancials.kpis} assetClass={normalizedFinancials.assetClass} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <AreaBreakdown areas={normalizedFinancials.areas} assetClass={normalizedFinancials.assetClass} />
            <CostBreakdown costs={normalizedFinancials.costs} assetClass={normalizedFinancials.assetClass} />
            <RevenuePanel revenue={normalizedFinancials.revenue} kpis={normalizedFinancials.kpis} assetClass={normalizedFinancials.assetClass} />
          </div>

          <CashFlowChart cashFlows={normalizedFinancials.cashFlows} assetClass={normalizedFinancials.assetClass} />
          <SensitivityTable sensitivity={normalizedFinancials.sensitivity} assetClass={normalizedFinancials.assetClass} />

          <div className="border-t pt-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Recalculate</h3>
            <InputForm
              initialValues={financials}
              assetClass={activeClass}
              onSubmit={handleCalculate}
              isLoading={calculateMutation.isPending}
            />
          </div>
        </>
      )}

      {/* First-time form */}
      {!hasResults && !shouldShowError && (
        <InputForm
          initialValues={null}
          assetClass={activeClass}
          onSubmit={handleCalculate}
          isLoading={calculateMutation.isPending}
        />
      )}

      {shouldShowError && !hasResults && (
        <EmptyState
          title="Could not load financials"
          description={error?.message || 'Something went wrong. Please try again.'}
          icon={Calculator}
        />
      )}
    </div>
  );
}
