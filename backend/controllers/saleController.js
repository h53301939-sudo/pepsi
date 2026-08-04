const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Vehicle = require('../models/Vehicle');
const Customer = require('../models/Customer');
const VehicleStock = require('../models/VehicleStock');
const { recordLedgerTransaction } = require('../utils/ledgerEngine');
const { logActivity } = require('../utils/logActivity');

// @desc    Process Van Sale POS or Direct Warehouse Counter Sale Transaction & Generate Invoice
// @route   POST /api/sales
const createSale = async (req, res) => {
  try {
    const {
      vehicleId,
      customerId,
      items, // [{ product, quantity, unitPrice }]
      paymentMethod, // 'Cash', 'UPI', 'Credit'
      paidAmount,
      dueDate
    } = req.body;

    if (!vehicleId || !customerId || !items || !items.length) {
      return res.status(400).json({ message: 'Missing vehicle/warehouse selection, customer, or items' });
    }

    const isDirectWarehouse = vehicleId === 'warehouse_direct' || vehicleId === 'direct';

    let vehicle = null;
    if (!isDirectWarehouse) {
      vehicle = await Vehicle.findById(vehicleId);
      if (!vehicle) return res.status(404).json({ message: 'Selected vehicle not found' });
    }

    const customer = await Customer.findById(customerId);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    // Validate stock & prices
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) return res.status(404).json({ message: `Product not found` });

      if (!product.sellingPrice || Number(product.sellingPrice) <= 0) {
        return res.status(400).json({
          message: `⛔ Sale Blocked: Selling Price for "${product.name}" is not set!`
        });
      }

      if (isDirectWarehouse) {
        const availQty = product.warehouseStock || 0;
        if (availQty < item.quantity) {
          return res.status(400).json({
            message: `Insufficient warehouse main stock for ${product.name} (${product.size || ''}). Warehouse Stock: ${availQty} Cases, Sale Qty: ${item.quantity} Cases`
          });
        }
      } else {
        const vStock = await VehicleStock.findOne({ vehicle: vehicleId, product: item.product });
        const availQty = vStock ? vStock.quantity : 0;
        if (availQty < item.quantity) {
          return res.status(400).json({
            message: `Insufficient vehicle stock for ${product.name}. On Van: ${availQty} Cases, Sale Qty: ${item.quantity} Cases`
          });
        }
      }
    }

    // Calculate Subtotal & Net Total
    let subTotal = 0;
    const processedItems = [];

    for (const item of items) {
      const product = await Product.findById(item.product);
      const unitPrice = Number(item.unitPrice) || product.sellingPrice;
      const lineTotal = unitPrice * item.quantity;

      subTotal += lineTotal;

      processedItems.push({
        product: product._id,
        productName: product.name,
        size: product.size || '',
        quantity: item.quantity,
        unitPrice,
        totalAmount: lineTotal
      });
    }

    const netTotal = Math.round(subTotal);
    const actualPaid = paymentMethod === 'Credit' ? Number(paidAmount || 0) : netTotal;
    const dueAmount = netTotal - actualPaid;

    // ACTIVE CREDIT LIMIT ENFORCEMENT Check
    if (paymentMethod === 'Credit' && dueAmount > 0) {
      const creditLimit = Number(customer.creditLimit || 0);
      const currentDue = Number(customer.outstandingBalance || 0);
      const prospectiveTotalDue = currentDue + dueAmount;

      if (creditLimit > 0 && prospectiveTotalDue > creditLimit) {
        return res.status(400).json({
          message: `Credit Limit Exceeded for ${customer.shopName}! Credit Limit: ₹${creditLimit.toLocaleString()}, Current Balance: ₹${currentDue.toLocaleString()}, New Due: ₹${dueAmount.toLocaleString()}. Total ₹${prospectiveTotalDue.toLocaleString()} exceeds limit of ₹${creditLimit.toLocaleString()}. Collect payment or increase limit before proceeding.`
        });
      }
    }

    // Generate Unique Invoice Number
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const saleCountToday = await Sale.countDocuments({
      createdAt: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        $lte: new Date(new Date().setHours(23, 59, 59, 999))
      }
    });
    const invoiceNumber = `PEP-${dateStr}-${(saleCountToday + 101).toString()}`;

    // Create Sale Record
    const sale = new Sale({
      invoiceNumber,
      worker: req.user._id,
      vehicle: isDirectWarehouse ? null : vehicleId,
      customer: customerId,
      items: processedItems,
      subTotal,
      netTotal,
      paymentMethod,
      paidAmount: actualPaid,
      dueAmount,
      dueDate: dueDate ? new Date(dueDate) : null,
      status: dueAmount <= 0 ? 'Paid' : (actualPaid > 0 ? 'Partial' : 'Unpaid')
    });

    await sale.save();

    // Update Customer Credit / Outstanding Balance if Credit sale
    if (dueAmount > 0) {
      customer.outstandingBalance += dueAmount;
      await customer.save();
    }

    // Record Stock Ledger Transactions & Deduct Inventory
    for (const item of processedItems) {
      if (isDirectWarehouse) {
        // Deduct directly from Product.warehouseStock
        const prod = await Product.findById(item.product);
        if (prod) {
          prod.warehouseStock = Math.max(0, prod.warehouseStock - item.quantity);
          await prod.save();
        }

        await recordLedgerTransaction({
          product: item.product,
          quantity: item.quantity,
          sourceType: 'Warehouse',
          destType: 'Customer',
          destId: customerId,
          destRefModel: 'Customer',
          transactionType: 'Warehouse_To_Customer',
          unitPrice: item.unitPrice,
          user: req.user._id,
          remarks: `Direct Warehouse Counter Sale Invoice #${invoiceNumber}`
        });
      } else {
        await recordLedgerTransaction({
          product: item.product,
          quantity: item.quantity,
          sourceType: 'Vehicle',
          sourceId: vehicleId,
          sourceRefModel: 'Vehicle',
          destType: 'Customer',
          destId: customerId,
          destRefModel: 'Customer',
          transactionType: 'Vehicle_To_Customer',
          unitPrice: item.unitPrice,
          user: req.user._id,
          remarks: `Van Sale POS Invoice #${invoiceNumber}`
        });
      }
    }

    await logActivity({
      req,
      user: req.user,
      action: isDirectWarehouse ? 'Direct Warehouse Counter Sale' : 'Van Sale Invoice Generated',
      details: `Generated Invoice #${invoiceNumber} for ${customer.shopName} total ₹${netTotal} (${paymentMethod})`
    });

    const populatedSale = await Sale.findById(sale._id)
      .populate('customer')
      .populate('worker', 'name phone')
      .populate('vehicle', 'vehicleNumber vehicleName')
      .populate('items.product');

    res.status(201).json(populatedSale);
  } catch (err) {
    console.error('Error creating sale:', err);
    res.status(500).json({ message: err.message || 'Failed to create sale' });
  }
};

