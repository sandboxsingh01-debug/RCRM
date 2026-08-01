const bcrypt = require('bcryptjs');

const TABLES = [
  `CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    mobile VARCHAR(15),
    role VARCHAR(20) NOT NULL CHECK(role IN ('super_admin','sales_user','support_user','customer')),
    department VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS leads (
    id SERIAL PRIMARY KEY,
    lead_id VARCHAR(20) UNIQUE NOT NULL,
    company_name VARCHAR(200) NOT NULL,
    contact_person VARCHAR(100) NOT NULL,
    mobile VARCHAR(15) NOT NULL,
    whatsapp_number VARCHAR(15),
    email VARCHAR(100),
    address TEXT,
    city VARCHAR(50),
    state VARCHAR(50),
    gst_number VARCHAR(15),
    industry_type VARCHAR(50),
    lead_source VARCHAR(50),
    sales_executive_id INTEGER,
    follow_up_date DATE,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'lead' CHECK(status IN ('lead','prospect','customer','lost')),
    converted_to_prospect_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sales_executive_id) REFERENCES users(id)
  )`,

  `CREATE TABLE IF NOT EXISTS prospects (
    id SERIAL PRIMARY KEY,
    prospect_id VARCHAR(20) UNIQUE NOT NULL,
    lead_id INTEGER NOT NULL,
    interested_products TEXT,
    demo_date DATE,
    proposal_date DATE,
    expected_closing_date DATE,
    negotiation_notes TEXT,
    status VARCHAR(30) DEFAULT 'active' CHECK(status IN ('active','converted','lost')),
    converted_to_customer_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lead_id) REFERENCES leads(id)
  )`,

  `CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    customer_id VARCHAR(20) UNIQUE NOT NULL,
    company_name VARCHAR(200) NOT NULL,
    contact_person VARCHAR(100) NOT NULL,
    mobile VARCHAR(15) NOT NULL,
    whatsapp_number VARCHAR(15),
    email VARCHAR(100),
    gst_number VARCHAR(15),
    billing_address TEXT,
    city VARCHAR(50),
    state VARCHAR(50),
    software_purchased TEXT,
    purchase_date DATE,
    license_expiry DATE,
    amc_expiry DATE,
    assigned_executive_id INTEGER,
    customer_status VARCHAR(20) DEFAULT 'active' CHECK(customer_status IN ('active','inactive','suspended')),
    user_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (assigned_executive_id) REFERENCES users(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`,

  `CREATE TABLE IF NOT EXISTS training_schedule (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    day_number INTEGER NOT NULL,
    training_title VARCHAR(100) NOT NULL,
    description TEXT,
    scheduled_date DATE,
    completed_date DATE,
    trainer_id INTEGER,
    status VARCHAR(20) DEFAULT 'pending' CHECK(status IN ('pending','scheduled','completed','skipped')),
    customer_feedback TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (trainer_id) REFERENCES users(id)
  )`,

  `CREATE TABLE IF NOT EXISTS tickets (
    id SERIAL PRIMARY KEY,
    ticket_number VARCHAR(20) UNIQUE NOT NULL,
    customer_id INTEGER NOT NULL,
    priority VARCHAR(10) DEFAULT 'medium' CHECK(priority IN ('low','medium','high','urgent')),
    category VARCHAR(50),
    subject VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    screenshot_path VARCHAR(255),
    attachment_path VARCHAR(255),
    assigned_engineer_id INTEGER,
    status VARCHAR(20) DEFAULT 'open' CHECK(status IN ('open','assigned','in_progress','waiting_customer','resolved','closed')),
    resolution_notes TEXT,
    resolved_at TIMESTAMP,
    closed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (assigned_engineer_id) REFERENCES users(id)
  )`,

  `CREATE TABLE IF NOT EXISTS ticket_timeline (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER NOT NULL,
    user_id INTEGER,
    action VARCHAR(50) NOT NULL,
    notes TEXT,
    is_internal BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_id) REFERENCES tickets(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`,

  `CREATE TABLE IF NOT EXISTS communications (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    communication_type VARCHAR(20) NOT NULL CHECK(communication_type IN ('call','whatsapp','email','meeting','note')),
    subject VARCHAR(200),
    message TEXT,
    user_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`,

  `CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    transaction_id VARCHAR(20) UNIQUE NOT NULL,
    customer_id INTEGER NOT NULL,
    transaction_type VARCHAR(20) NOT NULL CHECK(transaction_type IN ('quotation','invoice','payment','credit_note')),
    invoice_number VARCHAR(50),
    invoice_date DATE,
    amount DECIMAL(10,2) NOT NULL,
    paid_amount DECIMAL(10,2) DEFAULT 0,
    balance_amount DECIMAL(10,2),
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK(payment_status IN ('pending','partially_paid','paid','overdue')),
    due_date DATE,
    description TEXT,
    file_path VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
  )`,

  `CREATE TABLE IF NOT EXISTS whatsapp_templates (
    id SERIAL PRIMARY KEY,
    template_name VARCHAR(50) UNIQUE NOT NULL,
    template_code VARCHAR(50),
    message_template TEXT NOT NULL,
    category VARCHAR(30),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS whatsapp_logs (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER,
    mobile_number VARCHAR(15) NOT NULL,
    message TEXT NOT NULL,
    template_id INTEGER,
    status VARCHAR(20) DEFAULT 'sent',
    response TEXT,
    sent_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (sent_by) REFERENCES users(id)
  )`,

  `CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    action VARCHAR(50) NOT NULL,
    table_name VARCHAR(50),
    record_id INTEGER,
    old_value TEXT,
    new_value TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`,

  `CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    department_name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS software_products (
    id SERIAL PRIMARY KEY,
    product_name VARCHAR(100) NOT NULL,
    product_code VARCHAR(20) UNIQUE,
    description TEXT,
    price DECIMAL(10,2),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(50) UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`
];

