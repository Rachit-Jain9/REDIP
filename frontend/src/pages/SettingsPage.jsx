import { useState, useEffect } from 'react';
import { Settings, User, Lock, Palette, Save, Loader2, DollarSign } from 'lucide-react';
import useAuthStore from '../store/authStore';
import PageHeader from '../components/common/PageHeader';
import { toast } from '../components/common/Toast';
import { authAPI } from '../services/api';

const CURRENCY_OPTIONS = [
  { value: 'crores', label: 'Crores (Cr)' },
  { value: 'lakhs', label: 'Lakhs (L)' },
  { value: 'millions', label: 'Millions (M)' },
];

const CURRENCY_CODE_OPTIONS = [
  { value: 'INR', label: 'INR — Indian Rupee (₹)', symbol: '₹' },
  { value: 'USD', label: 'USD — US Dollar ($)', symbol: '$' },
  { value: 'AED', label: 'AED — UAE Dirham', symbol: 'AED' },
  { value: 'EUR', label: 'EUR — Euro (€)', symbol: '€' },
  { value: 'GBP', label: 'GBP — British Pound (£)', symbol: '£' },
  { value: 'JPY', label: 'JPY — Japanese Yen (¥)', symbol: '¥' },
  { value: 'SGD', label: 'SGD — Singapore Dollar (S$)', symbol: 'S$' },
  { value: 'LKR', label: 'LKR — Sri Lankan Rupee', symbol: 'Rs' },
  { value: 'THB', label: 'THB — Thai Baht (฿)', symbol: '฿' },
];

const AREA_UNIT_OPTIONS = [
  { value: 'sqft', label: 'Square Feet (sqft)' },
  { value: 'sqm', label: 'Square Metres (sqm)' },
  { value: 'acres', label: 'Acres' },
];

const DATE_FORMAT_OPTIONS = [
  { value: 'en-IN', label: 'DD/MM/YYYY (Indian)' },
  { value: 'en-US', label: 'MM/DD/YYYY (US)' },
  { value: 'en-GB', label: 'DD/MM/YYYY (UK)' },
  { value: 'iso', label: 'YYYY-MM-DD (ISO)' },
];

