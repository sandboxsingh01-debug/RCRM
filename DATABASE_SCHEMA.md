# CRM Database Schema

## Entity Relationship Overview

```
Users (1) ----< (N) Leads
Users (1) ----< (N) Customers  
Leads (1) ----> (1) Prospects
Prospects (1) ----> (1) Customers
Customers (1) ----< (N) Tickets
Customers (1) ----< (N) Trainings
Customers (1) ----< (N) Transactions
Customers (1) ----< (N) Communications
```

## Table Definitions

### 1. users
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    mobile VARCHAR(15),
    role VARCHAR(20) NOT NULL CHECK(role IN ('super_admin', 'sales_user', 'support_user', 'customer')),
    department VARCHAR(50),
    is_active BOOLEAN DEFAULT 1,
    last_login DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 2. leads
```sql
CREATE TABLE leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    status VARCHAR(20) DEFAULT 'lead' CHECK(status IN ('lead', 'prospect', 'customer', 'lost')),
    converted_to_prospect_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sales_executive_id) REFERENCES users(id),
    FOREIGN KEY (converted_to_prospect_id) REFERENCES prospects(id)
);
```

### 3. prospects
```sql
CREATE TABLE prospects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prospect_id VARCHAR(20) UNIQUE NOT NULL,
    lead_id INTEGER NOT NULL,
    interested_products TEXT,
    demo_date DATE,
    proposal_date DATE,
    expected_closing_date DATE,
    negotiation_notes TEXT,
    status VARCHAR(30) DEFAULT 'active' CHECK(status IN ('active', 'converted', 'lost')),
    converted_to_customer_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lead_id) REFERENCES leads(id),
    FOREIGN KEY (converted_to_customer_id) REFERENCES customers(id)
);
```

### 4. customers
```sql
CREATE TABLE customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    customer_status VARCHAR(20) DEFAULT 'active' CHECK(customer_status IN ('active', 'inactive', 'suspended')),
    user_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (assigned_executive_id) REFERENCES users(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### 5. training_schedule
```sql
CREATE TABLE training_schedule (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    day_number INTEGER NOT NULL,
    training_title VARCHAR(100) NOT NULL,
    description TEXT,
    scheduled_date DATE,
    completed_date DATE,
    trainer_id INTEGER,
    status VARCHAR(20) DEFAULT 'pending' CHECK(status IN ('pending', 'scheduled', 'completed', 'skipped')),
    customer_feedback TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (trainer_id) REFERENCES users(id)
);
```

### 6. tickets
```sql
CREATE TABLE tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_number VARCHAR(20) UNIQUE NOT NULL,
    customer_id INTEGER NOT NULL,
    priority VARCHAR(10) DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'urgent')),
    category VARCHAR(50),
    subject VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    screenshot_path VARCHAR(255),
    attachment_path VARCHAR(255),
    assigned_engineer_id INTEGER,
    status VARCHAR(20) DEFAULT 'open' CHECK(status IN ('open', 'assigned', 'in_progress', 'waiting_customer', 'resolved', 'closed')),
    resolution_notes TEXT,
    resolved_at DATETIME,
    closed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (assigned_engineer_id) REFERENCES users(id)
);
```

### 7. ticket_timeline
```sql
CREATE TABLE ticket_timeline (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id INTEGER NOT NULL,
    user_id INTEGER,
    action VARCHAR(50) NOT NULL,
    notes TEXT,
    is_internal BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_id) REFERENCES tickets(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### 8. communications
```sql
CREATE TABLE communications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    communication_type VARCHAR(20) NOT NULL CHECK(communication_type IN ('call', 'whatsapp', 'email', 'meeting', 'note')),
    subject VARCHAR(200),
    message TEXT,
    user_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### 9. transactions
```sql
CREATE TABLE transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id VARCHAR(20) UNIQUE NOT NULL,
    customer_id INTEGER NOT NULL,
    transaction_type VARCHAR(20) NOT NULL CHECK(transaction_type IN ('quotation', 'invoice', 'payment', 'credit_note')),
    invoice_number VARCHAR(50),
    invoice_date DATE,
    amount DECIMAL(10, 2) NOT NULL,
    paid_amount DECIMAL(10, 2) DEFAULT 0,
    balance_amount DECIMAL(10, 2),
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK(payment_status IN ('pending', 'partially_paid', 'paid', 'overdue')),
    due_date DATE,
    description TEXT,
    file_path VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);
```

### 10. whatsapp_templates
```sql
CREATE TABLE whatsapp_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_name VARCHAR(50) UNIQUE NOT NULL,
    template_code VARCHAR(50),
    message_template TEXT NOT NULL,
    category VARCHAR(30),
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 11. whatsapp_logs
```sql
CREATE TABLE whatsapp_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER,
    mobile_number VARCHAR(15) NOT NULL,
    message TEXT NOT NULL,
    template_id INTEGER,
    status VARCHAR(20) DEFAULT 'sent',
    response TEXT,
    sent_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (template_id) REFERENCES whatsapp_templates(id),
    FOREIGN KEY (sent_by) REFERENCES users(id)
);
```

### 12. audit_logs
```sql
CREATE TABLE audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action VARCHAR(50) NOT NULL,
    table_name VARCHAR(50),
    record_id INTEGER,
    old_value TEXT,
    new_value TEXT,
    ip_address VARCHAR(45),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### 13. departments
```sql
CREATE TABLE departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    department_name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 14. software_products
```sql
CREATE TABLE software_products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_name VARCHAR(100) NOT NULL,
    product_code VARCHAR(20) UNIQUE,
    description TEXT,
    price DECIMAL(10, 2),
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 15. settings
```sql
CREATE TABLE settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    setting_key VARCHAR(50) UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Indexes for Performance

```sql
CREATE INDEX idx_leads_sales_exec ON leads(sales_executive_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_customers_executive ON customers(assigned_executive_id);
CREATE INDEX idx_tickets_customer ON tickets(customer_id);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_assigned ON tickets(assigned_engineer_id);
CREATE INDEX idx_communications_customer ON communications(customer_id);
CREATE INDEX idx_transactions_customer ON transactions(customer_id);
CREATE INDEX idx_training_customer ON training_schedule(customer_id);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_table ON audit_logs(table_name, record_id);
```

## Initial Data

### Training Templates
```sql
INSERT INTO training_schedule (day_number, training_title) VALUES
(1, 'SOFTWARE OVERVIEW'),
(2, 'BASIC TRAINING (SALE & PURCHASE)'),
(3, 'ACCOUNTANCY'),
(4, 'GST TRAINING'),
(5, 'REPORTING TRAINING');
```

### Default WhatsApp Templates
```sql
INSERT INTO whatsapp_templates (template_name, message_template, category) VALUES
('ticket_created', 'Dear {customer_name}, Your ticket #{ticket_number} has been created. Subject: {subject}. We will resolve it soon.', 'ticket'),
('ticket_resolved', 'Dear {customer_name}, Your ticket #{ticket_number} has been resolved. Resolution: {resolution}', 'ticket'),
('training_schedule', 'Dear {customer_name}, Your training "{training_title}" is scheduled on {date}', 'training'),
('amc_expiry', 'Dear {customer_name}, Your AMC will expire on {expiry_date}. Please renew to continue support.', 'renewal'),
('payment_reminder', 'Dear {customer_name}, Payment reminder for Invoice #{invoice_number}. Amount: {amount}. Due: {due_date}', 'payment');
```
