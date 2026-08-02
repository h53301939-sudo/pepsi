const mongoose = require('mongoose');

const saleItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: { type: String },
  quantity: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
  totalAmount: { type: Number, required: true }
});

const saleSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    worker: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    items: [saleItemSchema],
    subTotal: { type: Number, required: true },
    netTotal: { type: Number, required: true },
    paymentMethod: { type: String, enum: ['Cash', 'UPI', 'Credit'], required: true },
    paidAmount: { type: Number, required: true },
    dueAmount: { type: Number, default: 0 },
    dueDate: { type: Date },
    status: { type: String, enum: ['Paid', 'Partial', 'Unpaid'], default: 'Paid' },
    pdfUrl: { type: String }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Sale', saleSchema);
