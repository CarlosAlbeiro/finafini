const { v4: uuidv4 } = require('uuid');
const { query, run, get } = require('../config/db');

const formatDateStr = (dateVal) => {
  if (!dateVal) return '';
  if (dateVal instanceof Date) {
    return dateVal.toISOString().split('T')[0];
  }
  return String(dateVal).split('T')[0];
};

/**
 * Calcula fechas de vencimiento de forma exacta sin problemas de zona horaria (UTC)
 * Regla: La cuota #1 vence en el MES SIGUIENTE al inicio del préstamo (monthOffset = 1).
 * @param {string} startDateStr - Fecha base YYYY-MM-DD
 * @param {number} monthOffset - Desplazamiento en meses (1 para la 1ra cuota, 2 para la 2da, etc.)
 * @param {number|null} dueDay - Día pactado de pago (opcional, 1-31)
 */
const calculateDueDate = (startDateStr, monthOffset, dueDay) => {
  const cleanStr = formatDateStr(startDateStr);
  const parts = cleanStr.split('-');
  
  let year = parseInt(parts[0] || '2026', 10);
  let month = parseInt(parts[1] || '01', 10) - 1; // 0-indexado
  let day = parseInt(parts[2] || '01', 10);

  // Aplicar desplazamiento de meses (i=1 -> primer mes SIGUIENTE)
  let totalMonths = month + monthOffset;
  year += Math.floor(totalMonths / 12);
  month = ((totalMonths % 12) + 12) % 12;

  // Determinar el día objetivo: si dueDay está definido se usa ese día; de lo contrario el día de inicio
  let targetDay = dueDay ? Math.min(parseInt(dueDay, 10), 28) : day;

  // Ajustar si el mes tiene menos días (ej. 28 de Febrero)
  const lastDayOfTargetMonth = new Date(year, month + 1, 0).getDate();
  targetDay = Math.min(targetDay, lastDayOfTargetMonth);

  const yyyy = String(year);
  const mm = String(month + 1).padStart(2, '0');
  const dd = String(targetDay).padStart(2, '0');

  return `${yyyy}-${mm}-${dd}`;
};

/**
 * Cálculo de financiera bancaria estándar para Tasa Efectiva Anual (E.A.)
 * Convierte E.A. a Tasa Efectiva Mensual (EM) y calcula la Cuota Fija (Sistema Francés)
 */
const calculateFinancials = (principalInput, interestRateEAInput, installmentsCountInput) => {
  const P = Math.max(0, parseFloat(principalInput) || 0);
  const ea = Math.max(0, parseFloat(interestRateEAInput) || 0);
  const n = Math.max(1, parseInt(installmentsCountInput, 10) || 1);

  if (P === 0 || n === 0) {
    return {
      principal: 0,
      monthlyRate: 0,
      installmentAmount: 0,
      totalPayable: 0,
      totalInterest: 0
    };
  }

  if (ea === 0) {
    const installment = P / n;
    return {
      principal: P,
      monthlyRate: 0,
      installmentAmount: Math.round(installment * 100) / 100,
      totalPayable: P,
      totalInterest: 0
    };
  }

  // Tasa efectiva mensual i = (1 + EA/100)^(1/12) - 1
  const i = Math.pow(1 + (ea / 100), 1 / 12) - 1;

  // Cuota mensual fija PMT = P * [ i(1+i)^n / ((1+i)^n - 1) ]
  const pow = Math.pow(1 + i, n);
  const installmentAmount = P * ((i * pow) / (pow - 1));
  const totalPayable = installmentAmount * n;
  const totalInterest = totalPayable - P;

  return {
    principal: P,
    monthlyRate: i,
    installmentAmount: Math.round(installmentAmount * 100) / 100,
    totalPayable: Math.round(totalPayable * 100) / 100,
    totalInterest: Math.round(totalInterest * 100) / 100
  };
};

