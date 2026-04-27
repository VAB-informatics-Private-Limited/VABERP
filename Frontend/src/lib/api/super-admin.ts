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

export async function getAnalytics() {
  const res = await superAdminClient.get('/super-admin/analytics');
  return res.data;
}

export async function lockEnterprise(id: number) {
  const res = await superAdminClient.patch(`/super-admin/enterprises/${id}/lock`);
  return res.data;
}

export async function unlockEnterprise(id: number) {
  const res = await superAdminClient.patch(`/super-admin/enterprises/${id}/unlock`);
  return res.data;
}

export async function updateTaskVisibility(id: number, unrestricted: boolean) {
  const res = await superAdminClient.patch(`/super-admin/enterprises/${id}/task-visibility`, { unrestricted });
  return res.data;
}

export async function lockReseller(id: number) {
  const res = await superAdminClient.patch(`/super-admin/resellers/${id}/lock`);
  return res.data;
}

export async function unlockReseller(id: number) {
  const res = await superAdminClient.patch(`/super-admin/resellers/${id}/unlock`);
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

export async function updateEnterpriseProfile(
  id: number,
  body: Partial<{
    businessName: string;
    email: string;
    mobile: string;
    contactPerson: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    gstNumber: string;
    cinNumber: string;
    website: string;
  }>,
) {
  const res = await superAdminClient.patch(`/super-admin/enterprises/${id}`, body);
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
  durationDays?: number;
  durationType?: string;
  durationValue?: number;
  maxEmployees: number;
  features?: string;
  numberOfServicesAllowed?: number;
  serviceIds?: number[];
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
    durationType?: string;
    durationValue?: number;
    maxEmployees?: number;
    features?: string;
    numberOfServicesAllowed?: number;
    serviceIds?: number[];
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

export async function assignSubscriptionPlan(enterpriseId: number, planId: number, couponCode?: string) {
  const res = await superAdminClient.post('/super-admin/subscriptions/assign', { enterpriseId, planId, couponCode });
  return res.data;
}

// ─── Services Master ──────────────────────────────────────────────────────────

export async function getServices() {
  const res = await superAdminClient.get('/super-admin/services');
  return res.data;
}

export async function createService(body: { serviceName: string; status?: string }) {
  const res = await superAdminClient.post('/super-admin/services', body);
  return res.data;
}

export async function updateService(id: number, body: { serviceName?: string; status?: string }) {
  const res = await superAdminClient.patch(`/super-admin/services/${id}`, body);
  return res.data;
}

export async function deleteService(id: number) {
  const res = await superAdminClient.delete(`/super-admin/services/${id}`);
  return res.data;
}

// ─── Coupons ──────────────────────────────────────────────────────────────────

export async function getCoupons() {
  const res = await superAdminClient.get('/super-admin/coupons');
  return res.data;
}

export async function createCoupon(body: {
  couponCode: string;
  discountType: string;
  discountValue: number;
  expiryDate: string;
  status?: string;
  maxUses?: number;
}) {
  const res = await superAdminClient.post('/super-admin/coupons', body);
  return res.data;
}

export async function updateCoupon(id: number, body: {
  discountType?: string;
  discountValue?: number;
  expiryDate?: string;
  status?: string;
  maxUses?: number;
}) {
  const res = await superAdminClient.patch(`/super-admin/coupons/${id}`, body);
  return res.data;
}

export async function deleteCoupon(id: number) {
  const res = await superAdminClient.delete(`/super-admin/coupons/${id}`);
  return res.data;
}

export async function validateCoupon(couponCode: string, amount: number) {
  const res = await superAdminClient.post('/super-admin/coupons/validate', { couponCode, amount });
  return res.data;
}

// ─── Resellers ────────────────────────────────────────────────────────────────

export async function getResellers() {
  const res = await superAdminClient.get('/super-admin/resellers');
  return res.data;
}

export async function createReseller(body: {
  name: string;
  email: string;
  password: string;
  mobile: string;
  companyName?: string;
}) {
  const res = await superAdminClient.post('/super-admin/resellers', body);
  return res.data;
}

export async function getResellerDetail(id: number) {
  const res = await superAdminClient.get(`/super-admin/resellers/${id}`);
  return res.data;
}

export async function updateResellerStatus(id: number, status: string) {
  const res = await superAdminClient.patch(`/super-admin/resellers/${id}/status`, { status });
  return res.data;
}

export async function setResellerPlanPricing(resellerId: number, data: { planId: number; resellerPrice: number }) {
  const res = await superAdminClient.post(`/super-admin/resellers/${resellerId}/plan-pricing`, data);
  return res.data;
}

export async function getResellerPlanPricing(resellerId: number) {
  const res = await superAdminClient.get(`/super-admin/resellers/${resellerId}/plan-pricing`);
  return res.data;
}

export async function getResellerReport(resellerId: number) {
  const res = await superAdminClient.get(`/super-admin/resellers/${resellerId}/report`);
  return res.data;
}

export async function getResellerWallet(resellerId: number) {
  const res = await superAdminClient.get(`/super-admin/resellers/${resellerId}/wallet`);
  return res.data;
}

export async function creditResellerWallet(resellerId: number, data: { amount: number; description?: string }) {
  const res = await superAdminClient.post(`/super-admin/resellers/${resellerId}/wallet/credit`, data);
  return res.data;
}

export async function assignPlanToReseller(resellerId: number, planId: number) {
  const res = await superAdminClient.post(`/super-admin/resellers/${resellerId}/assign-plan`, { planId });
  return res.data;
}

export async function reassignReseller(enterpriseId: number, resellerId: number | null) {
  const res = await superAdminClient.patch(`/super-admin/enterprises/${enterpriseId}/reseller`, { resellerId });
  return res.data;
}

export async function getAllResellersList() {
  const res = await superAdminClient.get('/super-admin/resellers-list');
  return res.data;
}

export async function getResellersSubscriptionsOverview() {
  const res = await superAdminClient.get('/super-admin/reseller-subscriptions-overview');
  return res.data;
}

export async function getResellersWalletsOverview() {
  const res = await superAdminClient.get('/super-admin/reseller-wallets-overview');
  return res.data;
}

// ─── Reseller Plans CRUD ──────────────────────────────────────────────────

export async function getResellerPlans() {
  const res = await superAdminClient.get('/super-admin/reseller-plans');
  return res.data;
}

export async function createResellerPlan(body: {
  name: string;
  description?: string;
  price: number;
  durationDays: number;
  commissionPercentage: number;
  maxTenants?: number;
  features?: string;
}) {
  const res = await superAdminClient.post('/super-admin/reseller-plans', body);
  return res.data;
}

export async function updateResellerPlan(id: number, body: {
  name?: string;
  description?: string;
  price?: number;
  durationDays?: number;
  commissionPercentage?: number;
  maxTenants?: number;
  features?: string;
  isActive?: boolean;
}) {
  const res = await superAdminClient.patch(`/super-admin/reseller-plans/${id}`, body);
  return res.data;
}

export async function deleteResellerPlan(id: number) {
  const res = await superAdminClient.delete(`/super-admin/reseller-plans/${id}`);
  return res.data;
}

export async function getResellerTenants(resellerId: number) {
  const res = await superAdminClient.get(`/super-admin/resellers/${resellerId}/tenants`);
  return res.data;
}

export async function getResellerEarnings(resellerId: number) {
  const res = await superAdminClient.get(`/super-admin/resellers/${resellerId}/earnings`);
  return res.data;
}
