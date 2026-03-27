import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Label,
} from 'recharts';
import {
  Briefcase,
  TrendingUp,
  IndianRupee,
  Activity,
} from 'lucide-react';

import { useDashboard } from '../hooks/useDashboard';
import StatCard from '../components/common/StatCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import PageHeader from '../components/common/PageHeader';
import Badge from '../components/common/Badge';
import {
  formatCrores,
  formatPct,
  formatRelativeTime,
  STAGE_CONFIG,
} from '../utils/format';

const PIE_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#06b6d4', '#3b82f6',
];

export default function DashboardPage() {
  const { data, isLoading, isError, error } = useDashboard();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-20 text-red-600">
        <p className="text-lg font-medium">Failed to load dashboard</p>
        <p className="text-sm text-gray-500 mt-1">{error?.message}</p>
      </div>
    );
  }

  const {
    stats = {},
    stage_distribution = [],
    recent_activities = [],
    top_deals_by_irr = [],
    cities_distribution = [],
  } = data || {};

  const totalDeals = stats.total_deals || 0;
  const activeDeals = stats.active_deals_count || 0;
  const pipelineValue = stats.total_pipeline_value_cr || 0;
  const avgIrr = stats.avg_irr_pct || 0;

  // Transform pipeline distribution for the bar chart
  const pipelineChartData = stage_distribution.map((item) => ({
    stage: STAGE_CONFIG[item.stage]?.label || item.stage,
    count: item.count,
  }));

  // Transform city distribution for the pie chart
  const cityChartData = cities_distribution.map((item) => ({
    name: item.city || item.name || 'Unknown',
    value: Number(item.deal_count ?? item.count ?? 0),
  })).filter((item) => item.value > 0);

  const totalCityDeals = cityChartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of your real estate deal pipeline"
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Deals"
          value={totalDeals}
          icon={Briefcase}
          subtitle="All deals in pipeline"
        />
        <StatCard
          title="Active Deals"
          value={activeDeals}
          icon={Activity}
          subtitle="Currently in progress"
        />
        <StatCard
          title="Pipeline Value"
          value={formatCrores(pipelineValue)}
          icon={IndianRupee}
          subtitle="Total deal value"
        />
        <StatCard
          title="Avg IRR"
          value={formatPct(avgIrr)}
          icon={TrendingUp}
          subtitle="Across active deals"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Pipeline Distribution Bar Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Pipeline Distribution</h3>
          {pipelineChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={pipelineChartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="stage"
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} name="Deals" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-400 text-center py-16">No pipeline data available</p>
          )}
        </div>

        {/* City Distribution Pie Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">City Distribution</h3>
          {cityChartData.length > 0 ? (
            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_220px] gap-4 items-center">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={cityChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={96}
                    innerRadius={60}
                    paddingAngle={3}
                    stroke="#ffffff"
                    strokeWidth={3}
                    isAnimationActive={false}
                  >
                    {cityChartData.map((item, idx) => (
                      <Cell key={item.name} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                    <Label
                      content={({ viewBox }) => {
                        if (!viewBox || typeof viewBox.cx !== 'number' || typeof viewBox.cy !== 'number') {
                          return null;
                        }

                        return (
                          <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle">
                            <tspan x={viewBox.cx} y={viewBox.cy - 4} fill="#111827" fontSize="24" fontWeight="700">
                              {totalCityDeals}
                            </tspan>
                            <tspan x={viewBox.cx} y={viewBox.cy + 18} fill="#6b7280" fontSize="12">
                              mapped deals
                            </tspan>
                          </text>
                        );
                      }}
                    />
                  </Pie>
                  <Tooltip
                    formatter={(value, _name, entry) => [`${value} deal${value === 1 ? '' : 's'}`, entry.payload.name]}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                  />
                </PieChart>
              </ResponsiveContainer>

              <div className="space-y-3">
                {cityChartData.map((item, idx) => {
                  const percentage = totalCityDeals > 0
                    ? Math.round((item.value / totalCityDeals) * 100)
                    : 0;

                  return (
                    <div
                      key={item.name}
                      className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                        />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{item.name}</p>
                          <p className="text-xs text-gray-500">{percentage}% of live pipeline</p>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">{item.value}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-16">No city data available</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activities */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activities</h3>
          {recent_activities.length > 0 ? (
            <ul className="space-y-3 max-h-80 overflow-y-auto">
              {recent_activities.map((activity, idx) => (
                <li
                  key={activity.id || idx}
                  className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  <div className="w-2 h-2 mt-2 rounded-full bg-primary-500 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-800 leading-snug">
                      {activity.description}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatRelativeTime(activity.activity_date || activity.created_at)}
                      {activity.deal_name && <span className="ml-1">&middot; {activity.deal_name}</span>}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">No recent activities</p>
          )}
        </div>

        {/* Top Deals by IRR */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Deals by IRR</h3>
          {top_deals_by_irr.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 pr-4 font-medium text-gray-500">Deal</th>
                    <th className="text-left py-2 pr-4 font-medium text-gray-500">Stage</th>
                    <th className="text-right py-2 pr-4 font-medium text-gray-500">Value</th>
                    <th className="text-right py-2 font-medium text-gray-500">IRR</th>
                  </tr>
                </thead>
                <tbody>
                  {top_deals_by_irr.map((deal, idx) => {
                    const stageConf = STAGE_CONFIG[deal.stage] || {};
                    return (
                      <tr key={deal.id || idx} className="border-b border-gray-50 last:border-0">
                        <td className="py-2.5 pr-4 font-medium text-gray-900 truncate max-w-[160px]">
                          {deal.name}
                        </td>
                        <td className="py-2.5 pr-4">
                          <Badge className={stageConf.color}>
                            {stageConf.label || deal.stage}
                          </Badge>
                        </td>
                        <td className="py-2.5 pr-4 text-right text-gray-600 whitespace-nowrap">
                          {formatCrores(deal.total_revenue_cr)}
                        </td>
                        <td className="py-2.5 text-right font-semibold text-primary-600 whitespace-nowrap">
                          {formatPct(deal.irr_pct)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">No deals available</p>
          )}
        </div>
      </div>
    </div>
  );
}