// Crear un préstamo o deuda
const createDebt = async (req, res) => {
  try {
    const {
      role,
      counterpart_email,
      counterpart_name,
      title,
      description,
      total_amount, // CAPITAL INICIAL BASE (sin sumar intereses en BD)
      currency = 'COP',
      installments_count = 1,
      interest_rate = 0,
      start_date,
      due_day,
      already_paid_installments = 0
    } = req.body;

    const userId = req.user.id;

    if (!title || !total_amount || !start_date) {
      return res.status(400).json({ error: 'Título, monto total y fecha de inicio son requeridos.' });
    }

    let creditor_id = userId;
    let debtor_id = null;

    if (counterpart_email) {
      const counterpart = await get('SELECT id FROM users WHERE email = ?', [counterpart_email]);
      if (counterpart) {
        if (role === 'debtor') {
          creditor_id = counterpart.id;
          debtor_id = userId;
        } else {
          creditor_id = userId;
          debtor_id = counterpart.id;
        }
      }
    } else if (role === 'debtor') {
      creditor_id = 'external';
      debtor_id = userId;
    }

    const debtId = uuidv4();
    const principal = parseFloat(total_amount);
    const rateEA = parseFloat(interest_rate || 0);
    const instCount = parseInt(installments_count, 10) || 1;

    // CÁLCULO FINANCIERO EFECTIVO ANUAL (E.A.)
    const financials = calculateFinancials(principal, rateEA, instCount);

    const numAlreadyPaid = Math.min(instCount, Math.max(0, parseInt(already_paid_installments || 0, 10)));
    const isFullyPaid = numAlreadyPaid >= instCount && instCount > 0;
    const initialStatus = isFullyPaid ? 'paid' : 'active';
    const cleanStartDate = formatDateStr(start_date);

    // SE GUARDA EN total_amount ÚNICAMENTE EL CAPITAL PRINCIPAL
    await run(
      `INSERT INTO debts (
        id, creditor_id, debtor_id, title, description, total_amount, currency,
        installments_count, installment_amount, interest_rate, start_date, due_day, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        debtId,
        creditor_id,
        debtor_id,
        title,
        description || (counterpart_name ? `Asociado a: ${counterpart_name}` : ''),
        principal,
        currency,
        instCount,
        financials.installmentAmount,
        rateEA,
        cleanStartDate,
        due_day || null,
        initialStatus
      ]
    );

    // Generar cuotas automáticamente: Cuota 1 en el MES SIGUIENTE al inicio (i = 1)
    for (let i = 1; i <= instCount; i++) {
      const installmentId = uuidv4();
      const formattedDueDate = calculateDueDate(cleanStartDate, i, due_day);
      const isPaid = i <= numAlreadyPaid;

      await run(
        'INSERT INTO installments (id, debt_id, number, amount, due_date, status, paid_amount) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          installmentId,
          debtId,
          i,
          financials.installmentAmount,
          formattedDueDate,
          isPaid ? 'paid' : 'pending',
          isPaid ? financials.installmentAmount : 0
        ]
      );

      if (isPaid) {
        const paymentId = uuidv4();
        await run(
          `INSERT INTO payments (id, debt_id, installment_id, amount, registered_by, note)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [paymentId, debtId, installmentId, financials.installmentAmount, userId, `Cuota #${i} saldada al crear el préstamo`]
        );
      }
    }

    if (debtor_id && debtor_id !== userId) {
      const partId = uuidv4();
      await run(
        'INSERT INTO debt_participants (id, debt_id, user_id, role, invited_by, accepted) VALUES (?, ?, ?, ?, ?, ?)',
        [partId, debtId, debtor_id, 'debtor', userId, 0]
      );
    }

    const createdDebt = await get('SELECT * FROM debts WHERE id = ?', [debtId]);
    const installments = await query('SELECT * FROM installments WHERE debt_id = ? ORDER BY number ASC', [debtId]);

    return res.status(201).json({
      message: 'Préstamo registrado exitosamente',
      debt: {
        ...createdDebt,
        start_date: formatDateStr(createdDebt.start_date),
        total_payable: financials.totalPayable,
        total_interest: financials.totalInterest
      },
      installments
    });
  } catch (error) {
    console.error('Error al crear préstamo:', error);
    return res.status(500).json({ error: 'Error al registrar el préstamo.' });
  }
};

