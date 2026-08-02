import React, { useRef, useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { Printer, Download, CheckCircle, Clock } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import API from '../../services/api';
import pepsiLogo from '../../assets/pepsi-logo.png';

export default function InvoiceModal({ isOpen, onClose, sale }) {
  const invoiceRef = useRef(null);
  const [agencySettings, setAgencySettings] = useState(null);

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
    if (!invoiceRef.current) return;
    const canvas = await html2canvas(invoiceRef.current, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    pdf.save(`Invoice_${sale.invoiceNumber}.pdf`);
  };

  const companyName = agencySettings?.companyName || 'PEPSI BOTTLERS DISTRIBUTOR';
  const agencyAddress = agencySettings?.address || '';
  const agencyPhone = agencySettings?.phone || '';
  const agencyEmail = agencySettings?.email || '';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Invoice #${sale.invoiceNumber}`} maxWidth="max-w-3xl">
      <div className="space-y-4">
        {/* Action Controls */}
        <div className="flex items-center justify-end space-x-3 pb-2 border-b border-slate-100 dark:border-slate-700">
          <button
            onClick={handlePrint}
            className="flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Invoice</span>
          </button>
          <button
            onClick={handleDownloadPdf}
            className="flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-pepsi-blue text-white hover:bg-blue-700 shadow transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download PDF</span>
          </button>
        </div>

        {/* Printable Area */}
        <div ref={invoiceRef} id="printable-invoice" className="p-6 bg-white text-slate-900 rounded-xl border border-slate-200 space-y-6">
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
              <h4 className="font-black text-slate-900 text-sm mt-0.5">{sale.customer?.shopName}</h4>
              <p className="font-semibold text-slate-700">{sale.customer?.ownerName} (Ph: {sale.customer?.phone})</p>
              {sale.customer?.address ? (
                <p className="text-slate-600 font-semibold mt-1">Address: {sale.customer.address}</p>
              ) : null}
            </div>
            <div className="text-right">
              <p className="font-extrabold text-slate-400 uppercase tracking-wider text-[10px]">VAN & SALESMAN</p>
              <p className="font-bold text-slate-800 mt-0.5">Salesman: {sale.worker?.name || 'Worker'}</p>
              <p className="text-slate-600">Vehicle: {sale.vehicle?.vehicleNumber || 'Van'}</p>
              <p className="text-slate-600 mt-1">Payment Mode: <span className="font-extrabold text-blue-800">{sale.paymentMethod}</span></p>
            </div>
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Item Description</th>
                  <th className="py-2.5 px-3 text-center">Qty (Cases)</th>
                  <th className="py-2.5 px-3 text-right">Case Rate (₹)</th>
                  <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sale.items?.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-semibold text-slate-500">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-black text-slate-900">{item.productName || item.product?.name}</td>
                    <td className="py-2.5 px-3 text-center font-bold">{item.quantity} Cases</td>
                    <td className="py-2.5 px-3 text-right font-semibold">₹{item.unitPrice.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right font-black text-slate-900">₹{item.totalAmount.toFixed(2)}</td>
                  </tr>
                ))}
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
    </Modal>
  );
}
