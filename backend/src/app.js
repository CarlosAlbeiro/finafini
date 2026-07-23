const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const debtRoutes = require('./routes/debtRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const participantRoutes = require('./routes/participantRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const whatsappRoutes = require('./routes/whatsappRoutes');
const transactionRoutes = require('./routes/transactionRoutes');

const app = express();
const PORT = process.env.PORT || 3056;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos subidos (comprobantes de pago)
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

// Rutas API
app.use('/api/auth', authRoutes);
app.use('/api/debts', debtRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/participants', participantRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications/whatsapp', whatsappRoutes);
app.use('/api/transactions', transactionRoutes);

// Ruta de comprobación de salud
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Servidor de Finanzas Personales activo', timestamp: new Date() });
});

// Manejo global de errores
app.use((err, req, res, next) => {
  console.error('Error no capturado:', err);
  res.status(500).json({ error: err.message || 'Error interno del servidor.' });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend de Finanzas ejecutándose en http://localhost:${PORT}`);
});

module.exports = app;
