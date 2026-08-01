const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticate } = require('../middleware/auth.middleware');
const { notifyNewCustomerTrainingSchedule } = require('../services/whatsapp.service');

router.get('/', authenticate, (req, res) => {
  db.all('SELECT p.*, l.company_name FROM prospects p LEFT JOIN leads l ON p.lead_id = l.id ORDER BY p.created_at DESC',
    (err, rows) => {
      if (err) return res.status(500).json({ success: false, message: 'Database error' });
      res.json({ success: true, data: rows });
    }
  );
});

router.post('/:id/convert-to-customer', authenticate, (req, res) => {
  const { software_purchased, purchase_date, license_expiry, amc_expiry } = req.body;
  const customer_id = 'CUST' + Date.now();

  db.get('SELECT l.* FROM prospects p JOIN leads l ON p.lead_id = l.id WHERE p.id = ?', [req.params.id], (err, lead) => {
    if (err || !lead) return res.status(404).json({ success: false, message: 'Prospect not found' });

    db.run('BEGIN TRANSACTION');
    
    db.run(
      `INSERT INTO customers (customer_id, company_name, contact_person, mobile, whatsapp_number, email, 
       gst_number, billing_address, city, state, software_purchased, purchase_date, license_expiry, 
       amc_expiry, assigned_executive_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [customer_id, lead.company_name, lead.contact_person, lead.mobile, lead.whatsapp_number, lead.email,
       lead.gst_number, lead.address, lead.city, lead.state, software_purchased, purchase_date, 
       license_expiry, amc_expiry, lead.sales_executive_id],
      function(err) {
        if (err) {
          db.run('ROLLBACK');
          return res.status(400).json({ success: false, message: 'Error creating customer' });
        }

        const newCustomerId = this.lastID;

        // Create training schedule
        const trainings = [
          [newCustomerId, 1, 'SOFTWARE OVERVIEW'],
          [newCustomerId, 2, 'BASIC TRAINING (SALE & PURCHASE)'],
          [newCustomerId, 3, 'ACCOUNTANCY'],
          [newCustomerId, 4, 'GST TRAINING'],
          [newCustomerId, 5, 'REPORTING TRAINING']
        ];

        trainings.forEach(t => {
          db.run('INSERT INTO training_schedule (customer_id, day_number, training_title) VALUES (?, ?, ?)', t);
        });

        db.run('UPDATE prospects SET status = ?, converted_to_customer_id = ? WHERE id = ?',
          ['converted', newCustomerId, req.params.id]);
        db.run('UPDATE leads SET status = ? WHERE id = ?', ['customer', lead.id]);

        db.run('COMMIT');

        notifyNewCustomerTrainingSchedule(newCustomerId, req.user.id).catch(err =>
          console.error('WhatsApp training schedule notification failed:', err.message)
        );

        res.json({ success: true, message: 'Prospect converted to customer', data: { customer_id } });
      }
    );
  });
});

module.exports = router;
