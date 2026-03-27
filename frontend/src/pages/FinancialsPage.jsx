import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Calculator,
  TrendingUp,
  DollarSign,
  BarChart3,
  Grid3X3,
  IndianRupee,
  Percent,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';
import { useFinancials, useCalculateFinancials } from '../hooks/useFinancials';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import PageHeader from '../components/common/PageHeader';
import StatCard from '../components/common/StatCard';
import { formatCrores, formatPct, formatINR, formatArea } from '../utils/format';

const DEFAULT_INPUTS = {
  plotAreaSqft: '',
  fsi: '',
  loadingFactor: '0.65',
  constructionCostPerSqft: '',
  sellingRatePerSqft: '',
  landCostCr: '',
  approvalCostCr: '',
  marketingCostPct: '3.5',
  financeCostPct: '12',
  developerMarginPct: '20',
  projectDurationMonths: '36',
  discountRatePct: '12',
};

const INPUT_FIELDS = [
  { name: 'plotAreaSqft', label: 'Plot Area (sqft)', type: 'number', placeholder: 'e.g. 50000' },
  { name: 'fsi', label: 'FSI', type: 'number', step: '0.1', placeholder: 'e.g. 2.5' },
  { name: 'loadingFactor', label: 'Loading Factor (0-1)', type: 'number', step: '0.01', placeholder: 'e.g. 0.65' },
  { name: 'constructionCostPerSqft', label: 'Construction Cost (per sqft)', type: 'number', placeholder: 'e.g. 2500' },
  { name: 'sellingRatePerSqft', label: 'Selling Rate (per sqft)', type: 'number', placeholder: 'e.g. 8000' },
  { name: 'landCostCr', label: 'Land Cost (Cr)', type: 'number', step: '0.01', placeholder: 'e.g. 25' },
  { name: 'approvalCostCr', label: 'Approval Cost (Cr)', type: 'number', step: '0.01', placeholder: 'e.g. 2' },
  { name: 'marketingCostPct', label: 'Marketing (%)', type: 'number', step: '0.1', placeholder: 'e.g. 3.5' },
  { name: 'financeCostPct', label: 'Finance (%)', type: 'number', step: '0.1', placeholder: 'e.g. 12' },
  { name: 'developerMarginPct', label: 'Developer Margin (%)', type: 'number', step: '0.1', placeholder: 'e.g. 15' },
  { name: 'projectDurationMonths', label: 'Project Duration (months)', type: 'number', placeholder: 'e.g. 36' },
  { name: 'discountRatePct', label: 'Discount Rate (%)', type: 'number', step: '0.1', placeholder: 'e.g. 15' },
];

const toNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const buildInitialInputs = (financials) => {
  if (!financials) {
    return DEFAULT_INPUTS;
  }

  return {
    plotAreaSqft: financials.plot_area_sqft ?? '',
    fsi: financials.fsi ?? '',
    loadingFactor: financials.loading_factor ?? '0.65',
    constructionCostPerSqft: financials.construction_cost_per_sqft ?? '',
    sellingRatePerSqft: financials.selling_rate_per_sqft ?? '',
    landCostCr: financials.land_cost_cr ?? '',
    approvalCostCr: financials.approval_cost_cr ?? '',
    marketingCostPct: financials.marketing_cost_pct ?? '3.5',
    financeCostPct: financials.finance_cost_pct ?? '12',
    developerMarginPct: financials.developer_margin_pct ?? '20',
    projectDurationMonths: financials.project_duration_months ?? '36',
    discountRatePct: financials.discount_rate_pct ?? '12',
  };
};

