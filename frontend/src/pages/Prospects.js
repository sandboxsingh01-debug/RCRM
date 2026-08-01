import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Grid, Typography, IconButton, Tooltip
} from '@mui/material';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import { DataTable, StatusChip } from '../components/common';
import { getProspects, convertToCustomer } from '../services/api';

const EMPTY_CONVERT = {
  software_purchased: '', purchase_date: '', license_expiry: '', amc_expiry: ''
};

export default function Prospects() {
  const [prospects, setProspects] = useState([]);
  const [loading, setLoading]     = useState(false);
  const [selected, setSelected]   = useState(null);
  const [open, setOpen]           = useState(false);
  const [form, setForm]           = useState(EMPTY_CONVERT);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await getProspects(); setProspects(r.data.data || []); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleConvert = async () => {
    try {
      await convertToCustomer(selected.id, form);
      setOpen(false);
      setSelected(null);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Error converting prospect');
    }
  };

  const columns = [
    { key: 'prospect_id',         label: 'Prospect ID' },
    { key: 'company_name',        label: 'Company' },
    { key: 'interested_products', label: 'Interested Products' },
    { key: 'demo_date',           label: 'Demo Date' },
    { key: 'expected_closing_date', label: 'Expected Close' },
    { key: 'status',              label: 'Status', render: v => <StatusChip status={v} /> },
    {
      key: 'actions', label: 'Actions',
      render: (_, row) => row.status === 'active' && (
        <Tooltip title="Convert to Customer">
          <IconButton size="small" color="success"
            onClick={(e) => { e.stopPropagation(); setSelected(row); setForm(EMPTY_CONVERT); setOpen(true); }}>
            <SwapHorizIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )
    }
  ];

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" sx={{ mb: 2 }}>Prospects</Typography>
      <DataTable columns={columns} rows={prospects} loading={loading} />

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Convert "{selected?.company_name}" to Customer</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="Software Purchased"
                value={form.software_purchased}
                onChange={e => setForm(p => ({ ...p, software_purchased: e.target.value }))} />
            </Grid>
            {[
              { name: 'purchase_date', label: 'Purchase Date' },
              { name: 'license_expiry', label: 'License Expiry' },
              { name: 'amc_expiry', label: 'AMC Expiry' }
            ].map(f => (
              <Grid item xs={12} sm={4} key={f.name}>
                <TextField fullWidth size="small" label={f.label} type="date"
                  InputLabelProps={{ shrink: true }}
                  value={form[f.name]}
                  onChange={e => setForm(p => ({ ...p, [f.name]: e.target.value }))} />
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" color="success" onClick={handleConvert}>Convert to Customer</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
