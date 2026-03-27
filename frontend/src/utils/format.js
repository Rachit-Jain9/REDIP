/**
 * Format number as Indian currency (lakhs/crores)
 */
export const formatINR = (value, decimals = 2) => {
  if (value === null || value === undefined) return '-';
  const num = Number(value);
  if (Number.isNaN(num)) return '-';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
};

/**
 * Format as crores
 */
export const formatCrores = (value) => {
  if (value === null || value === undefined) return '-';
  const num = Number(value);
  if (Number.isNaN(num)) return '-';
  return `Rs ${num.toFixed(2)} Cr`;
};

/**
 * Format percentage
 */
export const formatPct = (value, decimals = 1) => {
  if (value === null || value === undefined) return '-';
  const num = Number(value);
  if (Number.isNaN(num)) return '-';
  return `${num.toFixed(decimals)}%`;
};

/**
 * Format area in sqft with commas
 */
export const formatArea = (value) => {
  if (value === null || value === undefined) return '-';
  const num = Number(value);
  if (Number.isNaN(num)) return '-';
  return `${num.toLocaleString('en-IN')} sqft`;
};

/**
 * Format date
 */
export const formatDate = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

/**
 * Format relative time
 */
export const formatRelativeTime = (value) => {
  if (!value) return '-';
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(value);
};

/**
 * Stage display config
 */
export const STAGE_CONFIG = {
  screening: { label: 'Screening', color: 'bg-gray-100 text-gray-800' },
  site_visit: { label: 'Site Visit', color: 'bg-blue-100 text-blue-800' },
  loi: { label: 'LOI', color: 'bg-yellow-100 text-yellow-800' },
  underwriting: { label: 'Underwriting', color: 'bg-purple-100 text-purple-800' },
  active: { label: 'Active', color: 'bg-green-100 text-green-800' },
  closed: { label: 'Closed', color: 'bg-emerald-100 text-emerald-800' },
  dead: { label: 'Dead', color: 'bg-red-100 text-red-800' },
};

export const PRIORITY_CONFIG = {
  low: { label: 'Low', color: 'bg-gray-100 text-gray-700' },
  medium: { label: 'Medium', color: 'bg-blue-100 text-blue-700' },
  high: { label: 'High', color: 'bg-orange-100 text-orange-700' },
  critical: { label: 'Critical', color: 'bg-red-100 text-red-700' },
};

export const DEAL_TYPE_LABELS = {
  acquisition: 'Acquisition',
  jv: 'Joint Venture',
  da: 'Dev Agreement',
  outright: 'Outright',
};
