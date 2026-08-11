import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import { Truck, ShoppingCart, Receipt, Package, CornerUpLeft, TrendingUp, DollarSign, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function WorkerDashboard() {
  const { user } = useAuth();
  const [vehicleStock, setVehicleStock] = useState(null);
  const [workerSales, setWorkerSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const vanId = user?.assignedVehicle?._id || user?.assignedVehicle;
        const [salesRes, stockRes, prodRes] = await Promise.all([
          API.get('/sales'),
          vanId ? API.get(`/vehicles/${vanId}/stock`) : Promise.resolve({ data: null }),
          API.get('/products')
        ]);

        const allSales = salesRes.data || [];
        const allProducts = prodRes.data || [];

        // Filter sales strictly for THIS logged-in worker
        const mySales = allSales.filter(s => {
          const wId = s.worker?._id || s.worker;
          return String(wId) === String(user?._id);
        });

        setWorkerSales(mySales);
        setProducts(allProducts);
        if (stockRes.data) setVehicleStock(stockRes.data);
      } catch (err) {
        console.error('Error loading worker dashboard:', err);
      } finally {
        setLoading(false);
      }
    };

    if (user?._id) {
      fetchData();
    }
  }, [user]);

  if (loading) return <LoadingSkeleton count={4} />;

  // 1. Current Loaded Van Stock
  const vanStockItems = vehicleStock?.stocks || [];
  const totalLoadedCases = vanStockItems.reduce((acc, curr) => acc + (curr.quantity || 0), 0);

  // 2. Today's Date Calculation (Strict Local Midnight)
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  // 3. Worker's Sales Made TODAY
  const todaySales = workerSales.filter(s => {
    const sDate = new Date(s.createdAt);
    return sDate >= todayStart && sDate <= todayEnd;
  });

  // Map product cost prices for profit computation
  const productCostMap = {};
  products.forEach(p => {
    productCostMap[String(p._id)] = p.purchasePrice || p.costPrice || (p.sellingPrice * 0.8);
  });

  let todaySalesTotal = 0;
  let todayProfitTotal = 0;
  let todayCasesDelivered = 0;

  todaySales.forEach((sale) => {
    todaySalesTotal += (sale.netTotal || 0);

    let saleCost = 0;
    (sale.items || []).forEach((item) => {
      const qty = item.quantity || 0;
      todayCasesDelivered += qty;
      const pId = item.product?._id || item.product;
      const unitCost = productCostMap[String(pId)] || (item.product && (item.product.purchasePrice || item.product.costPrice)) || 0;
      saleCost += (qty * unitCost);
    });

    todayProfitTotal += ((sale.netTotal || 0) - saleCost);
  });

  return (
    <div className="space-y-6">
      
      {/* 🌟 SALESMAN WELCOME & ROUTE HERO BANNER */}
      <div className="bg-gradient-to-r from-[#002B7F] via-blue-800 to-[#001D66] text-white p-6 rounded-3xl shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-blue-700/40">
        <div>
          <span className="text-[10px] uppercase font-black tracking-widest bg-white/20 px-3 py-1 rounded-full border border-white/20 inline-block">
            Salesman Route Dashboard
          </span>
          <h1 className="text-2xl font-black mt-2 tracking-tight text-white">Welcome, {user?.name}!</h1>
          <p className="text-xs text-blue-200 mt-1 flex items-center space-x-1.5">
            <Truck className="w-3.5 h-3.5 text-blue-300" />
            <span>
              Assigned Van: <strong className="text-white underline">{user?.assignedVehicle?.vehicleNumber || 'Route Van'}</strong> ({user?.assignedVehicle?.vehicleName || 'Tata Ace'})
            </span>
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            to="/returns"
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl border border-white/20 transition flex items-center space-x-1.5 text-xs"
          >
            <CornerUpLeft className="w-4 h-4 text-blue-300" />
            <span>End-Shift Return</span>
          </Link>
          <Link
            to="/pos"
            className="px-5 py-2.5 bg-white text-[#002B7F] font-black rounded-2xl shadow-lg hover:bg-slate-100 transition flex items-center space-x-2 text-xs uppercase tracking-wider active:scale-95"
          >
            <ShoppingCart className="w-4 h-4 text-pepsi-red" />
            <span>Launch POS & Billing</span>
          </Link>
        </div>
      </div>

      {/* 📊 TODAY'S ROUTE PERFORMANCE STATS (STRICTLY THIS WORKER'S TODAY METRICS) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* 💰 Today's Sales (This Worker) */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Your Today's Sales</p>
            <div className="p-1.5 bg-emerald-50 dark:bg-emerald-950/50 rounded-lg text-emerald-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-emerald-600">
            ₹{todaySalesTotal.toLocaleString('en-IN')}
          </h3>
          <p className="text-[10px] text-slate-400 font-semibold">{todaySales.length} Orders Billed Today</p>
        </div>

        {/* 📈 Today's Net Profit (This Worker) */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Your Today's Profit</p>
            <div className="p-1.5 bg-blue-50 dark:bg-blue-950/50 rounded-lg text-pepsi-blue dark:text-blue-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-[#002B7F] dark:text-blue-400">
            ₹{Math.round(todayProfitTotal).toLocaleString('en-IN')}
          </h3>
          <p className="text-[10px] text-slate-400 font-semibold">
            Margin: {todaySalesTotal > 0 ? ((todayProfitTotal / todaySalesTotal) * 100).toFixed(1) : 0}%
          </p>
        </div>

        {/* 📦 Today's Cases Delivered (This Worker) */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Cases Delivered Today</p>
            <div className="p-1.5 bg-amber-50 dark:bg-amber-950/50 rounded-lg text-amber-600">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            {todayCasesDelivered.toLocaleString('en-IN')} Cases
          </h3>
          <p className="text-[10px] text-slate-400 font-semibold">Delivered on Route</p>
        </div>

        {/* 🚚 Current Van Stock */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Remaining Van Stock</p>
            <div className="p-1.5 bg-purple-50 dark:bg-purple-950/50 rounded-lg text-purple-600">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            {totalLoadedCases} Cases
          </h3>
          <p className="text-[10px] text-slate-400 font-semibold">{vanStockItems.length} SKUs on Van</p>
        </div>

      </div>

      {/* 🚚 LIVE LOADED VAN INVENTORY TABLE */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Truck className="w-4 h-4 text-pepsi-blue" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Your Assigned Van Stock Inventory</h3>
          </div>
          <span className="text-xs text-slate-400 font-medium">Ready for Route Sales</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400 uppercase text-[10px] font-bold">
                <th className="py-2.5 px-3">Item Name</th>
                <th className="py-2.5 px-3 text-center">Size</th>
                <th className="py-2.5 px-3 text-right">Case Price (₹)</th>
                <th className="py-2.5 px-3 text-center">Available on Van</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {vanStockItems.map((item) => (
                <tr key={item._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition">
                  <td className="py-2.5 px-3 font-extrabold text-slate-900 dark:text-white">{item.product?.name}</td>
                  <td className="py-2.5 px-3 text-center font-bold">
                    <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 text-[11px]">
                      {item.product?.size || '250ml'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-black text-slate-900 dark:text-white">
                    ₹{item.product?.sellingPrice} / Case
                  </td>
                  <td className="py-2.5 px-3 text-center font-extrabold text-blue-600 dark:text-blue-400">
                    {item.quantity} Cases
                  </td>
                </tr>
              ))}
              {vanStockItems.length === 0 && (
                <tr>
                  <td colSpan="4" className="py-6 text-center text-slate-400 italic">
                    No stock currently loaded on vehicle. Visit Van Loading page to load cases.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 🧾 YOUR TODAY'S ROUTE SALES HISTORY TABLE */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Receipt className="w-4 h-4 text-pepsi-blue" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Your Route Sales Today ({todaySales.length})
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-medium">Billed by you</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400 uppercase text-[10px] font-bold">
                <th className="py-2.5 px-3">Invoice #</th>
                <th className="py-2.5 px-3">Customer Shop</th>
                <th className="py-2.5 px-3 text-center">Cases</th>
                <th className="py-2.5 px-3 text-right">Net Amount</th>
                <th className="py-2.5 px-3 text-center">Payment</th>
                <th className="py-2.5 px-3 text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {todaySales.map((sale) => {
                const totalCases = (sale.items || []).reduce((sum, i) => sum + (i.quantity || 0), 0);
                return (
                  <tr key={sale._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition">
                    <td className="py-2.5 px-3 font-bold text-blue-600 dark:text-blue-400">
                      {sale.invoiceNumber}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                      {sale.customer?.shopName || 'Retail Customer'}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-slate-700 dark:text-slate-200">
                      {totalCases} Cases
                    </td>
                    <td className="py-2.5 px-3 text-right font-black text-slate-900 dark:text-white">
                      ₹{Number(sale.netTotal || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-2.5 px-3 text-center">
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
                    <td className="py-2.5 px-3 text-right text-slate-500 font-semibold">
                      {new Date(sale.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                );
              })}
              {todaySales.length === 0 && (
                <tr>
                  <td colSpan="6" className="py-6 text-center text-slate-400 italic">
                    No sales billed yet today. Click "Launch POS & Billing" to start route sales.
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
