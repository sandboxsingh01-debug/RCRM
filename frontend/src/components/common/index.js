import React, { useState } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableRow, Paper, TableContainer,
  TextField, InputAdornment, Box, TablePagination, CircularProgress,
  Typography, Chip, Dialog, DialogTitle, DialogContent, DialogActions, Button
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

// ─── DataTable ───────────────────────────────────────────────────────────────
export const DataTable = ({ columns, rows, loading, onRowClick }) => {
  const [search, setSearch]   = useState('');
  const [page, setPage]       = useState(0);
  const [rowsPerPage, setRPP] = useState(10);

  const filtered = rows.filter(row =>
    columns.some(col => String(row[col.key] ?? '').toLowerCase().includes(search.toLowerCase()))
  );
  const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Paper>
      <Box sx={{ p: 1.5 }}>
        <TextField
          size="small" placeholder="Search…" value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
        />
      </Box>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'primary.main' }}>
              {columns.map(col => (
                <TableCell key={col.key} sx={{ color: 'white', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                  {col.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={columns.length} align="center"><CircularProgress size={24} /></TableCell></TableRow>
            ) : paginated.length === 0 ? (
              <TableRow><TableCell colSpan={columns.length} align="center"><Typography color="text.secondary">No records found</Typography></TableCell></TableRow>
            ) : (
              paginated.map((row, i) => (
                <TableRow
                  key={row.id ?? i}
                  hover
                  onClick={() => onRowClick && onRowClick(row)}
                  sx={{ cursor: onRowClick ? 'pointer' : 'default', '&:nth-of-type(even)': { bgcolor: 'action.hover' } }}
                >
                  {columns.map(col => (
                    <TableCell key={col.key} sx={{ whiteSpace: 'nowrap' }}>
                      {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div" count={filtered.length} page={page} rowsPerPage={rowsPerPage}
        onPageChange={(_, p) => setPage(p)}
        onRowsPerPageChange={e => { setRPP(parseInt(e.target.value)); setPage(0); }}
        rowsPerPageOptions={[10, 25, 50]}
      />
    </Paper>
  );
};

// ─── ConfirmDialog ────────────────────────────────────────────────────────────
export const ConfirmDialog = ({ open, title, message, onConfirm, onCancel }) => (
  <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
    <DialogTitle>{title || 'Confirm Action'}</DialogTitle>
    <DialogContent><Typography>{message}</Typography></DialogContent>
    <DialogActions>
      <Button onClick={onCancel}>Cancel</Button>
      <Button onClick={onConfirm} color="error" variant="contained">Confirm</Button>
    </DialogActions>
  </Dialog>
);

// ─── StatusChip ───────────────────────────────────────────────────────────────
const STATUS_COLORS = {
  lead: 'default', prospect: 'info', customer: 'success', lost: 'error',
  open: 'warning', assigned: 'info', in_progress: 'primary', waiting_customer: 'secondary',
  resolved: 'success', closed: 'default',
  pending: 'warning', paid: 'success', overdue: 'error', partially_paid: 'info',
  active: 'success', inactive: 'default', suspended: 'error',
  low: 'default', medium: 'info', high: 'warning', urgent: 'error'
};

export const StatusChip = ({ status }) => (
  <Chip
    label={status?.replace(/_/g, ' ')}
    color={STATUS_COLORS[status] || 'default'}
    size="small"
    sx={{ textTransform: 'capitalize' }}
  />
);
