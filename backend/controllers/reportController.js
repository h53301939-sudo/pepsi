const Sale = require('../models/Sale');
const Purchase = require('../models/Purchase');
const Product = require('../models/Product');
const Vehicle = require('../models/Vehicle');
const VehicleStock = require('../models/VehicleStock');
const Customer = require('../models/Customer');
const User = require('../models/User');
const Return = require('../models/Return');
const Damage = require('../models/Damage');
const StockTransaction = require('../models/StockTransaction');
const ExcelJS = require('exceljs');

// Helper to construct bulletproof start and end date bounds covering both local & UTC
const getDateBounds = (startDateStr, endDateStr) => {
  let start, end;
  
  if (startDateStr && endDateStr) {
    const [sy, sm, sd] = startDateStr.split('-').map(Number);
    const [ey, em, ed] = endDateStr.split('-').map(Number);

    const localStart = new Date(sy, sm - 1, sd, 0, 0, 0, 0);
    const localEnd = new Date(ey, em - 1, ed, 23, 59, 59, 999);

    const utcStart = new Date(Date.UTC(sy, sm - 1, sd, 0, 0, 0, 0));
    const utcEnd = new Date(Date.UTC(ey, em - 1, ed, 23, 59, 59, 999));

    start = localStart < utcStart ? localStart : utcStart;
    end = localEnd > utcEnd ? localEnd : utcEnd;
  } else {
    const now = new Date();
    const localStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const localEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    
    const utcStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0));
    const utcEnd = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999));

    start = localStart < utcStart ? localStart : utcStart;
    end = localEnd > utcEnd ? localEnd : utcEnd;
  }

  return { start, end };
};

// @desc    Get Admin Dashboard Stats & Charts
// @route   GET /api/reports/dashboard
const getDashboardStats = async (req, res) => {
  const { start, end } = getDateBounds();

  // 1. Warehouse Stock & Value
  const products = await Product.find({ status: 'Active' });
  let totalWarehouseStock = 0;
  let totalWarehouseValue = 0;
  let lowStockProducts = 0;

  products.forEach(p => {
    totalWarehouseStock += p.warehouseStock;
    totalWarehouseValue += p.warehouseStock * (p.purchasePrice || 0);
    if (p.warehouseStock <= p.minStock) lowStockProducts++;
  });

  // 2. Vehicle Stock & Value
  const vehicleStocks = await VehicleStock.find({ quantity: { $gt: 0 } }).populate('product');
  let totalVehicleStock = 0;
  let totalVehicleValue = 0;

  vehicleStocks.forEach(vs => {
    totalVehicleStock += vs.quantity;
    totalVehicleValue += vs.quantity * (vs.product?.purchasePrice || 0);
  });

  // 3. Today's Sales & Payment Breakdown
  const todaySales = await Sale.find({ createdAt: { $gte: start, $lte: end } });
  let todaySalesTotal = 0;
  let cashToday = 0;
  let upiToday = 0;

  todaySales.forEach(s => {
    todaySalesTotal += s.netTotal;
    if (s.paymentMethod === 'Cash') cashToday += s.paidAmount;
    if (s.paymentMethod === 'UPI') upiToday += s.paidAmount;
  });

  // 4. Customer Outstanding Balance
  const customers = await Customer.find();
  const pendingCreditAmount = customers.reduce((sum, c) => sum + c.outstandingBalance, 0);

  // 5. Active Workers & Vehicles
  const activeWorkers = await User.countDocuments({ role: 'worker', active: true });
  const activeVehicles = await Vehicle.countDocuments({ status: { $in: ['Loaded', 'On Route'] } });

  // 6. Today's Purchases, Loading, Returns
  const todayPurchases = await Purchase.find({ createdAt: { $gte: start, $lte: end } });
  const todayPurchasesTotal = todayPurchases.reduce((sum, p) => sum + p.totalAmount, 0);

  const todayReturns = await Return.find({ createdAt: { $gte: start, $lte: end } });
  const todayReturnsTotal = todayReturns.reduce((sum, r) => sum + r.totalValue, 0);

  const todayLoadingCount = await StockTransaction.countDocuments({
    transactionType: 'Warehouse_To_Vehicle',
    createdAt: { $gte: start, $lte: end }
  });

  // 7. Today's Estimated Profit (Selling Revenue - Purchase Cost for Sold Items)
  let todayProfit = 0;
  for (const sale of todaySales) {
    for (const item of sale.items) {
      const prod = await Product.findById(item.product);
      const costPrice = prod ? (prod.purchasePrice || 0) : (item.unitPrice * 0.8);
      const itemCost = item.quantity * costPrice;
      todayProfit += (item.totalAmount - itemCost);
    }
  }

  // 8. Recent Sales & Activity
  const recentSales = await Sale.find()
    .populate('customer', 'shopName ownerName')
    .populate('worker', 'name')
    .sort({ createdAt: -1 })
    .limit(5);

  res.json({
    kpis: {
      totalWarehouseStock,
      totalWarehouseValue,
      totalVehicleStock,
      totalVehicleValue,
      todaySalesTotal,
      cashToday,
      upiToday,
      pendingCreditAmount,
      todayProfit,
      lowStockProducts,
      activeWorkers,
      activeVehicles,
      todayPurchasesTotal,
      todayReturnsTotal,
      todayLoadingCount
    },
    recentSales
  });
};