// Listar préstamos del usuario
const getDebts = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, role, currency } = req.query;

    let sql = `
      SELECT d.*, 
        u_cred.name as creditor_name, u_cred.email as creditor_email,
        u_debt.name as debtor_name, u_debt.email as debtor_email,
        (SELECT COALESCE(SUM(paid_amount), 0) FROM installments WHERE debt_id = d.id) as total_paid,
        (SELECT COUNT(*) FROM installments WHERE debt_id = d.id AND status = 'paid') as paid_installments_count
      FROM debts d
      LEFT JOIN users u_cred ON d.creditor_id = u_cred.id
      LEFT JOIN users u_debt ON d.debtor_id = u_debt.id
      WHERE (d.creditor_id = ? OR d.debtor_id = ? OR d.id IN (SELECT debt_id FROM debt_participants WHERE user_id = ?))
    `;

    const params = [userId, userId, userId];

    if (status) {
      sql += ` AND d.status = ?`;
      params.push(status);
    }

    if (currency) {
      sql += ` AND d.currency = ?`;
      params.push(currency);
    }

    sql += ` ORDER BY d.created_at DESC`;

    const debts = await query(sql, params);

    const formattedDebts = debts.map(d => {
      const isCreditor = d.creditor_id === userId;
      const isDebtor = d.debtor_id === userId;
      
      const financials = calculateFinancials(d.total_amount, d.interest_rate, d.installments_count);
      const totalPaid = parseFloat(d.total_paid || 0);
      const remaining = Math.max(0, financials.totalPayable - totalPaid);
      
      let userRole = 'viewer';
      if (isCreditor) userRole = 'creditor';
      else if (isDebtor) userRole = 'debtor';

      return {
        ...d,
        start_date: formatDateStr(d.start_date),
        userRole,
        total_payable: financials.totalPayable,
        total_interest: financials.totalInterest,
        remaining_amount: remaining,
        progress_percentage: Math.min(100, Math.round((totalPaid / financials.totalPayable) * 100)) || 0
      };
    });

    return res.json({ debts: formattedDebts });
  } catch (error) {
    console.error('Error al obtener préstamos:', error);
    return res.status(500).json({ error: 'Error al obtener la lista de préstamos.' });
  }
};

// Detalle del préstamo
const getDebtById = async (req, res) => {
  try {
    const { id } = req.params;

    const debt = await get(`
      SELECT d.*, 
        u_cred.name as creditor_name, u_cred.email as creditor_email,
        u_debt.name as debtor_name, u_debt.email as debtor_email,
        (SELECT COUNT(*) FROM installments WHERE debt_id = d.id AND status = 'paid') as paid_installments_count
      FROM debts d
      LEFT JOIN users u_cred ON d.creditor_id = u_cred.id
      LEFT JOIN users u_debt ON d.debtor_id = u_debt.id
      WHERE d.id = ?
    `, [id]);

    if (!debt) {
      return res.status(404).json({ error: 'Préstamo no encontrado.' });
    }

    const installments = await query('SELECT * FROM installments WHERE debt_id = ? ORDER BY number ASC', [id]);
    const payments = await query(`
      SELECT p.*, u.name as registered_by_name 
      FROM payments p
      LEFT JOIN users u ON p.registered_by = u.id
      WHERE p.debt_id = ?
      ORDER BY p.paid_at DESC
    `, [id]);

    const totalPaid = installments.reduce((acc, inst) => acc + (inst.paid_amount || 0), 0);
    const financials = calculateFinancials(debt.total_amount, debt.interest_rate, debt.installments_count);
    const remaining = Math.max(0, financials.totalPayable - totalPaid);

    const formattedInstallments = installments.map(inst => ({
      ...inst,
      due_date: formatDateStr(inst.due_date)
    }));

    return res.json({
      debt: {
        ...debt,
        start_date: formatDateStr(debt.start_date),
        total_payable: financials.totalPayable,
        total_interest: financials.totalInterest,
        total_paid: totalPaid,
        remaining_amount: remaining,
        progress_percentage: Math.min(100, Math.round((totalPaid / financials.totalPayable) * 100))
      },
      installments: formattedInstallments,
      payments
    });
  } catch (error) {
    console.error('Error al obtener préstamo:', error);
    return res.status(500).json({ error: 'Error al obtener detalle del préstamo.' });
  }
};

