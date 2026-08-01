const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticate } = require('../middleware/auth.middleware');

router.post('/', authenticate, (req, res) => {
  const { customer_id, communication_type, subject, message } = req.body;
  
  db.run(
    'INSERT INTO communications (customer_id, communication_type, subject, message, user_id) VALUES (?, ?, ?, ?, ?)',
    [customer_id, communication_type, subject, message, req.user.id],
    function(err) {
      if (err) return res.status(400).json({ success: false, message: 'Error creating communication' });
      res.status(201).json({ success: true, data: { id: this.lastID } });
    }
  );
});

router.get('/customer/:customerId', authenticate, (req, res) => {
  db.all(
    'SELECT c.*, u.full_name as user_name FROM communications c LEFT JOIN users u ON c.user_id = u.id WHERE c.customer_id = ? ORDER BY c.created_at DESC',
    [req.params.customerId],
    (err, rows) => {
      if (err) return res.status(500).json({ success: false, message: 'Database error' });
      res.json({ success: true, data: rows });
    }
  );
});

module.exports = router;