const INDEXES = [
  'CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status)',
  'CREATE INDEX IF NOT EXISTS idx_leads_sales_exec ON leads(sales_executive_id)',
  'CREATE INDEX IF NOT EXISTS idx_customers_executive ON customers(assigned_executive_id)',
  'CREATE INDEX IF NOT EXISTS idx_tickets_customer ON tickets(customer_id)',
  'CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status)',
  'CREATE INDEX IF NOT EXISTS idx_tickets_assigned ON tickets(assigned_engineer_id)',
  'CREATE INDEX IF NOT EXISTS idx_communications_customer ON communications(customer_id)',
  'CREATE INDEX IF NOT EXISTS idx_transactions_customer ON transactions(customer_id)',
  'CREATE INDEX IF NOT EXISTS idx_training_customer ON training_schedule(customer_id)',
  'CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id)'
];

async function seedDatabase(query) {
  for (const ddl of TABLES) await query(ddl);
  for (const idx of INDEXES) await query(idx);

  // Default users
  const users = [
    ['admin', 'admin@crm.com', await bcrypt.hash('Admin@123', 10), 'Super Administrator', '9999999999', 'super_admin', 'Management'],
    ['sales1', 'sales1@crm.com', await bcrypt.hash('Sales@123', 10), 'Sales Executive One', '8888888888', 'sales_user', 'Sales'],
    ['support1', 'support1@crm.com', await bcrypt.hash('Support@123', 10), 'Support Engineer One', '7777777777', 'support_user', 'Support']
  ];
  for (const u of users) {
    await query(
      `INSERT INTO users (username, email, password_hash, full_name, mobile, role, department)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (username) DO NOTHING`,
      u
    );
  }

  const depts = [['Sales', 'Sales Department'], ['Support', 'Technical Support'], ['Management', 'Management']];
  for (const d of depts) {
    await query(
      'INSERT INTO departments (department_name, description) VALUES ($1, $2) ON CONFLICT (department_name) DO NOTHING',
      d
    );
  }

  const products = [
    ['Billing Software Pro', 'BSP001', 'Complete billing and invoicing solution', 15000],
    ['GST Filing Suite', 'GFS001', 'GST return filing and compliance', 8000],
    ['Inventory Manager', 'IM001', 'Stock and inventory management', 12000],
    ['Accounting Suite', 'AS001', 'Full accounting and ledger management', 20000]
  ];
  for (const p of products) {
    await query(
      'INSERT INTO software_products (product_name, product_code, description, price) VALUES ($1, $2, $3, $4) ON CONFLICT (product_code) DO NOTHING',
      p
    );
  }

  const templates = [
    ['ticket_created', 'TICKET_NEW', 'Dear {customer_name}, Your ticket #{ticket_number} has been created. Subject: {subject}. We will resolve it soon. Team CRM', 'ticket'],
    ['ticket_assigned', 'TICKET_ASSIGN', 'Dear {customer_name}, Your ticket #{ticket_number} has been assigned to {engineer_name}. We are working on it.', 'ticket'],
    ['ticket_resolved', 'TICKET_RESOLVE', 'Dear {customer_name}, Your ticket #{ticket_number} has been resolved. Resolution: {resolution}. Please confirm.', 'ticket'],
    ['ticket_closed', 'TICKET_CLOSE', 'Dear {customer_name}, Your ticket #{ticket_number} is now closed. Thank you for your patience.', 'ticket'],
    ['training_schedule', 'TRAINING_SCHED', 'Dear {customer_name}, Your training "{training_title}" (Day {day_number}) is scheduled on {date} at {time}. Trainer: {trainer_name}. Team CRM', 'training'],
    ['new_customer_training', 'NEW_CUST_TRAIN', 'Dear {customer_name},\n\nWelcome! Your onboarding training schedule for {company_name} ({software_purchased}):\n\n{training_schedule}\n\nOur team will contact you to schedule each session.\n\nTeam CRM', 'training'],
    ['customer_status_changed', 'CUST_STATUS', 'Dear {customer_name}, Your account status for {company_name} has been updated to: {status}. For queries, contact our support team. Team CRM', 'customer'],
    ['training_status_update', 'TRAIN_STATUS', 'Dear {customer_name}, Training update — "{training_title}" (Day {day_number}) status: {status}. Team CRM', 'training'],
    ['training_completed', 'TRAIN_DONE', 'Dear {customer_name}, Congratulations! Training "{training_title}" (Day {day_number}) has been completed successfully. Team CRM', 'training'],
    ['amc_expiry', 'AMC_EXPIRE', 'Dear {customer_name}, Your AMC will expire on {expiry_date}. Please renew to continue support services.', 'renewal'],
    ['payment_reminder', 'PAYMENT_REM', 'Dear {customer_name}, Payment reminder for Invoice #{invoice_number}. Amount Due: Rs.{amount}. Due Date: {due_date}', 'payment']
  ];
  for (const t of templates) {
    await query(
      'INSERT INTO whatsapp_templates (template_name, template_code, message_template, category) VALUES ($1, $2, $3, $4) ON CONFLICT (template_name) DO NOTHING',
      t
    );
  }

  const settings = [
    ['company_name', 'My Software Company', 'Company Name'],
    ['company_phone', '9000000000', 'Company Phone'],
    ['company_email', 'info@mycompany.com', 'Company Email'],
    ['whatsapp_enabled', 'false', 'Enable WhatsApp notifications'],
    ['email_enabled', 'false', 'Enable Email notifications'],
    ['amc_alert_days', '30', 'Days before AMC expiry to send alert']
  ];
  for (const s of settings) {
    await query(
      'INSERT INTO settings (setting_key, setting_value, description) VALUES ($1, $2, $3) ON CONFLICT (setting_key) DO NOTHING',
      s
    );
  }

  console.log('✅ Database initialized and seeded successfully');
  console.log('📋 Default Login Credentials:');
  console.log('   Super Admin  → username: admin      | password: Admin@123');
  console.log('   Sales User   → username: sales1     | password: Sales@123');
  console.log('   Support User → username: support1   | password: Support@123');
}

module.exports = { seedDatabase, TABLES, INDEXES };

if (require.main === module) {
  const { Pool } = require('pg');

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('❌ DATABASE_URL is not set. Add it to backend/.env (e.g. from Neon).');
    process.exit(1);
  }

  const pool = new Pool({ connectionString, max: 1 });
  const query = (text, params) => pool.query(text, params);

  seedDatabase(query)
    .then(() => pool.end())
    .catch((err) => {
      console.error('❌ Seed failed:', err);
      pool.end();
      process.exit(1);
    });
}
