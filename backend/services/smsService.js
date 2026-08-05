const twilio = require('twilio');

let client = null;

const getTwilioClient = () => {
  if (!client && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    try {
      client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    } catch (err) {
      console.error('⚠️ Twilio initialization error:', err.message);
    }
  }
  return client;
};

/**
 * Send automatic SMS bill with PDF Invoice link to customer mobile number when sale is completed
 * @param {Object} sale - Populated Sale object
 */
const sendSaleBillSms = async (sale) => {
  const twilioClient = getTwilioClient();
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!twilioClient || !fromNumber) {
    console.log('ℹ️ Twilio SMS credentials not set in .env. Skipping SMS.');
    return false;
  }

  try {
    const rawPhone = sale.customer?.phone || '';
    const cleanPhone = rawPhone.replace(/\D/g, '');
    if (!cleanPhone) {
      console.log('ℹ️ Customer phone number missing. Skipping automatic SMS.');
      return false;
    }

    let phoneWithCountry = cleanPhone;
    if (cleanPhone.length === 10) {
      phoneWithCountry = `+91${cleanPhone}`;
    } else if (!phoneWithCountry.startsWith('+')) {
      phoneWithCountry = `+${cleanPhone}`;
    }

    let itemsSummary = '';
    sale.items?.forEach((item, idx) => {
      const name = item.productName || item.product?.name || 'Pepsi Item';
      const qty = item.quantity;
      const amt = item.totalAmount || 0;
      itemsSummary += `${idx + 1}.${name} x${qty}Cs=Rs.${amt} `;
    });

    const discountLine = sale.discount > 0 ? ` Disc:-Rs.${sale.discount}` : '';

    const baseUrl = process.env.PUBLIC_BASE_URL || 'https://davidtraders.in';
    const pdfUrl = `${baseUrl}/api/sales/${sale._id}/pdf`;

    const messageBody = `PEPSI DISTRIBUTOR: Invoice #${sale.invoiceNumber} for ${sale.customer?.shopName || 'Customer'}. ${itemsSummary}.${discountLine} NET TOTAL: Rs.${sale.netTotal}. Download PDF Bill: ${pdfUrl}`;

    const messageOptions = {
      body: messageBody,
      from: fromNumber,
      to: phoneWithCountry
    };

    // Include mediaUrl if public URL is configured
    if (process.env.PUBLIC_BASE_URL) {
      messageOptions.mediaUrl = [pdfUrl];
    }

    const res = await twilioClient.messages.create(messageOptions);

    console.log(`✅ Automatic SMS PDF Bill sent successfully via Twilio! SID: ${res.sid}`);
    return true;
  } catch (err) {
    console.error('❌ Failed to send Twilio SMS bill:', err.message);
    return false;
  }
};

module.exports = {
  sendSaleBillSms
};
