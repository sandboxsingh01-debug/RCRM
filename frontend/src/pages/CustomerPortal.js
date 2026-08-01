import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Button, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  MenuItem, List, ListItem, ListItemText, Divider, LinearProgress,
  AppBar, Toolbar, IconButton, Avatar, Paper, Tab, Tabs
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import AddIcon from '@mui/icons-material/Add';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { StatusChip } from '../components/common';

const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const CATEGORIES = ['Installation', 'Bug / Error', 'Training', 'Data Issue', 'Performance', 'Other'];

export default function CustomerPortal() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab]         = useState(0);
  const [data, setData]       = useState({});
  const [openTicket, setOpen] = useState(false);
  const [form, setForm]       = useState({ subject: '', description: '', priority: 'medium', category: '' });

  useEffect(() => {
    api.get('/dashboard/customer')
      .then(r => setData(r.data.data || {}))
      .catch(() => {});
  }, []);

  const handleCreateTicket = async () => {
    try {
      await api.post('/tickets', form);
      setOpen(false);
      setForm({ subject: '', description: '', priority: 'medium', category: '' });
      api.get('/dashboard/customer').then(r => setData(r.data.data || {}));
    } catch (err) { alert(err.response?.data?.message || 'Error creating ticket'); }
  };

  const profile   = data.profile || {};
  const tickets   = data.recent_tickets || [];
  const training  = data.training_schedule || [];
  const txns      = data.recent_transactions || [];
  const completed = training.filter(t => t.status === 'completed').length;
  const progress  = training.length ? Math.round((completed / training.length) * 100) : 0;

  const daysUntil = (dateStr) => {
    if (!dateStr) return null;
    const diff = Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const amcDays = daysUntil(profile.amc_expiry);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.100' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flex: 1 }}>Customer Portal</Typography>
          <Typography variant="body2" sx={{ mr: 2 }}>{profile.company_name}</Typography>
          <Avatar sx={{ bgcolor: 'secondary.main', width: 32, height: 32, mr: 1 }}>
            {profile.contact_person?.[0]?.toUpperCase()}
          </Avatar>
          <IconButton color="inherit" onClick={() => { logout(); navigate('/login'); }}>
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
        {/* Alerts */}
        {amcDays !== null && amcDays <= 30 && amcDays > 0 && (
          <Paper sx={{ p: 2, mb: 2, bgcolor: 'warning.light' }}>
            ⚠️ Your AMC expires in <strong>{amcDays} days</strong> ({profile.amc_expiry}). Please renew to continue support.
          </Paper>
        )}
        {amcDays !== null && amcDays <= 0 && (
          <Paper sx={{ p: 2, mb: 2, bgcolor: 'error.light', color: 'white' }}>
            🚨 Your AMC has expired. Please contact us immediately.
          </Paper>
        )}

        {/* Stats */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Software', value: profile.software_purchased || '—' },
            { label: 'License Expiry', value: profile.license_expiry || '—' },
            { label: 'AMC Expiry', value: profile.amc_expiry || '—' },
            { label: 'Training Progress', value: `${progress}%` },
          ].map(s => (
            <Grid item xs={6} sm={3} key={s.label}>
              <Card>
                <CardContent sx={{ textAlign: 'center', p: 2, '&:last-child': { pb: 2 } }}>
                  <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                  <Typography variant="subtitle2" fontWeight="bold">{s.value}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
          <Tab label="My Tickets" />
          <Tab label="Training" />
          <Tab label="Payments" />
        </Tabs>

        {tab === 0 && (
          <Box>
            <Button variant="contained" startIcon={<AddIcon />} sx={{ mb: 2 }}
              onClick={() => setOpen(true)}>
              Raise New Ticket
            </Button>
            <Grid container spacing={2}>
              {tickets.length === 0 ? (
                <Grid item xs={12}>
                  <Typography color="text.secondary">No tickets raised yet.</Typography>
                </Grid>
              ) : tickets.map(t => (
                <Grid item xs={12} sm={6} md={4} key={t.id}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption" color="primary">{t.ticket_number}</Typography>
                        <StatusChip status={t.status} />
                      </Box>
                      <Typography variant="subtitle2" sx={{ mt: 0.5 }}>{t.subject}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(t.created_at).toLocaleDateString()}
                      </Typography>
                      {t.resolution_notes && (
                        <Typography variant="body2" sx={{ mt: 1, p: 1, bgcolor: 'success.light', borderRadius: 1 }}>
                          ✅ {t.resolution_notes}
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {tab === 1 && (
          <Box>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2">Overall Progress: {completed}/{training.length} sessions</Typography>
              <LinearProgress variant="determinate" value={progress} sx={{ mt: 1, height: 8, borderRadius: 4 }} />
            </Box>
            <Grid container spacing={2}>
              {training.map(t => (
                <Grid item xs={12} sm={6} md={4} key={t.id}>
                  <Card variant="outlined" sx={{ borderLeft: `4px solid ${t.status === 'completed' ? '#2e7d32' : '#ed6c02'}` }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Chip label={`Day ${t.day_number}`} size="small" />
                        <StatusChip status={t.status} />
                      </Box>
                      <Typography variant="subtitle2" sx={{ mt: 1 }}>{t.training_title}</Typography>
                      {t.scheduled_date && (
                        <Typography variant="caption" color="text.secondary">
                          Scheduled: {new Date(t.scheduled_date).toLocaleDateString()}
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {tab === 2 && (
          <Box>
            {txns.length === 0 ? (
              <Typography color="text.secondary">No transactions found.</Typography>
            ) : (
              <List>
                {txns.map((t, i) => (
                  <React.Fragment key={t.id}>
                    <ListItem>
                      <ListItemText
                        primary={`${t.transaction_type?.toUpperCase()} — ${t.invoice_number || t.transaction_id}`}
                        secondary={`Amount: ₹${parseFloat(t.amount).toLocaleString('en-IN')} | Paid: ₹${parseFloat(t.paid_amount || 0).toLocaleString('en-IN')} | Balance: ₹${parseFloat(t.balance_amount || 0).toLocaleString('en-IN')}`}
                      />
                      <StatusChip status={t.payment_status} />
                    </ListItem>
                    {i < txns.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            )}
          </Box>
        )}
      </Box>

      {/* Create Ticket */}
      <Dialog open={openTicket} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Raise Support Ticket</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="Subject *" value={form.subject}
                onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" select label="Priority" value={form.priority}
                onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}>
                {PRIORITIES.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" select label="Category" value={form.category}
                onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                {CATEGORIES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="Description *" multiline rows={4}
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateTicket}>Submit Ticket</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
