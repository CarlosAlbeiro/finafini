const { v4: uuidv4 } = require('uuid');
const { query, run, get } = require('../config/db');

// Obtener todas las transacciones del usuario
const getTransactions = async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, currency, category } = req.query;

    let sql = 'SELECT * FROM transactions WHERE user_id = ?';
    const params = [userId];

    if (type) {
      sql += ' AND type = ?';
      params.push(type);
    }
    if (currency) {
      sql += ' AND currency = ?';
      params.push(currency);
    }
    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }

    sql += ' ORDER BY date DESC, created_at DESC';

    const transactions = await query(sql, params);
    return res.json({ transactions });
  } catch (error) {
    console.error('Error al obtener transacciones:', error);
    return res.status(500).json({ error: 'Error al obtener transacciones.' });
  }
};

// Crear una nueva transacción (Gasto o Ingreso)
const createTransaction = async (req, res) => {
  try {
    const userId = req.user.id;
    const { type = 'expense', category, amount, currency = 'COP', date, note } = req.body;

    if (!category || !amount || parseFloat(amount) <= 0 || !date) {
      return res.status(400).json({ error: 'Categoría, monto válido y fecha son obligatorios.' });
    }

    const id = uuidv4();
    await run(
      `INSERT INTO transactions (id, user_id, type, category, amount, currency, date, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, userId, type, category, parseFloat(amount), currency, date, note || '']
    );

    const created = await get('SELECT * FROM transactions WHERE id = ?', [id]);
    return res.status(201).json({
      message: 'Transacción registrada con éxito',
      transaction: created
    });
  } catch (error) {
    console.error('Error al crear transacción:', error);
    return res.status(500).json({ error: 'Error al registrar la transacción.' });
  }
};

// Eliminar transacción
const deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    await run('DELETE FROM transactions WHERE id = ? AND user_id = ?', [id, userId]);
    return res.json({ message: 'Transacción eliminada con éxito.' });
  } catch (error) {
    return res.status(500).json({ error: 'Error al eliminar transacción.' });
  }
};

// Obtener resumen mensual de gastos por categoría
const getExpensesSummary = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currency = 'COP' } = req.query;

    const summaryByCategory = await query(
      `SELECT category, SUM(amount) as total_amount, COUNT(*) as count
       FROM transactions
       WHERE user_id = ? AND type = 'expense' AND currency = ?
       GROUP BY category
       ORDER BY total_amount DESC`,
      [userId, currency]
    );

    return res.json({ summaryByCategory });
  } catch (error) {
    return res.status(500).json({ error: 'Error al obtener resumen de gastos.' });
  }
};

module.exports = {
  getTransactions,
  createTransaction,
  deleteTransaction,
  getExpensesSummary
};
