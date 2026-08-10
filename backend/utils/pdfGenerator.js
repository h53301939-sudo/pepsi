const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

/**
 * Dynamically stream formatted PDF Invoice directly to HTTP response
 * @param {Object} sale - Populated sale object
 * @param {Object} res - Express response stream
 */
const streamInvoicePdf = (sale, res) => {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename=Invoice_${sale.invoiceNumber}.pdf`);

  doc.pipe(res);
  buildInvoiceContent(doc, sale);
  doc.end();
};

/**
 * Generate PDF Invoice as in-memory Buffer for direct WhatsApp delivery
 * @param {Object} sale - Populated sale object
 * @returns {Promise<Buffer>}
 */
const generateInvoicePdfBuffer = (sale) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const buffers = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      buildInvoiceContent(doc, sale);
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

function buildInvoiceContent(doc, sale) {
  const logoPath = path.join(__dirname, '../assets/pepsi-logo.png');

  // Draw Header
  let textStartX = 40;
  if (fs.existsSync(logoPath)) {
    try {
      doc.image(logoPath, 40, 35, { width: 46, height: 46 });
      textStartX = 96;
    } catch (e) {}
  }

  // Company Name & Info
  doc.fillColor('#002B7F').fontSize(16).font('Helvetica-Bold').text('DAVID TRADERS (PEPSI DISTRIBUTOR)', textStartX, 38);
  doc.fontSize(8.5).font('Helvetica').fillColor('#475569').text('Kaithwaliya Aloo Mandi Sonbarsa Bazar • Ph: 8932094428', textStartX, 58);
  doc.fontSize(8).fillColor('#64748B').text('sales@pepsi-distributor.com', textStartX, 70);

  // Invoice Title Pill (Right)
  doc.fillColor('#E0F2FE').rect(410, 35, 145, 20).fill();
  doc.fillColor('#0369A1').fontSize(9).font('Helvetica-Bold').text('SALES INVOICE', 410, 41, { width: 145, align: 'center' });
  doc.fillColor('#0F172A').fontSize(10).font('Helvetica-Bold').text(`#${sale.invoiceNumber}`, 410, 60, { width: 145, align: 'right' });
  doc.fontSize(8).font('Helvetica').fillColor('#64748B').text(`Date: ${new Date(sale.createdAt || Date.now()).toLocaleDateString('en-IN')}`, 410, 73, { width: 145, align: 'right' });

  // Divider
  doc.strokeColor('#E2E8F0').lineWidth(1).moveTo(40, 92).lineTo(555, 92).stroke();

  // Customer & Van Info Cards
  const cardY = 102;
  doc.fillColor('#F8FAFC').roundedRect(40, cardY, 250, 68, 6).fill();
  doc.strokeColor('#E2E8F0').lineWidth(0.5).roundedRect(40, cardY, 250, 68, 6).stroke();

  doc.fillColor('#94A3B8').fontSize(7.5).font('Helvetica-Bold').text('BILLED TO CUSTOMER', 50, cardY + 8);
  doc.fillColor('#0F172A').fontSize(10).font('Helvetica-Bold').text(sale.customer?.shopName || 'Valued Customer', 50, cardY + 20);
  doc.fillColor('#475569').fontSize(8.5).font('Helvetica').text(`Owner: ${sale.customer?.ownerName || 'N/A'} (Ph: ${sale.customer?.phone || 'N/A'})`, 50, cardY + 34);
  const custAddress = sale.customer?.address || sale.customerAddress || 'Sonbarsa Bazar, Kaithwaliya';
  doc.fillColor('#64748B').fontSize(8).text(`Address: ${custAddress}`, 50, cardY + 48, { width: 230 });

  // Dispatch & Payment Card (Right)
  doc.fillColor('#F8FAFC').roundedRect(305, cardY, 250, 68, 6).fill();
  doc.strokeColor('#E2E8F0').lineWidth(0.5).roundedRect(305, cardY, 250, 68, 6).stroke();

  doc.fillColor('#94A3B8').fontSize(7.5).font('Helvetica-Bold').text('SOURCE & SALESMAN', 315, cardY + 8);
  doc.fillColor('#0F172A').fontSize(9).font('Helvetica-Bold').text(`Salesman: ${sale.worker?.name || 'Authorized Staff'}`, 315, cardY + 20);
  doc.fillColor('#475569').fontSize(8.5).font('Helvetica').text(`Dispatch: ${sale.vehicle?.vehicleNumber ? `Van (${sale.vehicle.vehicleNumber})` : 'Direct Warehouse Counter'}`, 315, cardY + 34);
  doc.fillColor('#475569').fontSize(8.5).text('Payment Mode: ', 315, cardY + 48);
  doc.fillColor('#002B7F').font('Helvetica-Bold').text(sale.paymentMethod || 'Cash', 378, cardY + 48);

  // Table Header
  const tableHeaderY = 182;
  doc.fillColor('#002B7F').rect(40, tableHeaderY, 515, 22).fill();
  doc.fillColor('#FFFFFF').fontSize(8.5).font('Helvetica-Bold');
  doc.text('#', 48, tableHeaderY + 6);
  doc.text('Item Description', 70, tableHeaderY + 6);
  doc.text('Qty (Cases)', 280, tableHeaderY + 6, { width: 70, align: 'center' });
  doc.text('Rate / Case (Rs)', 360, tableHeaderY + 6, { width: 90, align: 'right' });
  doc.text('Amount (Rs)', 465, tableHeaderY + 6, { width: 80, align: 'right' });

  let currentY = tableHeaderY + 26;
  doc.font('Helvetica');

  // Table Rows
  sale.items?.forEach((item, idx) => {
    const name = item.productName || item.product?.name || 'Pepsi Item';
    const size = item.size || item.product?.size;
    const displayName = size && !name.toLowerCase().includes(size.toLowerCase())
      ? `${name} (${size})`
      : name;

    if (idx % 2 === 1) {
      doc.fillColor('#F8FAFC').rect(40, currentY - 3, 515, 18).fill();
    }

    doc.fillColor('#64748B').fontSize(8).text(`${idx + 1}`, 48, currentY);
    doc.fillColor('#0F172A').fontSize(8.5).font('Helvetica-Bold').text(displayName, 70, currentY, { width: 200 });
    doc.font('Helvetica').fillColor('#334155').text(`${item.quantity} Cases`, 280, currentY, { width: 70, align: 'center' });
    doc.text(`Rs.${Number(item.unitPrice || 0).toFixed(2)}`, 360, currentY, { width: 90, align: 'right' });
    doc.fillColor('#0F172A').font('Helvetica-Bold').text(`Rs.${Number(item.totalAmount || (item.quantity * item.unitPrice) || 0).toFixed(2)}`, 465, currentY, { width: 80, align: 'right' });

    currentY += 18;
  });

  doc.strokeColor('#E2E8F0').lineWidth(0.8).moveTo(40, currentY + 4).lineTo(555, currentY + 4).stroke();
  currentY += 16;

  // Summary & Totals Block
  const subTotal = sale.subTotal || sale.items?.reduce((acc, i) => acc + (i.totalAmount || 0), 0) || sale.netTotal;
  const discount = Number(sale.discount || 0);

  // Status Badge (Left)
  if (sale.status === 'Paid' || (sale.dueAmount <= 0 && sale.paidAmount >= sale.netTotal)) {
    doc.fillColor('#D1FAE5').roundedRect(40, currentY, 80, 18, 4).fill();
    doc.fillColor('#065F46').fontSize(8).font('Helvetica-Bold').text('PAID FULL', 40, currentY + 5, { width: 80, align: 'center' });
  } else {
    doc.fillColor('#FEF3C7').roundedRect(40, currentY, 120, 18, 4).fill();
    doc.fillColor('#92400E').fontSize(8).font('Helvetica-Bold').text(`DUE: Rs.${sale.dueAmount}`, 40, currentY + 5, { width: 120, align: 'center' });
  }

  // Totals Breakdown (Right)
  if (discount > 0) {
    doc.fillColor('#475569').fontSize(8.5).font('Helvetica').text('Sub Total:', 350, currentY, { width: 100, align: 'right' });
    doc.text(`Rs.${subTotal.toFixed(2)}`, 465, currentY, { width: 80, align: 'right' });
    currentY += 14;

    doc.fillColor('#059669').font('Helvetica-Bold').text('Discount:', 350, currentY, { width: 100, align: 'right' });
    doc.text(`-Rs.${discount.toFixed(2)}`, 465, currentY, { width: 80, align: 'right' });
    currentY += 14;
  }

  doc.strokeColor('#CBD5E1').lineWidth(0.5).moveTo(350, currentY + 2).lineTo(555, currentY + 2).stroke();
  currentY += 6;

  doc.fillColor('#002B7F').fontSize(12).font('Helvetica-Bold').text('NET TOTAL:', 340, currentY, { width: 110, align: 'right' });
  doc.fontSize(12).text(`Rs.${Number(sale.netTotal || 0).toFixed(2)}`, 465, currentY, { width: 80, align: 'right' });
  currentY += 18;

  if (sale.paidAmount !== undefined) {
    doc.fillColor('#059669').fontSize(8.5).font('Helvetica').text('Paid Amount:', 350, currentY, { width: 100, align: 'right' });
    doc.text(`Rs.${Number(sale.paidAmount || 0).toFixed(2)}`, 465, currentY, { width: 80, align: 'right' });
  }

  // Footer Note
  doc.fontSize(8).font('Helvetica-Oblique').fillColor('#94A3B8').text('Thank you for choosing Pepsi Products! Refresh your world.', 40, 770, { align: 'center', width: 515 });
}

module.exports = { streamInvoicePdf, generateInvoicePdfBuffer };
