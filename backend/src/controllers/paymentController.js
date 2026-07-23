const { v4: uuidv4 } = require('uuid');
const { query, run, get } = require('../config/db');

const addPayment = async (req, res) => {
  try {
    const { debt_id, installment_id, amount, note } = req.body;
    const userId = req.user.id;
    const receipt_url = req.file ? `/uploads/${req.file.filename}` : null;

    if (!debt_id || !amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Debes especificar el préstamo y un monto de abono válido.' });
    }

    const numericAmount = parseFloat(amount);
    const paymentId = uuidv4();

    // Registrar el pago
    await run(
      `INSERT INTO payments (id, debt_id, installment_id, amount, registered_by, receipt_url, note)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [paymentId, debt_id, installment_id || null, numericAmount, userId, receipt_url, note || 'Abono registrado']
    );

    // Si se especificó una cuota directa
    if (installment_id) {
      const inst = await get('SELECT * FROM installments WHERE id = ?', [installment_id]);
      if (inst) {
        const newPaidAmount = (inst.paid_amount || 0) + numericAmount;
        let newStatus = 'partial';
        if (newPaidAmount >= inst.amount) {
          newStatus = 'paid';
        }
        await run('UPDATE installments SET paid_amount = ?, status = ? WHERE id = ?', [
          newPaidAmount,
          newStatus,
          installment_id
        ]);
      }
    } else {
      // Abono libre: Distribuir automáticamente entre cuotas pendientes
      const pendingInstallments = await query(
        "SELECT * FROM installments WHERE debt_id = ? AND status != 'paid' ORDER BY number ASC",
        [debt_id]
      );

      let remainingPayment = numericAmount;

      for (const inst of pendingInstallments) {
        if (remainingPayment <= 0) break;

        const needed = inst.amount - (inst.paid_amount || 0);
        if (needed <= 0) continue;

        if (remainingPayment >= needed) {
          remainingPayment -= needed;
          await run("UPDATE installments SET paid_amount = amount, status = 'paid' WHERE id = ?", [inst.id]);
        } else {
          const newPaid = (inst.paid_amount || 0) + remainingPayment;
          remainingPayment = 0;
          await run("UPDATE installments SET paid_amount = ?, status = 'partial' WHERE id = ?", [newPaid, inst.id]);
        }
      }
    }

    // Comprobar si todas las cuotas del préstamo ya fueron saldadas
    const unpaidCount = await get(
      "SELECT COUNT(*) as count FROM installments WHERE debt_id = ? AND status != 'paid'",
      [debt_id]
    );

    if (unpaidCount && unpaidCount.count === 0) {
      await run("UPDATE debts SET status = 'paid' WHERE id = ?", [debt_id]);
    }

    return res.status(201).json({
      message: 'Abono registrado exitosamente',
      payment_id: paymentId,
      receipt_url
    });
  } catch (error) {
    console.error('Error al registrar abono:', error);
    return res.status(500).json({ error: 'Error al procesar el abono.' });
  }
};

const getPaymentsByDebt = async (req, res) => {
  try {
    const { debt_id } = req.params;
    const payments = await query(
      `SELECT p.*, u.name as registered_by_name 
       FROM payments p
       LEFT JOIN users u ON p.registered_by = u.id
       WHERE p.debt_id = ?
       ORDER BY p.paid_at DESC`,
      [debt_id]
    );
    return res.json({ payments });
  } catch (error) {
    return res.status(500).json({ error: 'Error al obtener abonos.' });
  }
};

module.exports = {
  addPayment,
  getPaymentsByDebt
};
