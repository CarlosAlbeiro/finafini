const express = require('express');
const router = express.Router();
const { addPayment, getPaymentsByDebt } = require('../controllers/paymentController');
const { authenticateToken } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

router.use(authenticateToken);

router.post('/', upload.single('receipt'), addPayment);
router.get('/debt/:debt_id', getPaymentsByDebt);

module.exports = router;
