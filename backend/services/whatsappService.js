const pino = require('pino');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');
const { generateInvoicePdfBuffer } = require('../utils/pdfGenerator');

const AUTH_DIR = path.join(__dirname, '../whatsapp_auth');

// Dynamic import helper for ESM baileys package
let baileysModule = null;
async function getBaileys() {
  if (!baileysModule) {
    baileysModule = await import('@whiskeysockets/baileys');
  }
  return baileysModule;
}

// Global in-memory state
let sock = null;
let connectionStatus = 'disconnected'; // 'disconnected' | 'connecting' | 'qr_ready' | 'connected'
let latestQrDataUrl = null;
let connectedUserJid = null;
let connectedNumber = null;
let isInitializing = false;

// Ensure auth dir exists
if (!fs.existsSync(AUTH_DIR)) {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
}

/**
 * Initialize Baileys WhatsApp Socket
 */
async function initWhatsApp(forceNew = false) {
  if (isInitializing) return;
  isInitializing = true;

  try {
    const baileys = await getBaileys();
    const makeWASocket = baileys.default || baileys.makeWASocket;
    const { useMultiFileAuthState, DisconnectReason, delay } = baileys;

    if (forceNew && fs.existsSync(AUTH_DIR)) {
      try {
        fs.rmSync(AUTH_DIR, { recursive: true, force: true });
        fs.mkdirSync(AUTH_DIR, { recursive: true });
      } catch (e) {
        console.warn('Error clearing auth dir:', e.message);
      }
    }

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

    connectionStatus = 'connecting';
    latestQrDataUrl = null;

    sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      logger: pino({ level: 'silent' }),
      browser: ['David Traders ERP', 'Chrome', '1.0.0'],
      syncFullHistory: false
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        connectionStatus = 'qr_ready';
        try {
          latestQrDataUrl = await QRCode.toDataURL(qr);
        } catch (qrErr) {
          console.error('Error generating QR data URL:', qrErr);
        }
      }

      if (connection === 'open') {
        connectionStatus = 'connected';
        latestQrDataUrl = null;
        connectedUserJid = sock?.user?.id || '';
        connectedNumber = connectedUserJid.split(':')[0].split('@')[0] || '';
        console.log(`✅ [WhatsApp Gateway] Connected successfully! Business Number: +${connectedNumber}`);
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        if (statusCode === DisconnectReason.loggedOut) {
          connectionStatus = 'disconnected';
          latestQrDataUrl = null;
          connectedNumber = null;
          try {
            fs.rmSync(AUTH_DIR, { recursive: true, force: true });
          } catch (e) {}
        } else {
          connectionStatus = 'connecting';
          await delay(3000);
          isInitializing = false;
          initWhatsApp(false);
        }
      }
    });

  } catch (err) {
    console.error('❌ [WhatsApp Gateway] Error initializing socket:', err);
    connectionStatus = 'disconnected';
  } finally {
    isInitializing = false;
  }
}

/**
 * Get current Gateway status
 */
function getStatus() {
  return {
    status: connectionStatus,
    qrCode: latestQrDataUrl,
    connectedNumber: connectedNumber,
    isReady: connectionStatus === 'connected' && sock !== null
  };
}

/**
 * Disconnect and logout current linked device
 */
async function disconnectWhatsApp() {
  try {
    if (sock) {
      await sock.logout().catch(() => {});
      sock.end();
      sock = null;
    }
  } catch (e) {}

  connectionStatus = 'disconnected';
  latestQrDataUrl = null;
  connectedNumber = null;

  try {
    if (fs.existsSync(AUTH_DIR)) {
      fs.rmSync(AUTH_DIR, { recursive: true, force: true });
    }
  } catch (e) {}

  return { message: 'WhatsApp device disconnected successfully' };
}

/**
 * Send the high-definition frontend PDF invoice document directly to customer's WhatsApp
 * @param {string} rawPhone - Customer phone number
 * @param {Buffer} pdfBuffer - Real PDF binary buffer matching frontend invoice modal design
 * @param {Object} invoiceMeta - Invoice metadata (invoiceNumber, customerName, netTotal, dueAmount, paymentMethod, createdAt)
 */
async function sendCustomPdfDocument(rawPhone, pdfBuffer, invoiceMeta = {}) {
  if (connectionStatus !== 'connected' || !sock) {
    throw new Error('WhatsApp Gateway is not connected. Please connect WhatsApp in System Settings.');
  }

  const cleanPhone = (rawPhone || '').replace(/\D/g, '');
  if (!cleanPhone || cleanPhone.length < 10) {
    throw new Error('Invalid customer phone number.');
  }

  const phoneWithCountry = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
  const jid = `${phoneWithCountry}@s.whatsapp.net`;

  const fileName = `Invoice_${invoiceMeta.invoiceNumber || 'PEP'}.pdf`;
  const dateStr = new Date(invoiceMeta.createdAt || Date.now()).toLocaleDateString('en-IN');
  const caption = 
`🧾 *DAVID TRADERS - PEPSI DISTRIBUTOR*
----------------------------------------
*SALES INVOICE:* #${invoiceMeta.invoiceNumber || 'N/A'}
*Date:* ${dateStr}
*Customer:* ${invoiceMeta.customerName || 'Valued Customer'}
*Payment Mode:* ${invoiceMeta.paymentMethod || 'Cash'}
💰 *NET TOTAL:* ₹${Number(invoiceMeta.netTotal || 0).toFixed(2)}
${invoiceMeta.dueAmount > 0 ? `⚠️ *DUE BALANCE:* ₹${Number(invoiceMeta.dueAmount).toFixed(2)}` : '✅ *STATUS:* PAID FULL'}

Attached is your official PDF Tax Invoice.
Thank you for choosing Pepsi Products! Refresh your world.`;

  // Send real binary PDF document
  const result = await sock.sendMessage(jid, {
    document: pdfBuffer,
    mimetype: 'application/pdf',
    fileName: fileName,
    caption: caption
  });

  return result;
}

/**
 * Automatically send generated fallback PDF document invoice directly to customer's WhatsApp
 * @param {string} rawPhone - Customer phone number
 * @param {Object} sale - Populated sale object
 */
async function sendInvoicePdfDirect(rawPhone, sale) {
  const pdfBuffer = await generateInvoicePdfBuffer(sale);
  return sendCustomPdfDocument(rawPhone, pdfBuffer, {
    invoiceNumber: sale.invoiceNumber,
    customerName: sale.customer?.shopName || 'Valued Customer',
    paymentMethod: sale.paymentMethod,
    netTotal: sale.netTotal,
    dueAmount: sale.dueAmount,
    createdAt: sale.createdAt
  });
}

// Auto-initialize on server boot if auth directory exists
if (fs.existsSync(path.join(AUTH_DIR, 'creds.json'))) {
  initWhatsApp(false);
}

module.exports = {
  initWhatsApp,
  getStatus,
  disconnectWhatsApp,
  sendCustomPdfDocument,
  sendInvoicePdfDirect
};