// Actualizar préstamo completo
const updateDebt = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      total_amount,
      currency,
      installments_count,
      interest_rate,
      due_day,
      start_date,
      status,
      already_paid_installments
    } = req.body;

    const existingDebt = await get('SELECT * FROM debts WHERE id = ?', [id]);
    if (!existingDebt) {
      return res.status(404).json({ error: 'Préstamo no encontrado.' });
    }

    const principal = parseFloat(total_amount !== undefined ? total_amount : existingDebt.total_amount);
    const rateEA = parseFloat(interest_rate !== undefined ? interest_rate : (existingDebt.interest_rate || 0));
    const instCount = parseInt(installments_count !== undefined ? installments_count : existingDebt.installments_count, 10);
    const cleanStartDate = formatDateStr(start_date || existingDebt.start_date);

    // RE-CALCULAR FINANZAS CON EFECTIVO ANUAL (E.A.)
    const financials = calculateFinancials(principal, rateEA, instCount);

    let finalStatus = status || existingDebt.status;

    if (already_paid_installments !== undefined) {
      const numPaid = Math.min(instCount, Math.max(0, parseInt(already_paid_installments, 10)));
      if (numPaid >= instCount && instCount > 0) {
        finalStatus = 'paid';
      } else if (numPaid < instCount && finalStatus === 'paid') {
        finalStatus = 'active';
      }

      const currentInstallments = await query('SELECT * FROM installments WHERE debt_id = ? ORDER BY number ASC', [id]);
      
      for (let i = 1; i <= instCount; i++) {
        const isPaid = i <= numPaid;
        const existingInst = currentInstallments.find(inst => inst.number === i);

        // Cuota i se vence en mes start_date + i
        const formattedDueDate = calculateDueDate(cleanStartDate, i, due_day);

        if (existingInst) {
          await run(
            'UPDATE installments SET amount = ?, status = ?, paid_amount = ?, due_date = ? WHERE id = ?',
            [
              financials.installmentAmount,
              isPaid ? 'paid' : 'pending',
              isPaid ? financials.installmentAmount : 0,
              formattedDueDate,
              existingInst.id
            ]
          );
        } else {
          const installmentId = uuidv4();
          await run(
            'INSERT INTO installments (id, debt_id, number, amount, due_date, status, paid_amount) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [
              installmentId,
              id,
              i,
              financials.installmentAmount,
              formattedDueDate,
              isPaid ? 'paid' : 'pending',
              isPaid ? financials.installmentAmount : 0
            ]
          );
        }
      }
    } else {
      await run(
        "UPDATE installments SET amount = ? WHERE debt_id = ? AND status != 'paid'",
        [financials.installmentAmount, id]
      );
    }

    await run(
      `UPDATE debts SET 
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        total_amount = ?,
        currency = COALESCE(?, currency),
        installments_count = ?,
        installment_amount = ?,
        interest_rate = ?,
        due_day = COALESCE(?, due_day),
        start_date = COALESCE(?, start_date),
        status = ?
       WHERE id = ?`,
      [
        title || existingDebt.title,
        description !== undefined ? description : existingDebt.description,
        principal,
        currency || existingDebt.currency,
        instCount,
        financials.installmentAmount,
        rateEA,
        due_day !== undefined ? due_day : existingDebt.due_day,
        cleanStartDate,
        finalStatus,
        id
      ]
    );

    const updated = await get('SELECT * FROM debts WHERE id = ?', [id]);
    return res.json({
      message: 'Préstamo actualizado exitosamente.',
      debt: {
        ...updated,
        start_date: formatDateStr(updated.start_date),
        total_payable: financials.totalPayable,
        total_interest: financials.totalInterest
      }
    });
  } catch (error) {
    console.error('Error al actualizar préstamo:', error);
    return res.status(500).json({ error: 'Error al actualizar el préstamo.' });
  }
};

const updateDebtStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    await run('UPDATE debts SET status = ? WHERE id = ?', [status, id]);
    return res.json({ message: 'Estado del préstamo actualizado.' });
  } catch (error) {
    return res.status(500).json({ error: 'Error al actualizar préstamo.' });
  }
};

const deleteDebt = async (req, res) => {
  try {
    const { id } = req.params;
    await run('DELETE FROM debts WHERE id = ?', [id]);
    return res.json({ message: 'Préstamo eliminado exitosamente.' });
  } catch (error) {
    return res.status(500).json({ error: 'Error al eliminar préstamo.' });
  }
};

module.exports = {
  createDebt,
  getDebts,
  getDebtById,
  updateDebt,
  updateDebtStatus,
  deleteDebt,
  calculateFinancials,
  calculateDueDate
};
