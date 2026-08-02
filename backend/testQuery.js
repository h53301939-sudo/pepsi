require('dotenv').config();
const connectDB = require('./config/db');
const Sale = require('./models/Sale');

connectDB().then(async () => {
  const startDate = '2026-08-02';
  const endDate = '2026-08-02';

  const partsS = startDate.split('-').map(Number);
  const start = new Date(Date.UTC(partsS[0], partsS[1] - 1, partsS[2], 0, 0, 0, 0));

  const partsE = endDate.split('-').map(Number);
  const end = new Date(Date.UTC(partsE[0], partsE[1] - 1, partsE[2], 23, 59, 59, 999));

  console.log('QUERY UTC START:', start.toISOString(), 'END:', end.toISOString());

  const sales = await Sale.find({
    createdAt: { $gte: start, $lte: end }
  });

  console.log('MATCHED SALES COUNT:', sales.length);
  sales.forEach(s => console.log('MATCHED INVOICE:', s.invoiceNumber, s.createdAt, s.netTotal));
  process.exit(0);
});
