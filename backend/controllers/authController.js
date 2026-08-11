const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const { logActivity } = require('../utils/logActivity');

// Email regex pattern (RFC 5322 compliant)
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// 30 Minutes Strict JWT Session Expiry
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'pepsi_super_secret_jwt_key_2026', {
    expiresIn: '30m', // Strictly 30 Minutes
  });
};

// @desc    Auth user & get token with server-side validation & rate-limiting
// @route   POST /api/auth/login
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  // 1. Server-side Type & Presence Validation (Do not rely on client-side)
  if (typeof email !== 'string' || typeof password !== 'string') {
    if (res.recordFailedAttempt) res.recordFailedAttempt();
    return res.status(400).json({ message: 'Invalid input format. Email and password must be text strings.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanPassword = password.trim();

  if (!cleanEmail) {
    if (res.recordFailedAttempt) res.recordFailedAttempt();
    return res.status(400).json({ message: 'Please enter your email address' });
  }

  if (!cleanPassword) {
    if (res.recordFailedAttempt) res.recordFailedAttempt();
    return res.status(400).json({ message: 'Please enter your password' });
  }

  // 2. Server-side Email Format Validation
  if (!EMAIL_REGEX.test(cleanEmail)) {
    if (res.recordFailedAttempt) res.recordFailedAttempt();
    return res.status(400).json({ message: 'Please enter a valid email address (e.g., user@pepsi.com)' });
  }

  // 3. Server-side Password Length Validation
  if (cleanPassword.length < 4 || cleanPassword.length > 128) {
    if (res.recordFailedAttempt) res.recordFailedAttempt();
    return res.status(400).json({ message: 'Password must be between 4 and 128 characters long' });
  }

  // Check if database has any users. If completely empty, auto-seed default admin & worker
  const userCount = await User.countDocuments();
  if (userCount === 0) {
    console.log('Zero users in database. Creating default admin & worker on demand...');
    await User.create({
      name: 'Rajesh Sharma (Admin)',
      email: 'admin@pepsi.com',
      password: 'admin123',
      role: 'admin',
      phone: '+91 99887 76655',
      active: true
    });
    await User.create({
      name: 'Ramesh Kumar (Salesman)',
      email: 'worker@pepsi.com',
      password: 'worker123',
      role: 'worker',
      phone: '+91 98765 11111',
      active: true
    });
  }

  // 4. Safe Query (Exact match, prevents NoSQL injection)
  const user = await User.findOne({ email: cleanEmail }).populate('assignedVehicle');

  if (user && (await user.matchPassword(cleanPassword))) {
    if (!user.active) {
      if (res.recordFailedAttempt) res.recordFailedAttempt();
      return res.status(401).json({ message: 'Your account has been blocked. Please contact admin.' });
    }

    // Reset failed login counter on success
    if (res.recordSuccessfulLogin) res.recordSuccessfulLogin();

    await logActivity({ req, user, action: 'User Login', details: `User ${user.name} (${user.role}) logged in successfully` });

    return res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      assignedVehicle: user.assignedVehicle,
      token: generateToken(user._id),
      sessionDuration: '30m'
    });
  } else {
    // Record failed attempt for rate-limiting
    if (res.recordFailedAttempt) res.recordFailedAttempt();

    await logActivity({
      req,
      user: null,
      action: 'Failed Login Attempt',
      details: `Failed login attempt for email: ${cleanEmail} from IP: ${req.ip || 'Unknown'}`
    });

    return res.status(401).json({ message: 'Invalid email address or password. Please try again.' });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
const getMe = async (req, res) => {
  const user = await User.findById(req.user._id).select('-password').populate('assignedVehicle');
  res.json(user);
};

// @desc    Get all workers
// @route   GET /api/auth/workers
const getWorkers = async (req, res) => {
  const workers = await User.find({ role: 'worker' }).select('-password').populate('assignedVehicle');
  res.json(workers);
};

// @desc    Create new worker
// @route   POST /api/auth/workers
const createWorker = async (req, res) => {
  const { name, email, password, phone, assignedVehicle } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ message: 'Name, email, and password are required' });
  }

  const cleanEmail = email.trim().toLowerCase();

  if (!EMAIL_REGEX.test(cleanEmail)) {
    return res.status(400).json({ message: 'Please provide a valid worker email address' });
  }

  const userExists = await User.findOne({ email: cleanEmail });
  if (userExists) {
    return res.status(400).json({ message: 'User with this email already exists' });
  }

  const worker = new User({
    name: name.trim(),
    email: cleanEmail,
    password: password.trim(),
    phone: phone ? phone.trim() : '',
    role: 'worker',
    assignedVehicle: assignedVehicle || null
  });

  await worker.save();

  if (assignedVehicle) {
    await Vehicle.findByIdAndUpdate(assignedVehicle, { assignedWorker: worker._id });
  }

  await logActivity({ req, user: req.user, action: 'Create Worker', details: `Created worker ${name} (${cleanEmail})` });

  res.status(201).json(worker);
};

