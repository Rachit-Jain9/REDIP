import { useState } from 'react';
import {
  Phone,
  MapPin,
  Users,
  FileText,
  DollarSign,
  Mail,
  StickyNote,
  Activity,
  Filter,
} from 'lucide-react';
import { useRecentActivities } from '../hooks/useActivities';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import PageHeader from '../components/common/PageHeader';
import { formatRelativeTime } from '../utils/format';

const ACTIVITY_TYPE_CONFIG = {
  call: { icon: Phone, label: 'Call', color: 'bg-blue-100 text-blue-600' },
  site_visit: { icon: MapPin, label: 'Site Visit', color: 'bg-green-100 text-green-600' },
  meeting: { icon: Users, label: 'Meeting', color: 'bg-purple-100 text-purple-600' },
  loi_sent: { icon: FileText, label: 'LOI Sent', color: 'bg-yellow-100 text-yellow-600' },
  offer_received: { icon: DollarSign, label: 'Offer Received', color: 'bg-emerald-100 text-emerald-600' },
  email: { icon: Mail, label: 'Email', color: 'bg-sky-100 text-sky-600' },
  note: { icon: StickyNote, label: 'Note', color: 'bg-orange-100 text-orange-600' },
};

const ALL_TYPES = Object.keys(ACTIVITY_TYPE_CONFIG);

export default function ActivitiesPage() {
  const [filterType, setFilterType] = useState('all');
  const { data: activities, isLoading } = useRecentActivities(100);

  const filtered =
    filterType === 'all'
      ? activities || []
      : (activities || []).filter((a) => a.activity_type === filterType);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Activities"
        description="Recent activity log across all deals"
      />

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Filter size={16} className="text-gray-400" />
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              filterType === 'all'
                ? 'bg-primary-100 text-primary-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          {ALL_TYPES.map((type) => {
            const config = ACTIVITY_TYPE_CONFIG[type];
            const Icon = config.icon;
            return (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  filterType === type
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Icon size={12} />
                {config.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Timeline */}
      {isLoading ? (
        <LoadingSpinner />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="No activities found"
          description={
            filterType === 'all'
              ? 'No recent activities to display.'
              : `No "${ACTIVITY_TYPE_CONFIG[filterType]?.label}" activities found.`
          }
        />
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="divide-y divide-gray-100">
            {filtered.map((activity, idx) => {
              const config = ACTIVITY_TYPE_CONFIG[activity.activity_type] || ACTIVITY_TYPE_CONFIG.note;
              const Icon = config.icon;

              return (
                <div key={activity.id || idx} className="px-6 py-4 flex gap-4 hover:bg-gray-50 transition">
                  {/* Icon */}
                  <div className="flex flex-col items-center">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center ${config.color}`}>
                      <Icon size={16} />
                    </div>
                    {idx < filtered.length - 1 && (
                      <div className="w-px flex-1 bg-gray-200 mt-2" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pt-1">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm text-gray-900">
                          {activity.description || config.label}
                        </p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {activity.deal_name && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                              {activity.deal_name}
                            </span>
                          )}
                          {activity.performed_by_name && (
                            <span className="text-xs text-gray-500">
                              by {activity.performed_by_name}
                            </span>
                          )}
                        </div>
                        {activity.notes && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                            {activity.notes}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 whitespace-nowrap shrink-0">
                        {formatRelativeTime(activity.activity_date || activity.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
