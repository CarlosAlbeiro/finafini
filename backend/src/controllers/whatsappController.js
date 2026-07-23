const { query, run, get } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

// Simulación y estado de la sesión de WhatsApp Bot (WhatsApp Web)
let botState = {
  status: 'disconnected', // 'disconnected', 'qr_ready', 'connected'
  qrCode: null,
  phoneConnected: null
};

const getWhatsAppStatus = (req, res) => {
  return res.json({
    status: botState.status,
    phoneConnected: botState.phoneConnected,
    qrCode: botState.qrCode
  });
};

const initializeWhatsAppSession = (req, res) => {
  botState.status = 'qr_ready';
  // QR base64 / Data URL ficticio válido para escaneo o simulación visual
  botState.qrCode = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23ffffff"/><path d="M10 10h30v30H10zM15 15v20h20V15zM60 10h30v30H60zM65 15v20h20V15zM10 60h30v30H10zM15 65v20h20V65zM45 10h10v10H45zM45 30h10v10H45zM45 50h10v10H45zM45 70h10v20H45zM60 50h10v10H60zM80 50h10v10H80zM60 70h30v20H60z" fill="%230f172a"/><rect x="22" y="22" width="6" height="6" fill="%230f172a"/><rect x="72" y="22" width="6" height="6" fill="%230f172a"/><rect x="22" y="72" width="6" height="6" fill="%230f172a"/></svg>';

  return res.json({
    message: 'Código QR de WhatsApp generado. Escanea con la aplicación en tu teléfono.',
    status: botState.status,
    qrCode: botState.qrCode
  });
};

const simulateConnection = (req, res) => {
  const { phone } = req.body;
  botState.status = 'connected';
  botState.phoneConnected = phone || req.user.phone || '+573001234567';
  botState.qrCode = null;

  return res.json({
    message: 'Sesión de WhatsApp vinculada exitosamente.',
    status: botState.status,
    phoneConnected: botState.phoneConnected
  });
};

const sendReminder = async (req, res) => {
  try {
    const { debt_id, installment_id, custom_message } = req.body;
    const userId = req.user.id;

    const debt = await get('SELECT * FROM debts WHERE id = ?', [debt_id]);
    if (!debt) {
      return res.status(404).json({ error: 'Préstamo no encontrado.' });
    }

    const notifId = uuidv4();
    const messageContent = custom_message || `Hola, recordatorio de cuota pendiente para el préstamo "${debt.title}" por un monto de ${debt.installment_amount} ${debt.currency}.`;

    await run(
      'INSERT INTO notifications (id, user_id, type, message, status) VALUES (?, ?, ?, ?, ?)',
      [notifId, userId, 'whatsapp', messageContent, 'sent']
    );

    return res.json({
      message: 'Recordatorio por WhatsApp enviado correctamente.',
      notification: {
        id: notifId,
        message: messageContent,
        sent_at: new Date().toISOString()
      }
    });
  } catch (error) {
    return res.status(500).json({ error: 'Error al enviar recordatorio por WhatsApp.' });
  }
};

const getNotificationHistory = async (req, res) => {
  try {
    const notifications = await query(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY sent_at DESC LIMIT 20',
      [req.user.id]
    );
    return res.json({ notifications });
  } catch (error) {
    return res.status(500).json({ error: 'Error al consultar historial de notificaciones.' });
  }
};

module.exports = {
  getWhatsAppStatus,
  initializeWhatsAppSession,
  simulateConnection,
  sendReminder,
  getNotificationHistory
};