const normalizeFinancials = (financials) => {
  if (!financials) return null;

  const cashFlowSeries = financials.cash_flows?.quarterly || [];
  const sensitivityMatrix = financials.sensitivity_matrix || {};
  const sellingRates = sensitivityMatrix.sellingRates || sensitivityMatrix.selling_rates || [];
  const constructionCosts = sensitivityMatrix.constructionCosts || sensitivityMatrix.construction_costs || [];
  const grid = sensitivityMatrix.irrGrid || sensitivityMatrix.irr_grid || [];

  return {
    metrics: {
      irr: toNumber(financials.irr_pct),
      npv: toNumber(financials.npv_cr),
      equityMultiple: toNumber(financials.equity_multiple),
      rlv: toNumber(financials.residual_land_value_cr),
    },
    areas: {
      grossBuiltUp: toNumber(financials.gross_area_sqft),
      saleable: toNumber(financials.saleable_area_sqft),
      carpet: toNumber(financials.carpet_area_sqft),
      superBuiltUp: toNumber(financials.super_builtup_area_sqft),
    },
    costs: {
      land: toNumber(financials.land_cost_cr),
      construction: toNumber(financials.total_construction_cost_cr),
      gst: toNumber(financials.gst_cost_cr),
      stampDuty: toNumber(financials.stamp_duty_cr),
      approval: toNumber(financials.approval_cost_cr),
      marketing: toNumber(financials.marketing_cost_cr),
      finance: toNumber(financials.finance_cost_cr),
      total: toNumber(financials.total_cost_cr),
    },
    revenue: {
      revenue: toNumber(financials.total_revenue_cr),
      profit: toNumber(financials.gross_profit_cr),
      margin: toNumber(financials.gross_margin_pct),
    },
    cashFlows: cashFlowSeries.map((cashFlow, index) => ({
      quarter: cashFlow.quarter ?? index,
      value: toNumber(cashFlow.net) ?? 0,
    })),
    sensitivity: {
      sellingRates,
      constructionCosts,
      grid,
    },
  };
};

const isNotFoundError = (error) => error?.response?.status === 404;

