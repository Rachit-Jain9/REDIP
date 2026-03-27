import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Plus,
  X,
  MapPin,
  Building2,
  Ruler,
  IndianRupee,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useProperties, useCreateProperty, useDeleteProperty } from '../hooks/useProperties';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import PageHeader from '../components/common/PageHeader';
import Badge from '../components/common/Badge';
import { formatINR, formatArea } from '../utils/format';

const ZONING_OPTIONS = [
  { value: 'residential', label: 'Residential' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'industrial', label: 'Industrial' },
  { value: 'mixed_use', label: 'Mixed Use' },
  { value: 'agricultural', label: 'Agricultural' },
];

const ITEMS_PER_PAGE = 12;

const initialFormState = {
  name: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  zoning: 'residential',
  landAreaSqft: '',
  circleRatePerSqft: '',
  permissibleFsi: '',
  surveyNumber: '',
  ownerName: '',
};

const zoningLabel = (value) =>
  ZONING_OPTIONS.find((option) => option.value === value)?.label || value || '-';

export default function PropertiesPage() {
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [zoningFilter, setZoningFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(initialFormState);

  const queryParams = useMemo(() => {
    const params = { page, limit: ITEMS_PER_PAGE };
    if (search) params.search = search;
    if (cityFilter) params.city = cityFilter;
    if (zoningFilter) params.zoning = zoningFilter;
    return params;
  }, [cityFilter, page, search, zoningFilter]);

  const { data, isLoading, isError } = useProperties(queryParams);
  const createProperty = useCreateProperty();
  const deleteProperty = useDeleteProperty();

  const properties = data?.data || [];
  const pagination = data?.pagination || { total: 0, page: 1, totalPages: 1 };
  const cities = [...new Set(properties.map((property) => property.city).filter(Boolean))];

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await createProperty.mutateAsync({
        ...form,
        landAreaSqft: form.landAreaSqft ? Number(form.landAreaSqft) : undefined,
        circleRatePerSqft: form.circleRatePerSqft ? Number(form.circleRatePerSqft) : undefined,
        permissibleFsi: form.permissibleFsi ? Number(form.permissibleFsi) : undefined,
        pincode: form.pincode || undefined,
        surveyNumber: form.surveyNumber || undefined,
        ownerName: form.ownerName || undefined,
      });
      setForm(initialFormState);
      setShowModal(false);
    } catch {
      // Mutation hook handles the toast.
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this property?')) {
      return;
    }

    try {
      await deleteProperty.mutateAsync(id);
    } catch {
      // Mutation hook handles the toast.
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        title="Properties"
        description={`${pagination.total} propert${pagination.total === 1 ? 'y' : 'ies'} in the land bank`}
      />

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search properties..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={cityFilter}
            onChange={(e) => {
              setCityFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="">All Cities</option>
            {cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>

          <select
            value={zoningFilter}
            onChange={(e) => {
              setZoningFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="">All Zoning</option>
            {ZONING_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            <Plus className="h-4 w-4" />
            Add Property
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner />
        </div>
      ) : isError ? (
        <div className="py-20 text-center text-sm text-red-500">
          Failed to load properties. Please try again.
        </div>
      ) : properties.length === 0 ? (
        <div className="py-20">
          <EmptyState
            title="No properties found"
            description="Get started by adding your first property."
            action={
              <button
                onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
              >
                <Plus className="h-4 w-4" />
                Add Property
              </button>
            }
          />
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {properties.map((property) => (
              <div
                key={property.id}
                className="group relative rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                <div className="mb-3 flex items-start justify-between">
                  <Link
                    to={`/properties/${property.id}`}
                    className="text-lg font-semibold text-gray-900 hover:text-primary-600"
                  >
                    {property.name}
                  </Link>
                  {property.zoning && <Badge>{zoningLabel(property.zoning)}</Badge>}
                </div>

                <div className="mb-4 flex items-center gap-1 text-sm text-gray-500">
                  <MapPin className="h-3.5 w-3.5" />
                  <span className="truncate">
                    {property.address}
                    {property.city && `, ${property.city}`}
                    {property.state && `, ${property.state}`}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 border-t border-gray-100 pt-3">
                  <div className="flex flex-col items-center gap-1">
                    <Ruler className="h-4 w-4 text-gray-400" />
                    <span className="text-xs text-gray-500">Area</span>
                    <span className="text-sm font-medium text-gray-900">
                      {property.land_area_sqft ? formatArea(property.land_area_sqft) : '-'}
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <IndianRupee className="h-4 w-4 text-gray-400" />
                    <span className="text-xs text-gray-500">Circle Rate</span>
                    <span className="text-sm font-medium text-gray-900">
                      {property.circle_rate_per_sqft ? formatINR(property.circle_rate_per_sqft) : '-'}
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <Building2 className="h-4 w-4 text-gray-400" />
                    <span className="text-xs text-gray-500">FSI</span>
                    <span className="text-sm font-medium text-gray-900">
                      {property.permissible_fsi ?? property.existing_fsi ?? '-'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(property.id)}
                  className="absolute right-2 top-2 hidden rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 group-hover:block"
                  title="Delete property"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          {pagination.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                disabled={page <= 1}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => setPage((currentPage) => Math.min(pagination.totalPages, currentPage + 1))}
                disabled={page >= pagination.totalPages}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Add Property</h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setForm(initialFormState);
                }}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="mb-1 block text-sm font-medium text-gray-700">Property Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleFormChange}
                    required
                    className="input"
                  />
                </div>

                <div className="col-span-2">
                  <label className="mb-1 block text-sm font-medium text-gray-700">Address *</label>
                  <input
                    type="text"
                    name="address"
                    value={form.address}
                    onChange={handleFormChange}
                    required
                    className="input"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">City *</label>
                  <input
                    type="text"
                    name="city"
                    value={form.city}
                    onChange={handleFormChange}
                    required
                    className="input"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">State *</label>
                  <input
                    type="text"
                    name="state"
                    value={form.state}
                    onChange={handleFormChange}
                    required
                    className="input"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Pincode</label>
                  <input
                    type="text"
                    name="pincode"
                    value={form.pincode}
                    onChange={handleFormChange}
                    className="input"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Zoning *</label>
                  <select
                    name="zoning"
                    value={form.zoning}
                    onChange={handleFormChange}
                    required
                    className="input"
                  >
                    {ZONING_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Land Area (sq ft)</label>
                  <input
                    type="number"
                    name="landAreaSqft"
                    value={form.landAreaSqft}
                    onChange={handleFormChange}
                    min="0"
                    className="input"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Circle Rate (INR / sqft)</label>
                  <input
                    type="number"
                    name="circleRatePerSqft"
                    value={form.circleRatePerSqft}
                    onChange={handleFormChange}
                    min="0"
                    className="input"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Permissible FSI</label>
                  <input
                    type="number"
                    name="permissibleFsi"
                    value={form.permissibleFsi}
                    onChange={handleFormChange}
                    min="0"
                    step="0.1"
                    className="input"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Survey Number</label>
                  <input
                    type="text"
                    name="surveyNumber"
                    value={form.surveyNumber}
                    onChange={handleFormChange}
                    className="input"
                  />
                </div>

                <div className="col-span-2">
                  <label className="mb-1 block text-sm font-medium text-gray-700">Owner Name</label>
                  <input
                    type="text"
                    name="ownerName"
                    value={form.ownerName}
                    onChange={handleFormChange}
                    className="input"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setForm(initialFormState);
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createProperty.isPending}
                  className="btn btn-primary"
                >
                  {createProperty.isPending ? 'Creating...' : 'Create Property'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
