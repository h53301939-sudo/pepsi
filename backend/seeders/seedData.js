const mongoose = require('mongoose');
const User = require('../models/User');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const Vehicle = require('../models/Vehicle');
const Customer = require('../models/Customer');
const Setting = require('../models/Setting');
const { recordLedgerTransaction } = require('../utils/ledgerEngine');

const seedDatabase = async () => {
  try {
    console.log('Seeding Pepsi distribution system database...');

    // Clear existing collections
    await User.deleteMany();
    await Product.deleteMany();
    await Supplier.deleteMany();
    await Vehicle.deleteMany();
    await Customer.deleteMany();
    await Setting.deleteMany();

    // 1. Create Default Settings
    await Setting.create({
      companyName: 'DAVID TRADERS',
      companyLogo: 'https://upload.wikimedia.org/wikipedia/commons/0/0f/Pepsi_logo_2023.svg',
      gstNumber: '27AAAAA0000A1Z5',
      address: 'Plot 42, Pepsi Beverage Park, Industrial Zone, Mumbai - 400072',
      phone: '+91 8932094428',
      email: 'sales@pepsi-distributor.com',
      currencySymbol: '₹',
      defaultGstPercent: 28,
      invoiceFooter: 'Thank you for choosing Pepsi Products! Refresh your world.'
    });

    // 2. Create Users (Admin & Workers)
    const adminUser = await User.create({
      name: 'ANIRUDH KUMAR (Admin)',
      email: 'admin@pepsi.com',
      password: 'admin123',
      role: 'admin',
      phone: '+91 9569703631',
      active: true
    });

    const workerUser1 = await User.create({
      name: 'Ramesh Kumar (Salesman)',
      email: 'worker@pepsi.com',
      password: 'worker123',
      role: 'worker',
      phone: '+91 98765 11111',
      active: true
    });

    const workerUser2 = await User.create({
      name: 'Suresh Patel (Salesman)',
      email: 'suresh@pepsi.com',
      password: 'worker123',
      role: 'worker',
      phone: '+91 98765 22222',
      active: true
    });

    // 3. Create Vehicles
    const vehicle1 = await Vehicle.create({
      vehicleNumber: 'MH-04-AB-1234',
      vehicleName: 'Tata Ace Van 1',
      driverName: 'Ramesh Kumar',
      assignedWorker: workerUser1._id,
      capacityCrates: 250,
      status: 'Loaded'
    });

    const vehicle2 = await Vehicle.create({
      vehicleNumber: 'MH-04-CD-5678',
      vehicleName: 'Mahindra Bolero Pickup 2',
      driverName: 'Suresh Patel',
      assignedWorker: workerUser2._id,
      capacityCrates: 300,
      status: 'Available'
    });

    // Link vehicle to worker
    workerUser1.assignedVehicle = vehicle1._id;
    await workerUser1.save();

    workerUser2.assignedVehicle = vehicle2._id;
    await workerUser2.save();

    // 4. Create Supplier (PepsiCo Bottling Plant)
    const supplier = await Supplier.create({
      name: 'PepsiCo India Holdings Pvt Ltd',
      contactPerson: 'Vikram Singh (Supply Chain Mgr)',
      phone: '+91 22 6677 8899',
      email: 'orders@pepsico.com',
      address: 'Plot 10, MIDC Industrial Area, Thane West, Maharashtra',
      gstNumber: '27AAACP0011B1Z2'
    });

    // 5. Create Pepsi Product Catalog
    const productList = [
      {
        name: 'Pepsi 250ml Pet Bottle',
        brand: 'Pepsi',
        category: 'Carbonated Soft Drink',
        sku: 'PEP-250ML',
        barcode: '890145800101',
        image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&q=80',
        purchasePrice: 12.00,
        sellingPrice: 16.50,
        mrp: 20.00,
        gstPercent: 28,
        unit: 'Bottle',
        size: '250ml',
        crateQuantity: 24,
        minStock: 200,
        warehouseStock: 0,
        status: 'Active'
      },
      {
        name: 'Pepsi 500ml Pet Bottle',
        brand: 'Pepsi',
        category: 'Carbonated Soft Drink',
        sku: 'PEP-500ML',
        barcode: '890145800102',
        image: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=500&q=80',
        purchasePrice: 22.00,
        sellingPrice: 28.00,
        mrp: 35.00,
        gstPercent: 28,
        unit: 'Bottle',
        size: '500ml',
        crateQuantity: 24,
        minStock: 150,
        warehouseStock: 0,
        status: 'Active'
      },
      {
        name: 'Pepsi 1.25L Bottle',
        brand: 'Pepsi',
        category: 'Carbonated Soft Drink',
        sku: 'PEP-1.25L',
        barcode: '890145800103',
        image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&q=80',
        purchasePrice: 42.00,
        sellingPrice: 52.00,
        mrp: 65.00,
        gstPercent: 28,
        unit: 'Bottle',
        size: '1.25L',
        crateQuantity: 12,
        minStock: 100,
        warehouseStock: 0,
        status: 'Active'
      },
      {
        name: '7UP 250ml Bottle',
        brand: '7UP',
        category: 'Carbonated Soft Drink',
        sku: '7UP-250ML',
        barcode: '890145800201',
        image: 'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=500&q=80',
        purchasePrice: 12.00,
        sellingPrice: 16.50,
        mrp: 20.00,
        gstPercent: 28,
        unit: 'Bottle',
        size: '250ml',
        crateQuantity: 24,
        minStock: 150,
        warehouseStock: 0,
        status: 'Active'
      },
      {
        name: 'Mirinda Orange 250ml',
        brand: 'Mirinda',
        category: 'Carbonated Soft Drink',
        sku: 'MIR-250ML',
        barcode: '890145800301',
        image: 'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=500&q=80',
        purchasePrice: 12.00,
        sellingPrice: 16.50,
        mrp: 20.00,
        gstPercent: 28,
        unit: 'Bottle',
        size: '250ml',
        crateQuantity: 24,
        minStock: 150,
        warehouseStock: 0,
        status: 'Active'
      },
      {
        name: 'Mountain Dew 250ml',
        brand: 'Mountain Dew',
        category: 'Carbonated Soft Drink',
        sku: 'MTD-250ML',
        barcode: '890145800401',
        image: 'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=500&q=80',
        purchasePrice: 12.00,
        sellingPrice: 16.50,
        mrp: 20.00,
        gstPercent: 28,
        unit: 'Bottle',
        size: '250ml',
        crateQuantity: 24,
        minStock: 150,
        warehouseStock: 0,
        status: 'Active'
      },
      {
        name: 'Sting Energy Drink 250ml',
        brand: 'Sting',
        category: 'Energy Drink',
        sku: 'STG-250ML',
        barcode: '890145800501',
        image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&q=80',
        purchasePrice: 14.00,
        sellingPrice: 18.00,
        mrp: 20.00,
        gstPercent: 28,
        unit: 'Bottle',
        size: '250ml',
        crateQuantity: 30,
        minStock: 300,
        warehouseStock: 0,
        status: 'Active'
      },
      {
        name: 'Aquafina Packaged Water 1L',
        brand: 'Aquafina',
        category: 'Packaged Water',
        sku: 'AQF-1L',
        barcode: '890145800601',
        image: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=500&q=80',
        purchasePrice: 10.00,
        sellingPrice: 15.00,
        mrp: 20.00,
        gstPercent: 18,
        unit: 'Bottle',
        size: '1L',
        crateQuantity: 12,
        minStock: 250,
        warehouseStock: 0,
        status: 'Active'
      }
    ];

    const createdProducts = await Product.insertMany(productList);
    console.log(`Created ${createdProducts.length} Pepsi products`);

    // 6. Create Initial Inward Purchase (Pepsi Company -> Warehouse)
    for (const prod of createdProducts) {
      const stockInwardQty = prod.minStock * 5; // Generous initial warehouse stock
      await recordLedgerTransaction({
        product: prod._id,
        quantity: stockInwardQty,
        sourceType: 'Supplier',
        sourceId: supplier._id,
        sourceRefModel: 'Supplier',
        destType: 'Warehouse',
        transactionType: 'Supplier_Inward',
        unitPrice: prod.purchasePrice,
        user: adminUser._id,
        remarks: 'Initial Pepsi Stock Inward Batch #PEP-2026-001'
      });
    }

    // 7. Load Stock into Vehicle 1 (Warehouse -> Van 1)
    const loadItems = [
      { prod: createdProducts[0], qty: 120 }, // Pepsi 250ml
      { prod: createdProducts[1], qty: 72 },  // Pepsi 500ml
      { prod: createdProducts[3], qty: 96 },  // 7UP 250ml
      { prod: createdProducts[4], qty: 48 },  // Mirinda
      { prod: createdProducts[6], qty: 150 }  // Sting
    ];

    for (const item of loadItems) {
      await recordLedgerTransaction({
        product: item.prod._id,
        quantity: item.qty,
        sourceType: 'Warehouse',
        destType: 'Vehicle',
        destId: vehicle1._id,
        destRefModel: 'Vehicle',
        transactionType: 'Warehouse_To_Vehicle',
        unitPrice: item.prod.purchasePrice,
        user: adminUser._id,
        remarks: `Van Loading for Morning Route - Driver ${vehicle1.driverName}`
      });
    }

    // 8. Create Customers
    const customer1 = await Customer.create({
      shopName: 'Krishna General Store & Cold Drinks',
      ownerName: 'Krishna Kant',
      phone: '+91 98200 12345',
      whatsapp: '+91 98200 12345',
      address: 'Shop 12, Station Road, Malad West, Mumbai',
      gstNumber: '27ABCDE1234F1Z9',
      creditLimit: 50000,
      outstandingBalance: 3200
    });

    const customer2 = await Customer.create({
      shopName: 'A1 Super Market & Snacks',
      ownerName: 'Aslam Khan',
      phone: '+91 98333 44556',
      whatsapp: '+91 98333 44556',
      address: 'Near Cinema Hall, Andheri East, Mumbai',
      gstNumber: '27FGHIJ5678K1Z3',
      creditLimit: 75000,
      outstandingBalance: 0
    });

    console.log('Pepsi Distribution Database successfully seeded with full sample data!');
  } catch (error) {
    console.error('Seeding error:', error.message);
  }
};

module.exports = seedDatabase;

if (require.main === module) {
  const connectDB = require('../config/db');
  dotenv = require('dotenv');
  dotenv.config();
  connectDB().then(async () => {
    await seedDatabase();
    process.exit();
  });
}
