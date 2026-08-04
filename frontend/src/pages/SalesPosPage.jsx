import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import InvoiceModal from '../components/invoice/InvoiceModal';
import Modal from '../components/common/Modal';
import { ShoppingCart, Plus, Minus, Trash2, Search, UserPlus, CreditCard, CheckCircle, Printer, AlertTriangle, Package, Loader2, Store } from 'lucide-react';

export default function SalesPosPage() {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState(() => {
    return localStorage.getItem('pepsi_pos_vehicle') || 'warehouse_direct';
  });
  const [vanStock, setVanStock] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState(() => {
    return localStorage.getItem('pepsi_pos_customer') || '';
  });
  const [searchProduct, setSearchProduct] = useState('');
  const [mobileTab, setMobileTab] = useState('items'); // 'items' or 'cart'

  // Button locking state to prevent duplicate clicks/events
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCustSubmitting, setIsCustSubmitting] = useState(false);

  // Persistent Cart state stored in localStorage across page navigation
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('pepsi_pos_cart');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paidAmount, setPaidAmount] = useState('');

  const [loading, setLoading] = useState(true);
  const [generatedSale, setGeneratedSale] = useState(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [isNewCustModalOpen, setIsNewCustModalOpen] = useState(false);

  const [newCustomer, setNewCustomer] = useState({
    shopName: '',
    ownerName: '',
    phone: '',
    address: ''
  });

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('pepsi_pos_cart', JSON.stringify(cart));
  }, [cart]);

  // Save selected vehicle to localStorage
  useEffect(() => {
    if (selectedVehicleId) {
      localStorage.setItem('pepsi_pos_vehicle', selectedVehicleId);
    }
  }, [selectedVehicleId]);

  // Save selected customer to localStorage
  useEffect(() => {
    if (selectedCustomerId) {
      localStorage.setItem('pepsi_pos_customer', selectedCustomerId);
    }
  }, [selectedCustomerId]);

  const fetchVanStock = async (vid) => {
    if (!vid) return;
    try {
      if (vid === 'warehouse_direct') {
        const res = await API.get('/products');
        const prods = res.data || [];
        const mapped = prods.map(p => ({
          _id: p._id,
          product: p,
          quantity: p.warehouseStock || 0
        }));
        setVanStock(mapped);
      } else {
        const res = await API.get(`/vehicles/${vid}/stock`);
        setVanStock(res.data?.stocks || []);
      }
    } catch (err) {
      console.error('Error fetching stock:', err);
    }
  };

  const fetchData = async () => {
    try {
      const [vRes, cRes] = await Promise.all([
        API.get('/vehicles'),
        API.get('/customers')
      ]);
      const vList = vRes.data || [];
      const cList = cRes.data || [];
      setVehicles(vList);
      setCustomers(cList);

      let vid = selectedVehicleId;
      if (!vid) {
        vid = user?.assignedVehicle?._id || 'warehouse_direct';
      }

      setSelectedVehicleId(vid);
      fetchVanStock(vid);

      let cid = selectedCustomerId || (cList && cList[0]?._id) || '';
      setSelectedCustomerId(cid);
    } catch (err) {
      console.error('Error fetching POS data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleVehicleChange = (vid) => {
    setSelectedVehicleId(vid);
    fetchVanStock(vid);
  };

  const addToCart = (item) => {
    const existing = cart.find(c => c.product._id === item.product._id);
    if (existing) {
      if (existing.quantity >= item.quantity) {
        const stockType = selectedVehicleId === 'warehouse_direct' ? 'warehouse main stock' : 'van stock';
        alert(`Cannot add more than available ${stockType} (${item.quantity} Cases)`);
        return;
      }
      setCart(cart.map(c => c.product._id === item.product._id ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      setCart([...cart, {
        product: item.product,
        maxStock: item.quantity, // Cases
        quantity: 1, // 1 Case
        unitPrice: item.product.sellingPrice // Case Price e.g. 340
      }]);
    }
  };

  const updateCartQty = (prodId, newQty) => {
    if (newQty <= 0) {
      setCart(cart.filter(c => c.product._id !== prodId));
      return;
    }
    const item = cart.find(c => c.product._id === prodId);
    if (item && newQty > item.maxStock) {
      const stockType = selectedVehicleId === 'warehouse_direct' ? 'warehouse' : 'van';
      alert(`Max available stock on ${stockType} is ${item.maxStock} Cases`);
      return;
    }
    setCart(cart.map(c => c.product._id === prodId ? { ...c, quantity: newQty } : c));
  };

  const handleClearCart = () => {
    if (window.confirm('Clear all items from current sale cart?')) {
      setCart([]);
      localStorage.removeItem('pepsi_pos_cart');
    }
  };

  let netTotal = 0;
  cart.forEach(item => {
    netTotal += item.quantity * item.unitPrice;
  });

  const selectedCustomerObj = customers.find(c => c._id === selectedCustomerId);
  const actualPaidAmount = paymentMethod === 'Credit' ? Number(paidAmount || 0) : netTotal;
  const prospectiveDue = netTotal - actualPaidAmount;

  const isCreditExceeded = paymentMethod === 'Credit' && 
    prospectiveDue > 0 && 
    selectedCustomerObj?.creditLimit > 0 && 
    ((selectedCustomerObj.outstandingBalance || 0) + prospectiveDue) > selectedCustomerObj.creditLimit;

  const handleProcessSale = async () => {
    if (isSubmitting) return; // Prevent double trigger
    if (!selectedVehicleId) return alert('Select dispatch source (Warehouse Counter or Van)');
    if (!selectedCustomerId) return alert('Select customer');
    if (cart.length === 0) return alert('Cart is empty');

    if (isCreditExceeded) {
      const currentDue = selectedCustomerObj.outstandingBalance || 0;
      const limit = selectedCustomerObj.creditLimit;
      alert(`⛔ SALE BLOCKED: Credit limit of ₹${limit.toLocaleString()} exceeded for ${selectedCustomerObj.shopName}!\n\nCurrent Due: ₹${currentDue.toLocaleString()}\nNew Bill Due: ₹${prospectiveDue.toLocaleString()}\nTotal: ₹${(currentDue + prospectiveDue).toLocaleString()}\n\nPlease collect payment or increase credit limit in Customers page.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const salePayload = {
        vehicleId: selectedVehicleId,
        customerId: selectedCustomerId,
        items: cart.map(c => ({
          product: c.product._id,
          quantity: c.quantity, // Cases
          unitPrice: c.unitPrice
        })),
        paymentMethod,
        paidAmount: actualPaidAmount
      };

      const res = await API.post('/sales', salePayload);
      setGeneratedSale(res.data);
      setIsInvoiceOpen(true);
      
      // Clear persistent cart after successful sale
      setCart([]);
      localStorage.removeItem('pepsi_pos_cart');
      fetchVanStock(selectedVehicleId);
      fetchData(); // Refresh customers list & balances
    } catch (err) {
      alert(err.response?.data?.message || 'POS Sale failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateCustomerSubmit = async (e) => {
    e.preventDefault();
    if (isCustSubmitting) return;
    setIsCustSubmitting(true);
    try {
      const res = await API.post('/customers', newCustomer);
      setCustomers([...customers, res.data]);
      setSelectedCustomerId(res.data._id);
      setIsNewCustModalOpen(false);
      setNewCustomer({ shopName: '', ownerName: '', phone: '', address: '' });
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create customer');
    } finally {
      setIsCustSubmitting(false);
    }
  };

  if (loading) return <LoadingSkeleton count={5} />;

  const filteredVanStock = vanStock.filter(item =>
    item.product?.name.toLowerCase().includes(searchProduct.toLowerCase()) ||
    item.product?.size?.toLowerCase().includes(searchProduct.toLowerCase()) ||
    item.product?.sku?.toLowerCase().includes(searchProduct.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-pepsi-blue text-white rounded-xl">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 dark:text-white leading-tight">Sales POS Billing (Cases)</h1>
            <p className="text-[11px] text-slate-500">Sell Direct from Warehouse Counter or Delivery Van Stock</p>
          </div>
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <select
            value={selectedVehicleId}
            onChange={(e) => handleVehicleChange(e.target.value)}
            className="w-full sm:w-auto p-2.5 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-black text-slate-900 dark:text-white"
          >
            <option value="warehouse_direct">🏭 DIRECT WAREHOUSE SALE (Main Counter)</option>
            {vehicles.map(v => (
              <option key={v._id} value={v._id}>
                🚐 Van: {v.vehicleNumber} ({v.vehicleName}) — {v.totalStockUnits || 0} Cases Loaded
              </option>
            ))}
          </select>

          <button
            onClick={() => setIsNewCustModalOpen(true)}
            className="flex items-center space-x-1 px-3 py-2.5 bg-blue-50 dark:bg-blue-900/30 text-pepsi-blue dark:text-blue-300 rounded-xl text-xs font-bold hover:bg-blue-100 transition whitespace-nowrap"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>+ Add Customer</span>
          </button>
        </div>
      </div>

      {/* Mobile Tab Switcher (Only visible on screens < lg) */}
      <div className="flex lg:hidden bg-slate-200 dark:bg-slate-700/60 p-1 rounded-xl">
        <button
          onClick={() => setMobileTab('items')}
          className={`flex-1 py-2 text-xs font-extrabold rounded-lg transition flex items-center justify-center space-x-1.5 ${
            mobileTab === 'items'
              ? 'bg-pepsi-blue text-white shadow'
              : 'text-slate-600 dark:text-slate-300'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>Items Catalog</span>
        </button>
        <button
          onClick={() => setMobileTab('cart')}
          className={`flex-1 py-2 text-xs font-extrabold rounded-lg transition flex items-center justify-center space-x-1.5 ${
            mobileTab === 'cart'
              ? 'bg-pepsi-blue text-white shadow'
              : 'text-slate-600 dark:text-slate-300'
          }`}
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          <span>View Cart ({cart.length}) - ₹{netTotal}</span>
        </button>
      </div>

      {/* POS Interface Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Product Selector (7 cols) */}
        <div className={`lg:col-span-7 space-y-4 ${mobileTab === 'items' ? 'block' : 'hidden lg:block'}`}>
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Select Customer Shop
              </label>
              {selectedCustomerObj && (
                <span className="text-[11px] font-extrabold text-pepsi-blue dark:text-blue-400">
                  Credit Limit: ₹{selectedCustomerObj.creditLimit?.toLocaleString() || 0}
                </span>
              )}
            </div>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
            >
              {customers.map(c => (
                <option key={c._id} value={c._id}>
                  {c.shopName} ({c.ownerName}) - Limit: ₹{c.creditLimit} | Bal: ₹{c.outstandingBalance}
                </option>
              ))}
            </select>
          </div>

          {/* Product Cards Grid */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                {selectedVehicleId === 'warehouse_direct' ? 'WAREHOUSE MAIN STOCK AVAILABLE' : 'VAN CASES AVAILABLE'} ({filteredVanStock.length} SKUs)
              </span>
              <input
                type="text"
                placeholder="Filter item..."
                value={searchProduct}
                onChange={(e) => setSearchProduct(e.target.value)}
                className="px-3 py-1 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[460px] overflow-y-auto pr-1">
              {filteredVanStock.map((item) => (
                <div
                  key={item._id}
                  onClick={() => addToCart(item)}
                  className="bg-slate-50 dark:bg-slate-700/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-600 hover:border-pepsi-blue active:scale-95 cursor-pointer transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <h4 className="font-black text-sm text-slate-900 dark:text-white leading-tight">{item.product?.name}</h4>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                        {item.product?.size || '250ml'}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t pt-2 border-slate-200 dark:border-slate-600">
                    <span className="text-xs md:text-sm font-black text-pepsi-blue dark:text-blue-400">₹{item.product?.sellingPrice} / Case</span>
                    <span className="text-[11px] font-extrabold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                      {item.quantity} Cases
                    </span>
                  </div>
                </div>
              ))}
              {filteredVanStock.length === 0 && (
                <div className="col-span-3 py-12 text-center text-slate-400 italic text-xs space-y-1">
                  <p className="font-bold text-slate-600 dark:text-slate-300">No stock available for selected source.</p>
                  <p className="text-[11px]">Select another dispatch source or add stock in Products Catalog / Van Loading.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Cart & Billing Panel (5 cols) */}
        <div className={`lg:col-span-5 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between space-y-4 ${mobileTab === 'cart' ? 'block' : 'hidden lg:block'}`}>
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Current Cart Items</h3>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-400 font-bold">{cart.length} Items</span>
                {cart.length > 0 && (
                  <button
                    onClick={handleClearCart}
                    className="text-[10px] font-bold text-red-500 hover:underline px-1.5 py-0.5 bg-red-50 dark:bg-red-950/40 rounded"
                  >
                    Clear Cart
                  </button>
                )}
              </div>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-700/60 max-h-[280px] overflow-y-auto my-2 pr-1">
              {cart.map((c) => (
                <div key={c.product._id} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex-1 pr-2">
                    <p className="font-bold text-slate-900 dark:text-white">
                      {c.product.name} ({c.product.size || '250ml'})
                    </p>
                    <p className="text-[10px] text-slate-400">₹{c.unitPrice} / Case</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button onClick={() => updateCartQty(c.product._id, c.quantity - 1)} className="p-1.5 rounded bg-slate-100 dark:bg-slate-700">
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-black px-2 text-sm">{c.quantity} Cases</span>
                    <button onClick={() => updateCartQty(c.product._id, c.quantity + 1)} className="p-1.5 rounded bg-slate-100 dark:bg-slate-700">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => updateCartQty(c.product._id, 0)} className="p-1.5 text-red-500 hover:bg-red-50 rounded">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {cart.length === 0 && (
                <div className="py-12 text-center text-slate-400 italic text-xs">
                  Cart is empty. Click any item to add cases to sale cart.
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-700/40 p-4 rounded-xl space-y-3 text-xs border border-slate-200 dark:border-slate-600">
            <div className="space-y-1">
              <div className="flex justify-between text-base font-black text-slate-900 dark:text-white pt-1">
                <span>Net Total:</span>
                <span className="text-pepsi-blue dark:text-blue-400 text-lg">₹{netTotal}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-600 space-y-2">
              <label className="block text-[10px] font-bold text-slate-400 uppercase">Payment Mode</label>
              <div className="grid grid-cols-3 gap-2">
                {['Cash', 'UPI', 'Credit'].map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPaymentMethod(mode)}
                    className={`py-2.5 text-xs font-extrabold rounded-lg border transition ${
                      paymentMethod === mode
                        ? 'bg-pepsi-blue text-white border-pepsi-blue shadow'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {paymentMethod === 'Credit' && (
              <div className="space-y-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Amount Paid Today (₹)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white font-bold text-sm"
                  />
                </div>

                {isCreditExceeded && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-500 rounded-xl space-y-1">
                    <div className="flex items-center space-x-1.5 font-extrabold text-xs">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      <span>Credit Limit Will Be Exceeded!</span>
                    </div>
                    <p className="text-[10px] text-red-400">
                      Shop Limit: ₹{selectedCustomerObj?.creditLimit?.toLocaleString()} | Current Due: ₹{selectedCustomerObj?.outstandingBalance?.toLocaleString()} | New Due: ₹{prospectiveDue.toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={handleProcessSale}
              disabled={isSubmitting || cart.length === 0 || isCreditExceeded}
              className="w-full py-3.5 bg-gradient-to-r from-pepsi-blue to-blue-700 text-white font-extrabold rounded-xl shadow-lg hover:shadow-blue-500/20 disabled:opacity-50 transition flex items-center justify-center space-x-2 text-sm uppercase tracking-wider"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing Sale...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Complete Sale & Generate Invoice</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <InvoiceModal
        isOpen={isInvoiceOpen}
        onClose={() => setIsInvoiceOpen(false)}
        sale={generatedSale}
      />

      <Modal isOpen={isNewCustModalOpen} onClose={() => setIsNewCustModalOpen(false)} title="Quick Create New Customer Shop">
        <form onSubmit={handleCreateCustomerSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Shop / Business Name</label>
            <input
              type="text"
              required
              value={newCustomer.shopName}
              onChange={(e) => setNewCustomer({ ...newCustomer, shopName: e.target.value })}
              placeholder="e.g. Krishna Cold Drinks"
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Owner Name</label>
              <input
                type="text"
                required
                value={newCustomer.ownerName}
                onChange={(e) => setNewCustomer({ ...newCustomer, ownerName: e.target.value })}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
              <input
                type="text"
                required
                value={newCustomer.phone}
                onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Shop Address</label>
            <input
              type="text"
              value={newCustomer.address}
              onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
              placeholder="Shop address (optional, will show on invoice if added)..."
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white"
            />
          </div>

          <button
            type="submit"
            disabled={isCustSubmitting}
            className="w-full py-3 bg-pepsi-blue text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition flex items-center justify-center space-x-2"
          >
            {isCustSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Customer...</span>
              </>
            ) : (
              <span>Save Customer & Select for Sale</span>
            )}
          </button>
        </form>
      </Modal>
    </div>
  );
}
