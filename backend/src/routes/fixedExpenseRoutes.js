const express = require('express');
const router = express.Router();
const {
  getFixedExpenses,
  createFixedExpense,
  updateFixedExpense,
  deleteFixedExpense,
  payFixedExpenseForCurrentMonth
} = require('../controllers/fixedExpenseController');
const { authenticateToken } = require('../middlewares/auth');

router.use(authenticateToken);

router.get('/', getFixedExpenses);
router.post('/', createFixedExpense);
router.put('/:id', updateFixedExpense);
router.delete('/:id', deleteFixedExpense);
router.post('/:id/pay', payFixedExpenseForCurrentMonth);

module.exports = router;
