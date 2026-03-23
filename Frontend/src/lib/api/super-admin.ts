import axios from 'axios';

const superAdminClient = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

superAdminClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem('superadmin-storage');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        const token = parsed?.state?.token;
        if (token) config.headers.Authorization = `Bearer ${token}`;
      } catch {
        // ignore
      }
    }
  }
  return config;
});

superAdminClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      if (!window.location.pathname.startsWith('/superadmin/login')) {
        localStorage.removeItem('superadmin-storage');
        window.location.href = '/superadmin/login';
      }
    }
    return Promise.reject(err);
  }
);

export async function superAdminLogin(email: string, password: string) {
  const res = await superAdminClient.post('/super-admin/login', { email, password });
  return res.data;
}

export async function getDashboard() {
  const res = await superAdminClient.get('/super-admin/dashboard');
  return res.data;
}

export async function getAllEnterprises() {
  const res = await superAdminClient.get('/super-admin/enterprises');
  return res.data;
}

export async function createEnterprise(data: Record<string, any>) {
  const res = await superAdminClient.post('/super-admin/enterprises', data);
  return res.data;
}

export async function getEnterprisePayment(id: number) {
  const res = await superAdminClient.get(`/super-admin/enterprises/${id}/payment`);
  return res.data;
}

export async function approveEnterprise(id: number) {
  const res = await superAdminClient.post(`/super-admin/enterprises/${id}/approve`);
  return res.data;
}

export async function rejectEnterprise(id: number) {
  const res = await superAdminClient.post(`/super-admin/enterprises/${id}/reject`);
  return res.data;
}

export async function getEnterprise(id: number) {
  const res = await superAdminClient.get(`/super-admin/enterprises/${id}`);
  return res.data;
}

export async function updateEnterpriseStatus(id: number, status: string) {
  const res = await superAdminClient.patch(`/super-admin/enterprises/${id}/status`, { status });
  return res.data;
}

export async function updateEnterpriseExpiry(id: number, expiryDate: string) {
  const res = await superAdminClient.patch(`/super-admin/enterprises/${id}/expiry`, { expiryDate });
  return res.data;
}

export async function getEnterpriseFinancials(id: number, period: string = '30d') {
  const res = await superAdminClient.get(`/super-admin/enterprises/${id}/financials?period=${period}`);
  return res.data;
}

// ─── Module 1: Employees ─────────────────────────────────────────────────────

export async function getAllEmployees() {
  const res = await superAdminClient.get('/super-admin/employees');
  return res.data;
}

export async function getEmployeeStats() {
  const res = await superAdminClient.get('/super-admin/employees/stats');
  return res.data;
}

// ─── Module 2: Accounts ───────────────────────────────────────────────────────

export async function getPlatformAccounts(period: string = '30d') {
  const res = await superAdminClient.get(`/super-admin/accounts?period=${period}`);
  return res.data;
}

// ─── Module 3: Support ────────────────────────────────────────────────────────

export async function getAllTickets(status?: string) {
  const url = status ? `/super-admin/support?status=${status}` : '/super-admin/support';
  const res = await superAdminClient.get(url);
  return res.data;
}

export async function getTicket(id: number) {
  const res = await superAdminClient.get(`/super-admin/support/${id}`);
  return res.data;
}

export async function replyToTicket(id: number, reply: string, status: string) {
  const res = await superAdminClient.patch(`/super-admin/support/${id}/reply`, { reply, status });
  return res.data;
}

export async function getTicketStats() {
  const res = await superAdminClient.get('/super-admin/support/stats');
  return res.data;
}

// ─── Module 4: Subscriptions ─────────────────────────────────────────────────

export async function getSubscriptionPlans() {
  const res = await superAdminClient.get('/super-admin/subscriptions/plans');
  return res.data;
}

export async function createSubscriptionPlan(body: {
  name: string;
  description?: string;
  price: number;
  durationDays: number;
  maxEmployees: number;
  features?: string;
}) {
  const res = await superAdminClient.post('/super-admin/subscriptions/plans', body);
  return res.data;
}

export async function updateSubscriptionPlan(
  id: number,
  body: {
    name?: string;
    description?: string;
    price?: number;
    durationDays?: number;
    maxEmployees?: number;
    features?: string;
  }
) {
  const res = await superAdminClient.patch(`/super-admin/subscriptions/plans/${id}`, body);
  return res.data;
}

export async function deleteSubscriptionPlan(id: number) {
  const res = await superAdminClient.delete(`/super-admin/subscriptions/plans/${id}`);
  return res.data;
}

export async function getEnterpriseSubscriptions() {
  const res = await superAdminClient.get('/super-admin/subscriptions/enterprises');
  return res.data;
}

export async function assignSubscriptionPlan(enterpriseId: number, planId: number) {
  const res = await superAdminClient.post('/super-admin/subscriptions/assign', { enterpriseId, planId });
  return res.data;
}
