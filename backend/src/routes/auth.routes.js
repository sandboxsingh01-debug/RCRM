const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth.middleware');

// Login
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  db.get('SELECT * FROM users WHERE username = ? AND is_active = true', [username], async (err, user) => {
    if (err) return res.status(500).json({ success: false, message: 'Database error' });
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    db.run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

    res.json({
      success: true,
      token,
      user: { id: user.id, username: user.username, full_name: user.full_name, role: user.role }
    });
  });
});

// Register (Super Admin only)
router.post('/register', authenticate, (req, res) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }

  const { username, email, password, full_name, mobile, role, department } = req.body;

  bcrypt.hash(password, 10, (err, hash) => {
    if (err) return res.status(500).json({ success: false, message: 'Error hashing password' });

    db.run(
      `INSERT INTO users (username, email, password_hash, full_name, mobile, role, department)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [username, email, hash, full_name, mobile, role, department],
      function(err) {
        if (err) return res.status(400).json({ success: false, message: 'User already exists or invalid data' });
        res.status(201).json({ success: true, message: 'User created', userId: this.lastID });
      }
    );
  });
});

// Get current user
router.get('/me', authenticate, (req, res) => {
  db.get('SELECT id, username, email, full_name, mobile, role, department FROM users WHERE id = ?',
    [req.user.id],
    (err, user) => {
      if (err) return res.status(500).json({ success: false, message: 'Database error' });
      res.json({ success: true, data: user });
    }
  );
});

module.exports = router;
