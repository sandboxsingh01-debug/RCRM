# Enterprise CRM System

Complete CRM for Software Sales & Support — Leads → Prospects → Customers → Tickets → Training → Payments

---

## Default Login Credentials

| Role        | Username   | Password     |
|-------------|------------|--------------|
| Super Admin | admin      | Admin@123    |
| Sales User  | sales1     | Sales@123    |
| Support User| support1   | Support@123  |

---

## Quick Start (Local Development)

### Prerequisites
- Node.js 18+
- npm 9+
- Python 3.11+ (optional, for Excel import)

---

### Step 1 — Install & Seed Backend

```bash
cd backend
npm install
npm run seed
```

You should see:
```
✅ Database initialized and seeded successfully
📋 Default Login Credentials:
   Super Admin  → username: admin      | password: Admin@123
   Sales User   → username: sales1     | password: Sales@123
   Support User → username: support1   | password: Support@123
```

### Step 2 — Start Backend

```bash
npm run dev
```

Backend runs at: http://localhost:5000
Health check: http://localhost:5000/health

---

### Step 3 — Install & Start Frontend

Open a new terminal:

```bash
cd frontend
npm install
npm start
```

Frontend runs at: http://localhost:3000

---

### Step 4 — (Optional) Start Python Services

Open a third terminal:

```bash
cd python-services
pip install -r requirements.txt
python main.py
```

Python services run at: http://localhost:8000

---

## Production — Docker

### Run everything with Docker Compose

```bash
docker-compose up --build
```

- Frontend: http://localhost:80
- Backend API: http://localhost:5000
- Python: http://localhost:8000

### Stop

```bash
docker-compose down
```

---

## Project Structure

```
RCRM/
├── backend/
│   ├── database/          ← SQLite DB (auto-created on seed)
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js    ← DB connection
│   │   │   └── seed.js        ← DB init + default users
│   │   ├── middleware/
│   │   │   ├── auth.middleware.js
│   │   │   └── audit.middleware.js
│   │   └── routes/
│   │       ├── auth.routes.js
│   │       ├── lead.routes.js
│   │       ├── prospect.routes.js
│   │       ├── customer.routes.js
│   │       ├── ticket.routes.js
│   │       ├── training.routes.js
│   │       ├── transaction.routes.js
│   │       ├── communication.routes.js
│   │       ├── whatsapp.routes.js
│   │       ├── dashboard.routes.js
│   │       ├── report.routes.js
│   │       ├── user.routes.js
│   │       └── setting.routes.js
│   ├── .env
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/AppLayout.js   ← Sidebar + Topbar
│   │   │   ├── common/index.js       ← DataTable, StatusChip, ConfirmDialog
│   │   │   └── PrivateRoute.js
│   │   ├── context/AuthContext.js
│   │   ├── pages/
│   │   │   ├── Login.js
│   │   │   ├── Dashboard.js
│   │   │   ├── Leads.js
│   │   │   ├── Prospects.js
│   │   │   ├── Customers.js
│   │   │   ├── Tickets.js
│   │   │   ├── Training.js
│   │   │   ├── Transactions.js
│   │   │   ├── Reports.js
│   │   │   ├── Settings.js
│   │   │   └── CustomerPortal.js
│   │   ├── services/api.js
│   │   └── App.js
│   ├── .env
│   └── package.json
│
├── python-services/
│   ├── main.py           ← Excel import + analytics API
│   └── requirements.txt
│
├── uploads/
│   ├── tickets/
│   ├── customers/
│   ├── invoices/
│   └── documents/
│
├── docker-compose.yml
└── README.md
```

---

## API Endpoints

| Method | Endpoint                              | Description              |
|--------|---------------------------------------|--------------------------|
| POST   | /api/auth/login                       | Login                    |
| GET    | /api/auth/me                          | Current user             |
| GET    | /api/leads                            | List leads               |
| POST   | /api/leads                            | Create lead              |
| PUT    | /api/leads/:id                        | Update lead              |
| POST   | /api/leads/:id/convert-to-prospect    | Convert lead             |
| GET    | /api/prospects                        | List prospects           |
| POST   | /api/prospects/:id/convert-to-customer| Convert prospect         |
| GET    | /api/customers                        | List customers           |
| POST   | /api/customers                        | Create customer          |
| PUT    | /api/customers/:id                    | Update customer          |
| GET    | /api/tickets                          | List tickets             |
| POST   | /api/tickets                          | Create ticket            |
| PATCH  | /api/tickets/:id/assign               | Assign ticket            |
| PATCH  | /api/tickets/:id/resolve              | Resolve ticket           |
| GET    | /api/tickets/:id/timeline             | Ticket history           |
| GET    | /api/training/customer/:id            | Training schedule        |
| PATCH  | /api/training/:id/complete            | Mark training complete   |
| GET    | /api/transactions                     | List transactions        |
| POST   | /api/transactions                     | Create invoice           |
| POST   | /api/transactions/:id/payment         | Record payment           |
| GET    | /api/dashboard/admin                  | Admin dashboard stats    |
| GET    | /api/dashboard/sales                  | Sales dashboard stats    |
| GET    | /api/dashboard/support                | Support dashboard stats  |
| GET    | /api/dashboard/customer               | Customer portal stats    |
| GET    | /api/reports/sales                    | Sales report             |
| GET    | /api/reports/revenue                  | Revenue report           |
| GET    | /api/reports/tickets                  | Ticket report            |
| GET    | /api/reports/lead-conversion          | Lead conversion report   |
| POST   | /api/whatsapp/send                    | Send WhatsApp message    |
| GET    | /api/whatsapp/templates               | List templates           |
| GET    | /api/users                            | List users (admin)       |
| POST   | /api/users                            | Create user (admin)      |
| DELETE | /api/users/:id                        | Delete user (admin)      |

---

## User Roles

| Role         | Access                                              |
|--------------|-----------------------------------------------------|
| super_admin  | Full access to everything                           |
| sales_user   | Leads, Prospects, Customers, Tickets                |
| support_user | Tickets (assigned), Training, Customers (view)      |
| customer     | Customer Portal only (own tickets, training, bills) |

---

## Excel Import (Python Service)

Upload your existing Excel files via:
- POST http://localhost:8000/api/import/preview  — preview columns
- POST http://localhost:8000/api/import/leads    — import leads
- POST http://localhost:8000/api/import/customers — import customers

Your existing files in this folder:
- LEADS.xlsx
- LEDGER MASTER.xlsx
- NEW CUSTOMER TOKENS AUTO GENERATE.xlsx
- TOKENS.xlsx
