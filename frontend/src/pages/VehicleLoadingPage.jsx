import React, { useState, useEffect } from 'react';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import { Warehouse, CheckCircle, Plus, Trash2, Loader2, Truck } from 'lucide-react';

export default function VehicleLoadingPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [vehicles, setVehicles] = useState([]);
  const [products, setProducts] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [loadItems, setLoadItems] = useState([{ product: '', cases: '' }]);
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const [vRes, pRes, hRes] = await Promise.all([
        API.get('/vehicles'),
        API.get('/products'),
        API.get('/loading/history')
      ]);

      let vList = vRes.data || [];
      if (user?.role === 'worker') {
        const assignedId = user?.assignedVehicle?._id || user?.assignedVehicle;
        if (assignedId) {
          const matchingVan = vList.find(v => String(v._id) === String(assignedId));
          vList = matchingVan ? [matchingVan] : [];
        } else {
          vList = [];
        }
      }

      setVehicles(vList);
      setProducts(pRes.data || []);
      setLoadingHistory(hRes.data || []);
      
      let vid = (user?.role === 'worker' ? (user?.assignedVehicle?._id || user?.assignedVehicle) : selectedVehicle) || (vList && vList[0]?._id) || '';
      setSelectedVehicle(vid);
      if (pRes.data && pRes.data.length > 0) {
        setLoadItems([{ product: pRes.data[0]._id, cases: '' }]);
      }
    } catch (err) {
      console.error('Error fetching loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleVehicleChange = (vid) => {
    setSelectedVehicle(vid);
  };

  const handleAddItem = () => {
    setLoadItems([...loadItems, { product: products[0]?._id || '', cases: '' }]);
  };

  const handleRemoveItem = (idx) => {
    setLoadItems(loadItems.filter((_, i) => i !== idx));
  };

  const handleConfirmLoading = async (e) => {
    e.preventDefault();
    if (isSubmitting) return; // Single-click locking

    setIsSubmitting(true);
    try {
      const itemsPayload = loadItems.map(i => ({
        product: i.product,
        quantity: Number(i.cases) // Quantity in Cases
      }));

      const res = await API.post('/loading', {
        vehicleId: selectedVehicle,
        items: itemsPayload,
        remarks
      });

      toast.success(res.data?.message || 'Cases loaded successfully onto Van! 🚚', 'Van Loaded');
      setLoadItems([{ product: products[0]?._id || '', cases: '' }]);
      setRemarks('');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load stock', 'Loading Failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <LoadingSkeleton count={4} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Vehicle Loading & Stock Transfer (Cases)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {user?.role === 'worker' 
              ? 'Transfer product cases from Central Warehouse onto your assigned delivery van'
              : 'Select items from Admin dropdown and transfer Cases from Warehouse to Delivery Van'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Loading Wizard Form (2 cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-5">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <Warehouse className="w-4 h-4 text-pepsi-blue" />
            <span>Warehouse Stock Transfer to Van</span>
          </h3>

          <form onSubmit={handleConfirmLoading} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {user?.role === 'worker' ? 'Your Assigned Delivery Van' : 'Select Target Delivery Van'}
              </label>

              {user?.role === 'worker' ? (
                <div className="p-3 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-xl flex items-center space-x-2.5 shadow-sm">
                  <Truck className="w-5 h-5 text-pepsi-blue shrink-0" />
                  <div>
                    <span className="font-extrabold text-sm text-[#002B7F] dark:text-blue-300 block">
                      {vehicles[0]
                        ? `${vehicles[0].vehicleNumber} (${vehicles[0].vehicleName})`
                        : (user?.assignedVehicle?.vehicleNumber ? `${user.assignedVehicle.vehicleNumber} (${user.assignedVehicle.vehicleName || 'Van'})` : 'No Van Assigned')}
                    </span>
                    <span className="text-[11px] text-slate-500 font-semibold">
                      Assigned Driver: {user?.name || 'Worker'}
                    </span>
                  </div>
                </div>
              ) : (
                <select
                  required
                  value={selectedVehicle}
                  onChange={(e) => handleVehicleChange(e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl font-extrabold text-slate-900 dark:text-white text-sm"
                >
                  {vehicles.map(v => (
                    <option key={v._id} value={v._id}>
                      {v.vehicleNumber} ({v.vehicleName}) - Driver: {v.assignedWorker?.name || v.driverName || 'Unassigned'}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="space-y-3 pt-2">
              <label className="block font-bold text-slate-700 dark:text-slate-300">
                Select Items to Load (Cases)
              </label>

              {loadItems.map((item, idx) => (
                <div key={idx} className="flex items-center space-x-3 bg-slate-50 dark:bg-slate-700/50 p-3 rounded-xl border border-slate-200 dark:border-slate-600">
                  <div className="flex-1">
                    <select
                      required
                      value={item.product}
                      onChange={(e) => {
                        const updated = [...loadItems];
                        updated[idx].product = e.target.value;
                        setLoadItems(updated);
                      }}
                      className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg font-bold text-slate-900 dark:text-white"
                    >
                      {products.map(p => (
                        <option key={p._id} value={p._id}>
                          {p.name} | Size: {p.size || 'Standard'} | Case Price: ₹{p.sellingPrice} | Available Warehouse: {p.warehouseStock || 0} Cases
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-32">
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="Cases"
                      value={item.cases}
                      onChange={(e) => {
                        const updated = [...loadItems];
                        updated[idx].cases = e.target.value;
                        setLoadItems(updated);
                      }}
                      className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg font-bold text-slate-900 dark:text-white"
                    />
                  </div>

                  {loadItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddItem}
                className="text-pepsi-blue dark:text-blue-400 font-bold flex items-center space-x-1 hover:underline pt-1"
              >
                <Plus className="w-4 h-4" />
                <span>Add Another Item Line</span>
              </button>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Remarks</label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g. Morning route loading"
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-pepsi-blue text-white rounded-xl font-black text-sm hover:bg-blue-700 transition flex items-center justify-center space-x-2 shadow-lg shadow-blue-600/30 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Transferring Cases...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Confirm & Transfer Cases to Van</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Recent Loading History (1 col) */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <span>Recent Van Loadings</span>
          </h3>

          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {loadingHistory.map((h) => (
              <div key={h._id} className="p-3 bg-slate-50 dark:bg-slate-700/40 rounded-xl border border-slate-200 dark:border-slate-600 space-y-1">
                <div className="flex justify-between items-start">
                  <span className="font-black text-slate-900 dark:text-white text-xs">{h.vehicle?.vehicleNumber}</span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(h.createdAt).toLocaleDateString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-300">
                  Total Cases Loaded: <span className="font-black text-emerald-600">{(h.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0)}</span>
                </div>
                <div className="text-[10px] text-slate-400">
                  Worker: {h.loadedBy?.name || 'Admin'}
                </div>
              </div>
            ))}
            {loadingHistory.length === 0 && (
              <p className="text-center py-6 text-slate-400 text-xs italic">No load logs found.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
