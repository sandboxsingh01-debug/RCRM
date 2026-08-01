import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Grid, Paper, Typography, Box, Card, CardContent, Chip, Divider, CircularProgress
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PeopleIcon from '@mui/icons-material/People';
import BusinessIcon from '@mui/icons-material/Business';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import { getAdminDashboard, getSalesDashboard, getSupportDashboard } from '../services/api';

const STAT_CARDS = {
  super_admin: [
    { key: 'total_leads',      label: 'Total Leads',      color: '#1976d2', icon: <TrendingUpIcon /> },
    { key: 'total_prospects',  label: 'Prospects',         color: '#7b1fa2', icon: <PeopleIcon /> },
    { key: 'total_customers',  label: 'Customers',         color: '#2e7d32', icon: <BusinessIcon /> },
    { key: 'pending_tickets',  label: 'Pending Tickets',   color: '#e65100', icon: <ConfirmationNumberIcon /> },
    { key: 'resolved_tickets', label: 'Resolved Tickets',  color: '#00695c', icon: <ConfirmationNumberIcon /> },
    { key: 'pending_training', label: 'Pending Training',  color: '#1565c0', icon: <PeopleIcon /> },
  ],
  sales_user: [
    { key: 'my_leads',      label: 'My Leads',      color: '#1976d2' },
    { key: 'my_prospects',  label: 'My Prospects',  color: '#7b1fa2' },
    { key: 'my_customers',  label: 'My Customers',  color: '#2e7d32' },
  ],
  support_user: [
    { key: 'my_open_tickets',     label: 'My Open Tickets',     color: '#e65100' },
    { key: 'my_resolved_tickets', label: 'My Resolved Tickets', color: '#2e7d32' },
  ],
};

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats]     = useState({});
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      let res;
      if (user.role === 'super_admin')   res = await getAdminDashboard();
      else if (user.role === 'sales_user')   res = await getSalesDashboard();
      else if (user.role === 'support_user') res = await getSupportDashboard();
      setStats(res?.data?.data || {});
    } catch {
      setStats({});
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  if (loading) {
    return <Box display="flex" justifyContent="center" pt={8}><CircularProgress /></Box>;
  }

  const cards = STAT_CARDS[user?.role] || [];

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" sx={{ mb: 3 }}>
        Welcome, {user?.full_name} 👋
      </Typography>

      {/* Stat cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {cards.map(card => (
          <Grid item xs={6} sm={4} md={3} key={card.key}>
            <Card sx={{ bgcolor: card.color, color: 'white', height: '100%' }}>
              <CardContent sx={{ '&:last-child': { pb: 2 } }}>
                <Typography variant="h3" fontWeight="bold">
                  {stats[card.key] ?? 0}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  {card.label}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Admin-only panels */}
      {user?.role === 'super_admin' && (
        <Grid container spacing={2}>
          {/* Revenue summary */}
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: '#1b5e20', color: 'white' }}>
              <CardContent sx={{ '&:last-child': { pb: 2 } }}>
                <Typography variant="h5" fontWeight="bold">
                  ₹{parseFloat(stats.total_revenue || 0).toLocaleString('en-IN')}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>Total Revenue</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: '#b71c1c', color: 'white' }}>
              <CardContent sx={{ '&:last-child': { pb: 2 } }}>
                <Typography variant="h5" fontWeight="bold">
                  ₹{parseFloat(stats.outstanding_amount || 0).toLocaleString('en-IN')}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>Outstanding</Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Recent Tickets */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
                Recent Tickets
              </Typography>
              {(stats.recent_tickets || []).length === 0
                ? <Typography variant="body2" color="text.secondary">No tickets yet</Typography>
                : (stats.recent_tickets || []).map((t, i) => (
                    <Box key={t.id}>
                      <Box sx={{ py: 0.75, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                          <Typography variant="body2" fontWeight="bold">{t.ticket_number}</Typography>
                          <Typography variant="caption" color="text.secondary">{t.company_name} — {t.subject}</Typography>
                        </Box>
                        <Chip label={t.status} size="small"
                          color={t.status === 'open' ? 'warning' : t.status === 'resolved' ? 'success' : 'info'} />
                      </Box>
                      {i < (stats.recent_tickets.length - 1) && <Divider />}
                    </Box>
                  ))
              }
            </Paper>
          </Grid>

          {/* AMC Expiry Alerts */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
                AMC Expiring Soon 🔔
              </Typography>
              {(stats.amc_expiring_soon || []).length === 0
                ? <Typography variant="body2" color="text.secondary">No expiring AMCs</Typography>
                : (stats.amc_expiring_soon || []).map((c, i) => (
                    <Box key={c.id}>
                      <Box sx={{ py: 0.75, display: 'flex', justifyContent: 'space-between' }}>
                        <Box>
                          <Typography variant="body2" fontWeight="bold">{c.company_name}</Typography>
                          <Typography variant="caption" color="text.secondary">{c.mobile}</Typography>
                        </Box>
                        <Typography variant="caption" color="error.main" fontWeight="bold">
                          {c.amc_expiry}
                        </Typography>
                      </Box>
                      {i < (stats.amc_expiring_soon.length - 1) && <Divider />}
                    </Box>
                  ))
              }
            </Paper>
          </Grid>

          {/* Sales Funnel */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
                Sales Funnel
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {(stats.sales_funnel || []).map(f => (
                  <Box key={f.status} sx={{
                    px: 2, py: 1, bgcolor: 'action.hover', borderRadius: 1,
                    textAlign: 'center', minWidth: 100
                  }}>
                    <Typography variant="h6" fontWeight="bold">{f.count}</Typography>
                    <Typography variant="caption" textTransform="capitalize">{f.status}</Typography>
                  </Box>
                ))}
              </Box>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Support user — ticket list */}
      {user?.role === 'support_user' && (stats.my_tickets || []).length > 0 && (
        <Paper sx={{ p: 2, mt: 2 }}>
          <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>My Open Tickets</Typography>
          {stats.my_tickets.map((t, i) => (
            <Box key={t.id}>
              <Box sx={{ py: 0.75, display: 'flex', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" fontWeight="bold">{t.ticket_number} — {t.subject}</Typography>
                  <Typography variant="caption" color="text.secondary">{t.company_name}</Typography>
                </Box>
                <Chip label={t.priority} size="small"
                  color={t.priority === 'urgent' ? 'error' : t.priority === 'high' ? 'warning' : 'default'} />
              </Box>
              {i < stats.my_tickets.length - 1 && <Divider />}
            </Box>
          ))}
        </Paper>
      )}

      {/* Sales user — follow-ups */}
      {user?.role === 'sales_user' && (stats.today_followups || []).length > 0 && (
        <Paper sx={{ p: 2, mt: 2 }}>
          <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>Today's Follow-ups 📅</Typography>
          {stats.today_followups.map((l, i) => (
            <Box key={l.id}>
              <Box sx={{ py: 0.75 }}>
                <Typography variant="body2" fontWeight="bold">{l.company_name}</Typography>
                <Typography variant="caption" color="text.secondary">{l.contact_person} — {l.mobile}</Typography>
              </Box>
              {i < stats.today_followups.length - 1 && <Divider />}
            </Box>
          ))}
        </Paper>
      )}
    </Box>
  );
}
