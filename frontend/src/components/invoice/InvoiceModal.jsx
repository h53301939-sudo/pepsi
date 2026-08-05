import React, { useRef, useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { Printer, Download, CheckCircle, Clock, Send, Share2, MessageCircle } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import API from '../../services/api';
import pepsiLogo from '../../assets/pepsi-logo.png';

export default function InvoiceModal({ isOpen, onClose, sale, isNewSale = false }) {
  const invoiceRef = useRef(null);
  const [agencySettings, setAgencySettings] = useState(null);
  const [copiedNotice, setCopiedNotice] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  useEffect(() => {
    if (isOpen) {
      API.get('/settings')
        .then(res => setAgencySettings(res.data))
        .catch(err => console.error('Error fetching invoice agency settings:', err));
    }
  }, [isOpen]);

  if (!sale) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!invoiceRef.current || isGeneratingPdf) return;
    setIsGeneratingPdf(true);
    try {
      const element = invoiceRef.current;
      // Force html2canvas to capture at 800px width so mobile view does not squeeze/cut-off layout
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        windowWidth: 800,
        onclone: (clonedDoc) => {
          const clonedEl = clonedDoc.getElementById('printable-invoice');
          if (clonedEl) {
            clonedEl.style.width = '750px';
            clonedEl.style.minWidth = '750px';
          }
        }
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Invoice_${sale.invoiceNumber}.pdf`);
    } catch (err) {
      console.error('Error downloading PDF:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const calculatedSubTotal = sale.subTotal || sale.items?.reduce((acc, item) => acc + (item.totalAmount || 0), 0) || sale.netTotal;
  const calculatedDiscount = Number(sale.discount || 0) || (calculatedSubTotal > sale.netTotal ? (calculatedSubTotal - sale.netTotal) : 0);

  const handleShareWhatsapp = async () => {
    const rawPhone = sale.customer?.phone || '';
    const cleanPhone = rawPhone.replace(/\D/g, '');
    let phoneWithCountry = '';
    
    if (cleanPhone.length === 10) {
      phoneWithCountry = `91${cleanPhone}`;
    } else if (cleanPhone.length > 10) {
      phoneWithCountry = cleanPhone;
    }

    const companyName = agencySettings?.companyName || 'PEPSI BOTTLERS DISTRIBUTOR';
    const dateStr = new Date(sale.createdAt || Date.now()).toLocaleDateString('en-IN');

    let itemsText = '';
    sale.items?.forEach((item, idx) => {
      const name = item.productName || item.product?.name || 'Pepsi Item';
      const size = item.size || item.product?.size;
      const fullDisplayName = size && !name.toLowerCase().includes(size.toLowerCase())
        ? `${name} (${size})`
        : name;
      itemsText += `${idx + 1}. *${fullDisplayName}* x ${item.quantity} Cases = ₹${item.totalAmount.toFixed(2)}\n`;
    });

    const discountLine = calculatedDiscount > 0 ? `🎁 *SPECIAL DISCOUNT:* -₹${calculatedDiscount.toFixed(2)}\n` : '';

    const message = 
`🧾 *${companyName.toUpperCase()}*
----------------------------------------
*SALES INVOICE:* #${sale.invoiceNumber}
*Date:* ${dateStr}
*Customer:* ${sale.customer?.shopName || 'Valued Customer'}
*Payment Mode:* ${sale.paymentMethod}

📦 *ITEMS RECEIVED:*
${itemsText}
${discountLine}💰 *NET TOTAL:* ₹${sale.netTotal?.toFixed(2)}
${sale.dueAmount > 0 ? `⚠️ *OUTSTANDING BALANCE:* ₹${sale.dueAmount.toFixed(2)}` : '✅ *STATUS:* PAID FULL'}

Thank you for choosing Pepsi Products! Refresh your world.`;

    // Copy formatted bill text to clipboard as fallback
    try {
      await navigator.clipboard.writeText(message);
      setCopiedNotice(true);
      setTimeout(() => setCopiedNotice(false), 4000);
    } catch (e) {
      console.warn('Clipboard write failed:', e);
    }

    // Open WhatsApp Web or Mobile API directly with text parameter
    const encodedText = encodeURIComponent(message);
    let whatsappUrl = '';
    
    if (phoneWithCountry) {
      whatsappUrl = `https://web.whatsapp.com/send?phone=${phoneWithCountry}&text=${encodedText}`;
    } else {
      whatsappUrl = `https://api.whatsapp.com/send?text=${encodedText}`;
    }

    window.open(whatsappUrl, '_blank');
  };

  const companyName = agencySettings?.companyName || 'PEPSI BOTTLERS DISTRIBUTOR';
  const agencyAddress = agencySettings?.address || '';
  const agencyPhone = agencySettings?.phone || '';
  const agencyEmail = agencySettings?.email || '';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Invoice #${sale.invoiceNumber}`} maxWidth="max-w-4xl">
      <div className="space-y-4">
        {/* 🎉 POPUP SUCCESS MESSAGE BANNER - Only show right after completing a new sale */}
        {isNewSale && (
          <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white p-4 rounded-2xl shadow-lg flex items-center justify-between animate-fade-in flex-wrap gap-2">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-md">
                <CheckCircle className="w-7 h-7 text-white animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-black tracking-wide flex items-center space-x-2">
                  <span>🎉 SALE COMPLETED SUCCESSFULLY!</span>
                </h3>
                <p className="text-xs text-emerald-100 font-semibold mt-0.5">
                  Invoice #{sale.invoiceNumber} created for {sale.customer?.shopName} (Net: ₹{sale.netTotal?.toLocaleString()})
                </p>
              </div>
            </div>
            <button
              onClick={handleShareWhatsapp}
              className="flex items-center space-x-1.5 px-3.5 py-2.5 bg-white text-emerald-700 font-black text-xs rounded-xl shadow hover:bg-emerald-50 transition active:scale-95 flex-shrink-0"
            >
              <MessageCircle className="w-4 h-4 fill-emerald-600 text-emerald-600" />
              <span>Send WhatsApp Bill</span>
            </button>
          </div>
        )}

        {/* Copy Notice Banner */}
        {copiedNotice && (
          <div className="bg-blue-50 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-700 text-pepsi-blue dark:text-blue-300 p-3 rounded-xl text-xs font-bold text-center animate-fade-in">
            📋 Bill text copied to clipboard! If WhatsApp doesn't auto-fill, press <strong>Ctrl + V</strong> to paste.
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center justify-end space-x-2.5 pb-2 border-b border-slate-100 dark:border-slate-700 flex-wrap gap-y-2">
          <button
            onClick={handleShareWhatsapp}
            className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-black rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 shadow-md transition active:scale-95"
          >
            <MessageCircle className="w-4 h-4 fill-white text-emerald-600" />
            <span>Send Bill on WhatsApp</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Invoice</span>
          </button>
          <button
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className="flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-pepsi-blue text-white hover:bg-blue-700 shadow transition disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isGeneratingPdf ? 'Generating PDF...' : 'Download PDF'}</span>
          </button>
        </div>

        {/* Responsive Horizontal Scroll Wrapper for Mobile View */}
        <div className="overflow-x-auto w-full max-w-full bg-slate-100 dark:bg-slate-900/60 p-2 sm:p-4 rounded-2xl">
          {/* Printable Area - Fixed width 720px on mobile to guarantee A4 aspect ratio & prevent text cutting off */}
          <div
            ref={invoiceRef}
            id="printable-invoice"
            className="p-6 bg-white text-slate-900 rounded-xl border border-slate-200 space-y-6 w-[720px] max-w-none mx-auto shadow-sm"
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b pb-5 border-slate-200">
              <div className="flex items-start space-x-4">
                <img
                  src={pepsiLogo}
                  alt="Pepsi Logo"
                  className="w-16 h-16 object-contain flex-shrink-0"
                />
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
                <p className="text-xs text-slate-500 font-semibold">Date: {new Date(sale.createdAt).toLocaleDateString('en-IN')}</p>
              </div>
            </div>

            {/* Customer & Van Details */}
            <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs">
              <div>
                <p className="font-extrabold text-slate-400 uppercase tracking-wider text-[10px]">BILLED TO CUSTOMER</p>
                <h4 className="font-black text-slate-900 text-sm mt-0.5">{sale.customer?.shopName || 'Valued Customer'}</h4>
                <p className="font-semibold text-slate-700">{sale.customer?.ownerName} {sale.customer?.phone ? `(Ph: ${sale.customer.phone})` : ''}</p>
                {sale.customer?.address ? (
                  <p className="text-slate-600 font-semibold mt-1">Address: {sale.customer.address}</p>
                ) : null}
              </div>
              <div className="text-right">
                <p className="font-extrabold text-slate-400 uppercase tracking-wider text-[10px]">SOURCE & SALESMAN</p>
                <p className="font-bold text-slate-800 mt-0.5">Salesman: {sale.worker?.name || 'Worker'}</p>
                <p className="text-slate-600 font-semibold">
                  Dispatch: {sale.vehicle?.vehicleNumber ? `Van (${sale.vehicle.vehicleNumber})` : 'Direct Warehouse Counter'}
                </p>
                <p className="text-slate-600 mt-1">Payment Mode: <span className="font-extrabold text-blue-800">{sale.paymentMethod}</span></p>
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
                        <td className="py-2.5 px-3 text-right font-semibold">₹{item.unitPrice.toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-right font-black text-slate-900">₹{item.totalAmount.toFixed(2)}</td>
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
                  {sale.status === 'Paid' ? (
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
