const Customer = require('../models/Customer');
const Payment = require('../models/Payment');
const Sale = require('../models/Sale');
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const { logActivity } = require('../utils/logActivity');

// @desc    Get customers (searchable)
// @route   GET /api/customers
const getCustomers = async (req, res) => {
  const { search } = req.query;
  let query = {};

  if (search) {
    query.$or = [
      { shopName: { $regex: search, $options: 'i' } },
      { ownerName: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } }
    ];
  }

  const customers = await Customer.find(query).sort({ shopName: 1 });
  res.json(customers);
};

// @desc    Get single customer full 360 profile, all purchases & invoices history
// @route   GET /api/customers/:id/details
const getCustomerDetails = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const custId = customer._id;

    // Fetch all sales & invoices made to this customer
    const sales = await Sale.find({
      $or: [
        { customer: custId },
        { customer: custId.toString() }
      ]
    })
      .populate('worker', 'name phone')
      .populate('vehicle', 'vehicleNumber')
      .sort({ createdAt: -1 });

    // Fetch all direct payment collections
    const payments = await Payment.find({
      $or: [
        { customer: custId },
        { customer: custId.toString() }
      ]
    })
      .populate('receivedBy', 'name')
      .sort({ createdAt: -1 });

    // Calculate aggregated metrics
    let totalLifetimePurchases = 0;
    let totalCasesPurchased = 0;
    let totalSalesPaid = 0;

    sales.forEach(sale => {
      totalLifetimePurchases += Number(sale.netTotal || 0);
      totalSalesPaid += Number(sale.paidAmount || 0);
      if (Array.isArray(sale.items)) {
        sale.items.forEach(item => {
          totalCasesPurchased += Number(item.quantity || 0);
        });
      }
    });

    const totalDirectPayments = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const totalAmountPaid = totalSalesPaid + totalDirectPayments;

    res.json({
      customer,
      sales,
      payments,
      summary: {
        totalLifetimePurchases,
        totalCasesPurchased,
        totalAmountPaid,
        outstandingBalance: customer.outstandingBalance || 0,
        totalInvoices: sales.length,
        totalPayments: payments.length
      }
    });
  } catch (err) {
    console.error('Error fetching customer details:', err);
    res.status(500).json({ message: err.message });
  }
};

// @desc    Create customer
// @route   POST /api/customers
const createCustomer = async (req, res) => {
  const { shopName, ownerName, phone, whatsapp, address, gstNumber, creditLimit, discountPercentage } = req.body;

  if (!shopName || !ownerName || !phone) {
    return res.status(400).json({ message: 'Shop name, owner name, and phone are required' });
  }

  const customer = new Customer({
    shopName,
    ownerName,
    phone,
    whatsapp: whatsapp || phone,
    address,
    gstNumber,
    creditLimit: creditLimit ? Number(creditLimit) : 50000,
    discountPercentage: discountPercentage ? Number(discountPercentage) : 0,
    outstandingBalance: 0
  });

  await customer.save();
  await logActivity({ req, user: req.user, action: 'Create Customer', details: `Created customer ${shopName} (${ownerName})` });

  res.status(201).json(customer);
};

// @desc    Update customer
// @route   PUT /api/customers/:id
const updateCustomer = async (req, res) => {
  const customer = await Customer.findById(req.params.id);
  if (!customer) return res.status(404).json({ message: 'Customer not found' });

  Object.assign(customer, req.body);
  await customer.save();
  await logActivity({ req, user: req.user, action: 'Update Customer', details: `Updated customer ${customer.shopName}` });

  res.json(customer);
};

// @desc    Record Customer Payment (Collection)
// @route   POST /api/customers/:id/payments
const addCustomerPayment = async (req, res) => {
  const { amount, paymentMethod, remarks } = req.body;
  const customer = await Customer.findById(req.params.id);

  if (!customer) return res.status(404).json({ message: 'Customer not found' });
  if (!amount || Number(amount) <= 0) return res.status(400).json({ message: 'Invalid payment amount' });

  const payment = new Payment({
    customer: customer._id,
    amount: Number(amount),
    paymentMethod: paymentMethod || 'Cash',
    receivedBy: req.user._id,
    remarks
  });

  await payment.save();

  customer.outstandingBalance = Math.max(0, customer.outstandingBalance - Number(amount));
  await customer.save();

  await logActivity({
    req,
    user: req.user,
    action: 'Payment Collection',
    details: `Collected ₹${amount} (${paymentMethod}) from ${customer.shopName}. New Balance: ₹${customer.outstandingBalance}`
  });

  res.json({ message: 'Payment recorded successfully', customer, payment });
};

// @desc    Delete customer
// @route   DELETE /api/customers/:id
const deleteCustomer = async (req, res) => {
  const customer = await Customer.findById(req.params.id);
  if (!customer) return res.status(404).json({ message: 'Customer not found' });

  await Customer.findByIdAndDelete(req.params.id);
  await logActivity({ req, user: req.user, action: 'Delete Customer', details: `Deleted customer ${customer.shopName}` });

  res.json({ message: 'Customer removed' });
};

module.exports = {
  getCustomers,
  getCustomerDetails,
  createCustomer,
  updateCustomer,
  addCustomerPayment,
  deleteCustomer
};
