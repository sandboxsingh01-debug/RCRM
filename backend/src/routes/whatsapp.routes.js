const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { sendWhatsApp } = require('../services/whatsapp.service');

router.post('/send', authenticate, async (req, res) => {
  const { customer_id, mobile_number, message, template_id } = req.body;
  if (!mobile_number || !message) {
    return res.status(400).json({ success: false, message: 'Mobile number and message are required' });
  }

  try {
    const result = await sendWhatsApp({
      customerId: customer_id,
      mobileNumber: mobile_number,
      message,
      templateId: template_id,
      sentBy: req.user.id
    });
    res.json({ success: true, message: 'WhatsApp message sent', data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: 'Error sending WhatsApp message', error: err.message });
  }
});

// Get templates
router.get('/templates', authenticate, (req, res) => {
  db.all('SELECT * FROM whatsapp_templates WHERE is_active = true', (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: 'Database error' });
    res.json({ success: true, data: rows });
  });
});

// Create template
router.post('/templates', authenticate, authorize('super_admin'), (req, res) => {
  const { template_name, template_code, message_template, category } = req.body;
  
  db.run(
    'INSERT INTO whatsapp_templates (template_name, template_code, message_template, category) VALUES (?, ?, ?, ?)',
    [template_name, template_code, message_template, category],
    function(err) {
      if (err) return res.status(400).json({ success: false, message: 'Error creating template' });
      res.status(201).json({ success: true, data: { id: this.lastID } });
    }
  );
});

// Get logs
router.get('/logs', authenticate, (req, res) => {
  db.all(
    'SELECT w.*, c.company_name, u.full_name as sent_by_name FROM whatsapp_logs w LEFT JOIN customers c ON w.customer_id = c.id LEFT JOIN users u ON w.sent_by = u.id ORDER BY w.created_at DESC LIMIT 100',
    (err, rows) => {
      if (err) return res.status(500).json({ success: false, message: 'Database error' });
      res.json({ success: true, data: rows });
    }
  );
});

module.exports = router;
