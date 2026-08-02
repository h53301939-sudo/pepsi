const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const { logActivity } = require('../utils/logActivity');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'pepsi_super_secret_jwt_key_2026', {
    expiresIn: '30d',
  });
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const cleanEmail = email.trim().toLowerCase();

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

  const user = await User.findOne({ email: { $regex: new RegExp(`^${cleanEmail}$`, 'i') } }).populate('assignedVehicle');

  if (user && (await user.matchPassword(password.trim()))) {
    if (!user.active) {
      return res.status(401).json({ message: 'Account is deactivated. Contact Admin.' });
    }

    await logActivity({ req, user, action: 'User Login', details: `User ${user.name} (${user.role}) logged in` });

    return res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      assignedVehicle: user.assignedVehicle,
      token: generateToken(user._id),
    });
  } else {
    return res.status(401).json({ message: 'Invalid email or password' });
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

  const userExists = await User.findOne({ email: email.trim().toLowerCase() });
  if (userExists) {
    return res.status(400).json({ message: 'User with this email already exists' });
  }

  const worker = new User({
    name,
    email: email.trim().toLowerCase(),
    password: password.trim(),
    phone,
    role: 'worker',
    assignedVehicle: assignedVehicle || null
  });

  await worker.save();

  if (assignedVehicle) {
    await Vehicle.findByIdAndUpdate(assignedVehicle, { assignedWorker: worker._id });
  }

  await logActivity({ req, user: req.user, action: 'Create Worker', details: `Created worker ${name} (${email})` });

  res.status(201).json(worker);
};

// @desc    Update worker
// @route   PUT /api/auth/workers/:id
const updateWorker = async (req, res) => {
  const worker = await User.findById(req.params.id);

  if (!worker) {
    return res.status(404).json({ message: 'Worker not found' });
  }

  worker.name = req.body.name || worker.name;
  if (req.body.email) worker.email = req.body.email.trim().toLowerCase();
  worker.phone = req.body.phone || worker.phone;
  if (req.body.active !== undefined) worker.active = req.body.active;
  if (req.body.assignedVehicle !== undefined) {
    worker.assignedVehicle = req.body.assignedVehicle || null;
  }
  if (req.body.password) {
    worker.password = req.body.password.trim();
  }

  const updatedWorker = await worker.save();

  if (req.body.assignedVehicle) {
    await Vehicle.findByIdAndUpdate(req.body.assignedVehicle, { assignedWorker: worker._id });
  }

  await logActivity({ req, user: req.user, action: 'Update Worker', details: `Updated worker ${worker.name}` });

  res.json(updatedWorker);
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
  createWorker,
  updateWorker,
  deleteWorker,
};
