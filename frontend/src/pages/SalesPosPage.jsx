import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import API from '../services/api';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import InvoiceModal from '../components/invoice/InvoiceModal';
import SaleSuccessModal from '../components/pos/SaleSuccessModal';
import SaleConfirmModal from '../components/pos/SaleConfirmModal';
import CustomerAvatar from '../components/common/CustomerAvatar';
import Modal from '../components/common/Modal';
import { playCartBeep, playSaleSuccessSound } from '../utils/audio';
import { ShoppingCart, Plus, Minus, Trash2, Search, UserPlus, CheckCircle, AlertTriangle, Package, Loader2, Tag, Truck } from 'lucide-react';

export default function SalesPosPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [vehicles, setVehicles] = useState([]);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState(() => {
    return localStorage.getItem('pepsi_pos_vehicle') || '';
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
  const [splitCashAmount, setSplitCashAmount] = useState('');
  const [splitUpiAmount, setSplitUpiAmount] = useState('');
  const [creditCashAmount, setCreditCashAmount] = useState('');
  const [creditUpiAmount, setCreditUpiAmount] = useState('');
  const [discountAmount, setDiscountAmount] = useState('');

  const [loading, setLoading] = useState(true);
  const [generatedSale, setGeneratedSale] = useState(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
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

  const fetchVanStock = async (vehicleId) => {
    if (!vehicleId) return;
    try {
      const res = await API.get(`/vehicles/${vehicleId}/stock`);
      setVanStock(res.data.stocks || []);
    } catch (err) {
      console.error('Error fetching van stock:', err);
    }
  };

  const fetchData = async () => {
    try {
      const [vRes, cRes] = await Promise.all([
        API.get('/vehicles'),
        API.get('/customers')
      ]);
      let vList = vRes.data || [];
      const cList = cRes.data || [];

      // If worker, restrict strictly to worker's assigned vehicle only
      if (user?.role === 'worker') {
        const assignedId = user?.assignedVehicle?._id || user?.assignedVehicle;
        if (assignedId) {
          const matchingVan = vList.find(v => String(v._id) === String(assignedId));
          vList = matchingVan ? [matchingVan] : [];
        } else {
          vList = [];
        }
      }

      setVehicles(vList);
      setCustomers(cList);

      let vid = '';
      if (user?.role === 'worker') {
        vid = user?.assignedVehicle?._id || user?.assignedVehicle || (vList[0]?._id || '');
      } else {
        const vanWithStock = vList.find(v => (v.totalStockUnits || 0) > 0);
        vid = selectedVehicleId;
        if (!vid || !vList.some(v => v._id === vid)) {
          vid = vanWithStock?._id || vList[0]?._id || '';
        } else {
          const currentSavedVan = vList.find(v => v._id === vid);
          if (currentSavedVan && (currentSavedVan.totalStockUnits || 0) === 0 && vanWithStock) {
            vid = vanWithStock._id;
          }
        }
      }

      setSelectedVehicleId(vid);
      if (vid) {
        fetchVanStock(vid);
      }
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
        alert(`Cannot add more than available van stock (${item.quantity} Cases)`);
        return;
      }
      setCart(cart.map(c => c.product._id === item.product._id ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      setCart([...cart, {
        product: item.product,
        quantity: 1,
        unitPrice: item.product.sellingPrice,
        maxVanStock: item.quantity
      }]);
    }
    // 🎵 Play scanner beep on add to cart
    playCartBeep();
  };

  const updateCartQty = (prodId, newQty) => {
    if (newQty <= 0) {
      setCart(cart.filter(c => c.product._id !== prodId));
      return;
    }
    const item = cart.find(c => c.product._id === prodId);
    if (item && newQty > item.maxVanStock) {
      alert(`Max available stock on van is ${item.maxVanStock} Cases`);
      return;
    }
    if (item && newQty > item.quantity) {
      playCartBeep();
    }
    setCart(cart.map(c => c.product._id === prodId ? { ...c, quantity: newQty } : c));
  };

  const handleClearCart = () => {
    if (window.confirm('Clear all items from POS cart?')) {
      setCart([]);
      localStorage.removeItem('pepsi_pos_cart');
    }
  };

  let subTotal = 0;
  let totalCases = 0;
  cart.forEach(item => {
    subTotal += item.quantity * item.unitPrice;
    totalCases += (Number(item.quantity) || 0);
  });

  const selectedCustomerObj = customers.find(c => c._id === selectedCustomerId);

  useEffect(() => {
    if (selectedCustomerObj?.discountPercentage > 0 && subTotal > 0) {
      const calculatedDisc = Math.round((subTotal * selectedCustomerObj.discountPercentage) / 100);
      setDiscountAmount(calculatedDisc.toString());
    }
  }, [selectedCustomerId, selectedCustomerObj?.discountPercentage, subTotal]);

  const numericDisc = Math.min(subTotal, Math.max(0, Number(discountAmount || 0)));
  const netTotal = Math.max(0, Math.round(subTotal - numericDisc));

  let actualPaidAmount = netTotal;
  if (paymentMethod === 'Credit') {
    actualPaidAmount = Number(creditCashAmount || 0) + Number(creditUpiAmount || 0);
  } else if (paymentMethod === 'Split') {
    actualPaidAmount = Number(splitCashAmount || 0) + Number(splitUpiAmount || 0);
  }
  const prospectiveDue = Math.max(0, netTotal - actualPaidAmount);

  const isCreditExceeded = (paymentMethod === 'Credit' || paymentMethod === 'Split') && 
    prospectiveDue > 0 && 
    selectedCustomerObj?.creditLimit > 0 && 
    ((selectedCustomerObj.outstandingBalance || 0) + prospectiveDue) > selectedCustomerObj.creditLimit;

  const handleProcessSale = () => {
    if (isSubmitting) return; // Prevent double trigger
    if (!selectedVehicleId) return alert('Select delivery van');
    if (!selectedCustomerId) return alert('Select customer');
    if (cart.length === 0) return alert('Cart is empty');

    if (paymentMethod === 'Split') {
      const cashVal = Number(splitCashAmount || 0);
      const upiVal = Number(splitUpiAmount || 0);
      if (cashVal + upiVal <= 0) {
        return alert('Please enter at least Cash or UPI amount for Split payment.');
      }
    }

    if (isCreditExceeded) {
      const currentDue = selectedCustomerObj.outstandingBalance || 0;
      const limit = selectedCustomerObj.creditLimit;
      alert(`⛔ SALE BLOCKED: Credit limit of ₹${limit.toLocaleString()} exceeded for ${selectedCustomerObj.shopName}!\n\nCurrent Due: ₹${currentDue.toLocaleString()}\nNew Bill Due: ₹${prospectiveDue.toLocaleString()}\nTotal: ₹${(currentDue + prospectiveDue).toLocaleString()}\n\nPlease collect payment or increase credit limit in Customers page.`);
      return;
    }

    // Open confirmation modal to prevent accidental clicks
    setIsConfirmModalOpen(true);
  };

  const handleConfirmAndExecuteSale = async () => {
    if (isSubmitting) return;
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
        discount: numericDisc,
        paymentMethod,
        paidAmount: actualPaidAmount,
        cashAmount: paymentMethod === 'Split' 
          ? Number(splitCashAmount || 0) 
          : (paymentMethod === 'Cash' ? netTotal : (paymentMethod === 'Credit' ? Number(creditCashAmount || 0) : 0)),
        upiAmount: paymentMethod === 'Split' 
          ? Number(splitUpiAmount || 0) 
          : (paymentMethod === 'UPI' ? netTotal : (paymentMethod === 'Credit' ? Number(creditUpiAmount || 0) : 0))
      };

      const res = await API.post('/sales', salePayload);
      
      // 🎵 Play Signature UPI/Cash Register Success Ringtone & Haptics
      playSaleSuccessSound();

      setGeneratedSale(res.data);
      setIsConfirmModalOpen(false);
      setIsSuccessModalOpen(true);
      
      // Clear persistent cart after successful sale
      setCart([]);
      setDiscountAmount('');
      setSplitCashAmount('');
      setSplitUpiAmount('');
      setCreditCashAmount('');
      setCreditUpiAmount('');
      setPaidAmount('');
      localStorage.removeItem('pepsi_pos_cart');
      fetchVanStock(selectedVehicleId);
      fetchData(); // Refresh customers list & balances
    } catch (err) {
      toast.error(err.response?.data?.message || 'POS Sale failed', 'Sale Error');
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
      toast.success(`Customer "${res.data?.shopName}" registered successfully! 👤`, 'Customer Added');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add customer', 'Error');
    } finally {
      setIsCustSubmitting(false);
    }
  };

  const filteredStock = vanStock.filter(st => 
    st.product?.name?.toLowerCase().includes(searchProduct.toLowerCase()) ||
    st.product?.size?.toLowerCase().includes(searchProduct.toLowerCase())
  );

  const selectedVehicleObj = vehicles.find(v => v._id === selectedVehicleId);

  if (loading) return <LoadingSkeleton count={4} />;

  return (
    <div className="space-y-4 pb-20 lg:pb-0">
      {/* Top Controls Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Van Sales POS</h1>
            <span className="text-xs bg-blue-50 text-pepsi-blue dark:bg-blue-900/30 dark:text-blue-300 font-extrabold px-2.5 py-1 rounded-full border border-blue-200 dark:border-blue-800">
              Live Loaded Route Billing (Cases)
            </span>
          </div>

          {/* Van Selector (Locked for Worker, Selectable for Admin) */}
          {user?.role === 'worker' ? (
            <div className="flex items-center space-x-2 bg-blue-50 dark:bg-blue-950/50 px-3.5 py-2 rounded-xl border border-blue-200 dark:border-blue-800 shadow-sm">
              <Truck className="w-4 h-4 text-pepsi-blue shrink-0" />
              <div>
                <span className="text-[9px] font-black text-slate-400 block uppercase tracking-wider">Assigned Route Van</span>
                <span className="font-extrabold text-xs text-[#002B7F] dark:text-blue-300">
                  {selectedVehicleObj
                    ? `${selectedVehicleObj.vehicleNumber} (${selectedVehicleObj.vehicleName}) • ${selectedVehicleObj.totalStockUnits || 0} Cases`
                    : (user?.assignedVehicle?.vehicleNumber ? `${user.assignedVehicle.vehicleNumber} (${user.assignedVehicle.vehicleName || 'Van'})` : 'No Van Assigned')}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-500 uppercase text-[10px]">Select Route Van:</span>
              <select
                value={selectedVehicleId}
                onChange={(e) => handleVehicleChange(e.target.value)}
                className="p-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white font-extrabold text-xs"
              >
                {vehicles.map((v) => (
                  <option key={v._id} value={v._id}>
                    {v.vehicleNumber} ({v.vehicleName}) - {v.totalStockUnits || 0} Cases Loaded
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Customer Selection Bar */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="w-full sm:w-auto flex-1 flex items-center space-x-2">
            {selectedCustomerObj && (
              <CustomerAvatar name={selectedCustomerObj.shopName} size="sm" />
            )}
            <div className="flex-1">
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white font-extrabold text-xs focus:ring-2 focus:ring-pepsi-blue"
              >
                {customers.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.shopName} ({c.ownerName}) - Limit: ₹{c.creditLimit?.toLocaleString()} | Bal: ₹{c.outstandingBalance?.toLocaleString()}
                    {c.discountPercentage > 0 ? ` [${c.discountPercentage}% OFF]` : ''}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => setIsNewCustModalOpen(true)}
              className="px-3 py-2.5 bg-pepsi-blue text-white rounded-xl font-bold text-xs hover:bg-blue-700 transition flex items-center space-x-1 flex-shrink-0"
              title="Add New Customer Shop"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Customer</span>
            </button>
          </div>

          {selectedCustomerObj && (
            <div className="flex items-center space-x-3 text-xs bg-slate-50 dark:bg-slate-700/40 px-3 py-2 rounded-xl border border-slate-100 dark:border-slate-700">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Credit Limit</span>
                <span className="font-extrabold text-pepsi-blue dark:text-blue-400">₹{selectedCustomerObj.creditLimit?.toLocaleString()}</span>
              </div>
              <div className="border-l border-slate-200 dark:border-slate-600 pl-3">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Current Balance</span>
                <span className={`font-black ${selectedCustomerObj.outstandingBalance > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                  ₹{selectedCustomerObj.outstandingBalance?.toLocaleString()}
                </span>
              </div>
              {selectedCustomerObj.discountPercentage > 0 && (
                <div className="border-l border-slate-200 dark:border-slate-600 pl-3">
                  <span className="text-[10px] text-emerald-600 uppercase font-bold block">Special Discount</span>
                  <span className="font-black text-emerald-600 flex items-center space-x-0.5">
                    <Tag className="w-3 h-3" />
                    <span>{selectedCustomerObj.discountPercentage}%</span>
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Tab Toggle Switcher (Visible on Mobile & Tablet screens) */}
      <div className="grid grid-cols-2 lg:hidden bg-slate-200 dark:bg-slate-700/80 p-1.5 rounded-2xl gap-2 font-black text-xs shadow-inner">
        <button
          type="button"
          onClick={() => setMobileTab('items')}
          className={`py-3 rounded-xl flex items-center justify-center space-x-2 transition ${
            mobileTab === 'items'
              ? 'bg-pepsi-blue text-white shadow-md'
              : 'text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>1. Select Items ({filteredStock.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileTab('cart')}
          className={`py-3 rounded-xl flex items-center justify-center space-x-2 transition relative ${
            mobileTab === 'cart'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          <span>2. View Cart ({cart.length}) {netTotal > 0 ? `• ₹${netTotal}` : ''}</span>
          {cart.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white font-black text-[10px] rounded-full flex items-center justify-center shadow animate-bounce">
              {cart.length}
            </span>
          )}
        </button>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Product Catalog Selection (7 cols) */}
        <div className={`lg:col-span-7 space-y-4 ${mobileTab === 'items' ? 'block' : 'hidden lg:block'}`}>
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center space-x-2">
                <Package className="w-4 h-4 text-pepsi-blue" />
                <span>Items Loaded on Van ({filteredStock.length} SKUs)</span>
              </h3>

              <div className="relative w-48">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter item..."
                  value={searchProduct}
                  onChange={(e) => setSearchProduct(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredStock.map((st) => (
                <div
                  key={st._id}
                  onClick={() => addToCart(st)}
                  className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-xl border border-slate-200 dark:border-slate-600/60 hover:border-pepsi-blue dark:hover:border-blue-400 cursor-pointer transition flex flex-col justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex justify-between items-start">
                      <h4 className="font-extrabold text-xs text-slate-900 dark:text-white capitalize">{st.product?.name}</h4>
                      <span className="text-[9px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 px-1.5 py-0.5 rounded">
                        {st.product?.size || '250ml'}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t pt-2 border-slate-200 dark:border-slate-600">
                    <span className="text-xs md:text-sm font-black text-pepsi-blue dark:text-blue-400">₹{st.product?.sellingPrice} / Case</span>
                    <span className="text-[11px] font-extrabold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                      {st.quantity} Cases
                    </span>
                  </div>
                </div>
              ))}
              {filteredStock.length === 0 && (
                <div className="col-span-3 py-12 text-center text-slate-400 italic text-xs space-y-1">
                  <p className="font-bold text-slate-600 dark:text-slate-300">No stock loaded on this vehicle.</p>
                  <p>Go to "Van Loading" page to transfer cases from main warehouse to this van.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Cart & Billing Panel (5 cols) */}
        <div className={`lg:col-span-5 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between space-y-4 ${mobileTab === 'cart' ? 'block' : 'hidden lg:block'}`}>
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Customer Sale Cart</h3>
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
                  Cart is empty. Click any item on the left to add cases to customer bill.
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-700/40 p-4 rounded-xl space-y-3 text-xs border border-slate-200 dark:border-slate-600">
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs text-slate-500 font-semibold">
                <span>Sub Total:</span>
                <span>₹{subTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-600 dark:text-slate-300 font-bold flex items-center space-x-1">
                  <span>Discount (₹):</span>
                  {selectedCustomerObj?.discountPercentage > 0 && (
                    <span className="text-[10px] text-emerald-600 font-black">({selectedCustomerObj.discountPercentage}% Auto)</span>
                  )}
                </span>
                <input
                  type="number"
                  placeholder="0"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value)}
                  className="w-24 p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-right font-bold text-xs text-emerald-600 dark:text-emerald-400"
                />
              </div>
              <div className="flex justify-between items-center text-base font-black text-slate-900 dark:text-white border-t pt-2 border-slate-200 dark:border-slate-600">
                <span>Net Total:</span>
                <span className="text-pepsi-blue dark:text-blue-400 text-lg">₹{netTotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-600 space-y-2">
              <label className="block text-[10px] font-bold text-slate-400 uppercase">Payment Mode</label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: 'Cash', label: '💵 Cash' },
                  { id: 'UPI', label: '📱 UPI' },
                  { id: 'Split', label: '🔀 Split' },
                  { id: 'Credit', label: '📋 Credit' }
                ].map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => {
                      setPaymentMethod(mode.id);
                      if (mode.id === 'Split' && !splitCashAmount && !splitUpiAmount) {
                        // Default empty for worker to type
                      }
                    }}
                    className={`py-2 px-1 text-center text-xs font-black rounded-xl border transition ${
                      paymentMethod === mode.id
                        ? mode.id === 'Split'
                          ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-500/20'
                          : 'bg-pepsi-blue text-white border-pepsi-blue shadow'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 🔀 SPLIT PAYMENT BREAKDOWN (CASH + UPI) */}
            {paymentMethod === 'Split' && (
              <div className="p-3 bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60 rounded-2xl space-y-2.5 animate-fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold text-purple-700 dark:text-purple-300 uppercase tracking-wider">
                    Split Cash + UPI Breakdown
                  </span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    (Number(splitCashAmount || 0) + Number(splitUpiAmount || 0)) >= netTotal
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                  }`}>
                    {(Number(splitCashAmount || 0) + Number(splitUpiAmount || 0)) >= netTotal 
                      ? '✓ Full (₹' + netTotal + ')' 
                      : `Due: ₹${Math.max(0, netTotal - (Number(splitCashAmount || 0) + Number(splitUpiAmount || 0))).toFixed(0)}`}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-600 dark:text-slate-300 mb-1">
                      💵 Cash Received (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={splitCashAmount}
                      onChange={(e) => setSplitCashAmount(e.target.value)}
                      className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white font-black text-xs focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-600 dark:text-slate-300 mb-1">
                      📱 UPI / Online (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={splitUpiAmount}
                      onChange={(e) => setSplitUpiAmount(e.target.value)}
                      className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white font-black text-xs focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                {/* Quick 1-click Auto-fill helpers */}
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 pt-1">
                  <span>Received: <b className="text-slate-900 dark:text-white">₹{(Number(splitCashAmount || 0) + Number(splitUpiAmount || 0)).toLocaleString()}</b></span>
                  
                  {Number(splitCashAmount || 0) > 0 && !splitUpiAmount && Number(splitCashAmount || 0) < netTotal && (
                    <button
                      type="button"
                      onClick={() => setSplitUpiAmount((netTotal - Number(splitCashAmount || 0)).toString())}
                      className="text-purple-600 dark:text-purple-400 hover:underline font-extrabold text-[10px] bg-white dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-purple-200 dark:border-purple-800"
                    >
                      + Set UPI ₹{netTotal - Number(splitCashAmount || 0)}
                    </button>
                  )}

                  {Number(splitUpiAmount || 0) > 0 && !splitCashAmount && Number(splitUpiAmount || 0) < netTotal && (
                    <button
                      type="button"
                      onClick={() => setSplitCashAmount((netTotal - Number(splitUpiAmount || 0)).toString())}
                      className="text-purple-600 dark:text-purple-400 hover:underline font-extrabold text-[10px] bg-white dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-purple-200 dark:border-purple-800"
                    >
                      + Set Cash ₹{netTotal - Number(splitUpiAmount || 0)}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* 📋 CREDIT PAYMENT (CASH / UPI DEPOSIT + DUE) */}
            {paymentMethod === 'Credit' && (
              <div className="p-3 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl space-y-2.5 animate-fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                    📋 Deposit Paid Today (Optional)
                  </span>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200">
                    Remaining Due: ₹{prospectiveDue.toFixed(0)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-600 dark:text-slate-300 mb-1">
                      💵 Cash Received (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={creditCashAmount}
                      onChange={(e) => setCreditCashAmount(e.target.value)}
                      className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white font-black text-xs focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-600 dark:text-slate-300 mb-1">
                      📱 UPI Received (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={creditUpiAmount}
                      onChange={(e) => setCreditUpiAmount(e.target.value)}
                      className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white font-black text-xs focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 pt-0.5">
                  <span>Paid Today: <b className="text-slate-900 dark:text-white">₹{(Number(creditCashAmount || 0) + Number(creditUpiAmount || 0)).toLocaleString()}</b></span>
                  
                  {(Number(creditCashAmount || 0) > 0 || Number(creditUpiAmount || 0) > 0) && (
                    <button
                      type="button"
                      onClick={() => {
                        setCreditCashAmount('');
                        setCreditUpiAmount('');
                      }}
                      className="text-amber-700 dark:text-amber-400 hover:underline font-extrabold text-[10px]"
                    >
                      Clear / 100% Udhaar
                    </button>
                  )}
                </div>

                {isCreditExceeded && (
                  <div className="p-2.5 bg-red-500/10 border border-red-500/30 text-red-500 rounded-xl space-y-1">
                    <div className="flex items-center space-x-1.5 font-extrabold text-xs">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      <span>Credit Limit Exceeded!</span>
                    </div>
                    <p className="text-[11px] leading-tight">
                      New Due (₹{prospectiveDue.toLocaleString()}) + Current Balance (₹{selectedCustomerObj?.outstandingBalance?.toLocaleString()}) exceeds limit of ₹{selectedCustomerObj?.creditLimit?.toLocaleString()}.
                    </p>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={handleProcessSale}
              disabled={isSubmitting || cart.length === 0 || isCreditExceeded}
              className="w-full py-3.5 bg-pepsi-blue text-white font-black text-sm rounded-xl shadow-lg hover:bg-blue-700 disabled:opacity-50 transition flex items-center justify-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>PROCESSING SALE...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>COMPLETE SALE & GENERATE INVOICE</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Floating Sticky Checkout Banner (When items are in cart) */}
      {mobileTab === 'items' && cart.length > 0 && (
        <div className="lg:hidden fixed bottom-16 left-3 right-3 z-30 bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-3.5 rounded-2xl shadow-2xl flex items-center justify-between border border-blue-400/40 backdrop-blur-md">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-white/20 rounded-xl">
              <ShoppingCart className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-extrabold text-xs">{cart.length} Item(s) Selected</p>
              <p className="font-black text-sm text-blue-200">Net Total: ₹{netTotal}</p>
            </div>
          </div>
          <button
            onClick={() => setMobileTab('cart')}
            className="px-4 py-2 bg-white text-blue-800 font-black text-xs rounded-xl shadow hover:bg-blue-50 transition active:scale-95 flex items-center space-x-1"
          >
            <span>View Cart & Bill</span>
            <span>→</span>
          </button>
        </div>
      )}

      {/* ⚠️ SALE CONFIRMATION MODAL (PREVENT ACCIDENTAL CLICKS) */}
      <SaleConfirmModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleConfirmAndExecuteSale}
        customerName={selectedCustomerObj?.shopName || 'Selected Customer'}
        totalAmount={netTotal}
        totalCases={totalCases}
        paymentMethod={paymentMethod}
        cashAmount={paymentMethod === 'Split' 
          ? Number(splitCashAmount || 0) 
          : (paymentMethod === 'Cash' ? netTotal : (paymentMethod === 'Credit' ? Number(creditCashAmount || 0) : 0))}
        upiAmount={paymentMethod === 'Split' 
          ? Number(splitUpiAmount || 0) 
          : (paymentMethod === 'UPI' ? netTotal : (paymentMethod === 'Credit' ? Number(creditUpiAmount || 0) : 0))}
        isSubmitting={isSubmitting}
      />

      {/* 🌟 1. SALE COMPLETED SUCCESS MODAL (MATCHING IMAGE EXACTLY) */}
      <SaleSuccessModal
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        onViewBill={() => {
          setIsSuccessModalOpen(false);
          setIsInvoiceOpen(true);
        }}
        sale={generatedSale}
      />

      {/* 📄 2. Detailed Invoice Modal (Opened via 'View Bill') */}
      {generatedSale && (
        <InvoiceModal
          isOpen={isInvoiceOpen}
          onClose={() => setIsInvoiceOpen(false)}
          sale={generatedSale}
          isNewSale={true}
        />
      )}

      {/* Add New Customer Modal */}
      <Modal isOpen={isNewCustModalOpen} onClose={() => setIsNewCustModalOpen(false)} title="Quick Add Customer Shop">
        <form onSubmit={handleCreateCustomerSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Shop Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Ramesh Cold Drink Corner"
              value={newCustomer.shopName}
              onChange={(e) => setNewCustomer({ ...newCustomer, shopName: e.target.value })}
              className="w-full p-2 bg-slate-50 dark:bg-slate-700 border rounded-lg text-slate-900 dark:text-white font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Owner Name</label>
              <input
                type="text"
                required
                value={newCustomer.ownerName}
                onChange={(e) => setNewCustomer({ ...newCustomer, ownerName: e.target.value })}
                className="w-full p-2 bg-slate-50 dark:bg-slate-700 border rounded-lg text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
              <input
                type="text"
                required
                value={newCustomer.phone}
                onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                className="w-full p-2 bg-slate-50 dark:bg-slate-700 border rounded-lg text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Shop Address / Route Location</label>
            <input
              type="text"
              placeholder="e.g. Near Bus Stand, Main Market"
              value={newCustomer.address}
              onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
              className="w-full p-2 bg-slate-50 dark:bg-slate-700 border rounded-lg text-slate-900 dark:text-white"
            />
          </div>

          <button
            type="submit"
            disabled={isCustSubmitting}
            className="w-full py-2.5 bg-[#0051A5] text-white font-bold rounded-lg hover:bg-blue-700 transition"
          >
            {isCustSubmitting ? 'Saving Customer...' : 'Save & Select Customer'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
