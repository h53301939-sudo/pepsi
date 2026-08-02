const express = require('express');
const router = express.Router();
const {
  loginUser,
  getMe,
  getWorkers,
  createWorker,
  updateWorker,
  deleteWorker
} = require('../controllers/authController');
const { protect, admin } = require('../middleware/authMiddleware');

router.post('/login', loginUser);
router.get('/me', protect, getMe);
router.get('/workers', protect, admin, getWorkers);
router.post('/workers', protect, admin, createWorker);
router.put('/workers/:id', protect, admin, updateWorker);
router.delete('/workers/:id', protect, admin, deleteWorker);

module.exports = router;
