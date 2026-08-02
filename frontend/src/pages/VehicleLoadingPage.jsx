import React, { useState, useEffect } from 'react';
import API from '../services/api';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import { Warehouse, CheckCircle, Plus, Trash2, Loader2 } from 'lucide-react';

export default function VehicleLoadingPage() {
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
      setVehicles(vRes.data || []);
      setProducts(pRes.data || []);
      setLoadingHistory(hRes.data || []);
      
      let vid = selectedVehicle || (vRes.data && vRes.data[0]?._id) || '';
      setSelectedVehicle(vid);
      if (pRes.data && pRes.data.length > 0) {
        setLoadItems([{ product: pRes.data[0]._id, cases: '' }]);
      }
    } catch (err) {
      console.error('Error fetching loading data:', err);
    } fontFinally: {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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

      alert(res.data?.message || 'Cases loaded successfully onto Van!');
      setLoadItems([{ product: products[0]?._id || '', cases: '' }]);
      setRemarks('');
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to load stock');
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
            Select items from Admin dropdown and transfer Cases from Warehouse to Delivery Van
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
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Select Target Delivery Van</label>
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
                          {p.name} | Size: {p.size || '250ml'} | Case Price: ₹{p.sellingPrice} | Available Warehouse: {p.warehouseStock} Cases
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
                      className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white font-black text-center text-sm"
                    />
                  </div>

                  {loadItems.length > 1 && (
                    <button type="button" onClick={() => handleRemoveItem(idx)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddItem}
                className="text-xs font-bold text-pepsi-blue hover:underline flex items-center space-x-1"
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
              className="w-full py-3.5 bg-pepsi-blue text-white font-extrabold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition flex items-center justify-center space-x-2 text-sm shadow-md"
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

        {/* Loading History Log (1 col) */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent Van Loading Logs</h3>
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {loadingHistory.slice(0, 15).map((h) => (
              <div key={h._id} className="p-3 bg-slate-50 dark:bg-slate-700/40 rounded-xl border border-slate-100 dark:border-slate-700 text-xs space-y-1">
                <div className="flex justify-between font-bold text-slate-900 dark:text-white">
                  <span>{h.product?.name} ({h.product?.size || '250ml'})</span>
                  <span className="text-blue-600 dark:text-blue-400">+{h.quantity} Cases</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Case Price: ₹{h.product?.sellingPrice} | Van: <span className="font-semibold">{h.destId?.vehicleNumber}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
