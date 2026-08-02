const express = require('express');
const router = express.Router();
const { createSale, getSales, getSaleById } = require('../controllers/saleController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, createSale);
router.get('/', protect, getSales);
router.get('/:id', protect, getSaleById);

module.exports = router;
