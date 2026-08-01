import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Grid, Paper, Tab, Tabs, CircularProgress
} from '@mui/material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer
} from 'recharts';
import { getSalesReport, getTicketReport, getRevenueReport, getLeadConversionReport } from '../services/api';

const COLORS = ['#1976d2', '#dc004e', '#2e7d32', '#ed6c02', '#7b1fa2', '#0288d1'];

const ChartCard = ({ title, children, loading }) => (
  <Paper sx={{ p: 2 }}>
    <Typography variant="h6" sx={{ mb: 2 }}>{title}</Typography>
    {loading ? <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box> : children}
  </Paper>
);

export default function Reports() {
  const [tab, setTab]               = useState(0);
  const [salesData, setSales]       = useState([]);
  const [ticketData, setTickets]    = useState([]);
  const [revenueData, setRevenue]   = useState([]);
  const [conversionData, setConv]   = useState([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    Promise.all([
      getSalesReport().catch(() => ({ data: { data: [] } })),
      getTicketReport().catch(() => ({ data: { data: [] } })),
      getRevenueReport().catch(() => ({ data: { data: [] } })),
      getLeadConversionReport().catch(() => ({ data: { data: [] } })),
    ]).then(([sales, tickets, revenue, conversion]) => {
      setSales(sales.data.data || []);
      setTickets(tickets.data.data || []);
      setRevenue(revenue.data.data || []);
      setConv(conversion.data.data || []);
      setLoading(false);
    });
  }, []);

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" sx={{ mb: 2 }}>Reports & Analytics</Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="Sales Funnel" />
        <Tab label="Ticket Analysis" />
        <Tab label="Revenue" />
        <Tab label="Lead Conversion" />
      </Tabs>

      {tab === 0 && (
        <ChartCard title="Sales Funnel — Lead Status" loading={loading}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={salesData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="status" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#1976d2" name="Count" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {tab === 1 && (
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <ChartCard title="Tickets by Status" loading={loading}>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={ticketData} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={100} label>
                    {ticketData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </Grid>
          <Grid item xs={12} md={6}>
            <ChartCard title="Tickets by Priority" loading={loading}>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={ticketData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="priority" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#dc004e" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </Grid>
        </Grid>
      )}

      {tab === 2 && (
        <ChartCard title="Monthly Revenue" loading={loading}>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(v) => `₹${parseFloat(v).toLocaleString('en-IN')}`} />
              <Legend />
              <Line type="monotone" dataKey="total_amount" stroke="#1976d2" name="Invoiced" strokeWidth={2} />
              <Line type="monotone" dataKey="total_paid" stroke="#2e7d32" name="Collected" strokeWidth={2} />
              <Line type="monotone" dataKey="total_balance" stroke="#dc004e" name="Outstanding" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {tab === 3 && (
        <ChartCard title="Lead Conversion by Executive" loading={loading}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={conversionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="full_name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="leads" fill="#1976d2" name="Leads" />
              <Bar dataKey="prospects" fill="#ed6c02" name="Prospects" />
              <Bar dataKey="customers" fill="#2e7d32" name="Customers" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}
    </Box>
  );
}
