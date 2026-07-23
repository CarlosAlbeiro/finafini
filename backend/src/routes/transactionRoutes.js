const express = require('express');
const router = express.Router();
const {
  getTransactions,
  createTransaction,
  deleteTransaction,
  getExpensesSummary
} = require('../controllers/transactionController');
const { authenticateToken } = require('../middlewares/auth');

router.use(authenticateToken);

router.get('/', getTransactions);
router.post('/', createTransaction);
router.delete('/:id', deleteTransaction);
router.get('/summary-by-category', getExpensesSummary);

module.exports = router;
