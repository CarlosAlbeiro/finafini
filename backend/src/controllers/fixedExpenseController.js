const { v4: uuidv4 } = require('uuid');
const { query, run, get } = require('../config/db');

// Formatear fecha YYYY-MM-DD
const formatDateStr = (dateVal) => {
  if (!dateVal) return '';
  if (dateVal instanceof Date) {
    return dateVal.toISOString().split('T')[0];
  }
  return String(dateVal).split('T')[0];
};

// Obtener todos los gastos fijos del usuario
const getFixedExpenses = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currency } = req.query;

    let sql = 'SELECT * FROM fixed_expenses WHERE user_id = ?';
    const params = [userId];

    if (currency) {
      sql += ' AND currency = ?';
      params.push(currency);
    }

    sql += ' ORDER BY due_day ASC, created_at DESC';

    const expenses = await query(sql, params);

    // Calcular rango del mes actual (primer día y último día)
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthIdx = now.getMonth();
    
    const startOfMonth = `${currentYear}-${String(currentMonthIdx + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(currentYear, currentMonthIdx + 1, 0).getDate();
    const endOfMonth = `${currentYear}-${String(currentMonthIdx + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    // Obtener transacciones del mes actual para verificar pagos de gastos fijos
    const monthlyTransactions = await query(
      `SELECT * FROM transactions 
       WHERE user_id = ? AND type = 'expense' AND date >= ? AND date <= ?`,
      [userId, startOfMonth, endOfMonth]
    );

    // Enlazar estado de pago del mes actual a cada gasto fijo
    const formattedExpenses = expenses.map(exp => {
      const matchTag = `[Gasto Fijo] ${exp.title}`;
      const isPaid = monthlyTransactions.some(t => 
        t.note && t.note.includes(matchTag)
      );

      return {
        ...exp,
        amount: parseFloat(exp.amount),
        due_day: parseInt(exp.due_day, 10),
        is_active: parseInt(exp.is_active, 10),
        paid_this_month: isPaid
      };
    });

    return res.json({ fixedExpenses: formattedExpenses });
  } catch (error) {
    console.error('Error al obtener gastos fijos:', error);
    return res.status(500).json({ error: 'Error al obtener gastos fijos.' });
  }
};

