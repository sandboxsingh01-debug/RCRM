const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// Admin Dashboard
router.get('/admin', authenticate, authorize('super_admin'), (req, res) => {
  const stats = {};

  db.get('SELECT COUNT(*) as total FROM leads WHERE status = "lead"', (err, row) => {
    stats.total_leads = row?.total || 0;

    db.get('SELECT COUNT(*) as total FROM leads WHERE status = "prospect"', (err, row) => {
      stats.total_prospects = row?.total || 0;

      db.get('SELECT COUNT(*) as total FROM customers WHERE customer_status = "active"', (err, row) => {
        stats.total_customers = row?.total || 0;

        db.get('SELECT COUNT(*) as total FROM tickets WHERE status IN ("open", "assigned", "in_progress")', (err, row) => {
          stats.pending_tickets = row?.total || 0;

          db.get('SELECT COUNT(*) as total FROM tickets WHERE status = "resolved"', (err, row) => {
            stats.resolved_tickets = row?.total || 0;

            db.get('SELECT COUNT(*) as total FROM training_schedule WHERE status = "pending"', (err, row) => {
              stats.pending_training = row?.total || 0;

              db.get('SELECT SUM(amount) as total FROM transactions WHERE payment_status = "paid"', (err, row) => {
                stats.total_revenue = row?.total || 0;

                db.get('SELECT SUM(balance_amount) as total FROM transactions WHERE payment_status IN ("pending", "partially_paid")', (err, row) => {
                  stats.outstanding_amount = row?.total || 0;

                  // Sales funnel
                  db.all(`SELECT status, COUNT(*) as count FROM leads GROUP BY status`, (err, funnel) => {
                    stats.sales_funnel = funnel || [];

                    // Recent tickets
                    db.all(`SELECT t.*, c.company_name FROM tickets t 
                            LEFT JOIN customers c ON t.customer_id = c.id 
                            ORDER BY t.created_at DESC LIMIT 5`, (err, tickets) => {
                      stats.recent_tickets = tickets || [];

                      // AMC expiring soon
                      db.all(`SELECT * FROM customers 
                              WHERE amc_expiry BETWEEN date('now') AND date('now', '+30 days')
                              ORDER BY amc_expiry ASC`, (err, expiring) => {
                        stats.amc_expiring_soon = expiring || [];

                        res.json({ success: true, data: stats });
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });
});

// Sales Dashboard
router.get('/sales', authenticate, authorize('sales_user'), (req, res) => {
  const stats = {};
  const userId = req.user.id;

  db.get('SELECT COUNT(*) as total FROM leads WHERE sales_executive_id = ? AND status = "lead"', [userId], (err, row) => {
    stats.my_leads = row?.total || 0;

    db.get('SELECT COUNT(*) as total FROM leads WHERE sales_executive_id = ? AND status = "prospect"', [userId], (err, row) => {
      stats.my_prospects = row?.total || 0;

      db.get('SELECT COUNT(*) as total FROM customers WHERE assigned_executive_id = ?', [userId], (err, row) => {
        stats.my_customers = row?.total || 0;

        db.all(`SELECT * FROM leads WHERE sales_executive_id = ? 
                AND follow_up_date = date('now') ORDER BY follow_up_date`, [userId], (err, followups) => {
          stats.today_followups = followups || [];

          res.json({ success: true, data: stats });
        });
      });
    });
  });
});

// Support Dashboard
router.get('/support', authenticate, authorize('support_user'), (req, res) => {
  const stats = {};
  const userId = req.user.id;

  db.get('SELECT COUNT(*) as total FROM tickets WHERE assigned_engineer_id = ? AND status IN ("assigned", "in_progress")', [userId], (err, row) => {
    stats.my_open_tickets = row?.total || 0;

    db.get('SELECT COUNT(*) as total FROM tickets WHERE assigned_engineer_id = ? AND status = "resolved"', [userId], (err, row) => {
      stats.my_resolved_tickets = row?.total || 0;

      db.all(`SELECT t.*, c.company_name FROM tickets t
              LEFT JOIN customers c ON t.customer_id = c.id
              WHERE t.assigned_engineer_id = ? AND t.status IN ('assigned', 'in_progress')
              ORDER BY t.priority DESC, t.created_at ASC`, [userId], (err, tickets) => {
        stats.my_tickets = tickets || [];

        res.json({ success: true, data: stats });
      });
    });
  });
});

// Customer Dashboard
router.get('/customer', authenticate, authorize('customer'), (req, res) => {
  db.get('SELECT id FROM customers WHERE user_id = ?', [req.user.id], (err, customer) => {
    if (err || !customer) return res.status(404).json({ success: false, message: 'Customer not found' });

    const stats = {};

    db.get('SELECT * FROM customers WHERE id = ?', [customer.id], (err, row) => {
      stats.profile = row;

      db.all('SELECT * FROM tickets WHERE customer_id = ? ORDER BY created_at DESC LIMIT 5', [customer.id], (err, tickets) => {
        stats.recent_tickets = tickets || [];

        db.all('SELECT * FROM training_schedule WHERE customer_id = ? ORDER BY day_number', [customer.id], (err, training) => {
          stats.training_schedule = training || [];

          db.all('SELECT * FROM transactions WHERE customer_id = ? ORDER BY created_at DESC LIMIT 5', [customer.id], (err, transactions) => {
            stats.recent_transactions = transactions || [];

            res.json({ success: true, data: stats });
          });
        });
      });
    });
  });
});

module.exports = router;
