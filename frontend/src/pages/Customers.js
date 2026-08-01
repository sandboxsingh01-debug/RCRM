import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Grid, MenuItem, Typography, IconButton, Tooltip, Alert
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { DataTable, StatusChip, ConfirmDialog } from '../components/common';
import { getCustomers } from '../services/api';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const EMPTY = {
  company_name: '', contact_person: '', mobile: '', whatsapp_number: '', email: '',
  gst_number: '', billing_address: '', city: '', state: '', software_purchased: '',
  purchase_date: '', license_expiry: '', amc_expiry: '', assigned_executive_id: '',
  customer_status: 'active'
};

export default function Customers() {
  const { user } = useAuth();
  const [customers, setCustomers]   = useState([]);
  const [loading, setLoading]       = useState(false);
  const [expiryAlerts, setAlerts]   = useState([]);
  const [openForm, setOpenForm]     = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [selected, setSelected]     = useState(null);
  const [form, setForm]             = useState(EMPTY);
  const [users, setUsers]           = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getCustomers();
      setCustomers(r.data.data || []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    if (user?.role === 'super_admin') {
      api.get('/customers/alerts/expiry').then(r => setAlerts(r.data.data || [])).catch(() => {});
      api.get('/users').then(r => setUsers(r.data.data || [])).catch(() => {});
    }
  }, [load, user]);

  const handleSave = async () => {
    try {
      if (selected) {
        await api.put(`/customers/${selected.id}`, form);
      } else {
        await api.post('/customers', form);
      }
      setOpenForm(false);
      setSelected(null);
      setForm(EMPTY);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Error saving customer');
    }
  };

  const columns = [
    { key: 'customer_id',     label: 'ID' },
    { key: 'company_name',    label: 'Company' },
    { key: 'contact_person',  label: 'Contact' },
    { key: 'mobile',          label: 'Mobile' },
    { key: 'software_purchased', label: 'Software' },
    { key: 'amc_expiry',      label: 'AMC Expiry' },
    { key: 'customer_status', label: 'Status', render: v => <StatusChip status={v} /> },
    { key: 'executive_name',  label: 'Executive' },
    {
      key: 'actions', label: 'Actions',
      render: (_, row) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="Edit">
            <IconButton size="small"
              onClick={(e) => { e.stopPropagation(); setSelected(row); setForm({ ...EMPTY, ...row }); setOpenForm(true); }}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {user?.role === 'super_admin' && (
            <Tooltip title="Delete">
              <IconButton size="small" color="error"
                onClick={(e) => { e.stopPropagation(); setSelected(row); setOpenDelete(true); }}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      )
    }
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" fontWeight="bold">Customers</Typography>
        <Button variant="contained" startIcon={<AddIcon />}
          onClick={() => { setSelected(null); setForm(EMPTY); setOpenForm(true); }}>
          Add Customer
        </Button>
      </Box>

      {expiryAlerts.length > 0 && (
        <Alert severity="warning" icon={<WarningAmberIcon />} sx={{ mb: 2 }}>
          {expiryAlerts.length} customer(s) have AMC/License expiring within 30 days.
        </Alert>
      )}

      <DataTable columns={columns} rows={customers} loading={loading} />

      <Dialog open={openForm} onClose={() => setOpenForm(false)} maxWidth="md" fullWidth>
        <DialogTitle>{selected ? 'Edit Customer' : 'Add Customer'}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            {[
              { name: 'company_name', label: 'Company Name *', sm: 6 },
              { name: 'contact_person', label: 'Contact Person *', sm: 6 },
              { name: 'mobile', label: 'Mobile *', sm: 4 },
              { name: 'whatsapp_number', label: 'WhatsApp', sm: 4 },
              { name: 'email', label: 'Email', sm: 4, type: 'email' },
              { name: 'gst_number', label: 'GST Number', sm: 4 },
              { name: 'city', label: 'City', sm: 4 },
              { name: 'state', label: 'State', sm: 4 },
              { name: 'software_purchased', label: 'Software Purchased', sm: 12 },
              { name: 'purchase_date', label: 'Purchase Date', sm: 4, type: 'date', shrink: true },
              { name: 'license_expiry', label: 'License Expiry', sm: 4, type: 'date', shrink: true },
              { name: 'amc_expiry', label: 'AMC Expiry', sm: 4, type: 'date', shrink: true },
            ].map(f => (
              <Grid item xs={12} sm={f.sm} key={f.name}>
                <TextField fullWidth size="small" label={f.label} type={f.type || 'text'}
                  value={form[f.name] || ''}
                  onChange={e => setForm(p => ({ ...p, [f.name]: e.target.value }))}
                  InputLabelProps={f.shrink ? { shrink: true } : undefined} />
              </Grid>
            ))}
            {user?.role === 'super_admin' && (
              <Grid item xs={12} sm={6}>
                <TextField fullWidth size="small" select label="Assigned Executive"
                  value={form.assigned_executive_id || ''}
                  onChange={e => setForm(p => ({ ...p, assigned_executive_id: e.target.value }))}>
                  {users.filter(u => u.role === 'sales_user').map(u => (
                    <MenuItem key={u.id} value={u.id}>{u.full_name}</MenuItem>
                  ))}
                </TextField>
              </Grid>
            )}
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" select label="Status"
                value={form.customer_status || 'active'}
                onChange={e => setForm(p => ({ ...p, customer_status: e.target.value }))}>
                {['active', 'inactive', 'suspended'].map(s => (
                  <MenuItem key={s} value={s}>{s}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="Billing Address" multiline rows={2}
                value={form.billing_address || ''}
                onChange={e => setForm(p => ({ ...p, billing_address: e.target.value }))} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenForm(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}>{selected ? 'Update' : 'Create'}</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={openDelete}
        title="Delete Customer"
        message={`Delete "${selected?.company_name}"? This cannot be undone.`}
        onCancel={() => setOpenDelete(false)}
        onConfirm={async () => {
          await api.delete(`/customers/${selected.id}`);
          setOpenDelete(false);
          load();
        }}
      />
    </Box>
  );
}
