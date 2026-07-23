const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { get, run, query } = require('../config/db');
const { JWT_SECRET } = require('../middlewares/auth');

const register = async (req, res) => {
  try {
    const { name, email, phone, password, default_currency } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nombre, email y contraseña son obligatorios.' });
    }

    const existingUser = await get('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.status(400).json({ error: 'El correo electrónico ya está registrado.' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const userId = uuidv4();
    const currency = default_currency || 'COP';

    await run(
      'INSERT INTO users (id, name, email, phone, password_hash, default_currency) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, name, email, phone || null, password_hash, currency]
    );

    const token = jwt.sign({ id: userId, email, name }, JWT_SECRET, { expiresIn: '7d' });

    return res.status(201).json({
      message: 'Usuario registrado exitosamente',
      token,
      user: { id: userId, name, email, phone, default_currency: currency }
    });
  } catch (error) {
    console.error('Error en registro:', error);
    return res.status(500).json({ error: 'Error al registrar usuario.' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son obligatorios.' });
    }

    const user = await get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' });

    return res.json({
      message: 'Inicio de sesión exitoso',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        default_currency: user.default_currency || 'COP',
        avatar_url: user.avatar_url
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    return res.status(500).json({ error: 'Error al iniciar sesión.' });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await get('SELECT id, name, email, phone, default_currency, avatar_url, created_at FROM users WHERE id = ?', [req.user.id]);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }
    return res.json({ user });
  } catch (error) {
    return res.status(500).json({ error: 'Error al obtener perfil.' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, phone, default_currency } = req.body;
    const userId = req.user.id;

    await run(
      'UPDATE users SET name = COALESCE(?, name), phone = COALESCE(?, phone), default_currency = COALESCE(?, default_currency) WHERE id = ?',
      [name, phone, default_currency, userId]
    );

    const updatedUser = await get('SELECT id, name, email, phone, default_currency, avatar_url FROM users WHERE id = ?', [userId]);

    return res.json({ message: 'Perfil actualizado correctamente', user: updatedUser });
  } catch (error) {
    return res.status(500).json({ error: 'Error al actualizar perfil.' });
  }
};

const listUsers = async (req, res) => {
  try {
    const users = await query('SELECT id, name, email, phone FROM users WHERE id != ?', [req.user.id]);
    return res.json({ users });
  } catch (error) {
    return res.status(500).json({ error: 'Error al listar usuarios.' });
  }
};

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  listUsers
};
