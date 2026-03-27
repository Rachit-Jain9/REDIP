import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, X, Briefcase, ChevronLeft, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';
import { useDeals, useCreateDeal } from '../hooks/useDeals';
import { useProperties } from '../hooks/useProperties';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import Badge from '../components/common/Badge';
import PageHeader from '../components/common/PageHeader';
import {
  formatCrores,
  formatPct,
  formatRelativeTime,
  STAGE_CONFIG,
  PRIORITY_CONFIG,
  DEAL_TYPE_LABELS,
} from '../utils/format';

const INITIAL_FORM = {
  propertyId: '',
  name: '',
  dealType: 'acquisition',
  priority: 'medium',
  landAskPriceCr: '',
  notes: '',
};

export default function DealsPage() {
  const navigate = useNavigate();

  // Filters
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [page, setPage] = useState(1);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);

  const params = useMemo(() => {
    const p = { page, limit: 12 };
    if (search) p.search = search;
    if (stageFilter) p.stage = stageFilter;
    if (typeFilter) p.dealType = typeFilter;
    if (priorityFilter) p.priority = priorityFilter;
    return p;
  }, [search, stageFilter, typeFilter, priorityFilter, page]);

  const { data, isLoading, isError } = useDeals(params);
  const { data: propertiesData } = useProperties({ limit: 200 });
  const createDeal = useCreateDeal();

  const deals = data?.data || [];
  const pagination = data?.pagination || { total: 0, page: 1, totalPages: 1 };
  const properties = propertiesData?.data || [];

  const handleFilterReset = () => {
    setSearch('');
    setStageFilter('');
    setTypeFilter('');
    setPriorityFilter('');
    setPage(1);
  };

  const hasFilters = search || stageFilter || typeFilter || priorityFilter;

  const handleOpenModal = () => {
    setForm(INITIAL_FORM);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setForm(INITIAL_FORM);
  };

  const handleFormChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      propertyId: form.propertyId,
      name: form.name,
      dealType: form.dealType,
      priority: form.priority,
      landAskPriceCr: form.landAskPriceCr ? parseFloat(form.landAskPriceCr) : undefined,
      notes: form.notes || undefined,
    };
    try {
      await createDeal.mutateAsync(payload);
      handleCloseModal();
    } catch {
      // error handled by hook
    }
  };

  if (isLoading) {
    return <LoadingSpinner className="py-24" />;
  }

  if (isError) {
    return (
      <div className="text-center py-24 text-red-600">
        Failed to load deals. Please try again.
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Deals"
        description={`${pagination.total} deal${pagination.total !== 1 ? 's' : ''} in pipeline`}
        actions={
          <button onClick={handleOpenModal} className="btn btn-primary flex items-center gap-2">
            <Plus size={16} />
            New Deal
          </button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search deals, properties, cities..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input pl-9 w-full"
          />
        </div>

        <select
          value={stageFilter}
          onChange={(e) => { setStageFilter(e.target.value); setPage(1); }}
          className="input w-auto"
        >
          <option value="">All Stages</option>
          {Object.entries(STAGE_CONFIG).map(([key, cfg]) => (
            <option key={key} value={key}>{cfg.label}</option>
          ))}
        </select>

        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="input w-auto"
        >
          <option value="">All Types</option>
          {Object.entries(DEAL_TYPE_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
          className="input w-auto"
        >
          <option value="">All Priorities</option>
          {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
            <option key={key} value={key}>{cfg.label}</option>
          ))}
        </select>

        {hasFilters && (
          <button onClick={handleFilterReset} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
            <X size={14} /> Clear
          </button>
        )}
      </div>

      {/* Deal Cards Grid */}
      {deals.length === 0 ? (
        <EmptyState
          title="No deals found"
          description={hasFilters ? 'Try adjusting your filters.' : 'Create your first deal to get started.'}
          icon={Briefcase}
          action={
            !hasFilters && (
              <button onClick={handleOpenModal} className="btn btn-primary mt-2">
                <Plus size={16} className="mr-1 inline" /> New Deal
              </button>
            )
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {deals.map((deal) => {
              const stageCfg = STAGE_CONFIG[deal.stage] || STAGE_CONFIG.screening;
              const priorityCfg = PRIORITY_CONFIG[deal.priority] || PRIORITY_CONFIG.medium;
              return (
                <Link
                  key={deal.id}
                  to={`/deals/${deal.id}`}
                  className="card hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-gray-900 truncate pr-2">{deal.name}</h3>
                    <Badge className={stageCfg.color}>{stageCfg.label}</Badge>
                  </div>

                  <p className="text-sm text-gray-600 mb-1">{deal.property_name}</p>
                  <p className="text-xs text-gray-400 mb-3">{deal.city}{deal.state ? `, ${deal.state}` : ''}</p>

                  <div className="flex items-center gap-2 mb-3">
                    <Badge className={priorityCfg.color}>{priorityCfg.label}</Badge>
                    <span className="text-xs text-gray-500">{DEAL_TYPE_LABELS[deal.deal_type] || deal.deal_type}</span>
                  </div>

                  <div className="flex items-center justify-between text-sm border-t pt-3">
                    <div>
                      <span className="text-gray-400 text-xs">IRR</span>
                      <p className="font-medium">{formatPct(deal.irr_pct)}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-gray-400 text-xs">Revenue</span>
                      <p className="font-medium">{formatCrores(deal.total_revenue_cr)}</p>
                    </div>
                  </div>

                  {deal.last_activity_date && (
                    <p className="text-xs text-gray-400 mt-2">
                      Last activity {formatRelativeTime(deal.last_activity_date)}
                    </p>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-gray-500">
                Showing {(pagination.page - 1) * (params.limit || 12) + 1}
                &ndash;
                {Math.min(pagination.page * (params.limit || 12), pagination.total)} of {pagination.total}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={pagination.page <= 1}
                  className="btn btn-secondary p-2 disabled:opacity-40"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-sm text-gray-700">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={pagination.page >= pagination.totalPages}
                  className="btn btn-secondary p-2 disabled:opacity-40"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* New Deal Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">New Deal</h2>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Property *</label>
                <select
                  name="propertyId"
                  value={form.propertyId}
                  onChange={handleFormChange}
                  required
                  className="input w-full"
                >
                  <option value="">Select a property</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} &mdash; {p.city}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deal Name *</label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleFormChange}
                  required
                  placeholder="e.g. Whitefield JV Phase 1"
                  className="input w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select name="dealType" value={form.dealType} onChange={handleFormChange} className="input w-full">
                    {Object.entries(DEAL_TYPE_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select name="priority" value={form.priority} onChange={handleFormChange} className="input w-full">
                    {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
                      <option key={key} value={key}>{cfg.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Land Ask Price (Cr)</label>
                <input
                  type="number"
                  name="landAskPriceCr"
                  value={form.landAskPriceCr}
                  onChange={handleFormChange}
                  step="0.01"
                  min="0"
                  placeholder="e.g. 25.50"
                  className="input w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleFormChange}
                  rows={3}
                  placeholder="Any initial notes..."
                  className="input w-full"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={handleCloseModal} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={createDeal.isPending} className="btn btn-primary">
                  {createDeal.isPending ? 'Creating...' : 'Create Deal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
