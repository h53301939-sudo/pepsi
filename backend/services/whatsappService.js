const axios = require('axios');

/**
 * Send WhatsApp Invoice Message via Meta WhatsApp Cloud API
 * @param {Object} params
 * @param {string} params.recipientPhone - 10 digit or international phone number
 * @param {Object} params.sale - Sale invoice document with customer and item details
 */
const sendWhatsAppCloudInvoice = async ({ recipientPhone, sale }) => {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    console.log('WhatsApp Cloud API keys not provided in .env. Skipping automated background API dispatch.');
    return { success: false, reason: 'Missing WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID in .env' };
  }

  // Sanitize phone number (Ensure country code, default to +91 for India)
  let cleanPhone = recipientPhone ? recipientPhone.replace(/\D/g, '') : '';
  if (cleanPhone.length === 10) {
    cleanPhone = `91${cleanPhone}`;
  }

  const itemListText = sale.items?.map(i => 
    `• ${i.productName || i.product?.name}: ${i.quantity} Cases @ ₹${i.unitPrice}/Case = ₹${i.totalAmount}`
  ).join('\n') || '';

  const messageText = `🥤 *PEPSI BOTTLERS DISTRIBUTOR*\n` +
    `*TAX INVOICE #${sale.invoiceNumber}*\n` +
    `Date: ${new Date(sale.createdAt || Date.now()).toLocaleDateString('en-IN')}\n` +
    `Customer: *${sale.customer?.shopName || 'Customer'}*\n\n` +
    `*Bill Items:*\n${itemListText}\n\n` +
    `*Net Total: ₹${sale.netTotal}*\n` +
    `Payment Status: ${sale.status === 'Paid' ? 'PAID FULL ✅' : `DUE ₹${sale.dueAmount} ⏳`}\n\n` +
    `Thank you for doing business with Pepsi Distribution!`;

  try {
    const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
    const response = await axios.post(
      url,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanPhone,
        type: 'text',
        text: { preview_url: false, body: messageText }
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`WhatsApp Cloud API invoice sent successfully to ${cleanPhone}:`, response.data);
    return { success: true, data: response.data };
  } catch (err) {
    console.error('Error sending WhatsApp Cloud API message:', err.response?.data || err.message);
    return { success: false, error: err.response?.data || err.message };
  }
};

module.exports = {
  sendWhatsAppCloudInvoice
};
