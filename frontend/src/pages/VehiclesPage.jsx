import React, { useState, useEffect } from 'react';
import API from '../services/api';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import Modal from '../components/common/Modal';
import { Truck, Plus, User, CheckCircle, Package } from 'lucide-react';

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    vehicleNumber: '',
    vehicleName: '',
    driverName: '',
    assignedWorker: '',
    capacityCrates: 250,
    status: 'Available'
  });

  const fetchData = async () => {
    try {
      const [vRes, wRes] = await Promise.all([
        API.get('/vehicles'),
        API.get('/auth/workers')
      ]);
      setVehicles(vRes.data || []);
      setWorkers(wRes.data || []);
    } catch (err) {
      console.error('Error loading vehicles:', err);
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
      await API.post('/vehicles', formData);
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add vehicle');
    }
  };

  if (loading) return <LoadingSkeleton count={4} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Van Fleet & Vehicle Inventory
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Track Pepsi delivery vans, salesman assignments, live loaded stock in Cases, and route status
          </p>
        </div>
        <button
          onClick={() => {
            setFormData({
              vehicleNumber: `MH-04-XX-${Math.floor(1000 + Math.random() * 9000)}`,
              vehicleName: 'Tata Ace Van',
              driverName: '',
              assignedWorker: workers[0]?._id || '',
              capacityCrates: 250,
              status: 'Available'
            });
            setIsModalOpen(true);
          }}
          className="flex items-center space-x-2 px-4 py-2.5 bg-pepsi-blue text-white rounded-xl font-bold text-xs shadow hover:bg-blue-700 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Add Delivery Vehicle</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vehicles.map((v) => (
          <div key={v._id} className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/40 text-pepsi-blue rounded-xl">
                    <Truck className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 dark:text-white text-base">{v.vehicleNumber}</h3>
                    <p className="text-xs text-slate-500">{v.vehicleName}</p>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                  v.status === 'On Route' || v.status === 'Loaded'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                    : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                }`}>
                  {v.status}
                </span>
              </div>

              <div className="space-y-2 border-t pt-3 border-slate-100 dark:border-slate-700 text-xs">
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>Driver / Salesman:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{v.assignedWorker?.name || v.driverName || 'Unassigned'}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>Van Capacity:</span>
                  <span className="font-bold">{v.capacityCrates} Cases</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>Current Loaded Stock:</span>
                  <span className="font-extrabold text-blue-600 dark:text-blue-400">
                    {v.totalStockUnits || 0} Cases (₹{v.totalStockValue?.toLocaleString() || 0})
                  </span>
                </div>
              </div>

              {/* Breakdown List of Items Currently Loaded on this Van */}
              <div className="bg-slate-50 dark:bg-slate-700/40 p-3 rounded-xl border border-slate-100 dark:border-slate-700/60 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                  <span>Van Inventory Breakdown</span>
                  <span>{v.stockItems?.length || 0} SKUs</span>
                </div>

                <div className="space-y-1.5 max-h-32 overflow-y-auto text-xs pr-1">
                  {v.stockItems && v.stockItems.length > 0 ? (
                    v.stockItems.map((st) => (
                      <div key={st._id} className="flex justify-between items-center bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200/60 dark:border-slate-600/60">
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {st.product?.name} ({st.product?.size || '250ml'})
                        </span>
                        <span className="font-extrabold text-pepsi-blue dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded text-[11px]">
                          {st.quantity} Cases
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-[11px] text-slate-400 italic text-center py-2">
                      No stock currently loaded on this van.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Register Delivery Vehicle">
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Vehicle Registration Number</label>
              <input
                type="text"
                required
                value={formData.vehicleNumber}
                onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Vehicle Model / Name</label>
              <input
                type="text"
                required
                value={formData.vehicleName}
                onChange={(e) => setFormData({ ...formData, vehicleName: e.target.value })}
                placeholder="e.g. Tata Ace Van 1"
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Assign Worker / Salesman</label>
              <select
                value={formData.assignedWorker}
                onChange={(e) => setFormData({ ...formData, assignedWorker: e.target.value })}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white font-bold"
              >
                <option value="">-- Unassigned --</option>
                {workers.map(w => <option key={w._id} value={w._id}>{w.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Capacity (Cases)</label>
              <input
                type="number"
                required
                value={formData.capacityCrates}
                onChange={(e) => setFormData({ ...formData, capacityCrates: Number(e.target.value) })}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <button type="submit" className="w-full py-3 bg-pepsi-blue text-white font-bold rounded-xl hover:bg-blue-700 transition">
            Save Vehicle
          </button>
        </form>
      </Modal>
    </div>
  );
}
