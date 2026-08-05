const PDFDocument = require('pdfkit');

/**
 * Dynamically stream formatted PDF Invoice directly to HTTP response or buffer
 * @param {Object} sale - Populated sale object
 * @param {Object} res - Express response stream
 */
const streamInvoicePdf = (sale, res) => {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename=Invoice_${sale.invoiceNumber}.pdf`);

  doc.pipe(res);

  // Title Header
  doc.fillColor('#002B7F').fontSize(22).text('PEPSI AUTHORIZED DISTRIBUTOR', { align: 'center' });
  doc.fontSize(10).fillColor('#666666').text('Official Sales Invoice & Payment Receipt', { align: 'center' });
  doc.moveDown(1.5);

  // Bill & Customer Info
  const startY = doc.y;
  doc.fillColor('#000000').fontSize(10);
  doc.text(`BILLED TO:`, 40, startY, { font: 'Helvetica-Bold' });
  doc.text(`Shop: ${sale.customer?.shopName || 'Valued Customer'}`);
  doc.text(`Owner: ${sale.customer?.ownerName || 'N/A'}`);
  doc.text(`Phone: ${sale.customer?.phone || 'N/A'}`);
  if (sale.customer?.address) doc.text(`Address: ${sale.customer.address}`);

  doc.text(`INVOICE DETAILS:`, 350, startY, { font: 'Helvetica-Bold' });
  doc.text(`Invoice No: #${sale.invoiceNumber}`, 350);
  doc.text(`Date: ${new Date(sale.createdAt).toLocaleDateString('en-IN')}`, 350);
  doc.text(`Payment Mode: ${sale.paymentMethod}`, 350);
  doc.text(`Status: ${sale.dueAmount <= 0 ? 'PAID FULL' : `DUE Rs.${sale.dueAmount}`}`, 350);

  doc.moveDown(2);

  // Table Headers
  const tableHeaderY = doc.y;
  doc.fillColor('#002B7F').rect(40, tableHeaderY, 515, 22).fill();
  doc.fillColor('#FFFFFF').fontSize(9);
  doc.text('#', 45, tableHeaderY + 6);
  doc.text('Item Description', 70, tableHeaderY + 6);
  doc.text('Qty (Cases)', 280, tableHeaderY + 6);
  doc.text('Rate / Case', 380, tableHeaderY + 6);
  doc.text('Total (Rs)', 480, tableHeaderY + 6);

  let currentY = tableHeaderY + 28;
  doc.fillColor('#000000').fontSize(9);

  // Table Rows
  sale.items?.forEach((item, idx) => {
    const name = item.productName || item.product?.name || 'Pepsi Item';
    const size = item.size || item.product?.size;
    const displayName = size && !name.toLowerCase().includes(size.toLowerCase())
      ? `${name} (${size})`
      : name;

    doc.text(`${idx + 1}`, 45, currentY);
    doc.text(displayName, 70, currentY);
    doc.text(`${item.quantity} Cases`, 280, currentY);
    doc.text(`Rs.${item.unitPrice.toFixed(2)}`, 380, currentY);
    doc.text(`Rs.${item.totalAmount.toFixed(2)}`, 480, currentY);

    currentY += 20;
  });

  doc.strokeColor('#E2E8F0').lineWidth(1).moveTo(40, currentY).lineTo(555, currentY).stroke();
  currentY += 15;

  // Totals Summary Block
  const subTotal = sale.subTotal || sale.items?.reduce((acc, i) => acc + (i.totalAmount || 0), 0) || sale.netTotal;
  const discount = Number(sale.discount || 0);

  if (discount > 0) {
    doc.text(`Sub Total: Rs.${subTotal.toFixed(2)}`, 380, currentY);
    currentY += 16;
    doc.fillColor('#059669').text(`Discount: -Rs.${discount.toFixed(2)}`, 380, currentY);
    currentY += 16;
  }

  doc.fillColor('#002B7F').fontSize(13).text(`NET TOTAL: Rs.${sale.netTotal.toFixed(2)}`, 350, currentY);
  currentY += 20;
  doc.fillColor('#000000').fontSize(9).text(`Paid Amount: Rs.${sale.paidAmount.toFixed(2)}`, 380, currentY);
  
  if (sale.dueAmount > 0) {
    currentY += 16;
    doc.fillColor('#DC2626').text(`Outstanding Due: Rs.${sale.dueAmount.toFixed(2)}`, 380, currentY);
  }

  // Footer
  doc.moveDown(3);
  doc.fillColor('#94A3B8').fontSize(9).text('Thank you for choosing Pepsi Products! Refresh your world.', { align: 'center' });

  doc.end();
};

module.exports = { streamInvoicePdf };
