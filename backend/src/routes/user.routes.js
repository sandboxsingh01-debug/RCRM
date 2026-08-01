const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// List all users
router.get('/', authenticate, authorize('super_admin'), (req, res) => {
  db.all(
    'SELECT id, username, email, full_name, mobile, role, department, is_active, last_login, created_at FROM users ORDER BY created_at DESC',
    (err, rows) => {
      if (err) return res.status(500).json({ success: false, message: 'Database error' });
      res.json({ success: true, data: rows });
    }
  );
});

// Get single user
router.get('/:id', authenticate, authorize('super_admin'), (req, res) => {
  db.get(
    'SELECT id, username, email, full_name, mobile, role, department, is_active FROM users WHERE id = ?',
    [req.params.id],
    (err, row) => {
      if (err) return res.status(500).json({ success: false, message: 'Database error' });
      if (!row) return res.status(404).json({ success: false, message: 'User not found' });
      res.json({ success: true, data: row });
    }
  );
});

// Create user
router.post('/', authenticate, authorize('super_admin'), (req, res) => {
  const { username, email, password, full_name, mobile, role, department } = req.body;
  if (!username || !email || !password || !full_name || !role) {
    return res.status(400).json({ success: false, message: 'username, email, password, full_name and role are required' });
  }

  bcrypt.hash(password, 10, (err, hash) => {
    if (err) return res.status(500).json({ success: false, message: 'Error hashing password' });

    db.run(
      `INSERT INTO users (username, email, password_hash, full_name, mobile, role, department)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [username, email, hash, full_name, mobile, role, department],
      function (err) {
        if (err) return res.status(400).json({ success: false, message: 'Username or email already exists' });
        res.status(201).json({ success: true, message: 'User created', data: { id: this.lastID } });
      }
    );
  });
});

// Update user
router.put('/:id', authenticate, authorize('super_admin'), (req, res) => {
  const { full_name, email, mobile, department, role } = req.body;
  db.run(
    'UPDATE users SET full_name=?, email=?, mobile=?, department=?, role=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
    [full_name, email, mobile, department, role, req.params.id],
    function (err) {
      if (err) return res.status(400).json({ success: false, message: 'Error updating user' });
      res.json({ success: true, message: 'User updated' });
    }
  );
});

// Reset password
router.patch('/:id/reset-password', authenticate, authorize('super_admin'), (req, res) => {
  const { new_password } = req.body;
  if (!new_password) return res.status(400).json({ success: false, message: 'new_password is required' });

  bcrypt.hash(new_password, 10, (err, hash) => {
    if (err) return res.status(500).json({ success: false, message: 'Error hashing password' });
    db.run('UPDATE users SET password_hash=? WHERE id=?', [hash, req.params.id], (err) => {
      if (err) return res.status(400).json({ success: false, message: 'Error resetting password' });
      res.json({ success: true, message: 'Password reset successfully' });
    });
  });
});

// Toggle active/inactive
router.patch('/:id/toggle', authenticate, authorize('super_admin'), (req, res) => {
  db.run('UPDATE users SET is_active = NOT is_active WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(400).json({ success: false, message: 'Error toggling user' });
    res.json({ success: true, message: 'User status toggled' });
  });
});

// Delete user
router.delete('/:id', authenticate, authorize('super_admin'), (req, res) => {
  if (parseInt(req.params.id) === req.user.id) {
    return res.status(400).json({ success: false, message: 'Cannot delete your own account' });
  }
  db.run('DELETE FROM users WHERE id=?', [req.params.id], function (err) {
    if (err) return res.status(400).json({ success: false, message: 'Error deleting user' });
    res.json({ success: true, message: 'User deleted' });
  });
});

module.exports = router;
