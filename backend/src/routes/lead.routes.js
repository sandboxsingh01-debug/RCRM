const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { auditLog } = require('../middleware/audit.middleware');

// Get all leads
router.get('/', authenticate, (req, res) => {
  const { status, sales_executive_id } = req.query;
  let query = 'SELECT l.*, u.full_name as sales_executive_name FROM leads l LEFT JOIN users u ON l.sales_executive_id = u.id WHERE 1=1';
  const params = [];

  if (status) { query += ' AND l.status = ?'; params.push(status); }
  if (sales_executive_id) { query += ' AND l.sales_executive_id = ?'; params.push(sales_executive_id); }
  if (req.user.role === 'sales_user') { query += ' AND l.sales_executive_id = ?'; params.push(req.user.id); }

  db.all(query + ' ORDER BY l.created_at DESC', params, (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: 'Database error' });
    res.json({ success: true, data: rows });
  });
});

// Get single lead
router.get('/:id', authenticate, (req, res) => {
  db.get('SELECT l.*, u.full_name as sales_executive_name FROM leads l LEFT JOIN users u ON l.sales_executive_id = u.id WHERE l.id = ?',
    [req.params.id],
    (err, row) => {
      if (err) return res.status(500).json({ success: false, message: 'Database error' });
      if (!row) return res.status(404).json({ success: false, message: 'Lead not found' });
      res.json({ success: true, data: row });
    }
  );
});

// Create lead
router.post('/', authenticate, authorize('super_admin', 'sales_user'), auditLog('leads'), (req, res) => {
  const { company_name, contact_person, mobile, whatsapp_number, email, address, city, state, 
          gst_number, industry_type, lead_source, follow_up_date, notes } = req.body;
  
  const lead_id = 'LD' + Date.now();
  const sales_executive_id = req.user.role === 'sales_user' ? req.user.id : req.body.sales_executive_id;

  db.run(
    `INSERT INTO leads (lead_id, company_name, contact_person, mobile, whatsapp_number, email, 
     address, city, state, gst_number, industry_type, lead_source, sales_executive_id, 
     follow_up_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [lead_id, company_name, contact_person, mobile, whatsapp_number, email, address, city, state,
     gst_number, industry_type, lead_source, sales_executive_id, follow_up_date, notes],
    function(err) {
      if (err) return res.status(400).json({ success: false, message: 'Error creating lead' });
      res.status(201).json({ success: true, message: 'Lead created', data: { id: this.lastID, lead_id } });
    }
  );
});

// Update lead
router.put('/:id', authenticate, authorize('super_admin', 'sales_user'), auditLog('leads'), (req, res) => {
  const fields = Object.keys(req.body).map(key => `${key} = ?`).join(', ');
  const values = [...Object.values(req.body), req.params.id];

  db.run(`UPDATE leads SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, values, (err) => {
    if (err) return res.status(400).json({ success: false, message: 'Error updating lead' });
    res.json({ success: true, message: 'Lead updated', data: { id: req.params.id } });
  });
});

// Convert to prospect
router.post('/:id/convert-to-prospect', authenticate, authorize('super_admin', 'sales_user'), (req, res) => {
  const { interested_products, demo_date, proposal_date, expected_closing_date } = req.body;
  const prospect_id = 'PR' + Date.now();

  db.run('BEGIN TRANSACTION');
  
  db.run(
    `INSERT INTO prospects (prospect_id, lead_id, interested_products, demo_date, proposal_date, expected_closing_date)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [prospect_id, req.params.id, interested_products, demo_date, proposal_date, expected_closing_date],
    function(err) {
      if (err) {
        db.run('ROLLBACK');
        return res.status(400).json({ success: false, message: 'Error creating prospect' });
      }

      db.run(
        'UPDATE leads SET status = ?, converted_to_prospect_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['prospect', this.lastID, req.params.id],
        (err) => {
          if (err) {
            db.run('ROLLBACK');
            return res.status(400).json({ success: false, message: 'Error updating lead' });
          }
          db.run('COMMIT');
          res.json({ success: true, message: 'Lead converted to prospect', data: { prospect_id } });
        }
      );
    }
  );
});

// Delete lead
router.delete('/:id', authenticate, authorize('super_admin'), (req, res) => {
  db.run('DELETE FROM leads WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(400).json({ success: false, message: 'Error deleting lead' });
    res.json({ success: true, message: 'Lead deleted' });
  });
});

module.exports = router;
