const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticate } = require('../middleware/auth.middleware');
const { notifyTrainingStatusChange } = require('../services/whatsapp.service');

router.get('/customer/:customerId', authenticate, (req, res) => {
  db.all('SELECT * FROM training_schedule WHERE customer_id = ? ORDER BY day_number',
    [req.params.customerId], (err, rows) => {
      if (err) return res.status(500).json({ success: false, message: 'Database error' });
      res.json({ success: true, data: rows });
    }
  );
});

router.patch('/:id/status', authenticate, (req, res) => {
  const { status, scheduled_date, trainer_id } = req.body;
  const allowed = ['pending', 'scheduled', 'completed', 'skipped'];
  if (!status || !allowed.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status' });
  }

  const query = `UPDATE training_schedule SET status = ?, scheduled_date = COALESCE(?, scheduled_date),
    trainer_id = COALESCE(?, trainer_id), completed_date = ${status === 'completed' ? 'CURRENT_DATE' : 'completed_date'},
    updated_at = CURRENT_TIMESTAMP WHERE id = ?`;

  db.run(query, [status, scheduled_date || null, trainer_id || null, req.params.id], function (err) {
    if (err) return res.status(400).json({ success: false, message: 'Error updating training' });
    if (this.changes === 0) return res.status(404).json({ success: false, message: 'Training not found' });

    notifyTrainingStatusChange(req.params.id, status, req.user.id).catch(e =>
      console.error('WhatsApp training status notification failed:', e.message)
    );

    res.json({ success: true, message: 'Training status updated' });
  });
});

router.patch('/:id/complete', authenticate, (req, res) => {
  const { trainer_id, customer_feedback, notes } = req.body;
  db.run(
    'UPDATE training_schedule SET status = ?, completed_date = CURRENT_DATE, trainer_id = ?, customer_feedback = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    ['completed', trainer_id, customer_feedback, notes, req.params.id],
    function (err) {
      if (err) return res.status(400).json({ success: false, message: 'Error updating training' });
      if (this.changes === 0) return res.status(404).json({ success: false, message: 'Training not found' });

      notifyTrainingStatusChange(req.params.id, 'completed', req.user.id).catch(e =>
        console.error('WhatsApp training completion notification failed:', e.message)
      );

      res.json({ success: true, message: 'Training marked as completed' });
    }
  );
});

module.exports = router;
