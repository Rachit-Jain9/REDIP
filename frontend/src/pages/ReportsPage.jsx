import { useState, useMemo } from 'react';
import { FileBarChart, Download, FileText, Loader2 } from 'lucide-react';
import { useDeals } from '../hooks/useDeals';
import LoadingSpinner from '../components/common/LoadingSpinner';
import PageHeader from '../components/common/PageHeader';
import Badge from '../components/common/Badge';
import {
  formatCrores,
  formatPct,
  formatArea,
  STAGE_CONFIG,
  DEAL_TYPE_LABELS,
} from '../utils/format';
import { exportsAPI } from '../services/api';
import { toast } from '../components/common/Toast';

const TABS = [
  { key: 'pipeline', label: 'Pipeline' },
  { key: 'financial', label: 'Financial' },
  { key: 'citywise', label: 'City-wise' },
  { key: 'performance', label: 'Performance' },
];

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('pipeline');
  const [exportingCSV, setExportingCSV] = useState(false);
  const [exportingComps, setExportingComps] = useState(false);
  const [generatingIC, setGeneratingIC] = useState(null);

  const { data: dealsData, isLoading } = useDeals({ limit: 500 });
  const deals = dealsData?.data || [];

  // Pipeline data: group by stage
  const pipelineData = useMemo(() => {
    const stages = {};
    deals.forEach((deal) => {
      const stage = deal.stage || 'screening';
      if (!stages[stage]) stages[stage] = { count: 0, totalValue: 0 };
      stages[stage].count += 1;
      stages[stage].totalValue += Number(deal.total_revenue_cr || 0);
    });
    return Object.entries(STAGE_CONFIG).map(([key, config]) => ({
      stage: key,
      label: config.label,
      color: config.color,
      count: stages[key]?.count || 0,
      totalValue: stages[key]?.totalValue || 0,
    }));
  }, [deals]);

  // City-wise data
  const cityData = useMemo(() => {
    const cities = {};
    deals.forEach((deal) => {
      const city = deal.city || 'Unknown';
      if (!cities[city]) cities[city] = { count: 0, irrSum: 0, irrCount: 0 };
      cities[city].count += 1;
      const irr = Number(deal.irr_pct);
      if (!isNaN(irr) && irr > 0) {
        cities[city].irrSum += irr;
        cities[city].irrCount += 1;
      }
    });
    return Object.entries(cities)
      .map(([city, data]) => ({
        city,
        count: data.count,
        avgIRR: data.irrCount > 0 ? data.irrSum / data.irrCount : null,
      }))
      .sort((a, b) => b.count - a.count);
  }, [deals]);

  // Performance data: sorted by IRR desc
  const performanceData = useMemo(() => {
    return [...deals]
      .map((d) => ({
        ...d,
        _irr: Number(d.irr_pct) || 0,
      }))
      .sort((a, b) => b._irr - a._irr);
  }, [deals]);

  const handleExportDeals = async () => {
    setExportingCSV(true);
    try {
      const response = await exportsAPI.deals();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'deals_export.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Deals CSV downloaded');
    } catch {
      toast.error('Export failed');
    } finally {
      setExportingCSV(false);
    }
  };

  const handleExportComps = async () => {
    setExportingComps(true);
    try {
      const response = await exportsAPI.comps();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'comps_export.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Comps CSV downloaded');
    } catch {
      toast.error('Export failed');
    } finally {
      setExportingComps(false);
    }
  };

  const handleGenerateIC = async (dealId, dealName) => {
    setGeneratingIC(dealId);
    try {
      const response = await exportsAPI.icReport(dealId);
      const reportPayload = response.data?.data ?? response.data;
      const blob = new Blob([JSON.stringify(reportPayload, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `IC_Report_${dealName}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('IC Report generated');
    } catch {
      toast.error('IC Report generation failed');
    } finally {
      setGeneratingIC(null);
    }
  };

  const getFinancialValue = (deal, key) => {
    if (deal[key] !== undefined) return deal[key];
    return null;
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Pipeline analytics and export tools"
      />

      {/* Export buttons */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={handleExportDeals}
          disabled={exportingCSV}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
        >
          {exportingCSV ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          Export Deals CSV
        </button>
        <button
          onClick={handleExportComps}
          disabled={exportingComps}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
        >
          {exportingComps ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          Export Comps CSV
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 text-sm font-medium border-b-2 transition ${
                activeTab === tab.key
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Pipeline Tab */}
      {activeTab === 'pipeline' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Stage</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Count</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Total Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pipelineData.map((row) => (
                <tr key={row.stage} className="hover:bg-gray-50">
                  <td className="px-6 py-3">
                    <Badge className={row.color}>{row.label}</Badge>
                  </td>
                  <td className="px-6 py-3 text-right text-gray-900 font-medium">{row.count}</td>
                  <td className="px-6 py-3 text-right text-gray-900">{formatCrores(row.totalValue)}</td>
                </tr>
              ))}
              <tr className="bg-gray-50 font-semibold">
                <td className="px-6 py-3 text-gray-900">Total</td>
                <td className="px-6 py-3 text-right text-gray-900">
                  {pipelineData.reduce((s, r) => s + r.count, 0)}
                </td>
                <td className="px-6 py-3 text-right text-gray-900">
                  {formatCrores(pipelineData.reduce((s, r) => s + r.totalValue, 0))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Financial Tab */}
      {activeTab === 'financial' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Deal</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">City</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Revenue</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Cost</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Profit</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">IRR</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">NPV</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Eq. Multiple</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {deals.map((deal) => (
                <tr key={deal.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{deal.name}</td>
                  <td className="px-4 py-3 text-gray-600">{deal.city || '-'}</td>
                  <td className="px-4 py-3 text-right text-gray-900">{formatCrores(getFinancialValue(deal, 'total_revenue_cr'))}</td>
                  <td className="px-4 py-3 text-right text-gray-900">{formatCrores(getFinancialValue(deal, 'total_cost_cr'))}</td>
                  <td className="px-4 py-3 text-right text-gray-900">{formatCrores(getFinancialValue(deal, 'gross_profit_cr'))}</td>
                  <td className="px-4 py-3 text-right text-gray-900">{formatPct(getFinancialValue(deal, 'irr_pct'))}</td>
                  <td className="px-4 py-3 text-right text-gray-900">{formatCrores(getFinancialValue(deal, 'npv_cr'))}</td>
                  <td className="px-4 py-3 text-right text-gray-900">
                    {getFinancialValue(deal, 'equity_multiple') ? `${Number(getFinancialValue(deal, 'equity_multiple')).toFixed(2)}x` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* City-wise Tab */}
      {activeTab === 'citywise' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">City</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Deal Count</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Avg IRR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {cityData.map((row) => (
                <tr key={row.city} className="hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium text-gray-900">{row.city}</td>
                  <td className="px-6 py-3 text-right text-gray-900">{row.count}</td>
                  <td className="px-6 py-3 text-right text-gray-900">{row.avgIRR !== null ? formatPct(row.avgIRR) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Performance Tab */}
      {activeTab === 'performance' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Deal</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">City</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Stage</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">IRR</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">NPV</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">IC Report</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {performanceData.map((deal, idx) => (
                <tr key={deal.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500">{idx + 1}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{deal.name}</td>
                  <td className="px-4 py-3 text-gray-600">{deal.city || '-'}</td>
                  <td className="px-4 py-3">
                    <Badge className={STAGE_CONFIG[deal.stage]?.color || 'bg-gray-100 text-gray-700'}>
                      {STAGE_CONFIG[deal.stage]?.label || deal.stage}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">{formatPct(deal._irr)}</td>
                  <td className="px-4 py-3 text-right text-gray-900">{formatCrores(getFinancialValue(deal, 'npv_cr'))}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleGenerateIC(deal.id, deal.name)}
                      disabled={generatingIC === deal.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-lg transition disabled:opacity-50"
                    >
                      {generatingIC === deal.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <FileText size={12} />
                      )}
                      Generate
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