// @desc    Update worker
// @route   PUT /api/auth/workers/:id
const updateWorker = async (req, res) => {
  const worker = await User.findById(req.params.id);

  if (!worker) {
    return res.status(404).json({ message: 'Worker not found' });
  }

  worker.name = req.body.name ? req.body.name.trim() : worker.name;
  if (req.body.email) worker.email = req.body.email.trim().toLowerCase();
  if (req.body.phone !== undefined) worker.phone = req.body.phone ? req.body.phone.trim() : '';
  if (req.body.active !== undefined) worker.active = req.body.active;
  if (req.body.assignedVehicle !== undefined) {
    worker.assignedVehicle = req.body.assignedVehicle || null;
  }
  if (req.body.password && req.body.password.trim()) {
    worker.password = req.body.password.trim();
  }

  const updatedWorker = await worker.save();

  if (req.body.assignedVehicle) {
    await Vehicle.findByIdAndUpdate(req.body.assignedVehicle, { assignedWorker: worker._id });
  }

  await logActivity({ req, user: req.user, action: 'Update Worker', details: `Updated worker ${worker.name}` });

  res.json(updatedWorker);
};

const Sale = require('../models/Sale');

// @desc    Get detailed worker profile with lifetime analytics (sales, profit, cases, recent history)
// @route   GET /api/auth/workers/:id/profile
const getWorkerProfile = async (req, res) => {
  const worker = await User.findById(req.params.id).select('-password').populate('assignedVehicle');

  if (!worker) {
    return res.status(404).json({ message: 'Worker not found' });
  }

  // Fetch all sales made by this worker
  const sales = await Sale.find({ worker: worker._id })
    .populate('customer', 'shopName ownerName phone address')
    .populate('items.product', 'name purchasePrice costPrice size currentStock')
    .sort({ createdAt: -1 });

  let lifetimeSales = 0;
  let lifetimeProfit = 0;
  let totalCasesSold = 0;

  sales.forEach((sale) => {
    lifetimeSales += (sale.netTotal || 0);

    let saleCost = 0;
    (sale.items || []).forEach((item) => {
      const qty = item.quantity || 0;
      totalCasesSold += qty;
      const unitCost = (item.product && (item.product.purchasePrice || item.product.costPrice)) || 0;
      saleCost += (qty * unitCost);
    });

    const saleProfit = (sale.netTotal || 0) - saleCost;
    lifetimeProfit += saleProfit;
  });

  const totalInvoices = sales.length;
  const recentSales = sales.slice(0, 25);

  res.json({
    worker,
    analytics: {
      lifetimeSales,
      lifetimeProfit,
      totalCasesSold,
      totalInvoices,
      averageOrderValue: totalInvoices > 0 ? Math.round(lifetimeSales / totalInvoices) : 0,
      profitMargin: lifetimeSales > 0 ? ((lifetimeProfit / lifetimeSales) * 100).toFixed(1) : '0'
    },
    recentSales
  });
};

// @desc    Toggle worker status (Block / Unblock)
// @route   PUT /api/auth/workers/:id/toggle-status
const toggleWorkerStatus = async (req, res) => {
  const worker = await User.findById(req.params.id);

  if (!worker) {
    return res.status(404).json({ message: 'Worker not found' });
  }

  if (worker.role === 'admin') {
    return res.status(400).json({ message: 'Cannot block administrator accounts' });
  }

  worker.active = !worker.active;
  await worker.save();

  const actionText = worker.active ? 'Unblocked Worker' : 'Blocked Worker';
  await logActivity({
    req,
    user: req.user,
    action: actionText,
    details: `${actionText}: ${worker.name} (${worker.email})`
  });

  res.json({
    message: `Worker account ${worker.active ? 'unblocked and activated' : 'blocked and deactivated'} successfully`,
    worker
  });
};

// @desc    Delete worker
// @route   DELETE /api/auth/workers/:id
const deleteWorker = async (req, res) => {
  const worker = await User.findById(req.params.id);

  if (!worker) {
    return res.status(404).json({ message: 'Worker not found' });
  }

  await User.findByIdAndDelete(req.params.id);
  await logActivity({ req, user: req.user, action: 'Delete Worker', details: `Deleted worker ${worker.name}` });

  res.json({ message: 'Worker removed successfully' });
};

module.exports = {
  loginUser,
  getMe,
  getWorkers,
  getWorkerProfile,
  toggleWorkerStatus,
  createWorker,
  updateWorker,
  deleteWorker,
};
