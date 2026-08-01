import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import AppLayout from './components/layout/AppLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import Prospects from './pages/Prospects';
import Customers from './pages/Customers';
import Tickets from './pages/Tickets';
import Training from './pages/Training';
import Transactions from './pages/Transactions';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import CustomerPortal from './pages/CustomerPortal';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />

          {/* Customer portal — own layout, own auth check */}
          <Route path="/customer-portal" element={
            <PrivateRoute roles={['customer']}>
              <CustomerPortal />
            </PrivateRoute>
          } />

          {/* All staff pages — wrapped in AppLayout via PrivateRoute using Outlet */}
          <Route element={<PrivateRoute roles={['super_admin', 'sales_user', 'support_user']} />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard"    element={<Dashboard />} />
              <Route path="/leads"        element={<PrivateRoute roles={['super_admin', 'sales_user']}><Leads /></PrivateRoute>} />
              <Route path="/prospects"    element={<PrivateRoute roles={['super_admin', 'sales_user']}><Prospects /></PrivateRoute>} />
              <Route path="/customers"    element={<Customers />} />
              <Route path="/tickets"      element={<Tickets />} />
              <Route path="/training"     element={<Training />} />
              <Route path="/transactions" element={<PrivateRoute roles={['super_admin']}><Transactions /></PrivateRoute>} />
              <Route path="/reports"      element={<PrivateRoute roles={['super_admin']}><Reports /></PrivateRoute>} />
              <Route path="/settings"     element={<PrivateRoute roles={['super_admin']}><Settings /></PrivateRoute>} />
            </Route>
          </Route>

          <Route path="/"  element={<Navigate to="/dashboard" replace />} />
          <Route path="*"  element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
