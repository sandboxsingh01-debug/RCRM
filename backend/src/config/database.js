const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL is not set.');
  console.error('   Add it to backend/.env — e.g. from Neon (https://neon.tech).');
  process.exit(1);
}

// max: 1 keeps a single connection so BEGIN/COMMIT transactions work like SQLite did
const pool = new Pool({
  connectionString,
  max: 1,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

pool.on('error', (err) => {
  console.error('⚠️ PostgreSQL pool error:', err.message);
});

// Convert SQLite "?" placeholders to Postgres "$1, $2, ..."
// Also convert SQLite-style double-quoted string literals ("lead") to Postgres 'lead'
function toPostgres(sql, params) {
  let i = 0;
  const text = sql
    .replace(/\?/g, () => `$${++i}`)
    .replace(/"([A-Za-z_][A-Za-z0-9_]*)"/g, "'$1'");
  return { text, values: params || [] };
}

function normalizeArgs(params, cb) {
  if (typeof params === 'function') return { params: [], cb: params };
  return { params: params || [], cb };
}

// db.run(sql, [params], callback) — callback bound with this.lastID / this.changes
function run(sql, params, cb) {
  const { params: values, cb: callback } = normalizeArgs(params, cb);
  const query = toPostgres(sql, values);
  const isInsert = /^\s*insert\s/i.test(query.text);
  if (isInsert) query.text += ' RETURNING id';

  pool.query(query)
    .then((result) => {
      const context = {
        lastID: isInsert && result.rows && result.rows[0] ? result.rows[0].id : 0,
        changes: result.rowCount || 0
      };
      if (callback) callback.call(context, null);
    })
    .catch((err) => {
      if (callback) callback.call({ lastID: 0, changes: 0 }, err);
    });
}

// db.get(sql, [params], callback) — first row
function get(sql, params, cb) {
  const { params: values, cb: callback } = normalizeArgs(params, cb);
  pool.query(toPostgres(sql, values))
    .then((result) => callback(null, result.rows[0]))
    .catch((err) => callback(err));
}

// db.all(sql, [params], callback) — all rows
function all(sql, params, cb) {
  const { params: values, cb: callback } = normalizeArgs(params, cb);
  pool.query(toPostgres(sql, values))
    .then((result) => callback(null, result.rows))
    .catch((err) => callback(err));
}

// Seed extra WhatsApp templates (idempotent, Postgres style)
const EXTRA_TEMPLATES = [
  ['new_customer_training', 'NEW_CUST_TRAIN', 'Dear {customer_name},\n\nWelcome! Your onboarding training schedule for {company_name} ({software_purchased}):\n\n{training_schedule}\n\nOur team will contact you to schedule each session.\n\nTeam CRM', 'training'],
  ['customer_status_changed', 'CUST_STATUS', 'Dear {customer_name}, Your account status for {company_name} has been updated to: {status}. For queries, contact our support team. Team CRM', 'customer'],
  ['training_status_update', 'TRAIN_STATUS', 'Dear {customer_name}, Training update — "{training_title}" (Day {day_number}) status: {status}. Team CRM', 'training'],
  ['training_completed', 'TRAIN_DONE', 'Dear {customer_name}, Congratulations! Training "{training_title}" (Day {day_number}) has been completed successfully. Team CRM', 'training']
];

function seedTemplates() {
  const values = [];
  const placeholders = EXTRA_TEMPLATES.map((_, i) => {
    const base = i * 4;
    values.push(...EXTRA_TEMPLATES[i]);
    return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`;
  }).join(', ');

  pool.query(
    `INSERT INTO whatsapp_templates (template_name, template_code, message_template, category)
     VALUES ${placeholders}
     ON CONFLICT (template_name) DO NOTHING`,
    values
  ).catch((err) => console.error('⚠️ Could not seed WhatsApp templates:', err.message));
}

pool.query('SELECT 1')
  .then(() => {
    console.log('✅ Connected to PostgreSQL');
    seedTemplates();
  })
  .catch((err) => {
    console.error('❌ Error connecting to PostgreSQL:', err.message);
    process.exit(1);
  });

module.exports = { get, all, run, _pool: pool, _toPostgres: toPostgres };
