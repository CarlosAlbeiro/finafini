const { v4: uuidv4 } = require('uuid');
const { query, run, get } = require('../config/db');

const inviteParticipant = async (req, res) => {
  try {
    const { debt_id, email, role = 'debtor' } = req.body;
    const userId = req.user.id;

    const userToInvite = await get('SELECT id, name, email FROM users WHERE email = ?', [email]);
    if (!userToInvite) {
      return res.status(404).json({ error: 'El usuario ingresado no está registrado en la plataforma.' });
    }

    const existingPart = await get(
      'SELECT id FROM debt_participants WHERE debt_id = ? AND user_id = ?',
      [debt_id, userToInvite.id]
    );

    if (existingPart) {
      return res.status(400).json({ error: 'Este usuario ya ha sido invitado a este préstamo.' });
    }

    const partId = uuidv4();
    await run(
      'INSERT INTO debt_participants (id, debt_id, user_id, role, invited_by, accepted) VALUES (?, ?, ?, ?, ?, 0)',
      [partId, debt_id, userToInvite.id, role, userId]
    );

    return res.status(201).json({
      message: `Invitación enviada a ${userToInvite.name} (${userToInvite.email}).`
    });
  } catch (error) {
    return res.status(500).json({ error: 'Error al invitar usuario al préstamo.' });
  }
};

const getMyInvitations = async (req, res) => {
  try {
    const userId = req.user.id;
    const invitations = await query(`
      SELECT dp.*, d.title as debt_title, d.total_amount, d.currency, u.name as inviter_name
      FROM debt_participants dp
      JOIN debts d ON dp.debt_id = d.id
      JOIN users u ON dp.invited_by = u.id
      WHERE dp.user_id = ? AND dp.accepted = 0
    `, [userId]);

    return res.json({ invitations });
  } catch (error) {
    return res.status(500).json({ error: 'Error al obtener invitaciones.' });
  }
};

const respondInvitation = async (req, res) => {
  try {
    const { id } = req.params;
    const { accept } = req.body;
    const userId = req.user.id;

    if (accept) {
      await run('UPDATE debt_participants SET accepted = 1 WHERE id = ? AND user_id = ?', [id, userId]);
      
      // Actualizar también la deuda si estaba huérfana
      const part = await get('SELECT debt_id, role FROM debt_participants WHERE id = ?', [id]);
      if (part) {
        if (part.role === 'debtor') {
          await run('UPDATE debts SET debtor_id = ? WHERE id = ?', [userId, part.debt_id]);
        } else if (part.role === 'creditor') {
          await run('UPDATE debts SET creditor_id = ? WHERE id = ?', [userId, part.debt_id]);
        }
      }

      return res.json({ message: 'Invitación aceptada correctamente.' });
    } else {
      await run('DELETE FROM debt_participants WHERE id = ? AND user_id = ?', [id, userId]);
      return res.json({ message: 'Invitación rechazada.' });
    }
  } catch (error) {
    return res.status(500).json({ error: 'Error al responder la invitación.' });
  }
};

module.exports = {
  inviteParticipant,
  getMyInvitations,
  respondInvitation
};
