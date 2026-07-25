const { query } = require('../config/db');
const { calculateFinancials } = require('./debtController');

const formatDateStr = (dateVal) => {
  if (!dateVal) return '';
  if (dateVal instanceof Date) {
    return dateVal.toISOString().split('T')[0];
  }
  return String(dateVal).split('T')[0];
};

const monthNamesSpanish = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const getDashboardSummary = async (req, res) => {
  try {
    const userId = req.user.id;

    // Nombres de mes actual y mes siguiente de forma segura sin desfase horario
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthIdx = now.getMonth(); // 0 = Enero, 6 = Julio, etc.

    const currentMonthName = monthNamesSpanish[currentMonthIdx];

    const nextMonthIdx = (currentMonthIdx + 1) % 12;
    const nextMonthYear = currentMonthIdx === 11 ? currentYear + 1 : currentYear;
    const nextMonthName = monthNamesSpanish[nextMonthIdx];

    // Rango Fecha Mes Actual en formato YYYY-MM-DD
    const currentMonthStartStr = `${currentYear}-${String(currentMonthIdx + 1).padStart(2, '0')}-01`;
    const lastDayCurrent = new Date(currentYear, currentMonthIdx + 1, 0).getDate();
    const currentMonthEndStr = `${currentYear}-${String(currentMonthIdx + 1).padStart(2, '0')}-${String(lastDayCurrent).padStart(2, '0')}`;

    // Rango Fecha Mes Siguiente en formato YYYY-MM-DD
    const nextMonthStartStr = `${nextMonthYear}-${String(nextMonthIdx + 1).padStart(2, '0')}-01`;
    const lastDayNext = new Date(nextMonthYear, nextMonthIdx + 1, 0).getDate();
    const nextMonthEndStr = `${nextMonthYear}-${String(nextMonthIdx + 1).padStart(2, '0')}-${String(lastDayNext).padStart(2, '0')}`;

    // Obtener todos los préstamos donde participa el usuario
    const allDebts = await query(`
      SELECT d.*, 
        (SELECT COALESCE(SUM(paid_amount), 0) FROM installments WHERE debt_id = d.id) as total_paid
      FROM debts d
      WHERE (d.creditor_id = ? OR d.debtor_id = ? OR d.id IN (SELECT debt_id FROM debt_participants WHERE user_id = ?))
    `, [userId, userId, userId]);

    // Resumen por Monedas (COP, USD, EUR)
    const currencies = ['COP', 'USD', 'EUR'];
    const summaryByCurrency = {};

    currencies.forEach(c => {
      summaryByCurrency[c] = {
        total_owed: 0,              // Lo que debo a otros (saldo global)
        total_lent: 0,              // Lo que me deben otros
        total_due_this_month: 0,    // Valor exacto a vencer este mes
        total_due_next_month: 0,    // Valor exacto a vencer el próximo mes
        total_active: 0,            // Total de préstamos activos
        total_settled: 0            // Total saldado
      };
    });

    allDebts.forEach(debt => {
      const c = debt.currency || 'COP';
      if (!summaryByCurrency[c]) {
        summaryByCurrency[c] = {
          total_owed: 0,
          total_lent: 0,
          total_due_this_month: 0,
          total_due_next_month: 0,
          total_active: 0,
          total_settled: 0
        };
      }

      const financials = calculateFinancials(debt.total_amount, debt.interest_rate, debt.installments_count);
      const totalPaid = parseFloat(debt.total_paid || 0);
      const remaining = Math.max(0, financials.totalPayable - totalPaid);

      if (debt.creditor_id === userId) {
        // Yo presté (me deben dinero)
        summaryByCurrency[c].total_lent += remaining;
      } else if (debt.debtor_id === userId) {
        // Yo debo dinero
        summaryByCurrency[c].total_owed += remaining;
      }

      if (debt.status === 'active') {
        summaryByCurrency[c].total_active += 1;
      } else if (debt.status === 'paid') {
        summaryByCurrency[c].total_settled += 1;
      }
    });

    // Calcular cuotas del usuario a vencer ESTE MES (o que estaban vencidas previamente)
    const monthlyInstallments = await query(`
      SELECT i.*, d.currency, d.creditor_id, d.debtor_id
      FROM installments i
      JOIN debts d ON i.debt_id = d.id
      WHERE (d.creditor_id = ? OR d.debtor_id = ? OR d.id IN (SELECT debt_id FROM debt_participants WHERE user_id = ?))
        AND i.status != 'paid'
        AND i.due_date <= ?
    `, [userId, userId, userId, currentMonthEndStr]);

    monthlyInstallments.forEach(inst => {
      const c = inst.currency || 'COP';
      const pendingAmount = Math.max(0, parseFloat(inst.amount) - (parseFloat(inst.paid_amount) || 0));
      if (summaryByCurrency[c]) {
        summaryByCurrency[c].total_due_this_month += pendingAmount;
      }
    });

    // Calcular cuotas del usuario a vencer EL PRÓXIMO MES
    const nextMonthInstallments = await query(`
      SELECT i.*, d.currency, d.creditor_id, d.debtor_id
      FROM installments i
      JOIN debts d ON i.debt_id = d.id
      WHERE (d.creditor_id = ? OR d.debtor_id = ? OR d.id IN (SELECT debt_id FROM debt_participants WHERE user_id = ?))
        AND i.status != 'paid'
        AND i.due_date >= ?
        AND i.due_date <= ?
    `, [userId, userId, userId, nextMonthStartStr, nextMonthEndStr]);

    nextMonthInstallments.forEach(inst => {
      const c = inst.currency || 'COP';
      const pendingAmount = Math.max(0, parseFloat(inst.amount) - (parseFloat(inst.paid_amount) || 0));
      if (summaryByCurrency[c]) {
        summaryByCurrency[c].total_due_next_month += pendingAmount;
      }
    });

    // Obtener gastos fijos activos del usuario
    const fixedExpenses = await query(
      'SELECT * FROM fixed_expenses WHERE user_id = ? AND is_active = 1',
      [userId]
    );

    // Obtener transacciones del mes actual para verificar pagos de gastos fijos
    const currentMonthTransactions = await query(
      `SELECT * FROM transactions 
       WHERE user_id = ? AND type = 'expense' AND date >= ? AND date <= ?`,
      [userId, currentMonthStartStr, currentMonthEndStr]
    );

    // Sumar a total_due_this_month y total_due_next_month los gastos fijos
    fixedExpenses.forEach(fe => {
      const c = fe.currency || 'COP';
      if (!summaryByCurrency[c]) {
        summaryByCurrency[c] = {
          total_owed: 0,
          total_lent: 0,
          total_due_this_month: 0,
          total_due_next_month: 0,
          total_active: 0,
          total_settled: 0
        };
      }

      const matchTag = `[Gasto Fijo] ${fe.title}`;
      const isPaidThisMonth = currentMonthTransactions.some(t => 
        t.note && t.note.includes(matchTag)
      );

      const amount = parseFloat(fe.amount) || 0;

      // Si no se ha pagado este mes, sumar a las cuotas a pagar este mes
      if (!isPaidThisMonth) {
        summaryByCurrency[c].total_due_this_month += amount;
      }

      // Para el próximo mes, el gasto fijo se repetirá
      summaryByCurrency[c].total_due_next_month += amount;
    });

    // Redondear totales para evitar imprecisiones de punto flotante en JS
    currencies.forEach(c => {
      if (summaryByCurrency[c]) {
        summaryByCurrency[c].total_owed = Math.round(summaryByCurrency[c].total_owed * 100) / 100;
        summaryByCurrency[c].total_lent = Math.round(summaryByCurrency[c].total_lent * 100) / 100;
        summaryByCurrency[c].total_due_this_month = Math.round(summaryByCurrency[c].total_due_this_month * 100) / 100;
        summaryByCurrency[c].total_due_next_month = Math.round(summaryByCurrency[c].total_due_next_month * 100) / 100;
      }
    });

    // Próximas cuotas a vencer ordenadas por fecha exacta de vencimiento
    const rawUpcoming = await query(`
      SELECT i.*, d.title as debt_title, d.currency, d.creditor_id, d.debtor_id
      FROM installments i
      JOIN debts d ON i.debt_id = d.id
      WHERE (d.creditor_id = ? OR d.debtor_id = ?)
        AND i.status != 'paid'
      ORDER BY i.due_date ASC
      LIMIT 8
    `, [userId, userId]);

    // Agregar a las próximas cuotas a vencer los gastos fijos pendientes del mes actual
    fixedExpenses.forEach(fe => {
      const matchTag = `[Gasto Fijo] ${fe.title}`;
      const isPaidThisMonth = currentMonthTransactions.some(t => 
        t.note && t.note.includes(matchTag)
      );

      if (!isPaidThisMonth) {
        const targetDay = Math.min(parseInt(fe.due_day, 10), lastDayCurrent);
        const dueDate = `${currentYear}-${String(currentMonthIdx + 1).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`;
        
        rawUpcoming.push({
          id: fe.id,
          debt_id: fe.id,
          debt_title: `[Gasto Fijo] ${fe.title}`,
          number: 'Fijo',
          amount: parseFloat(fe.amount),
          currency: fe.currency || 'COP',
          due_date: dueDate,
          creditor_id: 'fixed',
          debtor_id: userId,
          is_fixed: true,
          status: 'pending'
        });
      }
    });

    // Ordenar todas por fecha de vencimiento
    rawUpcoming.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

    const upcomingInstallments = rawUpcoming.slice(0, 8).map(inst => ({
      ...inst,
      due_date: formatDateStr(inst.due_date),
      userRole: inst.creditor_id === userId ? 'creditor' : 'debtor',
      pending_amount: inst.is_fixed ? parseFloat(inst.amount) : Math.max(0, parseFloat(inst.amount) - (parseFloat(inst.paid_amount) || 0))
    }));

    // Historial reciente de abonos
    const recentPayments = await query(`
      SELECT p.*, d.title as debt_title, d.currency, u.name as registered_by_name
      FROM payments p
      JOIN debts d ON p.debt_id = d.id
      JOIN users u ON p.registered_by = u.id
      WHERE (d.creditor_id = ? OR d.debtor_id = ?)
      ORDER BY p.paid_at DESC
      LIMIT 5
    `, [userId, userId]);

    return res.json({
      summaryByCurrency,
      upcomingInstallments,
      recentPayments,
      currentMonthName,
      nextMonthName,
      totalDebtsCount: allDebts.length
    });
  } catch (error) {
    console.error('Error al generar resumen del dashboard:', error);
    return res.status(500).json({ error: 'Error al cargar resumen financiero.' });
  }
};

module.exports = {
  getDashboardSummary
};
