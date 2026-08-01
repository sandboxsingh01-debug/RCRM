import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Tabs, Tab, Paper, Grid, TextField, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, MenuItem,
  IconButton, Tooltip, Switch, FormControlLabel
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { DataTable, ConfirmDialog } from '../components/common';
import api from '../services/api';

const ROLES = ['sales_user', 'support_user'];

const EMPTY_USER = { username: '', email: '', password: '', full_name: '', mobile: '', role: 'sales_user', department: '' };

export default function Settings() {
  const [tab, setTab]             = useState(0);
  const [users, setUsers]         = useState([]);
  const [templates, setTemplates] = useState([]);
  const [settings, setSettings]   = useState({});
  const [openUser, setOpenUser]   = useState(false);
  const [openTpl, setOpenTpl]     = useState(false);
  const [openDel, setOpenDel]     = useState(false);
  const [selUser, setSelUser]     = useState(null);
  const [selTpl, setSelTpl]       = useState(null);
  const [userForm, setUserForm]   = useState(EMPTY_USER);
  const [tplForm, setTplForm]     = useState({ template_name: '', message_template: '', category: '' });

  const loadUsers  = () => api.get('/users').then(r => setUsers(r.data.data || [])).catch(() => {});
  const loadTpls   = () => api.get('/whatsapp/templates').then(r => setTemplates(r.data.data || [])).catch(() => {});
  const loadConfig = () => api.get('/settings').then(r => {
    const map = {};
    (r.data.data || []).forEach(s => { map[s.setting_key] = s.setting_value; });
    setSettings(map);
  }).catch(() => {});

  useEffect(() => { loadUsers(); loadTpls(); loadConfig(); }, []);

  const handleSaveUser = async () => {
    try {
      if (selUser) {
        await api.put(`/users/${selUser.id}`, userForm);
      } else {
        await api.post('/users', userForm);
      }
      setOpenUser(false);
      setUserForm(EMPTY_USER);
      setSelUser(null);
      loadUsers();
    } catch (err) { alert(err.response?.data?.message || 'Error saving user'); }
  };

  const handleDeleteUser = async () => {
    await api.delete(`/users/${selUser.id}`);
    setOpenDel(false);
    loadUsers();
  };

  const handleToggleUser = async (id) => {
    await api.patch(`/users/${id}/toggle`);
    loadUsers();
  };

  const handleSaveTpl = async () => {
    try {
      await api.post('/whatsapp/templates', tplForm);
      setOpenTpl(false);
      setTplForm({ template_name: '', message_template: '', category: '' });
      loadTpls();
    } catch (err) { alert('Error saving template'); }
  };

  const handleSaveConfig = async () => {
    for (const [key, value] of Object.entries(settings)) {
      await api.post('/settings', { setting_key: key, setting_value: value });
    }
    alert('Settings saved successfully');
  };

  const userColumns = [
    { key: 'full_name',  label: 'Name' },
    { key: 'username',   label: 'Username' },
    { key: 'email',      label: 'Email' },
    { key: 'mobile',     label: 'Mobile' },
    { key: 'role',       label: 'Role' },
    { key: 'department', label: 'Department' },
    { key: 'is_active',  label: 'Active', render: (v, row) => (
      <Switch checked={!!v} size="small" onChange={() => handleToggleUser(row.id)} />
    )},
    { key: 'actions', label: 'Actions', render: (_, row) => (
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        <Tooltip title="Edit">
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); setSelUser(row); setUserForm({ ...EMPTY_USER, ...row }); setOpenUser(true); }}>
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete">
          <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); setSelUser(row); setOpenDel(true); }}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    )}
  ];

  const tplColumns = [
    { key: 'template_name',     label: 'Name' },
    { key: 'template_code',     label: 'Code' },
    { key: 'category',          label: 'Category' },
    { key: 'message_template',  label: 'Template', render: v => <Typography noWrap sx={{ maxWidth: 300 }} title={v}>{v}</Typography> },
  ];

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" sx={{ mb: 2 }}>System Settings</Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="Users" />
        <Tab label="WhatsApp Templates" />
        <Tab label="System Config" />
      </Tabs>

      {tab === 0 && (
        <Box>
          <Button variant="contained" startIcon={<AddIcon />} sx={{ mb: 2 }}
            onClick={() => { setSelUser(null); setUserForm(EMPTY_USER); setOpenUser(true); }}>
            Add User
          </Button>
          <DataTable columns={userColumns} rows={users} />
        </Box>
      )}

      {tab === 1 && (
        <Box>
          <Button variant="contained" startIcon={<AddIcon />} sx={{ mb: 2 }}
            onClick={() => setOpenTpl(true)}>
            Add Template
          </Button>
          <DataTable columns={tplColumns} rows={templates} />
        </Box>
      )}

      {tab === 2 && (
        <Paper sx={{ p: 3 }}>
          <Grid container spacing={2}>
            {[
              { key: 'company_name', label: 'Company Name' },
              { key: 'company_phone', label: 'Company Phone' },
              { key: 'company_email', label: 'Company Email' },
              { key: 'amc_alert_days', label: 'AMC Alert Days Before Expiry', type: 'number' },
            ].map(f => (
              <Grid item xs={12} sm={6} key={f.key}>
                <TextField fullWidth size="small" label={f.label} type={f.type || 'text'}
                  value={settings[f.key] || ''}
                  onChange={e => setSettings(p => ({ ...p, [f.key]: e.target.value }))} />
              </Grid>
            ))}
            <Grid item xs={6}>
              <FormControlLabel
                control={<Switch checked={settings.whatsapp_enabled === 'true'}
                  onChange={e => setSettings(p => ({ ...p, whatsapp_enabled: String(e.target.checked) }))} />}
                label="Enable WhatsApp Notifications"
              />
            </Grid>
            <Grid item xs={6}>
              <FormControlLabel
                control={<Switch checked={settings.email_enabled === 'true'}
                  onChange={e => setSettings(p => ({ ...p, email_enabled: String(e.target.checked) }))} />}
                label="Enable Email Notifications"
              />
            </Grid>
            <Grid item xs={12}>
              <Button variant="contained" onClick={handleSaveConfig}>Save Configuration</Button>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* User Dialog */}
      <Dialog open={openUser} onClose={() => setOpenUser(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{selUser ? 'Edit User' : 'Add User'}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            {[
              { name: 'full_name', label: 'Full Name *', sm: 6 },
              { name: 'username',  label: 'Username *', sm: 6 },
              { name: 'email',     label: 'Email *', sm: 6, type: 'email' },
              { name: 'mobile',    label: 'Mobile', sm: 6 },
              { name: 'department', label: 'Department', sm: 6 },
            ].map(f => (
              <Grid item xs={12} sm={f.sm} key={f.name}>
                <TextField fullWidth size="small" label={f.label} type={f.type || 'text'}
                  value={userForm[f.name] || ''}
                  onChange={e => setUserForm(p => ({ ...p, [f.name]: e.target.value }))} />
              </Grid>
            ))}
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" select label="Role" value={userForm.role}
                onChange={e => setUserForm(p => ({ ...p, role: e.target.value }))}>
                {ROLES.map(r => <MenuItem key={r} value={r}>{r.replace('_', ' ')}</MenuItem>)}
              </TextField>
            </Grid>
            {!selUser && (
              <Grid item xs={12} sm={6}>
                <TextField fullWidth size="small" label="Password *" type="password"
                  value={userForm.password || ''}
                  onChange={e => setUserForm(p => ({ ...p, password: e.target.value }))} />
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenUser(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveUser}>{selUser ? 'Update' : 'Create'}</Button>
        </DialogActions>
      </Dialog>

      {/* Template Dialog */}
      <Dialog open={openTpl} onClose={() => setOpenTpl(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add WhatsApp Template</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="Template Name" value={tplForm.template_name}
                onChange={e => setTplForm(p => ({ ...p, template_name: e.target.value }))} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="Category" value={tplForm.category}
                onChange={e => setTplForm(p => ({ ...p, category: e.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="Message Template" multiline rows={4}
                helperText="Use {customer_name}, {ticket_number}, {date} as placeholders"
                value={tplForm.message_template}
                onChange={e => setTplForm(p => ({ ...p, message_template: e.target.value }))} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenTpl(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveTpl}>Save Template</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog open={openDel} title="Delete User"
        message={`Delete user "${selUser?.full_name}"?`}
        onCancel={() => setOpenDel(false)} onConfirm={handleDeleteUser} />
    </Box>
  );
}
