const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

dotenv.config();

const app = express();

// Connect to Database (with zero-setup MemoryServer fallback)
connectDB().then(async () => {
  // Ensure Admin user always exists so you are never locked out
  const User = require('./models/User');
  const adminCount = await User.countDocuments({ role: 'admin' });
  if (adminCount === 0) {
    console.log('No Admin user found! Auto-creating default Admin account...');
    await User.create({
      name: 'Rajesh Sharma (Admin)',
      email: 'admin@pepsi.com',
      password: 'admin123',
      role: 'admin',
      active: true
    });
    console.log('✅ Admin account restored: admin@pepsi.com / admin123');
  }
});

// Body parsers & CORS middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/warehouse', require('./routes/warehouseRoutes'));
app.use('/api/suppliers', require('./routes/supplierRoutes'));
app.use('/api/purchases', require('./routes/purchaseRoutes'));
app.use('/api/vehicles', require('./routes/vehicleRoutes'));
app.use('/api/loading', require('./routes/loadingRoutes'));
app.use('/api/customers', require('./routes/customerRoutes'));
app.use('/api/sales', require('./routes/saleRoutes'));
app.use('/api/returns', require('./routes/returnRoutes'));
app.use('/api/damages', require('./routes/damageRoutes'));
app.use('/api/ledger', require('./routes/ledgerRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/activity-logs', require('./routes/activityLogRoutes'));
app.use('/api/settings', require('./routes/settingRoutes'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', system: 'Pepsi Warehouse & Van Sales Management API', time: new Date() });
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Pepsi Distribution Server running on port ${PORT}`);
});
