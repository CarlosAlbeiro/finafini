const express = require('express');
const router = express.Router();
const {
  getWhatsAppStatus,
  initializeWhatsAppSession,
  simulateConnection,
  sendReminder,
  getNotificationHistory
} = require('../controllers/whatsappController');
const { authenticateToken } = require('../middlewares/auth');

router.use(authenticateToken);

router.get('/status', getWhatsAppStatus);
router.post('/init', initializeWhatsAppSession);
router.post('/connect-simulate', simulateConnection);
router.post('/send-reminder', sendReminder);
router.get('/history', getNotificationHistory);

module.exports = router;
