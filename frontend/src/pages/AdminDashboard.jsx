import React, { useState, useEffect } from 'react';
import API from '../services/api';
import StatCard from '../components/common/StatCard';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import {
  Warehouse,
  IndianRupee,
  Truck,
  ShoppingCart,
  ArrowDownRight,
  TrendingUp,
  AlertTriangle,
  Users,
  CreditCard,
  CheckCircle2,
  DollarSign
} from 'lucide-react';

import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement);

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const [dashRes, analyticRes] = await Promise.all([
          API.get('/reports/dashboard'),
          API.get('/reports/analytics')
        ]);
        setData(dashRes.data);
        setAnalytics(analyticRes.data);
      } catch (err) {
        console.error('Error fetching dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) return <LoadingSkeleton count={6} />;

  const kpis = data?.kpis || {};

  // Sales Trend Chart Config
  const salesChartData = {
    labels: analytics?.salesTrend?.map(d => d.date) || [],
    datasets: [
      {
        label: 'Daily Revenue (₹)',
        data: analytics?.salesTrend?.map(d => d.revenue) || [],
        borderColor: '#0051A5',
        backgroundColor: 'rgba(0, 81, 165, 0.1)',
        fill: true,
        tension: 0.3,
      }
    ]
  };

  // Top Products Bar Chart Config
  const topProductsChartData = {
    labels: analytics?.topProducts?.map(p => p.name) || [],
    datasets: [
      {
        label: 'Cases Sold',
        data: analytics?.topProducts?.map(p => p.quantity) || [],
        backgroundColor: ['#0051A5', '#E32934', '#10B981', '#F59E0B', '#8B5CF6', '#3B82F6'],
        borderRadius: 8,
      }
    ]
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Distribution Overview
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time warehouse stock, van loading, customer credit & daily profit in Cases
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center px-3 py-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-full text-xs font-semibold border border-emerald-200 dark:border-emerald-800">
            <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse" />
            Live Ledger Sync Active
          </span>
        </div>
      </div>

      {/* Primary KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard
          title="Warehouse Stock"
          value={`${kpis.totalWarehouseStock?.toLocaleString() || 0} Cases`}
          subtitle={`Value: ₹${kpis.totalWarehouseValue?.toLocaleString() || 0}`}
          icon={Warehouse}
          color="blue"
        />
        <StatCard
          title="Vehicle Stock"
          value={`${kpis.totalVehicleStock?.toLocaleString() || 0} Cases`}
          subtitle={`Value: ₹${kpis.totalVehicleValue?.toLocaleString() || 0}`}
          icon={Truck}
          color="purple"
        />
        <StatCard
          title="Today's Sales"
          value={`₹${kpis.todaySalesTotal?.toLocaleString() || 0}`}
          subtitle="Van Sales POS"
          icon={ShoppingCart}
          color="green"
        />
        <StatCard
          title="Today's Profit"
          value={`₹${kpis.todayProfit?.toLocaleString() || 0}`}
          subtitle="Gross Revenue - Cost"
          icon={TrendingUp}
          color="green"
        />
        <StatCard
          title="Pending Credit"
          value={`₹${kpis.pendingCreditAmount?.toLocaleString() || 0}`}
          subtitle="Customer Balance"
          icon={CreditCard}
          color="red"
        />
      </div>

      {/* Secondary Quick Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700 text-xs">
          <p className="text-slate-400 uppercase font-bold text-[10px]">Cash Collection</p>
          <p className="text-base font-extrabold text-slate-900 dark:text-white mt-1">₹{kpis.cashToday?.toLocaleString() || 0}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700 text-xs">
          <p className="text-slate-400 uppercase font-bold text-[10px]">UPI Collection</p>
          <p className="text-base font-extrabold text-slate-900 dark:text-white mt-1">₹{kpis.upiToday?.toLocaleString() || 0}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700 text-xs">
          <p className="text-slate-400 uppercase font-bold text-[10px]">Today Purchases</p>
          <p className="text-base font-extrabold text-slate-900 dark:text-white mt-1">₹{kpis.todayPurchasesTotal?.toLocaleString() || 0}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700 text-xs">
          <p className="text-slate-400 uppercase font-bold text-[10px]">Today Returns</p>
          <p className="text-base font-extrabold text-slate-900 dark:text-white mt-1">₹{kpis.todayReturnsTotal?.toLocaleString() || 0}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700 text-xs">
          <p className="text-slate-400 uppercase font-bold text-[10px]">Low Stock Items</p>
          <p className="text-base font-extrabold text-amber-500 mt-1">{kpis.lowStockProducts || 0} SKUs</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700 text-xs">
          <p className="text-slate-400 uppercase font-bold text-[10px]">Active Vans</p>
          <p className="text-base font-extrabold text-blue-500 mt-1">{kpis.activeVehicles || 0} Vehicles</p>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trend Line Chart */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Daily Sales Trend (Last 7 Days)</h3>
            <span className="text-xs text-slate-400">Revenue (₹)</span>
          </div>
          <div className="h-64">
            <Line data={salesChartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>

        {/* Top Selling Products Bar Chart */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Top Selling Products</h3>
            <span className="text-xs text-slate-400">Cases Sold</span>
          </div>
          <div className="h-64">
            <Bar data={topProductsChartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent Sales & Invoices</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400 uppercase text-[10px] font-bold">
                <th className="py-2.5 px-3">Invoice No</th>
                <th className="py-2.5 px-3">Customer Shop</th>
                <th className="py-2.5 px-3">Salesman</th>
                <th className="py-2.5 px-3">Payment</th>
                <th className="py-2.5 px-3 text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {data?.recentSales?.map((sale) => (
                <tr key={sale._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40">
                  <td className="py-2.5 px-3 font-bold text-blue-600 dark:text-blue-400">{sale.invoiceNumber}</td>
                  <td className="py-2.5 px-3 font-semibold">{sale.customer?.shopName || 'Customer'}</td>
                  <td className="py-2.5 px-3 text-slate-500">{sale.worker?.name || 'Worker'}</td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                      {sale.paymentMethod}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-black text-slate-900 dark:text-white">₹{sale.netTotal}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
