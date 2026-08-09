import React, { useState, useEffect } from 'react';
import API from '../services/api';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import Modal from '../components/common/Modal';
import InvoiceModal from '../components/invoice/InvoiceModal';
import CustomerDetailsModal from '../components/customer/CustomerDetailsModal';
import {
  Users,
  Plus,
  CreditCard,
  DollarSign,
  Search,
  CheckCircle,
  Edit2,
  AlertCircle,
  Trash2,
  Tag,
  Loader2,
  FileText,
  Eye,
  Phone,
  MapPin,
  Receipt
} from 'lucide-react';

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Customer 360° Profile & Invoice Details Modal State
  const [selectedCustDetails, setSelectedCustDetails] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [activeInvoice, setActiveInvoice] = useState(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  // Payment Modal State
  const [selectedCust, setSelectedCust] = useState(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [isPaymentSubmitting, setIsPaymentSubmitting] = useState(false);

  // Edit / Add Customer Modal State
  const [isCustModalOpen, setIsCustModalOpen] = useState(false);
  const [editingCust, setEditingCust] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [custForm, setCustForm] = useState({
    shopName: '',
    ownerName: '',
    phone: '',
    address: '',
    creditLimit: '50000',
    discountPercentage: '0'
  });
  const [formError, setFormError] = useState('');

  const fetchCustomers = async () => {
    try {
      const res = await API.get(`/customers?search=${search}`);
      setCustomers(res.data || []);
    } catch (err) {
      console.error('Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [search]);

  // Open 360 Customer Details Modal
  const handleOpenCustomerDetails = (cust) => {
    setSelectedCustDetails(cust);
    setIsDetailsModalOpen(true);
  };

  // Open Invoice Modal from Customer Details
  const handleOpenInvoiceFromDetails = (sale) => {
    setActiveInvoice(sale);
    setIsInvoiceModalOpen(true);
  };

  // Handle Payment Modal
  const handleOpenPayment = (cust) => {
    setSelectedCust(cust);
    setPaymentAmount('');
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (isPaymentSubmitting) return; // LOCK AGAINST DOUBLE CLICKING
    setIsPaymentSubmitting(true);
    try {
      await API.post(`/customers/${selectedCust._id}/payments`, {
        amount: Number(paymentAmount),
        paymentMethod
      });
      setIsPaymentModalOpen(false);
      fetchCustomers();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setIsPaymentSubmitting(false);
    }
  };

  // Handle Add / Edit Customer Modal
  const handleOpenAddCustomer = () => {
    setEditingCust(null);
    setFormError('');
    setCustForm({
      shopName: '',
      ownerName: '',
      phone: '',
      address: '',
      creditLimit: '50000',
      discountPercentage: '0'
    });
    setIsCustModalOpen(true);
  };

  const handleOpenEditCustomer = (cust) => {
    setEditingCust(cust);
    setFormError('');
    setCustForm({
      shopName: cust.shopName,
      ownerName: cust.ownerName,
      phone: cust.phone,
      address: cust.address || '',
      creditLimit: cust.creditLimit || '50000',
      discountPercentage: cust.discountPercentage || '0'
    });
    setIsCustModalOpen(true);
  };

  const handleCustSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return; // LOCK AGAINST DOUBLE CLICKING
    setFormError('');

    if (!custForm.shopName || !custForm.ownerName || !custForm.phone) {
      setFormError('Shop Name, Owner Name, and Phone are required');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...custForm,
        creditLimit: Number(custForm.creditLimit || 50000),
        discountPercentage: Number(custForm.discountPercentage || 0)
      };

      if (editingCust) {
        await API.put(`/customers/${editingCust._id}`, payload);
      } else {
        await API.post('/customers', payload);
      }

      setIsCustModalOpen(false);
      fetchCustomers();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCust = async (id) => {
    if (window.confirm('Are you sure you want to delete this customer shop?')) {
      try {
        await API.delete(`/customers/${id}`);
        fetchCustomers();
      } catch (err) {
        alert(err.response?.data?.message || 'Failed to delete customer');
      }
    }
  };

  if (loading) return <LoadingSkeleton count={4} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center space-x-2">
            <span className="w-1.5 h-6 bg-[#0051A5] rounded-full inline-block mr-1" />
            <span>Customer Directory & Credit Accounts</span>
          </h1>
          
        </div>
        <button
          onClick={handleOpenAddCustomer}
          className="flex items-center space-x-2 px-4 py-2.5 bg-[#0051A5] hover:bg-blue-700 text-white rounded-xl font-extrabold text-xs shadow-md transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add New Customer Shop</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="flex items-center space-x-4 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by shop name, owner name, or mobile number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0051A5] dark:text-white"
          />
        </div>
      </div>

      {/* Customer Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {customers.map((c) => (
          <div
            key={c._id}
            className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/90 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-[#0051A5]/40 transition space-y-4 flex flex-col justify-between group"
          >
            <div>
              {/* Header with Title & Action Buttons */}
              <div className="flex items-start justify-between gap-2">
                <div 
                  onClick={() => handleOpenCustomerDetails(c)}
                  className="cursor-pointer hover:text-[#0051A5] transition flex-1"
                >
                  <div className="flex items-center space-x-2">
                    <h3 className="font-extrabold text-base text-slate-900 dark:text-white group-hover:text-[#0051A5] transition">
                      {c.shopName}
                    </h3>
                    {c.discountPercentage > 0 && (
                      <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-extrabold text-[10px] rounded-full flex items-center space-x-1">
                        <Tag className="w-3 h-3" />
                        <span>{c.discountPercentage}% OFF</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 font-medium">{c.ownerName} ({c.phone})</p>
                </div>

                <div className="flex space-x-1 flex-shrink-0">
                  <button
                    onClick={() => handleOpenCustomerDetails(c)}
                    className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/40 text-[#0051A5] dark:text-blue-300 hover:bg-blue-100 transition"
                    title="View 360° Profile & All Invoices"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleOpenEditCustomer(c)}
                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition"
                    title="Edit Customer & Discount"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteCust(c._id)}
                    className="p-1.5 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 transition"
                    title="Delete Shop"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 mt-2 flex items-center space-x-1">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{c.address || 'Address not set'}</span>
              </p>
            </div>

            {/* Financial Ledger Summary */}
            <div className="border-t border-b py-2.5 border-slate-100 dark:border-slate-700 space-y-1.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Credit Limit:</span>
                <span className="font-extrabold text-[#0051A5] dark:text-blue-400 text-sm">
                  ₹{c.creditLimit?.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Outstanding Due:</span>
                <span className={`font-black ${c.outstandingBalance > 0 ? 'text-red-600 text-sm' : 'text-emerald-600 text-sm'}`}>
                  ₹{c.outstandingBalance?.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Actions: View Invoices & Collect Payment */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => handleOpenCustomerDetails(c)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-bold text-xs rounded-xl transition flex items-center justify-center space-x-1.5"
              >
                <Receipt className="w-3.5 h-3.5 text-[#0051A5]" />
                <span>All Invoices</span>
              </button>

              <button
                onClick={() => handleOpenPayment(c)}
                disabled={c.outstandingBalance <= 0}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl disabled:opacity-40 transition flex items-center justify-center space-x-1 shadow-sm"
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>Collect Due</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 📜 CUSTOMER 360° PROFILE & INVOICES MODAL */}
      <CustomerDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        customerId={selectedCustDetails?._id}
        initialCustomer={selectedCustDetails}
        onOpenInvoice={handleOpenInvoiceFromDetails}
      />

      {/* 🖨️ DETAILED INVOICE MODAL (FOR PRINTING OR VIEWING BILL PDF) */}
      <InvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        sale={activeInvoice}
      />

      {/* Collect Payment Modal */}
      <Modal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} title={`Collect Payment - ${selectedCust?.shopName}`}>
        <form onSubmit={handlePaymentSubmit} className="space-y-4 text-xs">
          <p className="text-slate-500">
            Current Outstanding Balance: <span className="font-bold text-red-500">₹{selectedCust?.outstandingBalance}</span>
          </p>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Payment Amount (₹)</label>
            <input
              type="number"
              required
              max={selectedCust?.outstandingBalance}
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white font-bold text-base"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white font-bold"
            >
              <option value="Cash">Cash</option>
              <option value="UPI">UPI Transfer</option>
              <option value="Bank Transfer">Bank Transfer</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={isPaymentSubmitting}
            className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center space-x-2"
          >
            {isPaymentSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>RECORDING PAYMENT...</span>
              </>
            ) : (
              <span>Record Collection & Update Balance</span>
            )}
          </button>
        </form>
      </Modal>

      {/* Add / Edit Customer Modal */}
      <Modal
        isOpen={isCustModalOpen}
        onClose={() => setIsCustModalOpen(false)}
        title={editingCust ? `Edit Customer - ${editingCust.shopName}` : 'Add New Customer Shop'}
      >
        <form onSubmit={handleCustSubmit} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 bg-red-50 text-red-600 rounded-xl flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Shop / Business Name</label>
            <input
              type="text"
              required
              value={custForm.shopName}
              onChange={(e) => setCustForm({ ...custForm, shopName: e.target.value })}
              placeholder="e.g. Krishna General Store & Cold Drinks"
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Owner Name</label>
              <input
                type="text"
                required
                value={custForm.ownerName}
                onChange={(e) => setCustForm({ ...custForm, ownerName: e.target.value })}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
              <input
                type="text"
                required
                value={custForm.phone}
                onChange={(e) => setCustForm({ ...custForm, phone: e.target.value })}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Credit Limit (₹) <span className="text-pepsi-blue font-black">(Editable)</span>
              </label>
              <input
                type="number"
                required
                value={custForm.creditLimit}
                onChange={(e) => setCustForm({ ...custForm, creditLimit: e.target.value })}
                placeholder="50000"
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white font-black"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Special Discount (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={custForm.discountPercentage}
                onChange={(e) => setCustForm({ ...custForm, discountPercentage: e.target.value })}
                placeholder="0"
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Shop Address</label>
            <input
              type="text"
              value={custForm.address}
              onChange={(e) => setCustForm({ ...custForm, address: e.target.value })}
              placeholder="Shop address..."
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 bg-[#0051A5] text-white font-extrabold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm shadow-md flex items-center justify-center space-x-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>SAVING CUSTOMER...</span>
              </>
            ) : (
              <span>{editingCust ? 'Save Customer Changes' : 'Create Customer Shop'}</span>
            )}
          </button>
        </form>
      </Modal>
    </div>
  );
}
