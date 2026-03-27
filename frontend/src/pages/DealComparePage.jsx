import { useState, useMemo } from 'react';
import { X, GitCompare, Search, Plus } from 'lucide-react';
import { useDeals, useDeal } from '../hooks/useDeals';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import PageHeader from '../components/common/PageHeader';
import Badge from '../components/common/Badge';
import {
  formatCrores,
  formatPct,
  formatArea,
  STAGE_CONFIG,
  DEAL_TYPE_LABELS,
} from '../utils/format';

const COMPARISON_FIELDS = [
  { key: 'city', label: 'City', format: (v) => v || '-' },
  { key: 'stage', label: 'Stage', format: (v) => STAGE_CONFIG[v]?.label || v || '-' },
  { key: 'deal_type', label: 'Type', format: (v) => DEAL_TYPE_LABELS[v] || v || '-' },
  { key: 'total_revenue_cr', label: 'Revenue', format: formatCrores, compare: 'max' },
  { key: 'total_cost_cr', label: 'Total Cost', format: formatCrores, compare: 'min' },
  { key: 'gross_profit_cr', label: 'Profit', format: formatCrores, compare: 'max' },
  { key: 'irr_pct', label: 'IRR', format: formatPct, compare: 'max' },
  { key: 'npv_cr', label: 'NPV', format: formatCrores, compare: 'max' },
  { key: 'equity_multiple', label: 'Equity Multiple', format: (v) => v ? `${Number(v).toFixed(2)}x` : '-', compare: 'max' },
  { key: 'gross_margin_pct', label: 'Margin', format: formatPct, compare: 'max' },
  { key: 'land_area_sqft', label: 'Land Area', format: formatArea },
];

export default function DealComparePage() {
  const [selectedIds, setSelectedIds] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const { data: dealsData, isLoading: dealsLoading } = useDeals({ limit: 200 });
  const deals = dealsData?.data || [];

  // Fetch individual deal details for comparison
  const deal1 = useDeal(selectedIds[0]);
  const deal2 = useDeal(selectedIds[1]);
  const deal3 = useDeal(selectedIds[2]);
  const deal4 = useDeal(selectedIds[3]);
  const deal5 = useDeal(selectedIds[4]);

  const dealQueries = [deal1, deal2, deal3, deal4, deal5].slice(0, selectedIds.length);
  const selectedDeals = dealQueries.map((q) => q.data).filter(Boolean);
  const anyLoading = dealQueries.some((q) => q.isLoading);

  const filteredDeals = useMemo(() => {
    return deals.filter(
      (d) =>
        !selectedIds.includes(d.id) &&
        (d.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          d.city?.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [deals, selectedIds, searchTerm]);

  const addDeal = (id) => {
    if (selectedIds.length >= 5) return;
    setSelectedIds((prev) => [...prev, id]);
    setSearchTerm('');
    setShowDropdown(false);
  };

  const removeDeal = (id) => {
    setSelectedIds((prev) => prev.filter((sid) => sid !== id));
  };

  const getFieldValue = (deal, key) => {
    // Look in deal and deal.financials
    if (deal[key] !== undefined) return deal[key];
    if (deal.financials?.[key] !== undefined) return deal.financials[key];
    if (deal.property?.[key] !== undefined) return deal.property[key];
    return null;
  };

  const getBestWorst = (field) => {
    if (!field.compare || selectedDeals.length < 2) return { best: null, worst: null };
    const values = selectedDeals.map((d, i) => ({
      index: i,
      value: Number(getFieldValue(d, field.key)),
    })).filter((v) => !isNaN(v.value) && v.value !== null);

    if (values.length < 2) return { best: null, worst: null };

    const sorted = [...values].sort((a, b) => a.value - b.value);
    if (field.compare === 'max') {
      return { best: sorted[sorted.length - 1].index, worst: sorted[0].index };
    }
    return { best: sorted[0].index, worst: sorted[sorted.length - 1].index };
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Deal Comparison"
        description="Compare up to 5 deals side by side"
      />

      {/* Deal selector */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Selected deal chips */}
          {selectedIds.map((id) => {
            const deal = deals.find((d) => d.id === id);
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 text-primary-700 rounded-lg text-sm font-medium"
              >
                {deal?.name || 'Loading...'}
                <button
                  onClick={() => removeDeal(id)}
                  className="hover:text-primary-900 transition"
                >
                  <X size={14} />
                </button>
              </span>
            );
          })}

          {/* Add deal dropdown */}
          {selectedIds.length < 5 && (
            <div className="relative">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    placeholder="Search deals to add..."
                    className="pl-9 pr-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 w-64"
                  />
                </div>
              </div>
              {showDropdown && filteredDeals.length > 0 && (
                <div className="absolute z-20 top-full left-0 mt-1 w-80 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredDeals.slice(0, 20).map((deal) => (
                    <button
                      key={deal.id}
                      onClick={() => addDeal(deal.id)}
                      className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">{deal.name}</p>
                        <p className="text-xs text-gray-500">{deal.city || 'No city'}</p>
                      </div>
                      <Plus size={14} className="text-gray-400" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Click outside to close */}
        {showDropdown && (
          <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
        )}
      </div>

      {/* Comparison table */}
      {selectedDeals.length === 0 && !anyLoading ? (
        <EmptyState
          icon={GitCompare}
          title="No deals selected"
          description="Search and select deals above to compare them side by side."
        />
      ) : anyLoading ? (
        <LoadingSpinner />
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-40">
                  Metric
                </th>
                {selectedDeals.map((deal) => (
                  <th
                    key={deal.id}
                    className="text-left px-6 py-4 text-sm font-semibold text-gray-900 min-w-[180px]"
                  >
                    {deal.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {COMPARISON_FIELDS.map((field) => {
                const { best, worst } = getBestWorst(field);
                return (
                  <tr key={field.key} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-xs font-medium text-gray-500">
                      {field.label}
                    </td>
                    {selectedDeals.map((deal, idx) => {
                      const value = getFieldValue(deal, field.key);
                      const isBest = best === idx;
                      const isWorst = worst === idx;
                      return (
                        <td
                          key={deal.id}
                          className={`px-6 py-3 text-sm ${
                            isBest
                              ? 'text-green-700 font-semibold'
                              : isWorst
                              ? 'text-red-600'
                              : 'text-gray-900'
                          }`}
                        >
                          {field.format(value)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
