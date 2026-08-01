const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware — allow ALL origins (works with ngrok, localhost, any public URL)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.options('*', cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

// Initialize database
const db = require('./config/database');

// Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/leads', require('./routes/lead.routes'));
app.use('/api/prospects', require('./routes/prospect.routes'));
app.use('/api/customers', require('./routes/customer.routes'));
app.use('/api/tickets', require('./routes/ticket.routes'));
app.use('/api/training', require('./routes/training.routes'));
app.use('/api/transactions', require('./routes/transaction.routes'));
app.use('/api/communications', require('./routes/communication.routes'));
app.use('/api/whatsapp', require('./routes/whatsapp.routes'));
app.use('/api/reports', require('./routes/report.routes'));
app.use('/api/dashboard', require('./routes/dashboard.routes'));
app.use('/api/settings', require('./routes/setting.routes'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Serve static frontend files
const fs = require('fs');
const frontendBuildPath = path.join(__dirname, '../../frontend/build');
if (fs.existsSync(frontendBuildPath)) {
  app.use(express.static(frontendBuildPath));
  console.log('Serving frontend build statically from', frontendBuildPath);
}

// Route all non-API/uploads requests to React frontend
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path.startsWith('/health')) {
    return next();
  }
  if (fs.existsSync(frontendBuildPath)) {
    res.sendFile(path.join(frontendBuildPath, 'index.html'));
  } else {
    res.status(404).json({ success: false, message: 'API endpoint not found and frontend is not built.' });
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Stop the process using that port or set a different PORT in backend/.env.`);
    process.exit(1);
  }
  console.error('Server error:', err);
  process.exit(1);
});

module.exports = app;
