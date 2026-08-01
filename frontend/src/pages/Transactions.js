import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Grid, MenuItem, Typography, IconButton, Tooltip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PaymentIcon from '@mui/icons-material/Payment';
import { DataTable, StatusChip } from '../components/common';
import { getTransactions, createTransaction } from '../services/api';
import api from '../services/api';

const TYPES = ['quotation', 'invoice', 'payment', 'credit_note'];

const EMPTY = {
  customer_id: '', transaction_type: 'invoice', invoice_number: '',
  invoice_date: '', amount: '', due_date: '', description: ''
};

export default function Transactions() {
  const [txns, setTxns]             = useState([]);
  const [loading, setLoading]       = useState(false);
  const [customers, setCustomers]   = useState([]);
  const [openForm, setOpenForm]     = useState(false);
  const [openPay, setOpenPay]       = useState(false);
  const [selected, setSelected]     = useState(null);
  const [form, setForm]             = useState(EMPTY);
  const [payAmount, setPayAmount]   = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await getTransactions(); setTxns(r.data.data || []); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    api.get('/customers').then(r => setCustomers(r.data.data || [])).catch(() => {});
  }, [load]);

  const handleCreate = async () => {
    try {
      await createTransaction(form);
      setOpenForm(false);
      setForm(EMPTY);
      load();
    } catch (err) { alert(err.response?.data?.message || 'Error creating transaction'); }
  };

  const handlePayment = async () => {
    try {
      await api.post(`/transactions/${selected.id}/payment`, { payment_amount: parseFloat(payAmount) });
      setOpenPay(false);
      setPayAmount('');
      load();
    } catch (err) { alert(err.response?.data?.message || 'Error recording payment'); }
  };

  const columns = [
    { key: 'transaction_id',   label: 'Txn ID' },
    { key: 'company_name',     label: 'Customer' },
    { key: 'transaction_type', label: 'Type', render: v => <Typography textTransform="capitalize">{v}</Typography> },
    { key: 'invoice_number',   label: 'Invoice #' },
    { key: 'invoice_date',     label: 'Date' },
    { key: 'amount',           label: 'Amount', render: v => `₹${parseFloat(v || 0).toLocaleString('en-IN')}` },
    { key: 'paid_amount',      label: 'Paid', render: v => `₹${parseFloat(v || 0).toLocaleString('en-IN')}` },
    { key: 'balance_amount',   label: 'Balance', render: v => `₹${parseFloat(v || 0).toLocaleString('en-IN')}` },
    { key: 'payment_status',   label: 'Status', render: v => <StatusChip status={v} /> },
    { key: 'due_date',         label: 'Due Date' },
    {
      key: 'actions', label: 'Actions',
      render: (_, row) => row.transaction_type === 'invoice' && row.payment_status !== 'paid' && (
        <Tooltip title="Record Payment">
          <IconButton size="small" color="success"
            onClick={(e) => { e.stopPropagation(); setSelected(row); setOpenPay(true); }}>
            <PaymentIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )
    }
  ];

  const totalAmount  = txns.reduce((s, t) => s + parseFloat(t.amount || 0), 0);
  const totalPaid    = txns.reduce((s, t) => s + parseFloat(t.paid_amount || 0), 0);
  const totalBalance = txns.reduce((s, t) => s + parseFloat(t.balance_amount || 0), 0);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" fontWeight="bold">Transactions & Payments</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setForm(EMPTY); setOpenForm(true); }}>
          New Transaction
        </Button>
      </Box>

      {/* Summary row */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {[
          { label: 'Total Invoiced', value: totalAmount, color: 'primary.main' },
          { label: 'Total Collected', value: totalPaid, color: 'success.main' },
          { label: 'Outstanding', value: totalBalance, color: 'error.main' }
        ].map(s => (
          <Grid item xs={12} sm={4} key={s.label}>
            <Box sx={{ p: 2, bgcolor: s.color, color: 'white', borderRadius: 1, textAlign: 'center' }}>
              <Typography variant="body2">{s.label}</Typography>
              <Typography variant="h6">₹{s.value.toLocaleString('en-IN')}</Typography>
            </Box>
          </Grid>
        ))}
      </Grid>

      <DataTable columns={columns} rows={txns} loading={loading} />

      {/* Create Transaction */}
      <Dialog open={openForm} onClose={() => setOpenForm(false)} maxWidth="sm" fullWidth>
        <DialogTitle>New Transaction</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField fullWidth size="small" select label="Customer *" value={form.customer_id}
                onChange={e => setForm(p => ({ ...p, customer_id: e.target.value }))}>
                {customers.map(c => <MenuItem key={c.id} value={c.id}>{c.company_name}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" select label="Type" value={form.transaction_type}
                onChange={e => setForm(p => ({ ...p, transaction_type: e.target.value }))}>
                {TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="Invoice Number" value={form.invoice_number}
                onChange={e => setForm(p => ({ ...p, invoice_number: e.target.value }))} />
            </Grid>
            <Grid item xs={4}>
              <TextField fullWidth size="small" label="Amount *" type="number" value={form.amount}
                onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} />
            </Grid>
            <Grid item xs={4}>
              <TextField fullWidth size="small" label="Invoice Date" type="date" InputLabelProps={{ shrink: true }}
                value={form.invoice_date}
                onChange={e => setForm(p => ({ ...p, invoice_date: e.target.value }))} />
            </Grid>
            <Grid item xs={4}>
              <TextField fullWidth size="small" label="Due Date" type="date" InputLabelProps={{ shrink: true }}
                value={form.due_date}
                onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="Description" value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenForm(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate}>Create</Button>
        </DialogActions>
      </Dialog>

      {/* Record Payment */}
      <Dialog open={openPay} onClose={() => setOpenPay(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Record Payment — {selected?.invoice_number}</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Outstanding: ₹{parseFloat(selected?.balance_amount || 0).toLocaleString('en-IN')}
          </Typography>
          <TextField fullWidth size="small" label="Payment Amount *" type="number"
            value={payAmount} onChange={e => setPayAmount(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPay(false)}>Cancel</Button>
          <Button variant="contained" color="success" onClick={handlePayment}>Record</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
