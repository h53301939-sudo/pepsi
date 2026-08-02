const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    shopName: { type: String, required: true },
    ownerName: { type: String, required: true },
    phone: { type: String, required: true },
    whatsapp: { type: String },
    address: { type: String },
    gstNumber: { type: String },
    creditLimit: { type: Number, default: 50000 },
    outstandingBalance: { type: Number, default: 0 }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Customer', customerSchema);
