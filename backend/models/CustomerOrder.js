const mongoose = require('mongoose');

const customerOrderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: { type: String },
  size: { type: String },
  quantity: { type: Number, required: true, min: 1 }, // Quantity in Cases
  unitPrice: { type: Number, required: true },
  totalAmount: { type: Number, required: true }
});

const customerOrderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    bookedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    assignedVehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
    deliveryDate: { type: Date, default: Date.now },
    items: [customerOrderItemSchema],
    totalCases: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: ['Booked', 'Loaded_In_Van', 'Delivered', 'Cancelled'],
      default: 'Booked'
    },
    sale: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale' },
    remarks: { type: String }
  },
  { timestamps: true }
);

module.exports = mongoose.model('CustomerOrder', customerOrderSchema);
