import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Grid, MenuItem, Typography, IconButton, Tooltip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import { DataTable, StatusChip, ConfirmDialog } from '../components/common';
import { getLeads, createLead, updateLead, convertToProspect } from '../services/api';
import { useAuth } from '../context/AuthContext';

const EMPTY_FORM = {
  company_name: '', contact_person: '', mobile: '', whatsapp_number: '', email: '',
  address: '', city: '', state: '', gst_number: '', industry_type: '', lead_source: '',
  follow_up_date: '', notes: ''
};

const SOURCES = ['Website', 'Referral', 'Cold Call', 'Exhibition', 'Social Media', 'Other'];
const INDUSTRIES = ['Manufacturing', 'Trading', 'Retail', 'Service', 'Healthcare', 'Education', 'IT', 'Other'];

export default function Leads() {
  const { user } = useAuth();
  const [leads, setLeads]               = useState([]);
  const [loading, setLoading]           = useState(false);
  const [openForm, setOpenForm]         = useState(false);
  const [openConvert, setOpenConvert]   = useState(false);
  const [openDelete, setOpenDelete]     = useState(false);
  const [selected, setSelected]         = useState(null);
  const [form, setForm]                 = useState(EMPTY_FORM);
  const [convertForm, setConvertForm]   = useState({ interested_products: '', demo_date: '', expected_closing_date: '' });

  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getLeads();
      setLeads(res.data.data || []);
    } catch { /* handled by interceptor */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadLeads(); }, [loadLeads]);

  const handleSave = async () => {
    try {
      if (selected) {
        await updateLead(selected.id, form);
      } else {
        await createLead(form);
      }
      setOpenForm(false);
      setForm(EMPTY_FORM);
      setSelected(null);
      loadLeads();
    } catch (err) {
      alert(err.response?.data?.message || 'Error saving lead');
    }
  };

  const handleEdit = (row) => {
    setSelected(row);
    setForm({ ...EMPTY_FORM, ...row });
    setOpenForm(true);
  };

  const handleConvert = async () => {
    try {
      await convertToProspect(selected.id, convertForm);
      setOpenConvert(false);
      setSelected(null);
      loadLeads();
    } catch (err) {
      alert(err.response?.data?.message || 'Error converting lead');
    }
  };

  const columns = [
    { key: 'lead_id',            label: 'Lead ID' },
    { key: 'company_name',       label: 'Company' },
    { key: 'contact_person',     label: 'Contact' },
    { key: 'mobile',             label: 'Mobile' },
    { key: 'city',               label: 'City' },
    { key: 'lead_source',        label: 'Source' },
    { key: 'follow_up_date',     label: 'Follow-up' },
    { key: 'status',             label: 'Status',  render: (v) => <StatusChip status={v} /> },
    { key: 'sales_executive_name', label: 'Executive' },
    {
      key: 'actions', label: 'Actions',
      render: (_, row) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleEdit(row); }}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {row.status === 'lead' && (
            <Tooltip title="Convert to Prospect">
              <IconButton size="small" color="primary"
                onClick={(e) => { e.stopPropagation(); setSelected(row); setOpenConvert(true); }}>
                <SwapHorizIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
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
        <Typography variant="h5" fontWeight="bold">Leads Management</Typography>
        <Button variant="contained" startIcon={<AddIcon />}
          onClick={() => { setSelected(null); setForm(EMPTY_FORM); setOpenForm(true); }}>
          Add Lead
        </Button>
      </Box>

      <DataTable columns={columns} rows={leads} loading={loading} />

      {/* Create / Edit Dialog */}
      <Dialog open={openForm} onClose={() => setOpenForm(false)} maxWidth="md" fullWidth>
        <DialogTitle>{selected ? 'Edit Lead' : 'Add New Lead'}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            {[
              { name: 'company_name', label: 'Company Name *', required: true, sm: 6 },
              { name: 'contact_person', label: 'Contact Person *', required: true, sm: 6 },
              { name: 'mobile', label: 'Mobile *', required: true, sm: 4 },
              { name: 'whatsapp_number', label: 'WhatsApp Number', sm: 4 },
              { name: 'email', label: 'Email', sm: 4, type: 'email' },
              { name: 'city', label: 'City', sm: 4 },
              { name: 'state', label: 'State', sm: 4 },
              { name: 'gst_number', label: 'GST Number', sm: 4 },
              { name: 'follow_up_date', label: 'Follow-up Date', sm: 4, type: 'date', shrink: true },
            ].map(f => (
              <Grid item xs={12} sm={f.sm || 6} key={f.name}>
                <TextField fullWidth size="small" label={f.label} type={f.type || 'text'}
                  value={form[f.name] || ''}
                  onChange={e => setForm(p => ({ ...p, [f.name]: e.target.value }))}
                  InputLabelProps={f.shrink ? { shrink: true } : undefined}
                />
              </Grid>
            ))}
            <Grid item xs={12} sm={4}>
              <TextField fullWidth size="small" select label="Lead Source" value={form.lead_source || ''}
                onChange={e => setForm(p => ({ ...p, lead_source: e.target.value }))}>
                {SOURCES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth size="small" select label="Industry Type" value={form.industry_type || ''}
                onChange={e => setForm(p => ({ ...p, industry_type: e.target.value }))}>
                {INDUSTRIES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="Notes" multiline rows={2}
                value={form.notes || ''}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenForm(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}>
            {selected ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Convert to Prospect Dialog */}
      <Dialog open={openConvert} onClose={() => setOpenConvert(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Convert "{selected?.company_name}" to Prospect</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="Interested Products"
                value={convertForm.interested_products}
                onChange={e => setConvertForm(p => ({ ...p, interested_products: e.target.value }))} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="Demo Date" type="date" InputLabelProps={{ shrink: true }}
                value={convertForm.demo_date}
                onChange={e => setConvertForm(p => ({ ...p, demo_date: e.target.value }))} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="Expected Closing Date" type="date" InputLabelProps={{ shrink: true }}
                value={convertForm.expected_closing_date}
                onChange={e => setConvertForm(p => ({ ...p, expected_closing_date: e.target.value }))} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenConvert(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleConvert}>Convert</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={openDelete}
        title="Delete Lead"
        message={`Are you sure you want to delete lead for "${selected?.company_name}"?`}
        onCancel={() => setOpenDelete(false)}
        onConfirm={async () => {
          try {
            const api = (await import('../services/api')).default;
            await api.delete(`/leads/${selected.id}`);
            setOpenDelete(false);
            loadLeads();
          } catch { alert('Error deleting lead'); }
        }}
      />
    </Box>
  );
}
