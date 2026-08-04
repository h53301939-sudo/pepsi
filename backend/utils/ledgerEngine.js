const StockTransaction = require('../models/StockTransaction');
const Product = require('../models/Product');
const VehicleStock = require('../models/VehicleStock');

/**
 * Record a stock transaction in the immutable Stock Ledger and adjust inventory balances atomically.
 */
const recordLedgerTransaction = async ({
  product,
  quantity,
  sourceType,
  sourceId = null,
  sourceRefModel = null,
  destType,
  destId = null,
  destRefModel = null,
  transactionType,
  unitPrice = 0,
  user,
  remarks = ''
}) => {
  const numericQty = Number(quantity || 0);
  if (!product || !numericQty || numericQty <= 0) {
    throw new Error('Invalid product or quantity for stock transaction');
  }

  const transactionId = 'TXN-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
  const totalValue = numericQty * Number(unitPrice || 0);

  // 1. Create StockTransaction Ledger Entry
  const transaction = new StockTransaction({
    transactionId,
    product,
    quantity: numericQty,
    sourceType,
    sourceId,
    sourceRefModel,
    destType,
    destId,
    destRefModel,
    transactionType,
    unitPrice: Number(unitPrice || 0),
    totalValue,
    user,
    remarks
  });

  await transaction.save();

  // 2. Adjust Stock Balances atomically using MongoDB $inc
  const targetProduct = await Product.findById(product);
  if (!targetProduct) {
    throw new Error(`Product not found: ${product}`);
  }

  switch (transactionType) {
    case 'Supplier_Inward':
      // Increase Warehouse Stock
      targetProduct.warehouseStock = Number(targetProduct.warehouseStock || 0) + numericQty;
      await targetProduct.save();
      break;

    case 'Warehouse_To_Vehicle':
      // Check available warehouse stock
      if (Number(targetProduct.warehouseStock || 0) < numericQty) {
        throw new Error(`Insufficient warehouse stock for ${targetProduct.name}. Available: ${targetProduct.warehouseStock}, Requested: ${numericQty}`);
      }
      targetProduct.warehouseStock = Number(targetProduct.warehouseStock || 0) - numericQty;
      await targetProduct.save();

      // Atomic Increase of Vehicle Stock in MongoDB
      if (destId) {
        await VehicleStock.findOneAndUpdate(
          { vehicle: destId, product: targetProduct._id },
          { $inc: { quantity: numericQty } },
          { new: true, upsert: true }
        );
      }
      break;

    case 'Warehouse_To_Customer':
      // Deduct Main Warehouse Stock for Direct Warehouse Sales
      if (Number(targetProduct.warehouseStock || 0) < numericQty) {
        throw new Error(`Insufficient warehouse stock for ${targetProduct.name}. Available: ${targetProduct.warehouseStock}, Requested: ${numericQty}`);
      }
      targetProduct.warehouseStock = Number(targetProduct.warehouseStock || 0) - numericQty;
      await targetProduct.save();
      break;

    case 'Vehicle_To_Customer':
      // Atomic Decrease of Vehicle Stock
      if (sourceId) {
        const vStock = await VehicleStock.findOne({ vehicle: sourceId, product: targetProduct._id });
        const currentQty = vStock ? Number(vStock.quantity || 0) : 0;
        if (!vStock || currentQty < numericQty) {
          throw new Error(`Insufficient vehicle stock for ${targetProduct.name}. Available on Van: ${currentQty}, Requested: ${numericQty}`);
        }
        await VehicleStock.findOneAndUpdate(
          { vehicle: sourceId, product: targetProduct._id },
          { $inc: { quantity: -numericQty } },
          { new: true }
        );
      }
      break;

    case 'Vehicle_To_Warehouse':
      // Decrease Vehicle Stock, Increase Warehouse Stock
      if (sourceId) {
        const vStock = await VehicleStock.findOne({ vehicle: sourceId, product: targetProduct._id });
        const currentQty = vStock ? Number(vStock.quantity || 0) : 0;
        if (!vStock || currentQty < numericQty) {
          throw new Error(`Insufficient vehicle stock to return for ${targetProduct.name}. Available: ${currentQty}, Attempted Return: ${numericQty}`);
        }
        await VehicleStock.findOneAndUpdate(
          { vehicle: sourceId, product: targetProduct._id },
          { $inc: { quantity: -numericQty } },
          { new: true }
        );
      }
      targetProduct.warehouseStock = Number(targetProduct.warehouseStock || 0) + numericQty;
      await targetProduct.save();
      break;

    case 'Warehouse_Damage':
      if (Number(targetProduct.warehouseStock || 0) < numericQty) {
        throw new Error(`Insufficient warehouse stock for damage log on ${targetProduct.name}. Available: ${targetProduct.warehouseStock}`);
      }
      targetProduct.warehouseStock = Number(targetProduct.warehouseStock || 0) - numericQty;
      await targetProduct.save();
      break;

    case 'Vehicle_Damage':
      if (sourceId) {
        const vStock = await VehicleStock.findOne({ vehicle: sourceId, product: targetProduct._id });
        const currentQty = vStock ? Number(vStock.quantity || 0) : 0;
        if (!vStock || currentQty < numericQty) {
          throw new Error(`Insufficient vehicle stock for damage log on ${targetProduct.name}. Available: ${currentQty}`);
        }
        await VehicleStock.findOneAndUpdate(
          { vehicle: sourceId, product: targetProduct._id },
          { $inc: { quantity: -numericQty } },
          { new: true }
        );
      }
      break;

    case 'Stock_Adjustment':
      targetProduct.warehouseStock = Number(targetProduct.warehouseStock || 0) + numericQty;
      await targetProduct.save();
      break;

    default:
      break;
  }

  return transaction;
};

module.exports = { recordLedgerTransaction };
