const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { createService, getServiceStats } = require('../controllers/staffController');
const { callNext, completeToken, toggleQueuePause } = require('../controllers/queueController');

router.post('/services', authenticate, authorize('admin'), createService);
router.post('/services/:serviceId/call-next', authenticate, authorize('staff', 'admin'), callNext);
router.post('/token/:tokenId/complete', authenticate, authorize('staff', 'admin'), completeToken);
router.patch('/services/:serviceId/pause', authenticate, authorize('staff', 'admin'), toggleQueuePause);
router.get('/services/:serviceId/stats', authenticate, authorize('staff', 'admin'), getServiceStats);

module.exports = router;
