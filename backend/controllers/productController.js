const Product = require('../models/Product');
const { logActivity } = require('../utils/logActivity');

// @desc    Get all products
// @route   GET /api/products
const getProducts = async (req, res) => {
  try {
    const { search, category, status } = req.query;
    let query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { size: { $regex: search, $options: 'i' } }
      ];
    }

    if (category) query.category = category;
    if (status) query.status = status;

    const products = await Product.find(query).sort({ name: 1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Get product by ID
// @route   GET /api/products/:id
const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Create new product (Case-based)
// @route   POST /api/products
const createProduct = async (req, res) => {
  try {
    const {
      name,
      brand,
      category,
      sku,
      barcode,
      image,
      purchasePrice,
      sellingPrice, // Case price e.g. ₹340
      mrp,
      size,
      crateQuantity,
      warehouseStock // Initial Cases
    } = req.body;

    if (!name || sellingPrice === undefined || sellingPrice === null || sellingPrice === '') {
      return res.status(400).json({ message: 'Item name and Case Price are required' });
    }

    const cleanPrice = Number(sellingPrice);
    const cleanSize = size || '250ml';

    // Prevent duplicate product creation with same name and size
    const existing = await Product.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
      size: cleanSize,
      status: 'Active'
    });

    if (existing) {
      return res.status(400).json({ 
        message: `Product "${existing.name}" (${cleanSize}) already exists in catalog with ${existing.warehouseStock} Cases (₹${existing.sellingPrice}/Case). Please edit the existing product or delete it before re-adding.` 
      });
    }

    const cleanSku = sku || `PEP-${name.slice(0, 3).toUpperCase()}-${cleanSize.replace(/\s+/g, '')}-${Math.floor(100 + Math.random() * 900)}`;

    const product = new Product({
      name,
      brand: brand || 'PepsiCo',
      category: category || 'Carbonated Soft Drink',
      sku: cleanSku,
      barcode: barcode || '',
      image: image || 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&q=80',
      purchasePrice: Number(purchasePrice || cleanPrice * 0.8),
      sellingPrice: cleanPrice,
      mrp: Number(mrp || cleanPrice),
      unit: 'Case',
      size: cleanSize,
      crateQuantity: Number(crateQuantity || 24),
      minStock: 5, // Cases
      warehouseStock: Number(warehouseStock || 0), // Cases
      status: 'Active'
    });

    const createdProduct = await product.save();
    await logActivity({ req, user: req.user, action: 'Create Product', details: `Added product ${createdProduct.name} (${createdProduct.size}, ₹${createdProduct.sellingPrice}/Case)` });

    res.status(201).json(createdProduct);
  } catch (err) {
    console.error('Error creating product:', err);
    res.status(500).json({ message: err.message || 'Failed to create product' });
  }
};

// @desc    Update product
// @route   PUT /api/products/:id
const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const fields = ['name', 'brand', 'category', 'sku', 'barcode', 'image', 'purchasePrice', 'sellingPrice', 'mrp', 'unit', 'size', 'crateQuantity', 'minStock', 'warehouseStock', 'status'];
    
    fields.forEach(field => {
      if (req.body[field] !== undefined) {
        product[field] = req.body[field];
      }
    });

    const updatedProduct = await product.save();
    await logActivity({ req, user: req.user, action: 'Update Product', details: `Updated product ${updatedProduct.name}` });

    res.json(updatedProduct);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    await Product.findByIdAndDelete(req.params.id);
    await logActivity({ req, user: req.user, action: 'Delete Product', details: `Deleted product ${product.name}` });

    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Clear All Products
// @route   DELETE /api/products/clear-all
const clearAllProducts = async (req, res) => {
  try {
    await Product.deleteMany({});
    await logActivity({ req, user: req.user, action: 'Clear All Products', details: 'Cleared all items from products catalog' });
    res.json({ message: 'All items removed from catalog successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  clearAllProducts
};
