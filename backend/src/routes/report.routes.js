const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// Sales Report
router.get('/sales', authenticate, authorize('super_admin', 'sales_user'), (req, res) => {
  const { start_date, end_date } = req.query;
  
  db.all(
    `SELECT l.status, COUNT(*) as count FROM leads l 
     WHERE l.created_at BETWEEN ? AND ? GROUP BY l.status`,
    [start_date || '2020-01-01', end_date || '2099-12-31'],
    (err, rows) => {
      if (err) return res.status(500).json({ success: false, message: 'Database error' });
      res.json({ success: true, data: rows });
    }
  );
});

// Lead Conversion Report
router.get('/lead-conversion', authenticate, authorize('super_admin'), (req, res) => {
  db.all(
    `SELECT u.full_name, 
     COUNT(CASE WHEN l.status = 'lead' THEN 1 END) as leads,
     COUNT(CASE WHEN l.status = 'prospect' THEN 1 END) as prospects,
     COUNT(CASE WHEN l.status = 'customer' THEN 1 END) as customers
     FROM leads l LEFT JOIN users u ON l.sales_executive_id = u.id
     GROUP BY u.id`,
    (err, rows) => {
      if (err) return res.status(500).json({ success: false, message: 'Database error' });
      res.json({ success: true, data: rows });
    }
  );
});

// Ticket Report
router.get('/tickets', authenticate, authorize('super_admin', 'support_user'), (req, res) => {
  db.all(
    `SELECT status, priority, COUNT(*) as count FROM tickets 
     GROUP BY status, priority`,
    (err, rows) => {
      if (err) return res.status(500).json({ success: false, message: 'Database error' });
      res.json({ success: true, data: rows });
    }
  );
});

// Revenue Report
router.get('/revenue', authenticate, authorize('super_admin'), (req, res) => {
  db.all(
    `SELECT to_char(invoice_date, 'YYYY-MM') as month, 
     SUM(amount) as total_amount, 
     SUM(paid_amount) as total_paid,
     SUM(balance_amount) as total_balance
     FROM transactions 
     WHERE transaction_type = 'invoice'
     GROUP BY month ORDER BY month DESC`,
    (err, rows) => {
      if (err) return res.status(500).json({ success: false, message: 'Database error' });
      res.json({ success: true, data: rows });
    }
  );
});

// Training Report
router.get('/training', authenticate, authorize('super_admin'), (req, res) => {
  db.all(
    `SELECT c.company_name, 
     COUNT(CASE WHEN ts.status = 'completed' THEN 1 END) as completed,
     COUNT(CASE WHEN ts.status = 'pending' THEN 1 END) as pending
     FROM training_schedule ts
     LEFT JOIN customers c ON ts.customer_id = c.id
     GROUP BY c.id`,
    (err, rows) => {
      if (err) return res.status(500).json({ success: false, message: 'Database error' });
      res.json({ success: true, data: rows });
    }
  );
});

module.exports = router;
