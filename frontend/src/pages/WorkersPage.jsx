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
  const [editingWorker, setEditingWorker] = useState(null);

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

  const handleOpenAddModal = () => {
    setEditingWorker(null);
    setFormData({ name: '', email: '', password: 'worker123', phone: '', assignedVehicle: '' });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (w) => {
    setEditingWorker(w);
    setFormData({
      name: w.name,
      email: w.email,
      password: '', // Leave blank if not changing password
      phone: w.phone || '',
      assignedVehicle: w.assignedVehicle?._id || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingWorker) {
        await API.put(`/auth/workers/${editingWorker._id}`, formData);
      } else {
        await API.post('/auth/workers', formData);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save worker');
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
          
        </div>
        <button
          onClick={handleOpenAddModal}
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
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => handleOpenEditModal(w)}
                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition"
                  title="Edit Worker"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(w._id)}
                  className="p-1.5 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 transition"
                  title="Delete Worker"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
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

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingWorker ? 'Edit Salesman Worker Account' : 'Register Salesman Worker Account'}>
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Ramesh Kumar"
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white font-bold"
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
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              {editingWorker ? 'New Password (leave blank to keep current)' : 'Initial Password'}
            </label>
            <input
              type="password"
              required={!editingWorker}
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
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white font-bold"
            >
              <option value="">-- Select Van --</option>
              {vehicles.map(v => <option key={v._id} value={v._id}>{v.vehicleNumber} ({v.vehicleName})</option>)}
            </select>
          </div>

          <button type="submit" className="w-full py-3 bg-pepsi-blue text-white font-bold rounded-xl hover:bg-blue-700 transition">
            {editingWorker ? 'Save Worker Changes' : 'Create Worker Account'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
