import { useState } from 'react';
import {
  Brain,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Calendar,
  MapPin,
  BarChart2,
  Lightbulb,
  ChevronDown,
  RefreshCw,
} from 'lucide-react';
import { useDailyBrief } from '../hooks/useIntelligence';
import LoadingSpinner from '../components/common/LoadingSpinner';
import PageHeader from '../components/common/PageHeader';
import Badge from '../components/common/Badge';
import { formatPct, formatCrores, formatDate, STAGE_CONFIG } from '../utils/format';

function SectionCard({ icon: Icon, title, children, className = '' }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden ${className}`}>
      <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100 bg-gray-50">
        <Icon size={16} className="text-gray-500" />
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function UnconfiguredNotice({ requirements }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-amber-800">Verified market data not yet configured</p>
          <p className="text-xs text-amber-700 mt-1">
            REDIP will not generate external market claims until verified data sources are connected. The brief below reflects real internal pipeline data only.
          </p>
          {requirements?.length > 0 && (
            <button
              onClick={() => setOpen((o) => !o)}
              className="mt-2 flex items-center gap-1 text-xs text-amber-700 hover:text-amber-900 font-medium"
            >
              <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
              {open ? 'Hide' : 'Show'} required sources
            </button>
          )}
          {open && (
            <ul className="mt-2 space-y-1">
              {requirements.map((req) => (
                <li key={req.key} className="text-xs text-amber-700">
                  <span className="font-medium">{req.label}</span> — {req.purpose}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default function IntelligencePage() {
  const today = new Date().toISOString().slice(0, 10);
  const { data: brief, isLoading, isError, refetch, isFetching } = useDailyBrief();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-20">
        <p className="text-red-600 font-medium">Failed to load intelligence brief</p>
        <button onClick={() => refetch()} className="mt-3 btn btn-secondary text-sm">
          Retry
        </button>
      </div>
    );
  }

  const notConfigured = brief?.mode === 'verified_data_required';

  return (
    <div className="space-y-5 max-w-5xl">
      <PageHeader
        title="Daily Intelligence Brief"
        description={`Bengaluru real estate intelligence — ${today}`}
        actions={
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="btn btn-secondary flex items-center gap-2 text-sm"
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
            Refresh
          </button>
        }
      />

      {notConfigured && (
        <UnconfiguredNotice requirements={brief?.verifiedSourceRequirements} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* 1. Deal of the Day */}
        <SectionCard icon={TrendingUp} title="1. Deal of the Day">
          {brief?.dealOfDay ? (
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-semibold text-gray-900">{brief.dealOfDay.headline}</h4>
                {brief.dealOfDay.stage && (
                  <Badge className={STAGE_CONFIG[brief.dealOfDay.stage]?.color || 'bg-gray-100 text-gray-700'}>
                    {STAGE_CONFIG[brief.dealOfDay.stage]?.label || brief.dealOfDay.stage}
                  </Badge>
                )}
              </div>
              {brief.dealOfDay.city && (
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <MapPin size={13} />
                  <span>{brief.dealOfDay.city}</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                {brief.dealOfDay.irrPct != null && (
                  <div className="rounded-lg bg-slate-50 px-3 py-2">
                    <p className="text-xs text-gray-500">Modeled IRR</p>
                    <p className="text-base font-bold text-slate-900">{formatPct(brief.dealOfDay.irrPct)}</p>
                  </div>
                )}
                {brief.dealOfDay.totalRevenueCr != null && (
                  <div className="rounded-lg bg-slate-50 px-3 py-2">
                    <p className="text-xs text-gray-500">Total Revenue</p>
                    <p className="text-base font-bold text-slate-900">{formatCrores(brief.dealOfDay.totalRevenueCr)}</p>
                  </div>
                )}
              </div>
              {brief.dealOfDay.whyItMatters && (
                <p className="text-xs text-gray-600 italic border-l-2 border-primary-300 pl-3">
                  {brief.dealOfDay.whyItMatters}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No deals in pipeline yet. Add a deal to see it surface here.</p>
          )}
        </SectionCard>

        {/* 2. Key Developments */}
        <SectionCard icon={Calendar} title="2. Key Developments">
          {brief?.keyDevelopments?.length > 0 ? (
            <ul className="space-y-3">
              {brief.keyDevelopments.map((dev, i) => (
                <li key={i} className="border-b border-gray-50 last:border-0 pb-2 last:pb-0">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-medium text-gray-800">{dev.headline}</span>
                    {dev.city && (
                      <span className="text-xs text-gray-400 flex-shrink-0">{dev.city}</span>
                    )}
                  </div>
                  {dev.whyItMatters && (
                    <p className="text-xs text-gray-500 mt-1">{dev.whyItMatters}</p>
                  )}
                  {dev.date && (
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(dev.date)}</p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">No pipeline activity recorded yet.</p>
          )}
        </SectionCard>

        {/* 3. Market Signals */}
        <SectionCard icon={BarChart2} title="3. Market Signals">
          {brief?.marketSignals ? (
            <div className="space-y-3">
              {brief.marketSignals.bullish?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-emerald-700 mb-1 flex items-center gap-1">
                    <TrendingUp size={12} /> Bullish signals
                  </p>
                  <ul className="space-y-1">
                    {brief.marketSignals.bullish.map((s, i) => (
                      <li key={i} className="text-xs text-gray-700 flex gap-2">
                        <CheckCircle size={11} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {brief.marketSignals.risk?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-red-700 mb-1 flex items-center gap-1">
                    <AlertTriangle size={12} /> Risk signals
                  </p>
                  <ul className="space-y-1">
                    {brief.marketSignals.risk.map((s, i) => (
                      <li key={i} className="text-xs text-gray-700 flex gap-2">
                        <TrendingDown size={11} className="text-red-400 flex-shrink-0 mt-0.5" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {brief.marketSignals.sourceType === 'internal_pipeline_only' && (
                <p className="text-xs text-gray-400 italic mt-2">Source: internal pipeline data only</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No market signals available.</p>
          )}
        </SectionCard>

        {/* 4. Micro-Market Intelligence */}
        <SectionCard icon={MapPin} title="4. Bengaluru Micro-Market Intelligence">
          {brief?.bengaluruMicroMarketIntelligence?.length > 0 ? (
            <ul className="space-y-2">
              {brief.bengaluruMicroMarketIntelligence.map((item, i) => (
                <li key={i} className="text-xs text-gray-700 border-l-2 border-primary-200 pl-3">
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">
              Micro-market intelligence will appear here once verified external data sources are configured.
            </p>
          )}
        </SectionCard>
      </div>

      {/* 5. Demand Heatmap — full width */}
      {brief?.bengaluruDemandHeatmap?.length > 0 && (
        <SectionCard icon={BarChart2} title="5. Demand Heatmap — Bengaluru Micro-Markets" className="col-span-2">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-semibold text-gray-600">Micro-Market</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-600">Absorption</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-600">Pricing Trend</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-600">Inventory</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-600">Demand Signal</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-600">Insight</th>
                </tr>
              </thead>
              <tbody>
                {brief.bengaluruDemandHeatmap.map((row, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 px-3 font-medium text-gray-800">{row.microMarket}</td>
                    <td className="py-2 px-3 text-gray-500">{row.absorption}</td>
                    <td className="py-2 px-3 text-gray-500">{row.pricingTrend}</td>
                    <td className="py-2 px-3 text-gray-500">{row.inventory}</td>
                    <td className="py-2 px-3 text-gray-500">{row.demandSignal}</td>
                    <td className="py-2 px-3 text-gray-500 max-w-xs">{row.insight}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* 6. Slowdown Indicators */}
        <SectionCard icon={TrendingDown} title="6. Demand Slowdown Indicators">
          {brief?.demandSlowdownIndicators?.length > 0 ? (
            <ul className="space-y-2">
              {brief.demandSlowdownIndicators.map((item, i) => (
                <li key={i} className="text-xs text-gray-700 flex gap-2">
                  <AlertTriangle size={11} className="text-amber-400 flex-shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">No slowdown indicators.</p>
          )}
        </SectionCard>

        {/* 7. Strategic Takeaways */}
        <SectionCard icon={Lightbulb} title="7. Strategic Takeaways">
          {brief?.strategicTakeaways?.length > 0 ? (
            <ul className="space-y-2">
              {brief.strategicTakeaways.map((item, i) => (
                <li key={i} className="text-xs text-gray-700 flex gap-2">
                  <CheckCircle size={11} className="text-primary-500 flex-shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">No strategic takeaways.</p>
          )}
        </SectionCard>
      </div>

      {/* 8. Bottom Line */}
      {brief?.bottomLine && (
        <div className="rounded-xl border border-slate-200 bg-slate-900 px-6 py-4">
          <div className="flex items-start gap-3">
            <Brain size={18} className="text-primary-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">8. Bottom Line</p>
              <p className="text-sm text-white">{brief.bottomLine}</p>
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400 text-center pb-4">
        Brief generated {today} · Source: {notConfigured ? 'internal pipeline only' : 'verified external feeds + internal pipeline'}
      </p>
    </div>
  );
}
