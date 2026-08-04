const Customer = require('../models/Customer');
const Payment = require('../models/Payment');
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
  createCustomer,
  updateCustomer,
  addCustomerPayment,
  deleteCustomer
};
