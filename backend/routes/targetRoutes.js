const express = require('express');
const router = express.Router();
const { getCurrentTarget, setMonthTarget } = require('../controllers/targetController');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/current', protect, getCurrentTarget);
router.post('/', protect, admin, setMonthTarget);

module.exports = router;
