import React, { useState, useEffect } from 'react';
import API from '../services/api';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import { Settings, Save, CheckCircle, ShieldCheck } from 'lucide-react';

export default function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await API.get('/settings');
        setSettings(res.data);
      } catch (err) {
        console.error('Error fetching settings:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await API.put('/settings', settings);
      setSettings(res.data);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      alert('Failed to save settings');
    }
  };

  if (loading) return <LoadingSkeleton count={4} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          System & Company Settings
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Configure distribution agency details, real company name, hub address, and invoice headers
        </p>
      </div>

      {savedSuccess && (
        <div className="flex items-center space-x-2 p-3 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-xl text-xs font-bold border border-emerald-200">
          <CheckCircle className="w-4 h-4" />
          <span>Settings updated successfully!</span>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4 max-w-3xl">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2 border-b pb-3 border-slate-100 dark:border-slate-700">
          <Settings className="w-4 h-4 text-pepsi-blue" />
          <span>Real Distribution Agency Details</span>
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Company / Agency Name</label>
            <input
              type="text"
              required
              value={settings.companyName || ''}
              onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
              placeholder="e.g. Shree Pepsi Beverages Distribution Agency"
              className="w-full p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl font-black text-slate-900 dark:text-white text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Contact Phone</label>
              <input
                type="text"
                value={settings.phone || ''}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                placeholder="+91 98765 43210"
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Contact Email</label>
              <input
                type="email"
                value={settings.email || ''}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                placeholder="agency@pepsi-distributor.com"
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Distribution Hub Street Address</label>
            <textarea
              rows={2}
              value={settings.address || ''}
              onChange={(e) => setSettings({ ...settings, address: e.target.value })}
              placeholder="Enter complete real street address..."
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white font-semibold"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Printed Invoice Footer Note</label>
            <input
              type="text"
              value={settings.invoiceFooter || ''}
              onChange={(e) => setSettings({ ...settings, invoiceFooter: e.target.value })}
              placeholder="Thank you for choosing Pepsi Products!"
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white font-semibold"
            />
          </div>

          <button type="submit" className="py-3 px-6 bg-pepsi-blue text-white font-extrabold rounded-xl hover:bg-blue-700 transition flex items-center space-x-2 text-sm shadow">
            <Save className="w-4 h-4" />
            <span>Save Distribution Agency Details</span>
          </button>
        </form>
      </div>
    </div>
  );
}
