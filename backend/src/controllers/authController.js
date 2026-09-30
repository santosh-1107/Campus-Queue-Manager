const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { validateRegistration, validateLogin } = require('../middleware/validate');
require('dotenv').config();

async function register(req, res) {
  try {
    const { name, email, password, role } = req.body;
    const errors = validateRegistration({ name, email, password, role });
    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join('; ') });
    }
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const safeRole = ['student', 'staff', 'admin'].includes(role) ? role : 'student';

    const [result] = await pool.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [name, email, passwordHash, safeRole]
    );

    const token = jwt.sign(
      { id: result.insertId, role: safeRole, name },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );
    res.status(201).json({ token, user: { id: result.insertId, name, email, role: safeRole } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;
    const errors = validateLogin({ email, password });
    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join('; ') });
    }
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign(
      { id: user.id, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
}

module.exports = { register, login };
