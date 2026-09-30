const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { listServices } = require('../controllers/staffController');
const {
  joinQueue,
  getMyTokenStatus,
  cancelToken,
  getQueueState
} = require('../controllers/queueController');

router.get('/services', listServices);
router.get('/services/:serviceId/current', getQueueState);
router.post('/join', authenticate, joinQueue);
router.get('/token/:tokenId', authenticate, getMyTokenStatus);
router.post('/token/:tokenId/cancel', authenticate, cancelToken);

module.exports = router;
