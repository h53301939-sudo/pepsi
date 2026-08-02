const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    brand: { type: String, default: 'PepsiCo' },
    category: { type: String, default: 'Carbonated Soft Drink' },
    sku: { type: String },
    barcode: { type: String },
    image: { type: String, default: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&q=80' },
    purchasePrice: { type: Number, default: 0 },
    sellingPrice: { type: Number, required: true }, // Case Price (e.g. ₹340 per Case)
    mrp: { type: Number, default: 0 },
    unit: { type: String, default: 'Case' }, // Always Case
    size: { type: String, default: '250ml' }, // e.g. 250ml, 500ml, 1.25L, 2.25L
    crateQuantity: { type: Number, default: 24 }, // Pack size e.g. 24 bottles per case
    minStock: { type: Number, default: 10 }, // Min Cases
    warehouseStock: { type: Number, default: 0 }, // Total Cases in Warehouse
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Product', productSchema);
