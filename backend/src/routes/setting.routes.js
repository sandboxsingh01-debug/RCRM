const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.get('/', authenticate, authorize('super_admin'), (req, res) => {
  db.all('SELECT * FROM settings', (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: 'Database error' });
    res.json({ success: true, data: rows });
  });
});

router.post('/', authenticate, authorize('super_admin'), (req, res) => {
  const { setting_key, setting_value, description } = req.body;
  
  db.run(
    `INSERT INTO settings (setting_key, setting_value, description, updated_at)
     VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
     ON CONFLICT (setting_key) DO UPDATE SET
       setting_value = EXCLUDED.setting_value,
       description = EXCLUDED.description,
       updated_at = EXCLUDED.updated_at`,
    [setting_key, setting_value, description],
    (err) => {
      if (err) return res.status(400).json({ success: false, message: 'Error updating setting' });
      res.json({ success: true, message: 'Setting updated' });
    }
  );
});

module.exports = router;
