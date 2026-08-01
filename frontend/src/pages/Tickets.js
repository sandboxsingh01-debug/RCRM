import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Grid, MenuItem, Typography, IconButton, Tooltip,
  Stepper, Step, StepLabel, Chip, Paper, List, ListItem, ListItemText, Divider
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { DataTable, StatusChip } from '../components/common';
import { getTickets, createTicket, updateTicketStatus, assignTicket, resolveTicket, getTicketTimeline } from '../services/api';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const PRIORITIES  = ['low', 'medium', 'high', 'urgent'];
const CATEGORIES  = ['Installation', 'Bug / Error', 'Training', 'Data Issue', 'Performance', 'Other'];
const STATUS_FLOW = ['open', 'assigned', 'in_progress', 'waiting_customer', 'resolved', 'closed'];

const PRIORITY_COLOR = { low: 'default', medium: 'info', high: 'warning', urgent: 'error' };

export default function Tickets() {
  const { user } = useAuth();
  const [tickets, setTickets]       = useState([]);
  const [loading, setLoading]       = useState(false);
  const [customers, setCustomers]   = useState([]);
  const [engineers, setEngineers]   = useState([]);
  const [openCreate, setOpenCreate] = useState(false);
  const [openDetail, setOpenDetail] = useState(false);
  const [openAssign, setOpenAssign] = useState(false);
  const [openResolve, setOpenResolve] = useState(false);
  const [selected, setSelected]     = useState(null);
  const [timeline, setTimeline]     = useState([]);
  const [form, setForm]             = useState({ subject: '', description: '', priority: 'medium', category: '', customer_id: '' });
  const [assignForm, setAssignForm] = useState({ engineer_id: '' });
  const [resolveForm, setResolveForm] = useState({ resolution_notes: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await getTickets(); setTickets(r.data.data || []); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    api.get('/customers').then(r => setCustomers(r.data.data || [])).catch(() => {});
    if (user?.role === 'super_admin') {
      api.get('/users').then(r => setEngineers((r.data.data || []).filter(u => u.role === 'support_user'))).catch(() => {});
    }
  }, [load, user]);

  const openTicketDetail = async (ticket) => {
    setSelected(ticket);
    const r = await getTicketTimeline(ticket.id);
    setTimeline(r.data.data || []);
    setOpenDetail(true);
  };

  const handleCreate = async () => {
    try {
      await createTicket(form);
      setOpenCreate(false);
      setForm({ subject: '', description: '', priority: 'medium', category: '', customer_id: '' });
      load();
    } catch (err) { alert(err.response?.data?.message || 'Error creating ticket'); }
  };

  const handleAssign = async () => {
    try {
      await assignTicket(selected.id, assignForm);
      setOpenAssign(false);
      load();
    } catch (err) { alert(err.response?.data?.message || 'Error assigning ticket'); }
  };

  const handleResolve = async () => {
    try {
      await resolveTicket(selected.id, resolveForm);
      setOpenResolve(false);
      load();
    } catch (err) { alert(err.response?.data?.message || 'Error resolving ticket'); }
  };

  const handleStatusChange = async (ticket, newStatus) => {
    try {
      await updateTicketStatus(ticket.id, { status: newStatus });
      load();
    } catch (err) { alert('Error updating status'); }
  };

  const columns = [
    { key: 'ticket_number',   label: 'Ticket #' },
    { key: 'company_name',    label: 'Customer' },
    { key: 'subject',         label: 'Subject', render: v => <Typography noWrap sx={{ maxWidth: 200 }} title={v}>{v}</Typography> },
    { key: 'priority',        label: 'Priority', render: v => <Chip label={v} color={PRIORITY_COLOR[v]} size="small" /> },
    { key: 'category',        label: 'Category' },
    { key: 'status',          label: 'Status', render: v => <StatusChip status={v} /> },
    { key: 'assigned_engineer', label: 'Engineer' },
    { key: 'created_at',      label: 'Created', render: v => v ? new Date(v).toLocaleDateString() : '—' },
    {
      key: 'actions', label: 'Actions',
      render: (_, row) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="View Timeline">
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); openTicketDetail(row); }}>
              <VisibilityIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {user?.role === 'super_admin' && row.status === 'open' && (
            <Tooltip title="Assign">
              <IconButton size="small" color="primary"
                onClick={(e) => { e.stopPropagation(); setSelected(row); setOpenAssign(true); }}>
                <AssignmentIndIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {['support_user', 'super_admin'].includes(user?.role) && ['assigned', 'in_progress'].includes(row.status) && (
            <Tooltip title="Resolve">
              <IconButton size="small" color="success"
                onClick={(e) => { e.stopPropagation(); setSelected(row); setOpenResolve(true); }}>
                <CheckCircleIcon fontSize="small" />
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
        <Typography variant="h5" fontWeight="bold">Support Tickets</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenCreate(true)}>
          New Ticket
        </Button>
      </Box>

      <DataTable columns={columns} rows={tickets} loading={loading} onRowClick={openTicketDetail} />

      {/* Create Ticket */}
      <Dialog open={openCreate} onClose={() => setOpenCreate(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Support Ticket</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            {user?.role !== 'customer' && (
              <Grid item xs={12}>
                <TextField fullWidth size="small" select label="Customer" value={form.customer_id}
                  onChange={e => setForm(p => ({ ...p, customer_id: e.target.value }))}>
                  {customers.map(c => <MenuItem key={c.id} value={c.id}>{c.company_name}</MenuItem>)}
                </TextField>
              </Grid>
            )}
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
          <Button onClick={() => setOpenCreate(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate}>Create Ticket</Button>
        </DialogActions>
      </Dialog>

      {/* Ticket Detail + Timeline */}
      <Dialog open={openDetail} onClose={() => setOpenDetail(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selected?.ticket_number} — {selected?.subject}
          <Chip sx={{ ml: 2 }} label={selected?.status} size="small" />
        </DialogTitle>
        <DialogContent dividers>
          {selected && (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2"><b>Customer:</b> {selected.company_name}</Typography>
                <Typography variant="body2"><b>Priority:</b> {selected.priority}</Typography>
                <Typography variant="body2"><b>Category:</b> {selected.category}</Typography>
                <Typography variant="body2"><b>Engineer:</b> {selected.assigned_engineer || 'Unassigned'}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2"><b>Description:</b></Typography>
                <Paper variant="outlined" sx={{ p: 1, mt: 0.5 }}>
                  <Typography variant="body2">{selected.description}</Typography>
                </Paper>
              </Grid>
              {selected.resolution_notes && (
                <Grid item xs={12}>
                  <Typography variant="body2"><b>Resolution:</b></Typography>
                  <Paper variant="outlined" sx={{ p: 1, mt: 0.5, bgcolor: 'success.light' }}>
                    <Typography variant="body2">{selected.resolution_notes}</Typography>
                  </Paper>
                </Grid>
              )}
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Timeline</Typography>
                <Stepper orientation="vertical" sx={{ ml: 1 }}>
                  {timeline.map((t, i) => (
                    <Step key={i} active completed>
                      <StepLabel>
                        <Typography variant="body2" fontWeight="bold">{t.action?.replace(/_/g, ' ')}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {t.user_name || 'System'} • {new Date(t.created_at).toLocaleString()}
                        </Typography>
                        {t.notes && <Typography variant="caption" display="block">{t.notes}</Typography>}
                      </StepLabel>
                    </Step>
                  ))}
                </Stepper>
              </Grid>

              {/* Quick status change for support/admin */}
              {['support_user', 'super_admin'].includes(user?.role) && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Update Status:</Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                    {STATUS_FLOW.filter(s => s !== selected.status).map(s => (
                      <Button key={s} size="small" variant="outlined"
                        onClick={() => { handleStatusChange(selected, s); setOpenDetail(false); }}>
                        {s.replace(/_/g, ' ')}
                      </Button>
                    ))}
                  </Box>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDetail(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Assign Ticket */}
      <Dialog open={openAssign} onClose={() => setOpenAssign(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Assign Ticket</DialogTitle>
        <DialogContent dividers>
          <TextField fullWidth size="small" select label="Assign to Engineer" sx={{ mt: 1 }}
            value={assignForm.engineer_id}
            onChange={e => setAssignForm({ engineer_id: e.target.value })}>
            {engineers.map(e => <MenuItem key={e.id} value={e.id}>{e.full_name}</MenuItem>)}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAssign(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAssign}>Assign</Button>
        </DialogActions>
      </Dialog>

      {/* Resolve Ticket */}
      <Dialog open={openResolve} onClose={() => setOpenResolve(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Resolve Ticket — {selected?.ticket_number}</DialogTitle>
        <DialogContent dividers>
          <TextField fullWidth size="small" label="Resolution Notes *" multiline rows={4} sx={{ mt: 1 }}
            value={resolveForm.resolution_notes}
            onChange={e => setResolveForm({ resolution_notes: e.target.value })} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenResolve(false)}>Cancel</Button>
          <Button variant="contained" color="success" onClick={handleResolve}>Mark Resolved</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
