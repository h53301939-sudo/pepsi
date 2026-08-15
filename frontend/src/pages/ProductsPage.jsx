import React, { useState, useEffect } from 'react';
import API from '../services/api';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import Modal from '../components/common/Modal';
import { useToast } from '../context/ToastContext';
import { Plus, Search, Edit2, Trash2, Package, AlertCircle, TrendingUp, Loader2 } from 'lucide-react';

export default function ProductsPage() {
  const { toast } = useToast();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableSizes = [
    '150ml',
    '200ml',
    '250ml',
    '300ml',
    '330ml',
    '355ml',
    '400ml',
    '440ml',
    '500ml',
    '600ml',
    '750ml',
    '1L',
    '1.25L',
    '1.5L',
    '1.75L',
    '2L',
    '2.25L'
  ];

  const [formData, setFormData] = useState({
    name: '',
    size: '250ml',
    sellingPrice: '', // Van Selling Price e.g. 340
    purchasePrice: '', // Wholesale Cost Price e.g. 272
    warehouseStock: '', // Stock in Cases
    crateQuantity: 24
  });

  const fetchProducts = async () => {
    try {
      const res = await API.get(`/products?search=${search}`);
      setProducts(res.data || []);
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [search]);

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setFormError('');
    setFormData({
      name: '',
      size: '250ml',
      sellingPrice: '',
      purchasePrice: '',
      warehouseStock: '10',
      crateQuantity: 24
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (prod) => {
    setEditingProduct(prod);
    setFormError('');
    setFormData({
      name: prod.name,
      size: prod.size || '250ml',
      sellingPrice: prod.sellingPrice || '',
      purchasePrice: prod.purchasePrice || '',
      warehouseStock: prod.warehouseStock,
      crateQuantity: prod.crateQuantity || 24
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return; // LOCK AGAINST DOUBLE CLICKING
    setFormError('');

    if (!formData.name || !formData.sellingPrice || !formData.purchasePrice) {
      setFormError('Item Name, Cost Price, and Van Selling Price are required');
      return;
    }

    const sPrice = Number(formData.sellingPrice);
    const pPrice = Number(formData.purchasePrice);

    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name,
        size: formData.size,
        sellingPrice: sPrice, // Van Selling Price
        purchasePrice: pPrice, // Wholesale Cost Price
        warehouseStock: Number(formData.warehouseStock || 0), // Cases
        crateQuantity: Number(formData.crateQuantity || 24),
        unit: 'Case'
      };

      if (editingProduct) {
        await API.put(`/products/${editingProduct._id}`, payload);
        toast.success(`Item "${formData.name}" updated successfully! ✏️`, 'Item Updated');
      } else {
        await API.post('/products', payload);
        toast.success(`Item "${formData.name}" added to warehouse catalog! 📦`, 'Item Added');
      }
      setIsModalOpen(false);
      fetchProducts();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save product in warehouse';
      setFormError(msg);
      toast.error(msg, 'Save Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await API.delete(`/products/${id}`);
        toast.success('Product removed from catalog.', 'Item Deleted');
        fetchProducts();
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to delete product', 'Delete Error');
      }
    }
  };

  const handleClearAllItems = async () => {
    if (window.confirm('⚠️ WARNING: Delete ALL items from warehouse catalog to start completely clean?')) {
      try {
        await API.delete('/products/clear-all');
        toast.success('All items cleared from catalog.', 'Catalog Cleared');
        fetchProducts();
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to clear products', 'Error');
      }
    }
  };

  if (loading) return <LoadingSkeleton count={5} />;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Warehouse Products Catalog
          </h1>
         
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleClearAllItems}
            className="flex items-center space-x-2 px-3 py-2.5 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-xl font-bold text-xs hover:bg-red-100 transition"
          >
            <Trash2 className="w-4 h-4" />
            <span>Remove All Items</span>
          </button>
          <button
            onClick={handleOpenAddModal}
            className="flex items-center space-x-2 px-4 py-2.5 bg-pepsi-blue text-white rounded-xl font-bold text-xs shadow hover:bg-blue-700 transition"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Item to Warehouse</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center space-x-4 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by item name or size..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-pepsi-blue dark:text-white"
          />
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-700/40 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                <th className="py-3 px-4">Item Name</th>
                <th className="py-3 px-4 text-center">Size</th>
                <th className="py-3 px-4 text-right">Cost Price (₹)</th>
                <th className="py-3 px-4 text-right">Selling Price (₹)</th>
                <th className="py-3 px-4 text-center">Profit Margin (₹/Case)</th>
                <th className="py-3 px-4 text-center">Warehouse Stock (Cases)</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {products.map((prod) => {
                const costPrice = prod.purchasePrice || 0;
                const sellPrice = prod.sellingPrice || 0;
                const margin = sellPrice - costPrice;

                return (
                  <tr key={prod._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/40">
                    <td className="py-3 px-4 font-extrabold text-slate-900 dark:text-white">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-pepsi-blue rounded-lg">
                          <Package className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-extrabold text-sm">{prod.name}</p>
                          <span className="text-[10px] text-slate-400">SKU: {prod.sku}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2.5 py-1 rounded-full text-xs font-black bg-blue-50 text-pepsi-blue dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        {prod.size || '250ml'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-700 dark:text-slate-300 text-sm">
                      ₹{costPrice.toFixed(2)} <span className="text-[10px] text-slate-400 font-normal">/ Case</span>
                    </td>
                    <td className="py-3 px-4 text-right font-black text-pepsi-blue dark:text-blue-400 text-sm">
                      ₹{sellPrice.toFixed(2)} <span className="text-[10px] text-slate-400 font-normal">/ Case</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-black ${
                        margin >= 0
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                          : 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300'
                      }`}>
                        <TrendingUp className="w-3 h-3" />
                        <span>+₹{margin.toFixed(2)}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center px-3 py-1 rounded-full font-black text-xs bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200">
                        {prod.warehouseStock} Cases
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenEditModal(prod)}
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(prod._id)}
                        className="p-1.5 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {products.length === 0 && (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400 italic">
                    No products in warehouse. Click "+ Add Item to Warehouse" to add items.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduct ? 'Edit Item Prices & Stock' : 'Add Item to Warehouse Catalog'}
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 bg-red-50 text-red-600 rounded-xl flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Item Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Pepsi 1, 7UP, Mirinda, Mountain Dew"
              className="w-full p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white font-bold text-sm"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Size</label>
            <select
              value={formData.size}
              onChange={(e) => setFormData({ ...formData, size: e.target.value })}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white font-bold max-h-40"
            >
              {availableSizes.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Cost Price / Case (₹)
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.purchasePrice}
                onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                placeholder="e.g. 272"
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white font-bold text-sm"
              />
              <p className="text-[10px] text-slate-400 mt-0.5">Your agency purchase cost per case.</p>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Van Selling Price / Case (₹)
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.sellingPrice}
                onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                placeholder="e.g. 340"
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white font-black text-sm"
              />
              <p className="text-[10px] text-slate-400 mt-0.5">Price charged to customer per case.</p>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Initial Stock (Cases)</label>
            <input
              type="number"
              required
              value={formData.warehouseStock}
              onChange={(e) => setFormData({ ...formData, warehouseStock: e.target.value })}
              placeholder="e.g. 10"
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white font-bold"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 bg-pepsi-blue text-white font-extrabold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm shadow-md flex items-center justify-center space-x-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>SAVING ITEM...</span>
              </>
            ) : (
              <span>{editingProduct ? 'Save Product Changes' : 'Add Item to Warehouse Catalog'}</span>
            )}
          </button>
        </form>
      </Modal>
    </div>
  );
}
