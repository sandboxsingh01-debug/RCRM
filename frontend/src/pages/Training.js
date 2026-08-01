import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, MenuItem, TextField, Grid, Button,
  Dialog, DialogTitle, DialogContent, DialogActions,
  LinearProgress, Card, CardContent, CardActions, Chip, Paper
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/HourglassEmpty';
import { getCustomers } from '../services/api';
import { completeTraining, getTraining, updateTrainingStatus } from '../services/api';
import { StatusChip } from '../components/common';

export default function Training() {
  const [customers, setCustomers] = useState([]);
  const [selCustomer, setSelCustomer] = useState('');
  const [schedule, setSchedule]   = useState([]);
  const [openDone, setOpenDone]   = useState(false);
  const [openSchedule, setOpenSchedule] = useState(false);
  const [selected, setSelected]   = useState(null);
  const [form, setForm]           = useState({ customer_feedback: '', notes: '' });
  const [scheduleForm, setScheduleForm] = useState({ scheduled_date: '' });

  useEffect(() => {
    getCustomers().then(r => setCustomers(r.data.data || [])).catch(() => {});
  }, []);

  const loadSchedule = useCallback(async (custId) => {
    if (!custId) return;
    try {
      const r = await getTraining(custId);
      setSchedule(r.data.data || []);
    } catch { setSchedule([]); }
  }, []);

  useEffect(() => { loadSchedule(selCustomer); }, [selCustomer, loadSchedule]);

  const handleComplete = async () => {
    try {
      await completeTraining(selected.id, form);
      setOpenDone(false);
      setForm({ customer_feedback: '', notes: '' });
      loadSchedule(selCustomer);
    } catch (err) { alert('Error updating training'); }
  };

  const handleSchedule = async () => {
    try {
      await updateTrainingStatus(selected.id, {
        status: 'scheduled',
        scheduled_date: scheduleForm.scheduled_date
      });
      setOpenSchedule(false);
      setScheduleForm({ scheduled_date: '' });
      loadSchedule(selCustomer);
    } catch (err) { alert('Error scheduling training'); }
  };

  const completed = schedule.filter(s => s.status === 'completed').length;
  const progress  = schedule.length ? Math.round((completed / schedule.length) * 100) : 0;

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" sx={{ mb: 2 }}>Training & Onboarding</Typography>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={4}>
            <TextField fullWidth size="small" select label="Select Customer" value={selCustomer}
              onChange={e => setSelCustomer(e.target.value)}>
              <MenuItem value=""><em>— Select Customer —</em></MenuItem>
              {customers.map(c => <MenuItem key={c.id} value={c.id}>{c.company_name}</MenuItem>)}
            </TextField>
          </Grid>
          {selCustomer && (
            <Grid item xs={12} sm={6}>
              <Typography variant="body2">
                Progress: {completed}/{schedule.length} ({progress}%)
              </Typography>
              <LinearProgress variant="determinate" value={progress} sx={{ mt: 0.5, height: 8, borderRadius: 4 }} />
            </Grid>
          )}
        </Grid>
      </Paper>

      {schedule.length > 0 ? (
        <Grid container spacing={2}>
          {schedule.map(item => (
            <Grid item xs={12} sm={6} md={4} key={item.id}>
              <Card variant="outlined" sx={{
                borderLeft: `4px solid`,
                borderColor: item.status === 'completed' ? 'success.main' : item.status === 'scheduled' ? 'info.main' : 'grey.400'
              }}>
                <CardContent sx={{ pb: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Chip label={`Day ${item.day_number}`} size="small" color="primary" />
                    <StatusChip status={item.status} />
                  </Box>
                  <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 1 }}>
                    {item.training_title}
                  </Typography>
                  {item.scheduled_date && (
                    <Typography variant="caption" color="text.secondary">
                      Scheduled: {new Date(item.scheduled_date).toLocaleDateString()}
                    </Typography>
                  )}
                  {item.completed_date && (
                    <Typography variant="caption" color="success.main" display="block">
                      ✅ Completed: {new Date(item.completed_date).toLocaleDateString()}
                    </Typography>
                  )}
                  {item.customer_feedback && (
                    <Typography variant="caption" display="block" sx={{ mt: 0.5, fontStyle: 'italic' }}>
                      Feedback: {item.customer_feedback}
                    </Typography>
                  )}
                </CardContent>
                {item.status !== 'completed' && (
                  <CardActions sx={{ pt: 0 }}>
                    {item.status === 'pending' && (
                      <Button size="small" color="info"
                        onClick={() => { setSelected(item); setScheduleForm({ scheduled_date: '' }); setOpenSchedule(true); }}>
                        Schedule
                      </Button>
                    )}
                    <Button size="small" startIcon={<CheckCircleIcon />} color="success"
                      onClick={() => { setSelected(item); setOpenDone(true); }}>
                      Mark Complete
                    </Button>
                  </CardActions>
                )}
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : selCustomer ? (
        <Typography color="text.secondary">No training schedule found for this customer.</Typography>
      ) : (
        <Typography color="text.secondary">Select a customer to view training schedule.</Typography>
      )}

      <Dialog open={openSchedule} onClose={() => setOpenSchedule(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Schedule Training — {selected?.training_title}</DialogTitle>
        <DialogContent dividers>
          <TextField fullWidth size="small" type="date" label="Scheduled Date"
            InputLabelProps={{ shrink: true }}
            value={scheduleForm.scheduled_date}
            onChange={e => setScheduleForm({ scheduled_date: e.target.value })}
            sx={{ mt: 1 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenSchedule(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSchedule} disabled={!scheduleForm.scheduled_date}>
            Schedule & Notify
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openDone} onClose={() => setOpenDone(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Complete Training — {selected?.training_title}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="Customer Feedback"
                value={form.customer_feedback}
                onChange={e => setForm(p => ({ ...p, customer_feedback: e.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="Notes" multiline rows={3}
                value={form.notes}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDone(false)}>Cancel</Button>
          <Button variant="contained" color="success" onClick={handleComplete}>Mark as Completed</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
