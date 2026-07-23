const express = require('express');
const router = express.Router();
const { register, login, getMe, updateProfile, listUsers } = require('../controllers/authController');
const { authenticateToken } = require('../middlewares/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticateToken, getMe);
router.patch('/profile', authenticateToken, updateProfile);
router.get('/users', authenticateToken, listUsers);

module.exports = router;