export default function SettingsPage() {
  const { user, updateProfile } = useAuthStore();

  // Profile form
  const [profile, setProfile] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // Security form
  const [security, setSecurity] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [changingPassword, setChangingPassword] = useState(false);

  // Preferences (localStorage only)
  const [preferences, setPreferences] = useState({
    currency: localStorage.getItem('pref_currency') || 'crores',
    areaUnit: localStorage.getItem('pref_areaUnit') || 'sqft',
    dateFormat: localStorage.getItem('pref_dateFormat') || 'en-IN',
  });

  // Currency code + FX reference rate
  const [currencyCode, setCurrencyCode] = useState(localStorage.getItem('pref_currencyCode') || 'INR');
  const [fxRate, setFxRate] = useState(localStorage.getItem('pref_fx_rate') || '');
  const selectedCurrency = CURRENCY_CODE_OPTIONS.find((c) => c.value === currencyCode);

  useEffect(() => {
    if (user) {
      setProfile({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
      });
    }
  }, [user]);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    if (!profile.name.trim()) {
      toast.error('Name is required');
      return;
    }
    setSavingProfile(true);
    const success = await updateProfile({
      name: profile.name.trim(),
      phone: profile.phone.trim() || undefined,
    });
    setSavingProfile(false);
    if (success) {
      toast.success('Profile updated');
    } else {
      toast.error('Failed to update profile');
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!security.currentPassword) {
      toast.error('Current password is required');
      return;
    }
    if (security.newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(security.newPassword)) {
      toast.error('New password must include uppercase, lowercase, and a number');
      return;
    }
    if (security.newPassword !== security.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setChangingPassword(true);
    try {
      await authAPI.updateMe({
        currentPassword: security.currentPassword,
        newPassword: security.newPassword,
      });
      toast.success('Password changed');
      setSecurity({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const handlePreferenceChange = (key, value) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
    localStorage.setItem(`pref_${key}`, value);
    toast.success('Preference saved');
  };

  const handleCurrencyCodeChange = (code) => {
    setCurrencyCode(code);
    localStorage.setItem('pref_currencyCode', code);
    if (code === 'INR') {
      localStorage.removeItem('pref_fx_rate');
      setFxRate('');
    }
    toast.success('Currency updated — reload any open page to see converted values');
  };

  const handleFxRateSave = () => {
    const parsed = parseFloat(fxRate);
    if (!parsed || parsed <= 0) {
      toast.error('Enter a valid positive exchange rate');
      return;
    }
    localStorage.setItem('pref_fx_rate', String(parsed));
    toast.success(`Reference rate saved: 1 ${currencyCode} = ₹${parsed.toFixed(4)}`);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="Settings"
        description="Manage your profile, security, and preferences"
      />

      {/* Profile Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <User size={18} />
          Profile
        </h3>
        <form onSubmit={handleProfileSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              value={profile.name}
              onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={profile.email}
              readOnly
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              value={profile.phone}
              onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
              placeholder="9876543210"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <button
            type="submit"
            disabled={savingProfile}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
          >
            {savingProfile ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save Profile
          </button>
        </form>
      </div>

      {/* Security Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Lock size={18} />
          Security
        </h3>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
            <input
              type="password"
              value={security.currentPassword}
              onChange={(e) => setSecurity((s) => ({ ...s, currentPassword: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <input
              type="password"
              value={security.newPassword}
              onChange={(e) => setSecurity((s) => ({ ...s, newPassword: e.target.value }))}
              placeholder="At least 8 chars with uppercase, lowercase, and a number"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
            <input
              type="password"
              value={security.confirmPassword}
              onChange={(e) => setSecurity((s) => ({ ...s, confirmPassword: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <button
            type="submit"
            disabled={changingPassword}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
          >
            {changingPassword ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
            Change Password
          </button>
        </form>
      </div>

      {/* Preferences Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Palette size={18} />
          Preferences
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Number Format</label>
            <select
              value={preferences.currency}
              onChange={(e) => handlePreferenceChange('currency', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {CURRENCY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Area Unit</label>
            <select
              value={preferences.areaUnit}
              onChange={(e) => handlePreferenceChange('areaUnit', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {AREA_UNIT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date Format</label>
            <select
              value={preferences.dateFormat}
              onChange={(e) => handlePreferenceChange('dateFormat', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {DATE_FORMAT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Currency Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-1 flex items-center gap-2">
          <DollarSign size={18} />
          Display Currency
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          All deal values are stored in INR Crores. Select a display currency and enter your reference exchange rate — REDIP does not fetch live FX rates.
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
            <select
              value={currencyCode}
              onChange={(e) => handleCurrencyCodeChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {CURRENCY_CODE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {currencyCode !== 'INR' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reference rate: 1 {currencyCode} = how many INR?
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={fxRate}
                  onChange={(e) => setFxRate(e.target.value)}
                  placeholder={`e.g. ${currencyCode === 'USD' ? '84.20' : currencyCode === 'AED' ? '22.90' : currencyCode === 'EUR' ? '91.50' : currencyCode === 'GBP' ? '107.00' : currencyCode === 'JPY' ? '0.55' : currencyCode === 'SGD' ? '62.00' : currencyCode === 'LKR' ? '0.31' : '2.45'}`}
                  step="0.0001"
                  min="0"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  onClick={handleFxRateSave}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition"
                >
                  <Save size={14} />
                  Save Rate
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-400">
                Enter the rate from a source you trust (e.g. RBI, your bank, Bloomberg). This is for display only and does not affect stored data.
              </p>
              {localStorage.getItem('pref_fx_rate') && (
                <p className="mt-1 text-xs text-emerald-600 font-medium">
                  Active rate: 1 {currencyCode} = ₹{parseFloat(localStorage.getItem('pref_fx_rate')).toFixed(4)}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
