import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Building2, IndianRupee, MapPin, Ruler } from 'lucide-react';
import { useProperty } from '../hooks/useProperties';
import { useDeals } from '../hooks/useDeals';
import LoadingSpinner from '../components/common/LoadingSpinner';
import PageHeader from '../components/common/PageHeader';
import Badge from '../components/common/Badge';
import EmptyState from '../components/common/EmptyState';
import { formatArea, formatDate, formatINR, STAGE_CONFIG } from '../utils/format';

export default function PropertyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: property, isLoading, isError } = useProperty(id);
  const { data: dealsData } = useDeals({ limit: 200 });

  const relatedDeals = useMemo(
    () => (dealsData?.data || []).filter((deal) => deal.property_id === id),
    [dealsData?.data, id]
  );

  if (isLoading) {
    return <LoadingSpinner className="py-24" />;
  }

  if (isError || !property) {
    return (
      <div className="py-24">
        <EmptyState
          title="Property not found"
          description="The property details could not be loaded."
          action={
            <button onClick={() => navigate('/properties')} className="btn btn-secondary">
              Back to Properties
            </button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate('/properties')}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft size={16} /> Back to Properties
      </button>

      <PageHeader
        title={property.name}
        description={`${property.city}, ${property.state}`}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="card lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Property Overview</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Address</span>
              <p className="font-medium text-gray-900 mt-1">{property.address}</p>
            </div>
            <div>
              <span className="text-gray-400">Zoning</span>
              <p className="font-medium text-gray-900 mt-1 capitalize">
                {property.zoning?.replace(/_/g, ' ') || '-'}
              </p>
            </div>
            <div>
              <span className="text-gray-400">Land Area</span>
              <p className="font-medium text-gray-900 mt-1">{formatArea(property.land_area_sqft)}</p>
            </div>
            <div>
              <span className="text-gray-400">Circle Rate</span>
              <p className="font-medium text-gray-900 mt-1">
                {property.circle_rate_per_sqft ? formatINR(property.circle_rate_per_sqft) : '-'}
              </p>
            </div>
            <div>
              <span className="text-gray-400">Permissible FSI</span>
              <p className="font-medium text-gray-900 mt-1">
                {property.permissible_fsi ?? property.existing_fsi ?? '-'}
              </p>
            </div>
            <div>
              <span className="text-gray-400">Survey Number</span>
              <p className="font-medium text-gray-900 mt-1">{property.survey_number || '-'}</p>
            </div>
            <div>
              <span className="text-gray-400">Owner</span>
              <p className="font-medium text-gray-900 mt-1">{property.owner_name || '-'}</p>
            </div>
            <div>
              <span className="text-gray-400">Created</span>
              <p className="font-medium text-gray-900 mt-1">{formatDate(property.created_at)}</p>
            </div>
          </div>

          {property.notes && (
            <div className="mt-6 border-t pt-4">
              <span className="text-gray-400 text-sm">Notes</span>
              <p className="text-sm text-gray-700 mt-1 whitespace-pre-line">{property.notes}</p>
            </div>
          )}
        </section>

        <section className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">At a Glance</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary-50 text-primary-600">
                <MapPin size={18} />
              </div>
              <div>
                <p className="text-xs text-gray-500">Location</p>
                <p className="text-sm font-medium text-gray-900">
                  {property.lat && property.lng ? `${property.lat}, ${property.lng}` : 'Not geocoded'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary-50 text-primary-600">
                <Ruler size={18} />
              </div>
              <div>
                <p className="text-xs text-gray-500">Land Area</p>
                <p className="text-sm font-medium text-gray-900">{formatArea(property.land_area_sqft)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary-50 text-primary-600">
                <IndianRupee size={18} />
              </div>
              <div>
                <p className="text-xs text-gray-500">Circle Rate</p>
                <p className="text-sm font-medium text-gray-900">
                  {property.circle_rate_per_sqft ? formatINR(property.circle_rate_per_sqft) : '-'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary-50 text-primary-600">
                <Building2 size={18} />
              </div>
              <div>
                <p className="text-xs text-gray-500">Deals Linked</p>
                <p className="text-sm font-medium text-gray-900">{property.deal_count || 0}</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Related Deals</h2>

        {relatedDeals.length === 0 ? (
          <EmptyState
            title="No deals linked yet"
            description="Create a deal for this property from the Deals page."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {relatedDeals.map((deal) => {
              const stageConfig = STAGE_CONFIG[deal.stage] || STAGE_CONFIG.screening;

              return (
                <Link
                  key={deal.id}
                  to={`/deals/${deal.id}`}
                  className="rounded-xl border border-gray-200 p-4 hover:shadow-sm transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-900">{deal.name}</p>
                      <p className="text-sm text-gray-500 mt-1">{deal.deal_type}</p>
                    </div>
                    <Badge className={stageConfig.color}>{stageConfig.label}</Badge>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