// @desc    Get Sales history with filtering
// @route   GET /api/sales
const getSales = async (req, res) => {
  const { startDate, endDate, customerId, workerId, paymentMethod, search } = req.query;
  let query = {};

  if (req.user.role === 'worker') {
    query.worker = req.user._id;
  } else if (workerId) {
    query.worker = workerId;
  }

  if (customerId) query.customer = customerId;
  if (paymentMethod) query.paymentMethod = paymentMethod;

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
  }

  if (search) {
    query.invoiceNumber = { $regex: search, $options: 'i' };
  }

  const sales = await Sale.find(query)
    .populate('customer', 'shopName ownerName phone')
    .populate('worker', 'name')
    .populate('vehicle', 'vehicleNumber vehicleName')
    .sort({ createdAt: -1 });

  res.json(sales);
};

// @desc    Get sale by ID / Invoice detail
// @route   GET /api/sales/:id
const getSaleById = async (req, res) => {
  const sale = await Sale.findById(req.params.id)
    .populate('customer')
    .populate('worker', 'name phone email')
    .populate('vehicle', 'vehicleNumber vehicleName driverName')
    .populate('items.product');

  if (!sale) return res.status(404).json({ message: 'Sale invoice not found' });
  res.json(sale);
};

module.exports = {
  createSale,
  getSales,
  getSaleById
};
