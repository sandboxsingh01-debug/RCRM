const assert = require('assert');
const { newDb } = require('pg-mem');
const proxyquire = require('proxyquire');
const { seedDatabase } = require('./src/config/seed');

(async () => {
  const mem = newDb();
  const adapter = mem.adapters.createPg();
  const pool = new adapter.Pool();

  process.env.DATABASE_URL = 'postgres://mem';

  console.log('▶ Running seed against in-memory Postgres...');
  const memQuery = (text, params) => pool.query(text.replace(/DECIMAL\(\d+,\s*\d+\)/g, 'DECIMAL'), params);
  await seedDatabase(memQuery);

  const users = await pool.query('SELECT username, role FROM users ORDER BY id');
  assert.strictEqual(users.rows.length, 3, '3 default users');
  console.log('  ✅ users seeded:', users.rows.map(r => r.username).join(', '));

  const templates = await pool.query('SELECT count(*)::int AS n FROM whatsapp_templates');
  assert.ok(templates.rows[0].n >= 11, 'whatsapp templates seeded');
  console.log('  ✅ whatsapp_templates:', templates.rows[0].n);

  const settings = await pool.query("SELECT setting_value FROM settings WHERE setting_key = 'company_name'");
  assert.strictEqual(settings.rows[0].setting_value, 'My Software Company');
  console.log('  ✅ settings seeded');

  console.log('▶ Testing DB wrapper (SQLite → Postgres translation)...');
  const db = proxyquire('./src/config/database', { pg: adapter });
  await new Promise((resolve) => setTimeout(resolve, 50));

  await new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO leads (lead_id, company_name, contact_person, mobile) VALUES (?, ?, ?, ?)`,
      ['LD-test1', 'Acme Corp', 'Jane Doe', '9000000000'],
      function (err) {
        try {
          assert.ifError(err);
          assert.ok(this.lastID > 0, 'lastID set on insert');
          console.log('  ✅ db.run insert + lastID binding (id=' + this.lastID + ')');
          resolve();
        } catch (e) { reject(e); }
      }
    );
  });

  await new Promise((resolve, reject) => {
    db.get('SELECT COUNT(*) as total FROM leads WHERE status = "lead"', (err, row) => {
      try {
        assert.ifError(err);
        assert.strictEqual(row.total, 1, 'double-quote literal converted');
        console.log('  ✅ db.get + "literal" → \'literal\' conversion');
        resolve();
      } catch (e) { reject(e); }
    });
  });

  await new Promise((resolve, reject) => {
    db.all('SELECT id, lead_id FROM leads ORDER BY id', (err, rows) => {
      try {
        assert.ifError(err);
        assert.strictEqual(rows.length, 1);
        console.log('  ✅ db.all rows:', rows[0].lead_id);
        resolve();
      } catch (e) { reject(e); }
    });
  });

  await new Promise((resolve, reject) => {
    db.run('UPDATE leads SET status = ? WHERE id = ?', ['prospect', 1], function (err) {
      try {
        assert.ifError(err);
        assert.strictEqual(this.changes, 1, 'changes = 1 on update');
        console.log('  ✅ db.run update + this.changes binding');
        resolve();
      } catch (e) { reject(e); }
    });
  });

  await new Promise((resolve, reject) => {
    db.run('UPDATE leads SET status = ? WHERE id = ?', ['prospect', 9999], function (err) {
      try {
        assert.ifError(err);
        assert.strictEqual(this.changes, 0, 'changes = 0 when no row');
        console.log('  ✅ db.run changes = 0 for missing row');
        resolve();
      } catch (e) { reject(e); }
    });
  });

  // Transaction flow (lead → prospect conversion style)
  await new Promise((resolve, reject) => {
    db.run('BEGIN TRANSACTION');
    db.run(
      'INSERT INTO prospects (prospect_id, lead_id) VALUES (?, ?)',
      ['PR-test1', 1],
      function (err) {
        try {
          assert.ifError(err);
          db.run('UPDATE leads SET status = ?, converted_to_prospect_id = ? WHERE id = ?', ['prospect', this.lastID, 1]);
          db.run('COMMIT', (err2) => {
            try {
              assert.ifError(err2);
              console.log('  ✅ transaction (BEGIN → INSERT → UPDATE → COMMIT)');
              resolve();
            } catch (e) { reject(e); }
          });
        } catch (e) { reject(e); }
      }
    );
  });

  await new Promise((resolve, reject) => {
    db.all(
      'SELECT COUNT(*) as total FROM customers WHERE customer_status = "active"',
      (err, rows) => {
        try {
          assert.ifError(err);
          console.log('  ✅ dashboard-style double-quoted IN query (count=' + rows[0].total + ')');
          resolve();
        } catch (e) { reject(e); }
      }
    );
  });

  await new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO settings (setting_key, setting_value, description, updated_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT (setting_key) DO UPDATE SET
         setting_value = EXCLUDED.setting_value,
         description = EXCLUDED.description,
         updated_at = EXCLUDED.updated_at`,
      ['company_name', 'Updated Co', 'Company Name'],
      (err) => {
        try {
          assert.ifError(err);
          console.log('  ✅ settings upsert (ON CONFLICT DO UPDATE)');
          resolve();
        } catch (e) { reject(e); }
      }
    );
  });

  await new Promise((resolve, reject) => {
    db.all(
      `SELECT company_name, contact_person FROM customers
       WHERE amc_expiry BETWEEN CURRENT_DATE AND CURRENT_DATE + (?::int)
       ORDER BY amc_expiry ASC`,
      [30],
      (err, rows) => {
        try {
          assert.ifError(err);
          console.log('  ✅ CURRENT_DATE + interval query (rows=' + rows.length + ')');
          resolve();
        } catch (e) { reject(e); }
      }
    );
  });

  await new Promise((resolve, reject) => {
    db.get("SELECT * FROM users WHERE username = ? AND is_active = true", ['admin'], (err, row) => {
      try {
        assert.ifError(err);
        assert.strictEqual(row.role, 'super_admin');
        console.log('  ✅ login-style boolean query (is_active = true)');
        resolve();
      } catch (e) { reject(e); }
    });
  });

  console.log('\n🎉 All smoke tests passed!');
  process.exit(0);
})().catch((err) => {
  console.error('\n❌ Smoke test FAILED:', err);
  process.exit(1);
});
