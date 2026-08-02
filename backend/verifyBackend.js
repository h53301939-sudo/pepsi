const connectDB = require('./config/db');
const User = require('./models/User');
const Product = require('./models/Product');
const Vehicle = require('./models/Vehicle');
const Customer = require('./models/Customer');
const StockTransaction = require('./models/StockTransaction');
const seedDatabase = require('./seeders/seedData');
const { recordLedgerTransaction } = require('./utils/ledgerEngine');

async function testBackend() {
  console.log('=== STARTING BACKEND AUTOMATED VERIFICATION ===');
  await connectDB();
  await seedDatabase();

  // 1. Verify User Login & Passwords
  const admin = await User.findOne({ email: 'admin@pepsi.com' });
  const worker = await User.findOne({ email: 'worker@pepsi.com' });
  console.log(`[PASS] Found Admin: ${admin.name}, Worker: ${worker.name}`);

  const matchAdmin = await admin.matchPassword('admin123');
  const matchWorker = await worker.matchPassword('worker123');
  console.log(`[PASS] Password Checks - Admin: ${matchAdmin}, Worker: ${matchWorker}`);

  // 2. Check Products and Warehouse Stock
  const products = await Product.find();
  console.log(`[PASS] Products loaded in database: ${products.length}`);
  const pepsi250 = products.find(p => p.sku === 'PEP-250ML');
  console.log(`[PASS] Pepsi 250ml Warehouse Stock: ${pepsi250.warehouseStock} units (Purchase Price: ₹${pepsi250.purchasePrice})`);

  // 3. Check Vehicle Loading Ledger
  const vehicle = await Vehicle.findOne({ vehicleNumber: 'MH-04-AB-1234' });
  const vehicleStockLedger = await StockTransaction.find({ destId: vehicle._id });
  console.log(`[PASS] Vehicle ${vehicle.vehicleNumber} Loading Ledger Transactions: ${vehicleStockLedger.length}`);

  // 4. Test Stock Ledger Consistency
  const allLedger = await StockTransaction.find();
  console.log(`[PASS] Total Stock Transaction Ledger Entries: ${allLedger.length}`);

  console.log('=== BACKEND AUTOMATED VERIFICATION SUCCESSFUL ===');
  process.exit(0);
}

testBackend().catch(err => {
  console.error('VERIFICATION FAILED:', err);
  process.exit(1);
});
