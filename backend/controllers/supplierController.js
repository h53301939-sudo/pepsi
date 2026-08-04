const Supplier = require('../models/Supplier');
const { logActivity } = require('../utils/logActivity');

const getSuppliers = async (req, res) => {
  let suppliers = await Supplier.find().sort({ name: 1 });
  if (suppliers.length === 0) {
    const defaultSup = await Supplier.create({
      name: 'PepsiCo India Bottling Plant',
      contactPerson: 'Central Distribution Manager',
      phone: '+91 98765 00000',
      email: 'orders@pepsico.com',
      address: 'Central Bottling Plant, Industrial Estate',
      gstNumber: '27AAAAA0000A1Z5'
    });
    suppliers = [defaultSup];
  }
  res.json(suppliers);
};

const createSupplier = async (req, res) => {
  const { name, contactPerson, phone, email, address, gstNumber } = req.body;

  const supplier = new Supplier({
    name,
    contactPerson,
    phone,
    email,
    address,
    gstNumber
  });

  await supplier.save();
  await logActivity({ req, user: req.user, action: 'Create Supplier', details: `Added supplier ${name}` });

  res.status(201).json(supplier);
};

const updateSupplier = async (req, res) => {
  const supplier = await Supplier.findById(req.params.id);
  if (!supplier) return res.status(404).json({ message: 'Supplier not found' });

  Object.assign(supplier, req.body);
  await supplier.save();
  await logActivity({ req, user: req.user, action: 'Update Supplier', details: `Updated supplier ${supplier.name}` });

  res.json(supplier);
};

const deleteSupplier = async (req, res) => {
  const supplier = await Supplier.findById(req.params.id);
  if (!supplier) return res.status(404).json({ message: 'Supplier not found' });

  await Supplier.findByIdAndDelete(req.params.id);
  await logActivity({ req, user: req.user, action: 'Delete Supplier', details: `Deleted supplier ${supplier.name}` });

  res.json({ message: 'Supplier removed' });
};

module.exports = {
  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier
};
