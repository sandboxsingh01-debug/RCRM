const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// List transactions
router.get('/', authenticate, (req, res) => {
  const { customer_id, payment_status, type } = req.query;
  let query = `SELECT t.*, c.company_name, c.contact_person FROM transactions t
               LEFT JOIN customers c ON t.customer_id = c.id WHERE 1=1`;
  const params = [];

  if (customer_id) { query += ' AND t.customer_id = ?'; params.push(customer_id); }
  if (payment_status) { query += ' AND t.payment_status = ?'; params.push(payment_status); }
  if (type) { query += ' AND t.transaction_type = ?'; params.push(type); }

  db.all(query + ' ORDER BY t.created_at DESC', params, (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: 'Database error' });
    res.json({ success: true, data: rows });
  });
});

// Get single transaction
router.get('/:id', authenticate, (req, res) => {
  db.get(
    'SELECT t.*, c.company_name FROM transactions t LEFT JOIN customers c ON t.customer_id=c.id WHERE t.id=?',
    [req.params.id],
    (err, row) => {
      if (err) return res.status(500).json({ success: false, message: 'Database error' });
      if (!row) return res.status(404).json({ success: false, message: 'Transaction not found' });
      res.json({ success: true, data: row });
    }
  );
});

// Create transaction (quotation/invoice)
router.post('/', authenticate, authorize('super_admin', 'sales_user'), (req, res) => {
  const { customer_id, transaction_type, invoice_number, invoice_date, amount, due_date, description } = req.body;
  if (!customer_id || !transaction_type || !amount) {
    return res.status(400).json({ success: false, message: 'customer_id, transaction_type and amount are required' });
  }

  const transaction_id = 'TXN' + Date.now();
  db.run(
    `INSERT INTO transactions (transaction_id, customer_id, transaction_type, invoice_number,
     invoice_date, amount, paid_amount, balance_amount, due_date, description)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
    [transaction_id, customer_id, transaction_type, invoice_number, invoice_date,
     amount, amount, due_date, description],
    function (err) {
      if (err) return res.status(400).json({ success: false, message: 'Error creating transaction', error: err.message });
      res.status(201).json({ success: true, data: { id: this.lastID, transaction_id } });
    }
  );
});

// Record a payment against an invoice
router.post('/:id/payment', authenticate, authorize('super_admin', 'sales_user'), (req, res) => {
  const { payment_amount } = req.body;
  if (!payment_amount || payment_amount <= 0) {
    return res.status(400).json({ success: false, message: 'Valid payment_amount is required' });
  }

  db.get('SELECT * FROM transactions WHERE id = ?', [req.params.id], (err, txn) => {
    if (err || !txn) return res.status(404).json({ success: false, message: 'Transaction not found' });

    const newPaid = parseFloat(txn.paid_amount) + parseFloat(payment_amount);
    const newBalance = parseFloat(txn.amount) - newPaid;
    const newStatus = newBalance <= 0 ? 'paid' : 'partially_paid';

    db.run(
      `UPDATE transactions SET paid_amount=?, balance_amount=?, payment_status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
      [newPaid, Math.max(newBalance, 0), newStatus, req.params.id],
      (err) => {
        if (err) return res.status(400).json({ success: false, message: 'Error recording payment' });
        res.json({ success: true, message: 'Payment recorded', data: { paid: newPaid, balance: Math.max(newBalance, 0), status: newStatus } });
      }
    );
  });
});

// Update transaction
router.put('/:id', authenticate, authorize('super_admin'), (req, res) => {
  const { invoice_number, invoice_date, amount, due_date, description } = req.body;
  db.run(
    'UPDATE transactions SET invoice_number=?, invoice_date=?, amount=?, balance_amount=?, due_date=?, description=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
    [invoice_number, invoice_date, amount, amount, due_date, description, req.params.id],
    function (err) {
      if (err) return res.status(400).json({ success: false, message: 'Error updating transaction' });
      res.json({ success: true, message: 'Transaction updated' });
    }
  );
});

// Delete transaction
router.delete('/:id', authenticate, authorize('super_admin'), (req, res) => {
  db.run('DELETE FROM transactions WHERE id=?', [req.params.id], function (err) {
    if (err) return res.status(400).json({ success: false, message: 'Error deleting transaction' });
    res.json({ success: true, message: 'Transaction deleted' });
  });
});

module.exports = router;