function InputForm({ initialValues, onSubmit, isLoading }) {
  const [inputs, setInputs] = useState(() => buildInitialInputs(initialValues));

  useEffect(() => {
    setInputs(buildInitialInputs(initialValues));
  }, [initialValues]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setInputs((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {};

    for (const [key, value] of Object.entries(inputs)) {
      data[key] = value === '' ? undefined : Number(value);
    }

    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Calculator size={20} className="text-primary-600" />
        DCF Underwriting Inputs
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {INPUT_FIELDS.map((field) => (
          <div key={field.name}>
            <label htmlFor={field.name} className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
            </label>
            <input
              id={field.name}
              name={field.name}
              type={field.type}
              step={field.step}
              placeholder={field.placeholder}
              value={inputs[field.name]}
              onChange={handleChange}
              className="input"
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

function AreaBreakdown({ areas }) {
  if (!areas) return null;

  const rows = [
    { label: 'Gross Built-Up Area', value: formatArea(areas.grossBuiltUp) },
    { label: 'Saleable Area', value: formatArea(areas.saleable) },
    { label: 'Carpet Area', value: formatArea(areas.carpet) },
    { label: 'Super Built-Up Area', value: formatArea(areas.superBuiltUp) },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Area Breakdown</h3>
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between text-sm">
            <span className="text-gray-500">{row.label}</span>
            <span className="font-medium text-gray-900">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CostBreakdown({ costs }) {
  if (!costs) return null;

  const rows = [
    { label: 'Land Cost', value: formatCrores(costs.land) },
    { label: 'Construction Cost', value: formatCrores(costs.construction) },
    { label: 'GST', value: formatCrores(costs.gst) },
    { label: 'Stamp Duty', value: formatCrores(costs.stampDuty) },
    { label: 'Approval Cost', value: formatCrores(costs.approval) },
    { label: 'Marketing Cost', value: formatCrores(costs.marketing) },
    { label: 'Finance Cost', value: formatCrores(costs.finance) },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Cost Breakdown</h3>
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between text-sm">
            <span className="text-gray-500">{row.label}</span>
            <span className="font-medium text-gray-900">{row.value}</span>
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

function RevenueProfit({ revenue }) {
  if (!revenue) return null;

  const rows = [
    { label: 'Revenue', value: formatCrores(revenue.revenue) },
    { label: 'Profit', value: formatCrores(revenue.profit) },
    { label: 'Margin', value: formatPct(revenue.margin) },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Revenue & Profit</h3>
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between text-sm">
            <span className="text-gray-500">{row.label}</span>
            <span className="font-medium text-gray-900">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CashFlowChart({ cashFlows }) {
  if (!cashFlows || cashFlows.length === 0) return null;

  const data = cashFlows.map((cashFlow) => ({
    name: `Q${cashFlow.quarter}`,
    value: cashFlow.value,
  }));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <BarChart3 size={16} className="text-primary-600" />
        Quarterly Cash Flows
      </h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `${value.toFixed(0)} Cr`} />
            <Tooltip
              formatter={(value) => [formatCrores(value), 'Cash Flow']}
              contentStyle={{ borderRadius: '8px', fontSize: '13px' }}
            />
            <ReferenceLine y={0} stroke="#94a3b8" />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.value >= 0 ? '#22c55e' : '#ef4444'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function getIRRColor(irr) {
  if (irr == null) return 'bg-gray-50 text-gray-400';
  if (irr >= 25) return 'bg-green-100 text-green-800';
  if (irr >= 18) return 'bg-green-50 text-green-700';
  if (irr >= 12) return 'bg-yellow-50 text-yellow-700';
  if (irr >= 5) return 'bg-orange-50 text-orange-700';
  return 'bg-red-100 text-red-800';
}

function SensitivityTable({ sensitivity }) {
  if (!sensitivity || !sensitivity.grid?.length) return null;

  const { sellingRates, constructionCosts, grid } = sensitivity;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Grid3X3 size={16} className="text-primary-600" />
        Sensitivity Analysis (IRR %)
      </h3>
      <p className="text-xs text-gray-500 mb-3">
        Rows: Construction Cost/sqft | Columns: Selling Rate/sqft
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="px-2 py-1.5 text-left font-medium text-gray-500 border-b">Cost \ Rate</th>
              {sellingRates.map((rate) => (
                <th key={rate} className="px-2 py-1.5 text-center font-medium text-gray-500 border-b">
                  {formatINR(rate, 0)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {constructionCosts.map((cost, rowIndex) => (
              <tr key={cost}>
                <td className="px-2 py-1.5 font-medium text-gray-700 border-b">{formatINR(cost, 0)}</td>
                {grid[rowIndex]?.map((irr, columnIndex) => (
                  <td
                    key={columnIndex}
                    className={`px-2 py-1.5 text-center font-medium border-b ${getIRRColor(irr)}`}
                  >
                    {irr != null ? formatPct(irr) : '-'}
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

export default function FinancialsPage() {
  const { dealId } = useParams();
  const { data: financials, isLoading, error } = useFinancials(dealId);
  const calculateMutation = useCalculateFinancials();

  const normalizedFinancials = useMemo(
    () => normalizeFinancials(financials),
    [financials]
  );

  const handleCalculate = (data) => {
    calculateMutation.mutate({ dealId, data });
  };

  if (isLoading) {
    return (
      <div className="py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const hasResults = !!normalizedFinancials;
  const canShowCreateForm = !hasResults;
  const shouldShowErrorState = error && !isNotFoundError(error);

  return (
    <div className="space-y-6">
      <PageHeader
        title="DCF Underwriting"
        description="Financial analysis and sensitivity modeling"
        actions={
          <Link
            to={`/deals/${dealId}`}
            className="btn btn-secondary flex items-center gap-1.5"
          >
            <ArrowLeft size={16} />
            Back to Deal
          </Link>
        }
      />

      {canShowCreateForm && (
        <InputForm
          initialValues={financials}
          onSubmit={handleCalculate}
          isLoading={calculateMutation.isPending}
        />
      )}

      {hasResults && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="IRR"
              value={formatPct(normalizedFinancials.metrics.irr)}
              subtitle="Internal Rate of Return"
              icon={TrendingUp}
            />
            <StatCard
              title="NPV"
              value={formatCrores(normalizedFinancials.metrics.npv)}
              subtitle="Net Present Value"
              icon={IndianRupee}
            />
            <StatCard
              title="Equity Multiple"
              value={
                normalizedFinancials.metrics.equityMultiple != null
                  ? `${normalizedFinancials.metrics.equityMultiple.toFixed(2)}x`
                  : '-'
              }
              subtitle="Return on Equity"
              icon={DollarSign}
            />
            <StatCard
              title="RLV"
              value={formatCrores(normalizedFinancials.metrics.rlv)}
              subtitle="Residual Land Value"
              icon={Percent}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <AreaBreakdown areas={normalizedFinancials.areas} />
            <CostBreakdown costs={normalizedFinancials.costs} />
            <RevenueProfit revenue={normalizedFinancials.revenue} />
          </div>

          <CashFlowChart cashFlows={normalizedFinancials.cashFlows} />

          <SensitivityTable sensitivity={normalizedFinancials.sensitivity} />

          <div className="border-t pt-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Recalculate with New Inputs</h3>
            <InputForm
              initialValues={financials}
              onSubmit={handleCalculate}
              isLoading={calculateMutation.isPending}
            />
          </div>
        </>
      )}

      {shouldShowErrorState && !hasResults && (
        <EmptyState
          title="Could not load financials"
          description={error.message || 'Something went wrong. Please try again.'}
          icon={Calculator}
        />
      )}
    </div>
  );
}
