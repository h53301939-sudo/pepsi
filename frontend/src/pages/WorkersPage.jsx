import React, { useState, useEffect } from 'react';
import API from '../services/api';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import Modal from '../components/common/Modal';
import { UserCheck, Plus, Trash2, Edit2 } from 'lucide-react';

export default function WorkersPage() {
  const [workers, setWorkers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    assignedVehicle: ''
  });

  const fetchData = async () => {
    try {
      const [wRes, vRes] = await Promise.all([
        API.get('/auth/workers'),
        API.get('/vehicles')
      ]);
      setWorkers(wRes.data || []);
      setVehicles(vRes.data || []);
    } catch (err) {
      console.error('Error loading workers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await API.post('/auth/workers', formData);
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add worker');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Remove worker staff account?')) {
      try {
        await API.delete(`/auth/workers/${id}`);
        fetchData();
      } catch (err) {
        alert('Failed to delete worker');
      }
    }
  };

  if (loading) return <LoadingSkeleton count={4} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Salesman & Worker Staff Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Manage route salesman credentials and assigned van links
          </p>
        </div>
        <button
          onClick={() => {
            setFormData({ name: '', email: '', password: 'worker123', phone: '', assignedVehicle: '' });
            setIsModalOpen(true);
          }}
          className="flex items-center space-x-2 px-4 py-2.5 bg-pepsi-blue text-white rounded-xl font-bold text-xs shadow hover:bg-blue-700 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Salesman</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {workers.map((w) => (
          <div key={w._id} className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">{w.name}</h3>
                <p className="text-xs text-slate-500">{w.email}</p>
                <p className="text-[11px] text-slate-400 font-semibold">{w.phone || 'No Phone'}</p>
              </div>
              <button onClick={() => handleDelete(w._id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="border-t pt-3 border-slate-100 dark:border-slate-700 text-xs flex justify-between">
              <span className="text-slate-500">Assigned Van:</span>
              <span className="font-extrabold text-blue-600 dark:text-blue-400">
                {w.assignedVehicle?.vehicleNumber || 'Unassigned'}
              </span>
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Register Salesman Worker Account">
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Ramesh Kumar"
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="salesman@pepsi.com"
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
              <input
                type="text"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 98765 00000"
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Initial Password</label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Assign Van Vehicle</label>
            <select
              value={formData.assignedVehicle}
              onChange={(e) => setFormData({ ...formData, assignedVehicle: e.target.value })}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white"
            >
              <option value="">-- Select Van --</option>
              {vehicles.map(v => <option key={v._id} value={v._id}>{v.vehicleNumber} ({v.vehicleName})</option>)}
            </select>
          </div>

          <button type="submit" className="w-full py-3 bg-pepsi-blue text-white font-bold rounded-xl hover:bg-blue-700 transition">
            Create Worker Account
          </button>
        </form>
      </Modal>
    </div>
  );
}