// @desc    Get Custom Date Range Historical Analytics & Profit
// @route   GET /api/reports/historical
const getHistoricalAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const { start, end } = getDateBounds(startDate, endDate);

    // 1. Fetch Sales for Date Range
    const sales = await Sale.find({ createdAt: { $gte: start, $lte: end } })
      .populate('customer', 'shopName ownerName')
      .populate('worker', 'name')
      .sort({ createdAt: -1 });

    let totalRevenue = 0;
    let totalProfit = 0;
    let totalCasesSold = 0;
    let cashRevenue = 0;
    let upiRevenue = 0;
    let creditRevenue = 0;

    const itemSalesMap = {};
    const workerSalesMap = {};

    for (const s of sales) {
      totalRevenue += s.netTotal;

      if (s.paymentMethod === 'Cash') cashRevenue += s.paidAmount;
      if (s.paymentMethod === 'UPI') upiRevenue += s.paidAmount;
      if (s.paymentMethod === 'Credit') creditRevenue += s.dueAmount;

      const workerName = s.worker?.name || 'Unassigned';
      if (!workerSalesMap[workerName]) {
        workerSalesMap[workerName] = { invoices: 0, revenue: 0 };
      }
      workerSalesMap[workerName].invoices += 1;
      workerSalesMap[workerName].revenue += s.netTotal;

      for (const item of s.items) {
        totalCasesSold += item.quantity;
        const prod = await Product.findById(item.product);
        const costPrice = prod ? (prod.purchasePrice || 0) : (item.unitPrice * 0.8);
        const lineCost = item.quantity * costPrice;
        const lineProfit = item.totalAmount - lineCost;

        totalProfit += lineProfit;

        const itemName = item.productName || prod?.name || 'Pepsi Item';
        if (!itemSalesMap[itemName]) {
          itemSalesMap[itemName] = { cases: 0, revenue: 0, profit: 0 };
        }
        itemSalesMap[itemName].cases += item.quantity;
        itemSalesMap[itemName].revenue += item.totalAmount;
        itemSalesMap[itemName].profit += lineProfit;
      }
    }

    // 2. Fetch Purchases & Returns for Date Range
    const purchases = await Purchase.find({ createdAt: { $gte: start, $lte: end } });
    const totalPurchasesValue = purchases.reduce((sum, p) => sum + p.totalAmount, 0);

    const returns = await Return.find({ createdAt: { $gte: start, $lte: end } });
    const totalReturnsValue = returns.reduce((sum, r) => sum + r.totalValue, 0);

    // Format Product Breakdown
    const productBreakdown = Object.keys(itemSalesMap).map(name => ({
      name,
      cases: itemSalesMap[name].cases,
      revenue: itemSalesMap[name].revenue,
      profit: itemSalesMap[name].profit
    })).sort((a, b) => b.revenue - a.revenue);

    // Format Salesman Breakdown
    const salesmanBreakdown = Object.keys(workerSalesMap).map(name => ({
      name,
      invoices: workerSalesMap[name].invoices,
      revenue: workerSalesMap[name].revenue
    })).sort((a, b) => b.revenue - a.revenue);

    res.json({
      dateRange: {
        start: start.toISOString(),
        end: end.toISOString()
      },
      kpis: {
        totalRevenue,
        totalProfit,
        totalInvoices: sales.length,
        totalCasesSold,
        cashRevenue,
        upiRevenue,
        creditRevenue,
        totalPurchasesValue,
        totalReturnsValue
      },
      productBreakdown,
      salesmanBreakdown,
      salesList: sales
    });
  } catch (err) {
    console.error('Error in getHistoricalAnalytics:', err);
    res.status(500).json({ message: err.message || 'Failed to fetch historical analytics' });
  }
};