// Crear un nuevo gasto fijo recurrente
const createFixedExpense = async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, category, amount, currency = 'COP', due_day, note } = req.body;

    if (!title || !category || !amount || parseFloat(amount) <= 0 || !due_day) {
      return res.status(400).json({ error: 'Título, categoría, monto válido y día del mes son obligatorios.' });
    }

    const day = parseInt(due_day, 10);
    if (day < 1 || day > 31) {
      return res.status(400).json({ error: 'El día del mes debe estar entre 1 y 31.' });
    }

    const id = uuidv4();
    await run(
      `INSERT INTO fixed_expenses (id, user_id, title, category, amount, currency, due_day, note, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [id, userId, title.trim(), category, parseFloat(amount), currency, day, note || '']
    );

    const created = await get('SELECT * FROM fixed_expenses WHERE id = ?', [id]);
    return res.status(201).json({
      message: 'Gasto fijo registrado con éxito',
      fixedExpense: {
        ...created,
        amount: parseFloat(created.amount),
        due_day: parseInt(created.due_day, 10),
        is_active: parseInt(created.is_active, 10),
        paid_this_month: false
      }
    });
  } catch (error) {
    console.error('Error al crear gasto fijo:', error);
    return res.status(500).json({ error: 'Error al registrar el gasto fijo.' });
  }
};

// Actualizar gasto fijo existente
const updateFixedExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { title, category, amount, currency, due_day, note, is_active } = req.body;

    const existing = await get('SELECT * FROM fixed_expenses WHERE id = ? AND user_id = ?', [id, userId]);
    if (!existing) {
      return res.status(404).json({ error: 'Gasto fijo no encontrado.' });
    }

    const newTitle = title !== undefined ? title.trim() : existing.title;
    const newCategory = category !== undefined ? category : existing.category;
    const newAmount = amount !== undefined ? parseFloat(amount) : parseFloat(existing.amount);
    const newCurrency = currency !== undefined ? currency : existing.currency;
    const newDueDay = due_day !== undefined ? parseInt(due_day, 10) : parseInt(existing.due_day, 10);
    const newNote = note !== undefined ? note : existing.note;
    const newIsActive = is_active !== undefined ? (is_active ? 1 : 0) : parseInt(existing.is_active, 10);

    if (newDueDay < 1 || newDueDay > 31) {
      return res.status(400).json({ error: 'El día del mes debe estar entre 1 y 31.' });
    }

    await run(
      `UPDATE fixed_expenses SET
        title = ?,
        category = ?,
        amount = ?,
        currency = ?,
        due_day = ?,
        note = ?,
        is_active = ?
       WHERE id = ? AND user_id = ?`,
      [newTitle, newCategory, newAmount, newCurrency, newDueDay, newNote, newIsActive, id, userId]
    );

    const updated = await get('SELECT * FROM fixed_expenses WHERE id = ?', [id]);
    return res.json({
      message: 'Gasto fijo actualizado con éxito',
      fixedExpense: {
        ...updated,
        amount: parseFloat(updated.amount),
        due_day: parseInt(updated.due_day, 10),
        is_active: parseInt(updated.is_active, 10)
      }
    });
  } catch (error) {
    console.error('Error al actualizar gasto fijo:', error);
    return res.status(500).json({ error: 'Error al actualizar el gasto fijo.' });
  }
};

// Eliminar gasto fijo
const deleteFixedExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    await run('DELETE FROM fixed_expenses WHERE id = ? AND user_id = ?', [id, userId]);
    return res.json({ message: 'Gasto fijo eliminado con éxito.' });
  } catch (error) {
    console.error('Error al eliminar gasto fijo:', error);
    return res.status(500).json({ error: 'Error al eliminar gasto fijo.' });
  }
};

// Registrar pago de gasto fijo en las transacciones del mes actual
const payFixedExpenseForCurrentMonth = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const fixedExpense = await get('SELECT * FROM fixed_expenses WHERE id = ? AND user_id = ?', [id, userId]);
    if (!fixedExpense) {
      return res.status(404).json({ error: 'Gasto fijo no encontrado.' });
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthIdx = now.getMonth();
    const lastDay = new Date(currentYear, currentMonthIdx + 1, 0).getDate();
    
    // Ajustar el día al máximo de días del mes si sobrepasa
    const targetDay = Math.min(parseInt(fixedExpense.due_day, 10), lastDay);
    const dateStr = `${currentYear}-${String(currentMonthIdx + 1).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`;

    const transactionNote = `[Gasto Fijo] ${fixedExpense.title}${fixedExpense.note ? ' - ' + fixedExpense.note : ''}`;

    const transactionId = uuidv4();
    await run(
      `INSERT INTO transactions (id, user_id, type, category, amount, currency, date, note)
       VALUES (?, ?, 'expense', ?, ?, ?, ?, ?)`,
      [transactionId, userId, fixedExpense.category, parseFloat(fixedExpense.amount), fixedExpense.currency, dateStr, transactionNote]
    );

    const createdTx = await get('SELECT * FROM transactions WHERE id = ?', [transactionId]);
    return res.status(201).json({
      message: `Pago de "${fixedExpense.title}" registrado en transacciones de este mes.`,
      transaction: createdTx
    });
  } catch (error) {
    console.error('Error al registrar pago del gasto fijo:', error);
    return res.status(500).json({ error: 'Error al registrar el pago del gasto fijo.' });
  }
};

module.exports = {
  getFixedExpenses,
  createFixedExpense,
  updateFixedExpense,
  deleteFixedExpense,
  payFixedExpenseForCurrentMonth
};
