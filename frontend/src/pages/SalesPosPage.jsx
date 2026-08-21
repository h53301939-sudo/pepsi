import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import API from '../services/api';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import InvoiceModal from '../components/invoice/InvoiceModal';
import SaleSuccessModal from '../components/pos/SaleSuccessModal';
import SaleConfirmModal from '../components/pos/SaleConfirmModal';
import PaymentWizardModal from '../components/pos/PaymentWizardModal';
import CustomerAvatar from '../components/common/CustomerAvatar';
import Modal from '../components/common/Modal';
import { playCartBeep, playSaleSuccessSound } from '../utils/audio';
import { ShoppingCart, Plus, Minus, Trash2, Search, UserPlus, CheckCircle, AlertTriangle, Package, Loader2, Tag, Truck, ArrowRight, ChevronRight, ClipboardList } from 'lucide-react';

export default function SalesPosPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const linkedOrderId = location.state?.linkedOrderId;
  const orderNumber = location.state?.orderNumber;

  const { user } = useAuth();
  const { toast } = useToast();
  const [vehicles, setVehicles] = useState([]);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isPaymentWizardOpen, setIsPaymentWizardOpen] = useState(false);
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

  const loadedOrderRef = useRef(null);

  // Pre-load customer and cart if navigated from "Deliver & Bill" in Orders Page
  useEffect(() => {
    const navOrderId = location.state?.linkedOrderId;
    if (navOrderId && loadedOrderRef.current !== navOrderId) {
      loadedOrderRef.current = navOrderId;

      if (location.state?.preloadedCustomer) {
        setSelectedCustomerId(location.state.preloadedCustomer);
      }
      if (location.state?.preloadedCart && location.state.preloadedCart.length > 0) {
        const formatted = location.state.preloadedCart.map(i => ({
          product: {
            _id: i._id,
            name: i.name,
            size: i.size,
            sellingPrice: i.sellingPrice
          },
          quantity: i.quantity,
          unitPrice: i.sellingPrice,
          maxStock: i.maxStock || 9999
        }));
        setCart(formatted);
        toast.info(`Pre-loaded items for Order ${location.state.orderNumber || ''} 📋`, 'Booked Order Loaded');
      }
    }
  }, [location.state]);

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
    if (isSubmitting) return;
    if (!selectedVehicleId) {
      toast.warning('Please select a delivery van first', 'Van Required');
      return;
    }
    if (!selectedCustomerId) {
      toast.warning('Please select a customer first', 'Customer Required');
      return;
    }
    if (cart.length === 0) {
      toast.warning('Your cart is empty', 'Empty Cart');
      return;
    }

    // Open multi-step Payment Wizard Modal
    setIsPaymentWizardOpen(true);
  };

  const handleExecuteSaleWithData = async (paymentData) => {
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
        paymentMethod: paymentData.paymentMethod,
        paidAmount: paymentData.paidAmount,
        cashAmount: paymentData.cashAmount,
        upiAmount: paymentData.upiAmount
      };

      const res = await API.post('/sales', salePayload);
      
      // If sale was converted from an advance booked order, mark order as Delivered
      if (linkedOrderId) {
        try {
          await API.put(`/customer-orders/${linkedOrderId}/status`, {
            status: 'Delivered',
            saleId: res.data._id
          });
        } catch (orderErr) {
          console.error('Error linking sale to advance order:', orderErr);
        }
      }

      // 🎵 Play Signature UPI/Cash Register Success Ringtone & Haptics
      playSaleSuccessSound();

      setGeneratedSale(res.data);
      setIsPaymentWizardOpen(false);
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
      {/* 🌟 1. Top Header Banner (Responsive: Compact on Mobile, Spreads Elegantly on Desktop) */}
      <div className="bg-gradient-to-r from-pepsi-blue via-blue-800 to-blue-950 text-white p-4 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center space-x-3">
          <div className="p-3 bg-white/10 rounded-xl backdrop-blur-md shrink-0 mt-0.5 sm:mt-0">
            <Truck className="w-6 h-6 text-white" />
          </div>
          <div className="space-y-1 min-w-0 flex-1">
            <h1 className="text-lg sm:text-xl font-black tracking-tight leading-tight">
              Van Route Sale POS
            </h1>
            <p className="text-xs text-blue-100 font-medium">
              Live loaded route billing & delivery
            </p>

            <div className="pt-2 border-t border-white/10 flex flex-col md:flex-row md:items-center gap-1.5 md:gap-6 text-xs font-semibold text-blue-100">
              <div className="flex items-center space-x-1.5">
                <span className="opacity-80">Assigned Van:</span>
                {user?.role === 'admin' && vehicles.length > 0 ? (
                  <select
                    value={selectedVehicleId}
                    onChange={(e) => handleVehicleChange(e.target.value)}
                    className="p-1 bg-white/15 border border-white/20 rounded-lg text-white font-extrabold text-xs"
                  >
                    {vehicles.map((v) => (
                      <option key={v._id} value={v._id} className="text-slate-900">
                        {v.vehicleNumber} ({v.vehicleName})
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="font-extrabold text-white">
                    {selectedVehicleObj
                      ? `${selectedVehicleObj.vehicleNumber} (${selectedVehicleObj.vehicleName})`
                      : (user?.assignedVehicle?.vehicleNumber ? `${user.assignedVehicle.vehicleNumber} (${user.assignedVehicle.vehicleName || 'Van'})` : 'No Van Assigned')}
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-1.5">
                <span className="opacity-80">Cases Loaded:</span>
                <span className="font-extrabold text-white bg-white/15 px-2 py-0.5 rounded-md text-[11px]">
                  {selectedVehicleObj?.totalStockUnits || 0} Cases
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop "+ Add Customer" Button (Top-Right on Desktop) */}
        <button
          onClick={() => setIsNewCustModalOpen(true)}
          className="hidden md:flex items-center justify-center space-x-1.5 px-4 py-2.5 bg-white/15 hover:bg-white/25 text-white rounded-xl font-extrabold text-xs border border-white/20 transition cursor-pointer shrink-0 shadow-sm"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ Add Customer</span>
        </button>
      </div>

      {/* ➕ Mobile-Only Full-Width "+ Add Customer" Button (Visible only on Mobile) */}
      <button
        onClick={() => setIsNewCustModalOpen(true)}
        className="md:hidden w-full flex items-center justify-center space-x-2 py-3 px-4 bg-pepsi-blue hover:bg-blue-700 text-white rounded-2xl font-extrabold text-xs shadow-sm transition active:scale-[0.99] cursor-pointer"
      >
        <UserPlus className="w-4 h-4" />
        <span>+ Add Customer</span>
      </button>

      {/* 👤 2. Customer Selection Bar (Matching Direct Warehouse POS 100% 1:1) */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
        <div>
          <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
            Select Customer Shop
          </label>
          <div className="flex items-center space-x-2">
            {selectedCustomerObj && (
              <CustomerAvatar name={selectedCustomerObj.shopName} size="sm" />
            )}
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
        </div>

        {selectedCustomerObj && (
          <div className="flex items-center space-x-3 text-xs bg-slate-50 dark:bg-slate-700/40 px-3 py-2 rounded-xl border border-slate-100 dark:border-slate-700 w-fit">
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
              {filteredStock.map((st) => {
                const cartItem = cart.find(c => c.product._id === st.product?._id);
                const cartQty = cartItem ? cartItem.quantity : 0;
                const isSelected = cartQty > 0;

                return (
                  <div
                    key={st._id}
                    onClick={() => addToCart(st)}
                    className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between select-none cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50/70 dark:bg-blue-950/40 border-[#0051A5] dark:border-blue-500 shadow-md ring-2 ring-blue-500/20'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 shadow-sm'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-start">
                        <h4 className="font-black text-xs text-slate-900 dark:text-white capitalize truncate pr-1">
                          {st.product?.name}
                        </h4>
                        <span className="text-[10px] font-extrabold bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300 px-1.5 py-0.5 rounded-md shrink-0">
                          {st.product?.size || '250ml'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="font-black text-[#0051A5] dark:text-blue-400">
                          ₹{st.product?.sellingPrice} / Case
                        </span>
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                          {st.quantity} Cases
                        </span>
                      </div>
                    </div>

                    {/* Interactive Counter Controls on Card */}
                    <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-700/80">
                      {isSelected ? (
                        <div
                          className="flex items-center justify-between bg-white dark:bg-slate-900 p-1 rounded-xl border border-blue-200 dark:border-blue-800 shadow-inner"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateCartQty(st.product._id, cartQty - 1);
                            }}
                            className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-red-100 dark:hover:bg-red-950/60 text-slate-700 dark:text-slate-300 hover:text-red-600 flex items-center justify-center font-black transition active:scale-95 cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5 stroke-[3]" />
                          </button>

                          <div className="flex-1 text-center px-1">
                            <input
                              type="number"
                              min="1"
                              max={st.quantity}
                              value={cartQty}
                              onChange={(e) => updateCartQty(st.product._id, parseInt(e.target.value, 10) || 0)}
                              className="w-full text-center font-black text-sm text-[#0051A5] dark:text-blue-400 bg-transparent border-none focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              addToCart(st);
                            }}
                            className="w-7 h-7 rounded-lg bg-[#0051A5] hover:bg-blue-700 text-white flex items-center justify-center font-black transition active:scale-95 shadow-sm shadow-blue-600/30 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5 stroke-[3]" />
                          </button>
                        </div>
                      ) : (
                        <div className="py-1 text-center text-[11px] font-bold text-slate-400 dark:text-slate-500 hover:text-[#0051A5] dark:hover:text-blue-400 flex items-center justify-center space-x-1 transition">
                          <Plus className="w-3.5 h-3.5" />
                          <span>Click to Add</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
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

            {/* Big Proceed to Payment Button (Triggers Multi-Step Payment Wizard) */}
            <button
              type="button"
              onClick={handleProcessSale}
              disabled={isSubmitting || cart.length === 0 || !selectedCustomerId || !selectedVehicleId}
              className={`w-full py-4 font-black text-sm rounded-2xl transition flex items-center justify-center space-x-2 mt-2 ${
                cart.length === 0 || !selectedCustomerId || !selectedVehicleId || isSubmitting
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-300 dark:border-slate-700 shadow-none opacity-60'
                  : 'bg-gradient-to-r from-[#0051A5] to-blue-600 hover:from-blue-700 hover:to-blue-800 text-white shadow-xl shadow-blue-500/25 active:scale-95 cursor-pointer'
              }`}
            >
              <span>
                {!selectedVehicleId 
                  ? 'Select Delivery Van First'
                  : !selectedCustomerId 
                  ? 'Select Customer First' 
                  : cart.length === 0 
                  ? 'Cart is Empty (Add Items)' 
                  : `Proceed to Payment (₹${netTotal.toLocaleString()})`}
              </span>
              {cart.length > 0 && selectedCustomerId && selectedVehicleId && (
                <ChevronRight className="w-4 h-4 stroke-[3]" />
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

      {/* 🚀 MULTI-STEP PAYMENT WIZARD MODAL (Choose Method -> Split / Credit Details -> Confirm) */}
      <PaymentWizardModal
        isOpen={isPaymentWizardOpen}
        onClose={() => setIsPaymentWizardOpen(false)}
        onConfirmSale={handleExecuteSaleWithData}
        customerName={selectedCustomerObj?.shopName || 'Selected Customer'}
        totalAmount={netTotal}
        totalCases={totalCases}
        isCreditExceeded={isCreditExceeded}
        creditLimit={selectedCustomerObj?.creditLimit || 0}
        currentDue={selectedCustomerObj?.outstandingBalance || 0}
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
