import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import InvoiceModal from '../invoice/InvoiceModal';
import API from '../../services/api';
import { 
  TrendingUp, 
  DollarSign, 
  Package, 
  Receipt, 
  Truck, 
  Phone, 
  Mail, 
  ShieldCheck, 
  ShieldAlert, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Eye,
  FileText,
  Search,
  Calendar,
  Clock
} from 'lucide-react';

export default function WorkerProfileModal({ isOpen, onClose, workerId, onWorkerUpdated }) {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState('');

  // Invoice Tab & Search states
  const [activeTab, setActiveTab] = useState('today'); // 'today' or 'all'
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [selectedInvoiceForModal, setSelectedInvoiceForModal] = useState(null);

  const fetchProfile = async () => {
    if (!workerId) return;
    setLoading(true);
    setError('');

    try {
      // Fetch active sales, workers & products endpoints
      const [salesRes, workersRes, productsRes] = await Promise.all([
        API.get('/sales'),
        API.get('/auth/workers'),
        API.get('/products')
      ]);

      const allWorkers = workersRes.data || [];
      const currentWorker = allWorkers.find(w => String(w._id) === String(workerId));

      if (!currentWorker) {
        setError('Worker record not found.');
        setLoading(false);
        return;
      }

      const allProducts = productsRes.data || [];
      const productPriceMap = {};
      allProducts.forEach(p => {
        productPriceMap[String(p._id)] = p.purchasePrice || p.costPrice || 0;
      });

      const allSales = salesRes.data || [];
      // Filter sales strictly for this worker
      const workerSales = allSales.filter(s => {
        const wId = s.worker?._id || s.worker;
        return String(wId) === String(workerId);
      });

      // Compute Today's Date bounds (local midnight)
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

      let lifetimeSales = 0;
      let lifetimeProfit = 0;
      let totalCasesSold = 0;

      let todaySalesTotal = 0;
      let todayProfitTotal = 0;
      let todayCasesSold = 0;
      const todaySalesList = [];

      workerSales.forEach((sale) => {
        const netAmt = sale.netTotal || 0;
        lifetimeSales += netAmt;

        let saleCost = 0;
        let saleCases = 0;

        (sale.items || []).forEach((item) => {
          const qty = item.quantity || 0;
          saleCases += qty;
          const pId = item.product?._id || item.product;
          const unitCost = productPriceMap[String(pId)] || (item.product && (item.product.purchasePrice || item.product.costPrice)) || 0;
          saleCost += (qty * unitCost);
        });

        totalCasesSold += saleCases;
        const profit = netAmt - saleCost;
        lifetimeProfit += profit;

        const saleDate = new Date(sale.createdAt);
        if (saleDate >= todayStart && saleDate <= todayEnd) {
          todaySalesTotal += netAmt;
          todayProfitTotal += profit;
          todayCasesSold += saleCases;
          todaySalesList.push(sale);
        }
      });

      const totalInvoices = workerSales.length;

      setProfileData({
        worker: currentWorker,
        todayAnalytics: {
          sales: todaySalesTotal,
          profit: todayProfitTotal,
          cases: todayCasesSold,
          invoicesCount: todaySalesList.length,
          margin: todaySalesTotal > 0 ? ((todayProfitTotal / todaySalesTotal) * 100).toFixed(1) : '0'
        },
        lifetimeAnalytics: {
          sales: lifetimeSales,
          profit: lifetimeProfit,
          cases: totalCasesSold,
          invoicesCount: totalInvoices,
          averageOrderValue: totalInvoices > 0 ? Math.round(lifetimeSales / totalInvoices) : 0,
          margin: lifetimeSales > 0 ? ((lifetimeProfit / lifetimeSales) * 100).toFixed(1) : '0'
        },
        todaySales: todaySalesList,
        allSales: workerSales
      });
    } catch (err) {
      console.error('Error loading worker profile:', err);
      setError(err.response?.data?.message || 'Failed to load worker profile data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && workerId) {
      fetchProfile();
      setActiveTab('today');
      setInvoiceSearch('');
    } else {
      setProfileData(null);
    }
  }, [isOpen, workerId]);

  const handleToggleStatus = async () => {
    if (!profileData?.worker) return;
    const isCurrentlyActive = profileData.worker.active !== false;
    const confirmMsg = isCurrentlyActive
      ? `Are you sure you want to BLOCK ${profileData.worker.name}? They will be unable to log in or make sales.`
      : `Unblock and activate ${profileData.worker.name}'s account?`;

    if (!window.confirm(confirmMsg)) return;

    setToggling(true);
    try {
      const res = await API.put(`/auth/workers/${workerId}`, { active: !isCurrentlyActive });
      setProfileData(prev => ({
        ...prev,
        worker: res.data || { ...prev.worker, active: !isCurrentlyActive }
      }));
      if (onWorkerUpdated) onWorkerUpdated();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update worker status');
    } finally {
      setToggling(false);
    }
  };

  if (!isOpen) return null;

  const worker = profileData?.worker;
  const todayAnalytics = profileData?.todayAnalytics || { sales: 0, profit: 0, cases: 0, invoicesCount: 0, margin: 0 };
  const lifetimeAnalytics = profileData?.lifetimeAnalytics || { sales: 0, profit: 0, cases: 0, invoicesCount: 0, averageOrderValue: 0, margin: 0 };
  const todaySales = profileData?.todaySales || [];
  const allSales = profileData?.allSales || [];
  const isActive = worker ? worker.active !== false : true;

  // Selected invoices according to tab & search query
  const displayedSalesList = (activeTab === 'today' ? todaySales : allSales).filter(s => {
    if (!invoiceSearch) return true;
    const q = invoiceSearch.toLowerCase();
    const invNum = (s.invoiceNumber || '').toLowerCase();
    const shop = (s.customer?.shopName || '').toLowerCase();
    const owner = (s.customer?.ownerName || '').toLowerCase();
    return invNum.includes(q) || shop.includes(q) || owner.includes(q);
  });

  return (
    <>
      <Modal 
        isOpen={isOpen} 
        onClose={onClose} 
        title={worker ? `Worker Profile & Sales Dashboard: ${worker.name}` : 'Worker Performance Profile'}
        maxWidth="max-w-5xl"
      >
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-pepsi-blue animate-spin" />
            <p className="text-sm font-bold text-slate-500">Loading worker profile, today's sales & invoices...</p>
          </div>
        ) : error ? (
          <div className="py-10 text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
            <p className="text-sm font-bold text-red-600">{error}</p>
            <button
              onClick={fetchProfile}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition"
            >
              Retry
            </button>
          </div>
        ) : worker ? (
          <div className="space-y-6">
            
            {/* 👤 WORKER HEADER & PROFILE CARD */}
            <div className="bg-gradient-to-br from-slate-900 via-[#001D66] to-slate-900 text-white p-5 sm:p-6 rounded-2xl shadow-lg border border-blue-900/40 relative overflow-hidden">
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                
                {/* Left: Avatar + Details */}
                <div className="flex items-center space-x-4">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-xl sm:text-2xl font-black text-white shadow-inner shrink-0">
                    {worker.name ? worker.name.charAt(0).toUpperCase() : 'W'}
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">{worker.name}</h2>
                      {isActive ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Active Salesman</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-red-500/20 text-red-300 border border-red-500/40 animate-pulse">
                          <ShieldAlert className="w-3 h-3" />
                          <span>Blocked Account</span>
                        </span>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300">
                      <div className="flex items-center space-x-1">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span>{worker.email}</span>
                      </div>
                      {worker.phone && (
                        <div className="flex items-center space-x-1">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{worker.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center space-x-1">
                        <Truck className="w-3.5 h-3.5 text-blue-300" />
                        <span className="font-bold text-white">
                          Assigned Van: {worker.assignedVehicle?.vehicleNumber || 'Unassigned'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Block / Unblock Toggle Switch Container */}
                <div className="shrink-0 flex items-center bg-white/10 backdrop-blur-sm border border-white/15 px-4 py-2.5 rounded-2xl space-x-3">
                  <div className="text-right">
                    <span className="text-[11px] block font-bold text-slate-300">Account Access:</span>
                    <span className={`text-xs font-black ${isActive ? 'text-emerald-400' : 'text-red-400'}`}>
                      {isActive ? 'Active (Allowed)' : 'Blocked (No Access)'}
                    </span>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={isActive}
                    disabled={toggling}
                    onClick={handleToggleStatus}
                    className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50 ${
                      isActive ? 'bg-emerald-500' : 'bg-slate-600'
                    }`}
                    title={isActive ? 'Click to Block Account' : 'Click to Unblock Account'}
                  >
                    <span
                      className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        isActive ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

              </div>
            </div>

            {/* 🌟 1. TODAY'S SALES & PROFIT METRICS (LIVE TODAY) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>Today's Performance Overview (Live Today)</span>
                </h3>
                <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  {todayAnalytics.invoicesCount} Invoices Today
                </span>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                
                {/* 💰 Today's Sales */}
                <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 shadow-sm space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Today's Sales</span>
                    <div className="p-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
                      <DollarSign className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-lg sm:text-2xl font-black text-emerald-700 dark:text-emerald-300">
                    ₹{Number(todayAnalytics.sales || 0).toLocaleString('en-IN')}
                  </div>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Today's Net Revenue</p>
                </div>

                {/* 📈 Today's Profit */}
                <div className="bg-blue-50/50 dark:bg-blue-950/20 p-4 rounded-2xl border border-blue-200 dark:border-blue-800/60 shadow-sm space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">Today's Profit</span>
                    <div className="p-1.5 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-pepsi-blue dark:text-blue-300">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-lg sm:text-2xl font-black text-[#002B7F] dark:text-blue-300">
                    ₹{Number(Math.round(todayAnalytics.profit || 0)).toLocaleString('en-IN')}
                  </div>
                  <p className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                    Margin: {todayAnalytics.margin}%
                  </p>
                </div>

                {/* 📦 Today's Cases Sold */}
                <div className="bg-amber-50/50 dark:bg-amber-950/20 p-4 rounded-2xl border border-amber-200 dark:border-amber-800/60 shadow-sm space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Cases Sold Today</span>
                    <div className="p-1.5 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300">
                      <Package className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-lg sm:text-2xl font-black text-amber-800 dark:text-amber-300">
                    {Number(todayAnalytics.cases || 0).toLocaleString('en-IN')} Cases
                  </div>
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">Delivered Today</p>
                </div>

                {/* 🧾 Today's Invoices */}
                <div className="bg-purple-50/50 dark:bg-purple-950/20 p-4 rounded-2xl border border-purple-200 dark:border-purple-800/60 shadow-sm space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider">Today's Invoices</span>
                    <div className="p-1.5 rounded-xl bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300">
                      <Receipt className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-lg sm:text-2xl font-black text-purple-800 dark:text-purple-300">
                    {Number(todayAnalytics.invoicesCount || 0).toLocaleString('en-IN')} Orders
                  </div>
                  <p className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold">
                    Avg: ₹{todayAnalytics.invoicesCount > 0 ? Math.round(todayAnalytics.sales / todayAnalytics.invoicesCount).toLocaleString('en-IN') : 0}/sale
                  </p>
                </div>

              </div>
            </div>

            {/* 📊 2. LIFETIME PERFORMANCE STATS */}
            <div className="space-y-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Lifetime All-Time Performance
              </h3>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                
                {/* Lifetime Sales */}
                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Lifetime Sales</span>
                    <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <div className="text-base sm:text-xl font-black text-slate-900 dark:text-white">
                    ₹{Number(lifetimeAnalytics.sales || 0).toLocaleString('en-IN')}
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium">Total Cumulative Revenue</p>
                </div>

                {/* Lifetime Profit */}
                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Lifetime Profit</span>
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                  </div>
                  <div className="text-base sm:text-xl font-black text-emerald-600 dark:text-emerald-400">
                    ₹{Number(Math.round(lifetimeAnalytics.profit || 0)).toLocaleString('en-IN')}
                  </div>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                    Margin: {lifetimeAnalytics.margin}%
                  </p>
                </div>

                {/* Total Cases Sold */}
                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Cases Sold</span>
                    <Package className="w-3.5 h-3.5 text-amber-500" />
                  </div>
                  <div className="text-base sm:text-xl font-black text-slate-900 dark:text-white">
                    {Number(lifetimeAnalytics.cases || 0).toLocaleString('en-IN')}
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium">Cases Delivered</p>
                </div>

                {/* Total Orders / Invoices */}
                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Invoices</span>
                    <Receipt className="w-3.5 h-3.5 text-purple-500" />
                  </div>
                  <div className="text-base sm:text-xl font-black text-slate-900 dark:text-white">
                    {Number(lifetimeAnalytics.invoicesCount || 0).toLocaleString('en-IN')}
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium">
                    Avg: ₹{Number(lifetimeAnalytics.averageOrderValue || 0).toLocaleString('en-IN')}/sale
                  </p>
                </div>

              </div>
            </div>

            {/* 📜 3. SALES INVOICES HISTORY WITH TABS & INVOICE VIEWER */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm space-y-3 p-4 sm:p-5">
              
              {/* Header: Tabs + Search Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700">
                
                {/* Tab Switcher */}
                <div className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-700/60 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setActiveTab('today')}
                    className={`px-3 py-1.5 rounded-lg font-extrabold text-xs transition flex items-center space-x-1.5 ${
                      activeTab === 'today'
                        ? 'bg-pepsi-blue text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Today's Sales ({todaySales.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('all')}
                    className={`px-3 py-1.5 rounded-lg font-extrabold text-xs transition flex items-center space-x-1.5 ${
                      activeTab === 'all'
                        ? 'bg-pepsi-blue text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>All Invoices History ({allSales.length})</span>
                  </button>
                </div>

                {/* Search Input */}
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={invoiceSearch}
                    onChange={(e) => setInvoiceSearch(e.target.value)}
                    placeholder="Search invoice # or shop name..."
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-xs text-slate-900 dark:text-white"
                  />
                </div>

              </div>

              {/* Invoices Table */}
              {displayedSalesList.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-xs italic">
                  {activeTab === 'today' 
                    ? 'No sales billed by this worker today.' 
                    : 'No sales records found for this worker.'}
                </div>
              ) : (
                <div className="overflow-x-auto max-h-80 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-100 dark:border-slate-700 sticky top-0">
                      <tr>
                        <th className="py-2.5 px-4">Invoice #</th>
                        <th className="py-2.5 px-4">Customer Shop</th>
                        <th className="py-2.5 px-4 text-center">Cases</th>
                        <th className="py-2.5 px-4 text-right">Net Amount</th>
                        <th className="py-2.5 px-4 text-center">Status</th>
                        <th className="py-2.5 px-4">Date & Time</th>
                        <th className="py-2.5 px-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                      {displayedSalesList.map((sale) => {
                        const totalCases = (sale.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0);
                        return (
                          <tr key={sale._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition">
                            
                            {/* Invoice Number */}
                            <td className="py-2.5 px-4 font-bold text-blue-600 dark:text-blue-400">
                              {sale.invoiceNumber}
                            </td>

                            {/* Customer Shop */}
                            <td className="py-2.5 px-4">
                              <span className="font-bold text-slate-900 dark:text-white block">
                                {sale.customer?.shopName || 'Retail Customer'}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {sale.customer?.ownerName || sale.customer?.phone || ''}
                              </span>
                            </td>

                            {/* Total Cases */}
                            <td className="py-2.5 px-4 text-center font-bold text-slate-700 dark:text-slate-200">
                              {totalCases} cases
                            </td>

                            {/* Net Total */}
                            <td className="py-2.5 px-4 text-right font-black text-slate-900 dark:text-white">
                              ₹{Number(sale.netTotal || 0).toLocaleString('en-IN')}
                            </td>

                            {/* Payment Status */}
                            <td className="py-2.5 px-4 text-center">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                sale.status === 'Paid'
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                  : sale.status === 'Partial'
                                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                                  : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'
                              }`}>
                                {sale.paymentMethod} • {sale.status}
                              </span>
                            </td>

                            {/* Date & Time */}
                            <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap text-[11px]">
                              {new Date(sale.createdAt).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })} • {new Date(sale.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </td>

                            {/* View / Print Full Invoice Button */}
                            <td className="py-2.5 px-4 text-center">
                              <button
                                type="button"
                                onClick={() => setSelectedInvoiceForModal(sale)}
                                className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-[#002B7F] dark:text-blue-300 rounded-lg font-bold text-[11px] inline-flex items-center space-x-1 transition"
                                title="View & Print Full Bill Invoice"
                              >
                                <Eye className="w-3 h-3" />
                                <span>View Bill</span>
                              </button>
                            </td>

                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

            </div>

          </div>
        ) : null}
      </Modal>

      {/* 📄 FULL INVOICE MODAL (FOR VIEWING & PRINTING SELECTED BILL) */}
      {selectedInvoiceForModal && (
        <InvoiceModal
          isOpen={Boolean(selectedInvoiceForModal)}
          onClose={() => setSelectedInvoiceForModal(null)}
          sale={selectedInvoiceForModal}
        />
      )}
    </>
  );
}
