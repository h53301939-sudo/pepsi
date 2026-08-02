import React, { useState, useEffect } from 'react';
import API from '../services/api';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import Modal from '../components/common/Modal';
import { Warehouse, AlertTriangle, ArrowRightLeft, ShieldAlert, Plus, Package } from 'lucide-react';

export default function WarehousePage() {
  const [stockData, setStockData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isDamageModalOpen, setIsDamageModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [adjustQty, setAdjustQty] = useState('');
  const [remarks, setRemarks] = useState('');

  const [damageForm, setDamageForm] = useState({
    productId: '',
    quantity: '',
    reason: 'Broken Bottle',
    source: 'Warehouse',
    remarks: ''
  });

  const fetchWarehouseStock = async () => {
    try {
      const res = await API.get('/warehouse/stock');
      setStockData(res.data);
    } catch (err) {
      console.error('Error loading warehouse stock:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarehouseStock();
  }, []);

  const handleOpenAdjust = (product) => {
    setSelectedProduct(product);
    setAdjustQty('');
    setRemarks('');
    setIsAdjustModalOpen(true);
  };

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    try {
      await API.post('/warehouse/adjust', {
        productId: selectedProduct._id,
        adjustmentQty: Number(adjustQty),
        remarks
      });
      setIsAdjustModalOpen(false);
      fetchWarehouseStock();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to adjust stock');
    }
  };

  const handleDamageSubmit = async (e) => {
    e.preventDefault();
    try {
      await API.post('/damages', damageForm);
      setIsDamageModalOpen(false);
      fetchWarehouseStock();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to log damage');
    }
  };

  if (loading) return <LoadingSkeleton count={5} />;

  const summary = stockData?.summary || {};
  const products = stockData?.products || [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Central Warehouse Stock & Valuation (Cases)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Single Source Inventory Ledger measured strictly in Cases and Case Pricing
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setIsDamageModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2.5 bg-red-600 text-white font-bold text-xs rounded-xl shadow hover:bg-red-700 transition"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Log Damaged Stock (Cases)</span>
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700">
          <p className="text-xs font-bold text-slate-400 uppercase">Total Warehouse Stock</p>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {summary.totalStockQty?.toLocaleString()} Cases
          </h3>
          <p className="text-[11px] text-slate-500">{summary.totalProducts} Product SKUs</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700">
          <p className="text-xs font-bold text-slate-400 uppercase">Total Stock Valuation</p>
          <h3 className="text-2xl font-black text-emerald-600 mt-1">
            ₹{summary.totalStockValue?.toLocaleString()}
          </h3>
          <p className="text-[11px] text-slate-500">Based on Case Pricing</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700">
          <p className="text-xs font-bold text-slate-400 uppercase">Ledger Protection</p>
          <h3 className="text-lg font-black text-blue-600 mt-1">Immutable Audit</h3>
          <p className="text-[11px] text-slate-500">Every Movement Logged</p>
        </div>
      </div>

      {/* Stock Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-700/40 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4 text-center">Size</th>
                <th className="py-3 px-4 text-right">Case Price (₹)</th>
                <th className="py-3 px-4 text-center">Warehouse Stock (Cases)</th>
                <th className="py-3 px-4 text-right">Total Valuation (₹)</th>
                <th className="py-3 px-4 text-right">Adjust Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {products.map((p) => {
                const val = p.warehouseStock * (p.sellingPrice || 0);

                return (
                  <tr key={p._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40">
                    <td className="py-3 px-4 font-extrabold text-slate-900 dark:text-white">{p.name}</td>
                    <td className="py-3 px-4 text-center font-bold">{p.size || '250ml'}</td>
                    <td className="py-3 px-4 text-right font-black">₹{p.sellingPrice} / Case</td>
                    <td className="py-3 px-4 text-center font-extrabold">
                      <span className="px-3 py-1 rounded-full text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                        {p.warehouseStock} Cases
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-black text-slate-900 dark:text-white">
                      ₹{val.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleOpenAdjust(p)}
                        className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-pepsi-blue dark:text-blue-300 font-bold rounded-lg hover:bg-blue-100 transition"
                      >
                        Adjust Cases
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjust Stock Modal */}
      <Modal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        title={`Stock Adjustment - ${selectedProduct?.name}`}
      >
        <form onSubmit={handleAdjustSubmit} className="space-y-4 text-xs">
          <p className="text-slate-500">
            Current Warehouse Stock: <span className="font-bold text-slate-900 dark:text-white">{selectedProduct?.warehouseStock} Cases</span>
          </p>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Adjustment Quantity in Cases (+ to increase, - to decrease)
            </label>
            <input
              type="number"
              required
              value={adjustQty}
              onChange={(e) => setAdjustQty(e.target.value)}
              placeholder="e.g. +10 or -5 Cases"
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white font-bold"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Audit Remarks</label>
            <textarea
              required
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Audit recount"
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white"
            />
          </div>

          <button type="submit" className="w-full py-3 bg-pepsi-blue text-white font-bold rounded-xl hover:bg-blue-700 transition">
            Commit Case Stock Adjustment
          </button>
        </form>
      </Modal>

      {/* Damage Log Modal */}
      <Modal
        isOpen={isDamageModalOpen}
        onClose={() => setIsDamageModalOpen(false)}
        title="Record Damaged Stock (Cases)"
      >
        <form onSubmit={handleDamageSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Select Product</label>
            <select
              required
              value={damageForm.productId}
              onChange={(e) => setDamageForm({ ...damageForm, productId: e.target.value })}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white"
            >
              <option value="">-- Select Product --</option>
              {products.map((p) => (
                <option key={p._id} value={p._id}>{p.name} ({p.size}) - Stock: {p.warehouseStock} Cases</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Damaged Quantity (Cases)</label>
              <input
                type="number"
                required
                min="1"
                value={damageForm.quantity}
                onChange={(e) => setDamageForm({ ...damageForm, quantity: e.target.value })}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Reason</label>
              <select
                value={damageForm.reason}
                onChange={(e) => setDamageForm({ ...damageForm, reason: e.target.value })}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white"
              >
                <option value="Broken Bottle">Broken Case</option>
                <option value="Leakage">Cap Leakage</option>
                <option value="Expired">Expired Product</option>
                <option value="Transport Damage">Transport Damage</option>
              </select>
            </div>
          </div>

          <button type="submit" className="w-full py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition">
            Deduct & Record Damage
          </button>
        </form>
      </Modal>
    </div>
  );
}
