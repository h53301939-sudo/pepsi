const mongoose = require('mongoose');

const targetSchema = new mongoose.Schema(
  {
    month: {
      type: String, // Format: YYYY-MM (e.g., "2026-08")
      required: true,
      unique: true
    },
    targetCases: {
      type: Number,
      default: 5000,
      min: 0
    },
    targetRevenue: {
      type: Number,
      default: 2500000,
      min: 0
    },
    notes: {
      type: String,
      default: ''
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Target', targetSchema);
