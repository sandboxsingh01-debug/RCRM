const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { auditLog } = require('../middleware/audit.middleware');
const {
  notifyNewCustomerTrainingSchedule,
  notifyCustomerStatusChange
} = require('../services/whatsapp.service');

// List all customers (with optional search/filter)
router.get('/', authenticate, (req, res) => {
  const { search, status, executive_id } = req.query;
  let query = `SELECT c.*, u.full_name AS executive_name
               FROM customers c
               LEFT JOIN users u ON c.assigned_executive_id = u.id
               WHERE 1=1`;
  const params = [];

  if (search) {
    query += ' AND (c.company_name LIKE ? OR c.contact_person LIKE ? OR c.mobile LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (status) { query += ' AND c.customer_status = ?'; params.push(status); }
  if (executive_id) { query += ' AND c.assigned_executive_id = ?'; params.push(executive_id); }
  if (req.user.role === 'sales_user') {
    query += ' AND c.assigned_executive_id = ?';
    params.push(req.user.id);
  }

  db.all(query + ' ORDER BY c.created_at DESC', params, (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: 'Database error' });
    res.json({ success: true, data: rows });
  });
});

// Get single customer with full details
router.get('/:id', authenticate, (req, res) => {
  db.get(
    `SELECT c.*, u.full_name AS executive_name FROM customers c
     LEFT JOIN users u ON c.assigned_executive_id = u.id WHERE c.id = ?`,
    [req.params.id],
    (err, row) => {
      if (err) return res.status(500).json({ success: false, message: 'Database error' });
      if (!row) return res.status(404).json({ success: false, message: 'Customer not found' });
      res.json({ success: true, data: row });
    }
  );
});

// Create customer manually
router.post('/', authenticate, authorize('super_admin', 'sales_user'), auditLog('customers'), (req, res) => {
  const {
    company_name, contact_person, mobile, whatsapp_number, email,
    gst_number, billing_address, city, state, software_purchased,
    purchase_date, license_expiry, amc_expiry, assigned_executive_id
  } = req.body;

  const customer_id = 'CUST' + Date.now();
  const exec_id = req.user.role === 'sales_user' ? req.user.id : assigned_executive_id;

  db.run(
    `INSERT INTO customers (customer_id, company_name, contact_person, mobile, whatsapp_number, email,
     gst_number, billing_address, city, state, software_purchased, purchase_date, license_expiry,
     amc_expiry, assigned_executive_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [customer_id, company_name, contact_person, mobile, whatsapp_number, email,
     gst_number, billing_address, city, state, software_purchased, purchase_date,
     license_expiry, amc_expiry, exec_id],
    function (err) {
      if (err) return res.status(400).json({ success: false, message: 'Error creating customer', error: err.message });

      const newId = this.lastID;
      // Auto-create training schedule
      const trainings = [
        [newId, 1, 'SOFTWARE OVERVIEW'],
        [newId, 2, 'BASIC TRAINING (SALE & PURCHASE)'],
        [newId, 3, 'ACCOUNTANCY'],
        [newId, 4, 'GST TRAINING'],
        [newId, 5, 'REPORTING TRAINING']
      ];
      trainings.forEach(([customerId, day, title]) => {
        db.run(
          'INSERT INTO training_schedule (customer_id, day_number, training_title) VALUES (?, ?, ?)',
          [customerId, day, title]
        );
      });

      notifyNewCustomerTrainingSchedule(newId, req.user.id).catch(err =>
        console.error('WhatsApp training schedule notification failed:', err.message)
      );

      res.status(201).json({ success: true, message: 'Customer created', data: { id: newId, customer_id } });
    }
  );
});

// Update customer
router.put('/:id', authenticate, authorize('super_admin', 'sales_user'), auditLog('customers'), (req, res) => {
  const allowed = ['company_name','contact_person','mobile','whatsapp_number','email','gst_number',
                   'billing_address','city','state','software_purchased','purchase_date',
                   'license_expiry','amc_expiry','assigned_executive_id','customer_status'];
  const fields = Object.keys(req.body).filter(k => allowed.includes(k));
  if (!fields.length) return res.status(400).json({ success: false, message: 'No valid fields to update' });

  const setClauses = fields.map(f => `${f} = ?`).join(', ');
  const values = [...fields.map(f => req.body[f]), req.params.id];
  const statusChanging = fields.includes('customer_status');

  const applyUpdate = (oldStatus) => {
    db.run(`UPDATE customers SET ${setClauses}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, values, function (err) {
      if (err) return res.status(400).json({ success: false, message: 'Error updating customer' });
      if (this.changes === 0) return res.status(404).json({ success: false, message: 'Customer not found' });

      if (statusChanging && req.body.customer_status !== oldStatus) {
        notifyCustomerStatusChange(req.params.id, req.body.customer_status, req.user.id).catch(err =>
          console.error('WhatsApp status notification failed:', err.message)
        );
      }

      res.json({ success: true, message: 'Customer updated', data: { id: req.params.id } });
    });
  };

  if (statusChanging) {
    db.get('SELECT customer_status FROM customers WHERE id = ?', [req.params.id], (err, row) => {
      if (err) return res.status(500).json({ success: false, message: 'Database error' });
      if (!row) return res.status(404).json({ success: false, message: 'Customer not found' });
      applyUpdate(row.customer_status);
    });
  } else {
    applyUpdate(null);
  }
});

// Delete customer (super admin only)
router.delete('/:id', authenticate, authorize('super_admin'), (req, res) => {
  db.run('DELETE FROM customers WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(400).json({ success: false, message: 'Error deleting customer' });
    if (this.changes === 0) return res.status(404).json({ success: false, message: 'Customer not found' });
    res.json({ success: true, message: 'Customer deleted' });
  });
});

// Get customer AMC / license expiry alerts
router.get('/alerts/expiry', authenticate, authorize('super_admin'), (req, res) => {
  const { days = 30 } = req.query;
  const daysNum = parseInt(days, 10) || 0;
  db.all(
    `SELECT company_name, contact_person, mobile, amc_expiry, license_expiry
     FROM customers
     WHERE amc_expiry BETWEEN CURRENT_DATE AND CURRENT_DATE + (?::int)
        OR license_expiry BETWEEN CURRENT_DATE AND CURRENT_DATE + (?::int)
     ORDER BY amc_expiry ASC`,
    [daysNum, daysNum],
    (err, rows) => {
      if (err) return res.status(500).json({ success: false, message: 'Database error' });
      res.json({ success: true, data: rows });
    }
  );
});

module.exports = router;