// @desc    Get Sales & Profit Monthly/Daily Charts Data
// @route   GET /api/reports/analytics
const getAnalyticsCharts = async (req, res) => {
  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    last7Days.push(d);
  }

  const salesTrend = [];
  for (const day of last7Days) {
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);

    const daySales = await Sale.find({ createdAt: { $gte: day, $lte: dayEnd } });
    const totalRev = daySales.reduce((acc, s) => acc + s.netTotal, 0);

    salesTrend.push({
      date: day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      revenue: totalRev,
      orders: daySales.length
    });
  }

  // Product-wise sales breakdown
  const sales = await Sale.find();
  const productSalesMap = {};

  sales.forEach(s => {
    s.items.forEach(item => {
      const name = item.productName || 'Pepsi Item';
      if (!productSalesMap[name]) productSalesMap[name] = 0;
      productSalesMap[name] += item.quantity;
    });
  });

  const topProducts = Object.keys(productSalesMap).map(name => ({
    name,
    quantity: productSalesMap[name]
  })).sort((a, b) => b.quantity - a.quantity).slice(0, 6);

  res.json({
    salesTrend,
    topProducts
  });
};

// @desc    Export Ledger or Sales Report to Excel
// @route   GET /api/reports/export-excel
const exportToExcel = async (req, res) => {
  const { reportType } = req.query; // 'sales', 'ledger', 'stock'

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Report');

  if (reportType === 'sales') {
    sheet.columns = [
      { header: 'Invoice No', key: 'invoiceNumber', width: 20 },
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Customer', key: 'customer', width: 25 },
      { header: 'Worker', key: 'worker', width: 20 },
      { header: 'Payment Method', key: 'paymentMethod', width: 15 },
      { header: 'Net Total (₹)', key: 'netTotal', width: 15 },
      { header: 'Paid (₹)', key: 'paidAmount', width: 15 },
      { header: 'Due (₹)', key: 'dueAmount', width: 15 }
    ];

    const sales = await Sale.find().populate('customer').populate('worker');
    sales.forEach(s => {
      sheet.addRow({
        invoiceNumber: s.invoiceNumber,
        date: new Date(s.createdAt).toLocaleDateString(),
        customer: s.customer?.shopName || 'N/A',
        worker: s.worker?.name || 'N/A',
        paymentMethod: s.paymentMethod,
        netTotal: s.netTotal,
        paidAmount: s.paidAmount,
        dueAmount: s.dueAmount
      });
    });
  } else {
    sheet.columns = [
      { header: 'Transaction ID', key: 'transactionId', width: 25 },
      { header: 'Date', key: 'date', width: 20 },
      { header: 'Product', key: 'product', width: 25 },
      { header: 'Type', key: 'transactionType', width: 25 },
      { header: 'Qty', key: 'quantity', width: 10 },
      { header: 'Source', key: 'sourceType', width: 15 },
      { header: 'Destination', key: 'destType', width: 15 },
      { header: 'Remarks', key: 'remarks', width: 30 }
    ];

    const txns = await StockTransaction.find().populate('product');
    txns.forEach(t => {
      sheet.addRow({
        transactionId: t.transactionId,
        date: new Date(t.createdAt).toLocaleString(),
        product: t.product?.name || 'N/A',
        transactionType: t.transactionType,
        quantity: t.quantity,
        sourceType: t.sourceType,
        destType: t.destType,
        remarks: t.remarks
      });
    });
  }

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=pepsi_${reportType || 'export'}.xlsx`);

  await workbook.xlsx.write(res);
  res.end();
};

module.exports = {
  getDashboardStats,
  getHistoricalAnalytics,
  getAnalyticsCharts,
  exportToExcel
};
