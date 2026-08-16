import React, { useRef, useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { Printer, Download, CheckCircle, Clock, Send, Share2, MessageCircle, FileText, Loader2, Phone, Zap, CheckCircle2, AlertCircle } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import API from '../../services/api';
import pepsiLogo from '../../assets/pepsi-logo.png';

export default function InvoiceModal({ isOpen, onClose, sale, isNewSale = false }) {
  const invoiceRef = useRef(null);
  const [agencySettings, setAgencySettings] = useState(null);
  const [fetchedCustomer, setFetchedCustomer] = useState(null);
  const [copiedNotice, setCopiedNotice] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [waServerSending, setWaServerSending] = useState(false);
  const [waServerSuccess, setWaServerSuccess] = useState('');
  const [waServerNotice, setWaServerNotice] = useState('');

  useEffect(() => {
    if (isOpen && sale) {
      API.get('/settings')
        .then(res => setAgencySettings(res.data))
        .catch(err => console.error('Error fetching invoice agency settings:', err));

      const cust = sale.customer;
      const cId = typeof cust === 'string' ? cust : cust?._id;
      if (cId && (!cust || typeof cust === 'string' || !cust.phone)) {
        API.get(`/customers/${cId}`)
          .then(res => setFetchedCustomer(res.data))
          .catch(err => console.warn('Could not fetch customer by ID:', err));
      } else {
        setFetchedCustomer(null);
      }
    }
  }, [isOpen, sale]);

  if (!sale) return null;

  const handlePrint = () => {
    window.print();
  };

  // Helper to generate the exact A4 PDF Blob matching the on-screen invoice design
  const generatePdfBlob = async () => {
    if (!invoiceRef.current) return null;
    const element = invoiceRef.current;
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 800,
      onclone: (clonedDoc) => {
        const clonedEl = clonedDoc.getElementById('printable-invoice');
        if (clonedEl) {
          clonedEl.style.width = '780px';
          clonedEl.style.minWidth = '780px';
          clonedEl.style.maxWidth = '780px';
        }
      }
    });
    const imgData = canvas.toDataURL('image/jpeg', 0.92);
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
    return pdf.output('blob');
  };

  const handleDownloadPdf = async () => {
    if (!invoiceRef.current || isGeneratingPdf) return;
    setIsGeneratingPdf(true);
    try {
      const pdfBlob = await generatePdfBlob();
      if (pdfBlob) {
        const fileName = `Invoice_${sale.invoiceNumber}.pdf`;
        const url = window.URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Error downloading PDF:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const calculatedSubTotal = sale.subTotal || sale.items?.reduce((acc, item) => acc + (item.totalAmount || 0), 0) || sale.netTotal;
  const calculatedDiscount = Number(sale.discount || 0) || (calculatedSubTotal > sale.netTotal ? (calculatedSubTotal - sale.netTotal) : 0);

  // Extract Customer Shop and Details cleanly (prioritizing loaded or fetched customer object)
  const customerObj = fetchedCustomer || ((sale.customer && typeof sale.customer === 'object') ? sale.customer : {});
  const customerName = customerObj.shopName || (typeof sale.customer === 'string' && sale.customer.length > 5 ? sale.customer : 'Valued Customer');
  const ownerName = customerObj.ownerName || '';
  const customerPhone = customerObj.phone || sale.customerPhone || '';
  const customerAddress = customerObj.address || sale.customerAddress || (typeof sale.customer === 'object' ? sale.customer?.address : '') || '';

  // 🚀 AUTOMATED SERVER-SIDE HIGH-RESOLUTION PDF DELIVERY (EXACT IMAGE 2 LAYOUT)
  const handleSendAutomatedPdf = async () => {
    if (waServerSending || isGeneratingPdf) return;
    setWaServerSending(true);
    setWaServerSuccess('');
    setWaServerNotice('');

    try {
      // 1. Render the EXACT beautiful canvas layout with round Pepsi logo & cards
      const pdfBlob = await generatePdfBlob();
      if (!pdfBlob) throw new Error('Could not generate PDF document');

      // 2. Check WhatsApp Gateway status
      const statusRes = await API.get('/whatsapp/status');
      if (statusRes.data?.isReady) {
        // Send exact visual PDF blob via multipart FormData
        const formData = new FormData();
        formData.append('pdfFile', pdfBlob, `Invoice_${sale.invoiceNumber}.pdf`);
        formData.append('phone', customerPhone);
        formData.append('invoiceNumber', sale.invoiceNumber);
        formData.append('netTotal', sale.netTotal);
        formData.append('dueAmount', sale.dueAmount);
        formData.append('paymentMethod', sale.paymentMethod);
        if (sale.paymentMethod === 'Split') {
          formData.append('cashAmount', sale.cashAmount || 0);
          formData.append('upiAmount', sale.upiAmount || 0);
        }
        formData.append('createdAt', sale.createdAt);

        const res = await API.post('/whatsapp/send-pdf', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        if (res.data?.success || res.status === 200) {
          setWaServerNotice('');
          setWaServerSuccess(res.data?.message || `🎉 Official PDF Invoice #${sale.invoiceNumber} delivered directly to customer WhatsApp!`);
          setTimeout(() => setWaServerSuccess(''), 7000);
        }
      } else {
        setWaServerNotice('⚠️ WhatsApp Gateway is not connected. Please connect WhatsApp in System Settings.');
        setTimeout(() => setWaServerNotice(''), 7000);
      }
    } catch (err) {
      console.error('Server WhatsApp send error:', err);
      const errMsg = err.response?.data?.message || '⚠️ Failed to deliver PDF invoice. Please check WhatsApp connection in Settings.';
      setWaServerNotice(errMsg);
      setTimeout(() => setWaServerNotice(''), 7000);
    } finally {
      setWaServerSending(false);
    }
  };

  // 💬 DIRECT CUSTOMER CHAT OPENING ON WHATSAPP
  const handleShareWhatsappDirect = async () => {
    if (isGeneratingPdf) return;
    setIsGeneratingPdf(true);

    try {
      const pdfBlob = await generatePdfBlob();
      const fileName = `Invoice_${sale.invoiceNumber}.pdf`;

      const rawPhone = customerPhone || '';
      const cleanPhone = rawPhone.replace(/\D/g, '');
      let phoneWithCountry = '';
      
      if (cleanPhone.length === 10) {
        phoneWithCountry = `91${cleanPhone}`;
      } else if (cleanPhone.length > 10) {
        phoneWithCountry = cleanPhone;
      }

      const companyName = agencySettings?.companyName || 'DAVID TRADERS';69 
      const dateStr = new Date(sale.createdAt || Date.now()).toLocaleDateString('en-IN');
      const pdfDownloadLink = `${window.location.origin}/api/sales/${sale._id}/pdf`;

      let itemsText = '';
      sale.items?.forEach((item, idx) => {
        const name = item.productName || item.product?.name || 'Pepsi Item';
        const size = item.size || item.product?.size;
        const fullDisplayName = size && !name.toLowerCase().includes(size.toLowerCase())
          ? `${name} (${size})`
          : name;
        itemsText += `${idx + 1}. *${fullDisplayName}* x ${item.quantity} Cases = ₹${(item.totalAmount || (item.quantity * item.unitPrice)).toFixed(2)}\n`;
      });

      const discountLine = calculatedDiscount > 0 ? `🎁 *SPECIAL DISCOUNT:* -₹${calculatedDiscount.toFixed(2)}\n` : '';

      const message = 
`🧾 *${companyName.toUpperCase()}*
----------------------------------------
*SALES INVOICE:* #${sale.invoiceNumber}
*Date:* ${dateStr}
*Customer:* ${customerName}
*Payment Mode:* ${sale.paymentMethod}

📦 *ITEMS RECEIVED:*
${itemsText}
${discountLine}💰 *NET TOTAL:* ₹${sale.netTotal?.toFixed(2)}
${sale.dueAmount > 0 ? `⚠️ *OUTSTANDING BALANCE:* ₹${sale.dueAmount.toFixed(2)}` : '✅ *STATUS:* PAID FULL'}

📄 *DOWNLOAD OFFICIAL PDF BILL:*
${pdfDownloadLink}

Thank you for choosing Pepsi Products! Refresh your world.`;

      // 1. Download the real PDF bill to the device so user has it ready
      if (pdfBlob) {
        const url = window.URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }

      // 2. Copy bill summary to clipboard
      try {
        await navigator.clipboard.writeText(message);
      } catch (e) {
        console.warn('Clipboard write failed:', e);
      }

      setCopiedNotice(true);
      setTimeout(() => setCopiedNotice(false), 7000);

      // 3. Open WhatsApp DIRECTLY into that specific customer's chat!
      const encodedText = encodeURIComponent(message);
      let whatsappUrl = '';
      if (phoneWithCountry) {
        whatsappUrl = `https://api.whatsapp.com/send?phone=${phoneWithCountry}&text=${encodedText}`;
      } else {
        whatsappUrl = `https://api.whatsapp.com/send?text=${encodedText}`;
      }

      window.open(whatsappUrl, '_blank');
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Error opening customer WhatsApp chat:', err);
      }
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const companyName = agencySettings?.companyName || 'DAVID TRADERS (PEPSI DISTRIBUTOR)';
  const agencyAddress = agencySettings?.address || 'Kaithwaliya Aloo Mandi Sonbarsa Bazar';
  const agencyPhone = agencySettings?.phone || '8932094428';
  const agencyEmail = agencySettings?.email || 'sales@pepsi-distributor.com';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Invoice #${sale.invoiceNumber}`} maxWidth="max-w-4xl">
      <div className="space-y-4">
        {/* Action Controls Toolbar (Cleaned: Print & Download PDF Only) */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700 flex-wrap gap-2">
          {/* Customer info pill */}
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-600 dark:text-slate-300">
            <Phone className="w-3.5 h-3.5 text-pepsi-blue" />
            <span>Customer Contact: <strong className="text-slate-900 dark:text-white">{customerPhone ? `+91 ${customerPhone}` : 'Not provided'}</strong></span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-pepsi-blue text-white hover:bg-blue-700 shadow transition disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isGeneratingPdf ? 'Generating...' : 'Download PDF'}</span>
            </button>
          </div>
        </div>

        {/* 📱 DESKTOP CANVAS INVOICE SCROLL CONTAINER */}
        <div 
          className="w-full overflow-x-auto bg-slate-100 dark:bg-slate-900/60 p-2 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {/* Printable Area - Guaranteed Desktop Proportions with min-w-[780px] to preserve side-by-side desktop layout on all devices */}
          <div
            ref={invoiceRef}
            id="printable-invoice"
            className="p-6 bg-white text-slate-900 rounded-xl border border-slate-200 space-y-6 shadow-sm mx-auto"
            style={{ minWidth: '780px', width: '780px' }}
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b pb-5 border-slate-200">
              <div className="flex items-start space-x-4">
                <div className="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center bg-white shadow-sm border border-slate-200/80 flex-shrink-0 p-0.5">
                  <img
                    src={pepsiLogo}
                    alt="Pepsi Logo"
                    className="w-full h-full object-cover rounded-full"
                  />
                </div>
                <div className="space-y-1">
                  <h2 className="text-2xl font-black text-blue-900 tracking-tight leading-none">{companyName}</h2>
                  {agencyAddress && (
                    <p className="text-xs font-semibold text-slate-700 capitalize leading-snug">{agencyAddress}</p>
                  )}
                  <div className="flex items-center space-x-3 text-[11px] text-slate-500 font-medium">
                    {agencyPhone && <span>Ph: {agencyPhone}</span>}
                    {agencyEmail && <span>• Email: {agencyEmail}</span>}
                  </div>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <span className="inline-block text-xs font-black px-3 py-1 rounded bg-blue-100 text-blue-800 uppercase tracking-wide">
                  SALES INVOICE
                </span>
                <h3 className="text-sm font-black text-slate-900 mt-1.5">#{sale.invoiceNumber}</h3>
                <p className="text-xs text-slate-500 font-semibold">Date: {new Date(sale.createdAt || Date.now()).toLocaleDateString('en-IN')}</p>
              </div>
            </div>

            {/* Customer & Van Details */}
            <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs">
              <div>
                <p className="font-extrabold text-slate-400 uppercase tracking-wider text-[10px]">BILLED TO CUSTOMER</p>
                <h4 className="font-black text-slate-900 text-sm mt-0.5">{customerName}</h4>
                <p className="font-semibold text-slate-700">
                  {ownerName ? `Owner: ${ownerName}` : ''} {customerPhone ? `(Ph: ${customerPhone})` : ''}
                </p>
                <p className="text-slate-600 font-semibold mt-1">
                  <span className="text-slate-400 font-medium">Address:</span> {customerAddress || 'Sonbarsa Bazar, Kaithwaliya'}
                </p>
              </div>
              <div className="text-right">
                <p className="font-extrabold text-slate-400 uppercase tracking-wider text-[10px]">SOURCE & SALESMAN</p>
                <p className="font-bold text-slate-800 mt-0.5">Salesman: {sale.worker?.name || 'Authorized Staff'}</p>
                <p className="text-slate-600 font-semibold">
                  Dispatch: {sale.vehicle?.vehicleNumber ? `Van (${sale.vehicle.vehicleNumber})` : 'Direct Warehouse Counter'}
                </p>
                <p className="text-slate-600 mt-1">
                  Payment Mode: <span className="font-extrabold text-blue-800">
                    {sale.paymentMethod === 'Split'
                      ? `Split (Cash: ₹${Number(sale.cashAmount || 0).toLocaleString()} | UPI: ₹${Number(sale.upiAmount || 0).toLocaleString()})`
                      : sale.paymentMethod}
                  </span>
                </p>
              </div>
            </div>

            {/* Items Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <th className="py-2.5 px-3 w-8">#</th>
                    <th className="py-2.5 px-3">Item Description</th>
                    <th className="py-2.5 px-3 text-center">Qty (Cases)</th>
                    <th className="py-2.5 px-3 text-right">Case Rate (₹)</th>
                    <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sale.items?.map((item, idx) => {
                    const name = item.productName || item.product?.name || 'Pepsi Item';
                    const size = item.size || item.product?.size;
                    const fullDisplayName = size && !name.toLowerCase().includes(size.toLowerCase())
                      ? `${name} (${size})`
                      : name;

                    return (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-semibold text-slate-500">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-black text-slate-900">{fullDisplayName}</td>
                        <td className="py-2.5 px-3 text-center font-bold">{item.quantity} Cases</td>
                        <td className="py-2.5 px-3 text-right font-semibold">₹{Number(item.unitPrice || 0).toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-right font-black text-slate-900">₹{Number(item.totalAmount || (item.quantity * item.unitPrice) || 0).toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Summary & Totals */}
            <div className="flex justify-between items-end border-t pt-4 border-slate-200 text-xs">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  {sale.status === 'Paid' || (sale.dueAmount <= 0 && sale.paidAmount >= sale.netTotal) ? (
                    <span className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-black text-[11px]">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>PAID FULL</span>
                    </span>
                  ) : (
                    <span className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-black text-[11px]">
                      <Clock className="w-3.5 h-3.5" />
                      <span>OUTSTANDING: ₹{sale.dueAmount}</span>
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 italic">
                  {agencySettings?.invoiceFooter || 'Thank you for choosing Pepsi Products! Refresh your world.'}
                </p>
              </div>

              <div className="w-64 space-y-1.5 text-right font-medium">
                {calculatedDiscount > 0 && (
                  <>
                    <div className="flex justify-between text-xs text-slate-600 font-semibold">
                      <span>Sub Total:</span>
                      <span>₹{calculatedSubTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-emerald-600 font-bold">
                      <span>Discount Applied:</span>
                      <span>- ₹{calculatedDiscount.toFixed(2)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between text-base font-black text-slate-900 border-t pt-2 border-slate-300">
                  <span>Net Total:</span>
                  <span className="text-blue-900 text-lg">₹{sale.netTotal?.toFixed(2)}</span>
                </div>
                {sale.paidAmount !== undefined && (
                  <div className="flex justify-between text-xs font-bold text-emerald-700">
                    <span>Paid Amount:</span>
                    <span>₹{sale.paidAmount?.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
