import axios from 'axios';

// Dynamic API URL — works on localhost AND ngrok/public
const getApiUrl = () => {
  if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL;
  const { hostname, protocol } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') return 'http://localhost:5000/api';
  if (hostname.includes('ngrok')) return '/api';
  return `${protocol}//${hostname}:5000/api`;
};

const api = axios.create({ baseURL: getApiUrl() });

// Auto-attach token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-logout on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const getLeads            = (params)   => api.get('/leads', { params });
export const createLead          = (data)     => api.post('/leads', data);
export const updateLead          = (id, data) => api.put(`/leads/${id}`, data);
export const convertToProspect   = (id, data) => api.post(`/leads/${id}/convert-to-prospect`, data);

export const getProspects        = ()         => api.get('/prospects');
export const convertToCustomer   = (id, data) => api.post(`/prospects/${id}/convert-to-customer`, data);

export const getCustomers        = ()         => api.get('/customers');
export const getCustomer         = (id)       => api.get(`/customers/${id}`);

export const getTickets          = ()         => api.get('/tickets');
export const createTicket        = (data)     => api.post('/tickets', data);
export const updateTicketStatus  = (id, data) => api.patch(`/tickets/${id}/status`, data);
export const assignTicket        = (id, data) => api.patch(`/tickets/${id}/assign`, data);
export const resolveTicket       = (id, data) => api.patch(`/tickets/${id}/resolve`, data);
export const getTicketTimeline   = (id)       => api.get(`/tickets/${id}/timeline`);

export const getTraining         = (cid)      => api.get(`/training/customer/${cid}`);
export const completeTraining    = (id, data) => api.patch(`/training/${id}/complete`, data);
export const updateTrainingStatus = (id, data) => api.patch(`/training/${id}/status`, data);

export const getTransactions     = ()         => api.get('/transactions');
export const createTransaction   = (data)     => api.post('/transactions', data);

export const createCommunication        = (data) => api.post('/communications', data);
export const getCustomerCommunications  = (cid)  => api.get(`/communications/customer/${cid}`);

export const sendWhatsApp         = (data) => api.post('/whatsapp/send', data);
export const getWhatsAppTemplates = ()     => api.get('/whatsapp/templates');

export const getSalesReport          = (params) => api.get('/reports/sales', { params });
export const getLeadConversionReport = ()       => api.get('/reports/lead-conversion');
export const getTicketReport         = ()       => api.get('/reports/tickets');
export const getRevenueReport        = ()       => api.get('/reports/revenue');

export const getAdminDashboard    = () => api.get('/dashboard/admin');
export const getSalesDashboard    = () => api.get('/dashboard/sales');
export const getSupportDashboard  = () => api.get('/dashboard/support');
export const getCustomerDashboard = () => api.get('/dashboard/customer');

export default api;
