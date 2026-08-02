import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import { Truck, ShoppingCart, Receipt, Package, CornerUpLeft, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function WorkerDashboard() {
  const { user } = useAuth();
  const [vehicleStock, setVehicleStock] = useState(null);
  const [dashData, setDashData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashRes, stockRes] = await Promise.all([
          API.get('/reports/dashboard'),
          user?.assignedVehicle?._id ? API.get(`/vehicles/${user.assignedVehicle._id}/stock`) : Promise.resolve({ data: null })
        ]);
        setDashData(dashRes.data);
        if (stockRes.data) setVehicleStock(stockRes.data);
      } catch (err) {
        console.error('Error loading worker dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  if (loading) return <LoadingSkeleton count={4} />;

  const vanStockItems = vehicleStock?.stocks || [];
  const totalLoadedCases = vanStockItems.reduce((acc, curr) => acc + curr.quantity, 0);

  const kpis = dashData?.kpis || {};
  const recentSales = dashData?.recentSales || [];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-pepsi-blue to-blue-700 text-white p-6 rounded-3xl shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-widest bg-white/20 px-2.5 py-1 rounded-full">
            Salesman Route Dashboard
          </span>
          <h1 className="text-2xl font-black mt-2 tracking-tight">Welcome, {user?.name}!</h1>
          <p className="text-xs text-blue-100 mt-1">
            Assigned Van: <span className="font-bold underline">{user?.assignedVehicle?.vehicleNumber || 'Van 1'}</span> ({user?.assignedVehicle?.vehicleName || 'Tata Ace'})
          </p>
        </div>
        <Link
          to="/pos"
          className="px-5 py-3 bg-white text-pepsi-blue font-extrabold rounded-2xl shadow hover:bg-slate-100 transition flex items-center space-x-2 text-xs uppercase tracking-wider"
        >
          <ShoppingCart className="w-4 h-4 text-pepsi-red" />
          <span>Launch POS & Billing</span>
        </Link>
      </div>

      {/* Van & Real-Time System Daily Stats Overview (Identical to Admin Dashboard) */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1">
          <p className="text-xs text-slate-400 font-bold uppercase">Current Van Inventory</p>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white">{totalLoadedCases} Cases</h3>
          <p className="text-[11px] text-slate-500">{vanStockItems.length} Product SKUs Loaded</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1">
          <p className="text-xs text-slate-400 font-bold uppercase">Today's Total Sales</p>
          <h3 className="text-2xl font-black text-emerald-600">₹{kpis.todaySalesTotal?.toLocaleString() || 0}</h3>
          <p className="text-[11px] text-slate-500">Live Daily Revenue</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1">
          <p className="text-xs text-slate-400 font-bold uppercase">Today's Net Profit</p>
          <h3 className="text-2xl font-black text-blue-600">₹{kpis.todayProfit?.toLocaleString() || 0}</h3>
          <p className="text-[11px] text-slate-500">Gross Margin</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1">
          <p className="text-xs text-slate-400 font-bold uppercase">End of Shift Action</p>
          <Link to="/returns" className="text-xs font-bold text-pepsi-blue dark:text-blue-400 hover:underline flex items-center space-x-1 mt-2">
            <CornerUpLeft className="w-4 h-4" />
            <span>Process Unsold Stock Return</span>
          </Link>
        </div>
      </div>

      {/* Live Van Stock Table */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Live Loaded Van Stock</h3>
          <span className="text-xs text-slate-400">Available for Route Sales</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400 uppercase text-[10px] font-bold">
                <th className="py-2.5 px-3">Item Name</th>
                <th className="py-2.5 px-3 text-center">Size</th>
                <th className="py-2.5 px-3 text-right">Case Price (₹)</th>
                <th className="py-2.5 px-3 text-center">Van Stock (Cases)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {vanStockItems.map((item) => (
                <tr key={item._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40">
                  <td className="py-2.5 px-3 font-extrabold text-slate-900 dark:text-white">{item.product?.name}</td>
                  <td className="py-2.5 px-3 text-center font-bold">
                    <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                      {item.product?.size || '250ml'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-black">₹{item.product?.sellingPrice} / Case</td>
                  <td className="py-2.5 px-3 text-center font-extrabold text-blue-600 dark:text-blue-400">
                    {item.quantity} Cases
                  </td>
                </tr>
              ))}
              {vanStockItems.length === 0 && (
                <tr>
                  <td colSpan="4" className="py-6 text-center text-slate-400 italic">
                    No stock currently loaded on vehicle. Visit Van Loading page.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
