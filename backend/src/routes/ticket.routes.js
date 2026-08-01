const express = require('express');
const router = express.Router();
const db = require('../config/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const uploadDir = path.join(__dirname, '../../../uploads/tickets');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// Get all tickets
router.get('/', authenticate, (req, res) => {
  let query = `SELECT t.*, c.company_name, c.contact_person, u.full_name as assigned_engineer 
               FROM tickets t 
               LEFT JOIN customers c ON t.customer_id = c.id
               LEFT JOIN users u ON t.assigned_engineer_id = u.id WHERE 1=1`;
  const params = [];

  if (req.user.role === 'customer') {
    db.get('SELECT id FROM customers WHERE user_id = ?', [req.user.id], (err, customer) => {
      if (err || !customer) return res.status(403).json({ success: false, message: 'Access denied' });
      query += ' AND t.customer_id = ?';
      params.push(customer.id);
      executeQuery();
    });
  } else if (req.user.role === 'support_user') {
    query += ' AND t.assigned_engineer_id = ?';
    params.push(req.user.id);
    executeQuery();
  } else {
    executeQuery();
  }

  function executeQuery() {
    db.all(query + ' ORDER BY t.created_at DESC', params, (err, rows) => {
      if (err) return res.status(500).json({ success: false, message: 'Database error' });
      res.json({ success: true, data: rows });
    });
  }
});

// Create ticket (Customer Portal)
router.post('/', authenticate, upload.fields([{ name: 'screenshot' }, { name: 'attachment' }]), (req, res) => {
  const { subject, description, priority, category } = req.body;
  const ticket_number = 'TKT' + Date.now();
  
  let customer_id;
  if (req.user.role === 'customer') {
    db.get('SELECT id FROM customers WHERE user_id = ?', [req.user.id], (err, customer) => {
      if (err || !customer) return res.status(403).json({ success: false, message: 'Access denied' });
      customer_id = customer.id;
      createTicket();
    });
  } else {
    customer_id = req.body.customer_id;
    createTicket();
  }

  function createTicket() {
    const screenshot_path = req.files?.screenshot?.[0]?.filename;
    const attachment_path = req.files?.attachment?.[0]?.filename;

    db.run(
      `INSERT INTO tickets (ticket_number, customer_id, subject, description, priority, category, 
       screenshot_path, attachment_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [ticket_number, customer_id, subject, description, priority || 'medium', category, screenshot_path, attachment_path],
      function(err) {
        if (err) return res.status(400).json({ success: false, message: 'Error creating ticket' });
        
        db.run(
          'INSERT INTO ticket_timeline (ticket_id, action, notes) VALUES (?, ?, ?)',
          [this.lastID, 'created', 'Ticket created']
        );

        res.status(201).json({ success: true, message: 'Ticket created', data: { id: this.lastID, ticket_number } });
      }
    );
  }
});

// Update ticket status
router.patch('/:id/status', authenticate, authorize('super_admin', 'support_user'), (req, res) => {
  const { status, notes } = req.body;
  
  db.run(
    'UPDATE tickets SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [status, req.params.id],
    (err) => {
      if (err) return res.status(400).json({ success: false, message: 'Error updating status' });
      
      db.run(
        'INSERT INTO ticket_timeline (ticket_id, user_id, action, notes) VALUES (?, ?, ?, ?)',
        [req.params.id, req.user.id, `status_changed_to_${status}`, notes]
      );

      res.json({ success: true, message: 'Status updated' });
    }
  );
});

// Assign ticket
router.patch('/:id/assign', authenticate, authorize('super_admin'), (req, res) => {
  const { engineer_id } = req.body;
  
  db.run(
    'UPDATE tickets SET assigned_engineer_id = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [engineer_id, 'assigned', req.params.id],
    (err) => {
      if (err) return res.status(400).json({ success: false, message: 'Error assigning ticket' });
      
      db.run(
        'INSERT INTO ticket_timeline (ticket_id, user_id, action, notes) VALUES (?, ?, ?, ?)',
        [req.params.id, req.user.id, 'assigned', `Assigned to engineer ID: ${engineer_id}`]
      );

      res.json({ success: true, message: 'Ticket assigned' });
    }
  );
});

// Add resolution
router.patch('/:id/resolve', authenticate, authorize('super_admin', 'support_user'), (req, res) => {
  const { resolution_notes } = req.body;
  
  db.run(
    'UPDATE tickets SET resolution_notes = ?, status = ?, resolved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [resolution_notes, 'resolved', req.params.id],
    (err) => {
      if (err) return res.status(400).json({ success: false, message: 'Error resolving ticket' });
      
      db.run(
        'INSERT INTO ticket_timeline (ticket_id, user_id, action, notes) VALUES (?, ?, ?, ?)',
        [req.params.id, req.user.id, 'resolved', resolution_notes]
      );

      res.json({ success: true, message: 'Ticket resolved' });
    }
  );
});

// Get ticket timeline
router.get('/:id/timeline', authenticate, (req, res) => {
  db.all(
    `SELECT tt.*, u.full_name as user_name FROM ticket_timeline tt
     LEFT JOIN users u ON tt.user_id = u.id
     WHERE tt.ticket_id = ? ORDER BY tt.created_at DESC`,
    [req.params.id],
    (err, rows) => {
      if (err) return res.status(500).json({ success: false, message: 'Database error' });
      res.json({ success: true, data: rows });
    }
  );
});

module.exports = router;
