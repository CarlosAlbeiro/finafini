const express = require('express');
const router = express.Router();
const {
  createDebt,
  getDebts,
  getDebtById,
  updateDebt,
  updateDebtStatus,
  deleteDebt
} = require('../controllers/debtController');
const { authenticateToken } = require('../middlewares/auth');

router.use(authenticateToken);

router.post('/', createDebt);
router.get('/', getDebts);
router.get('/:id', getDebtById);
router.put('/:id', updateDebt);
router.patch('/:id', updateDebt);
router.patch('/:id/status', updateDebtStatus);
router.delete('/:id', deleteDebt);

module.exports = router;
