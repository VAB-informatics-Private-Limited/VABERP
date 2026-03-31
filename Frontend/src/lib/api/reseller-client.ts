import axios from 'axios';

export const resellerClient = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

resellerClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem('reseller-storage');
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

resellerClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      if (!window.location.pathname.startsWith('/reseller/login')) {
        localStorage.removeItem('reseller-storage');
        window.location.href = '/reseller/login';
      }
    }
    return Promise.reject(err);
  }
);

export async function resellerLogin(email: string, password: string) {
  const res = await resellerClient.post('/resellers/login', { email, password });
  return res.data;
}

export async function getMyProfile() {
  const res = await resellerClient.get('/resellers/me/profile');
  return res.data;
}

export async function getMyPlans() {
  const res = await resellerClient.get('/resellers/me/plans');
  return res.data;
}

export async function getEnterprisePlansForReseller() {
  const res = await resellerClient.get('/resellers/me/enterprise-plans');
  return res.data;
}

export async function getMyTenants() {
  const res = await resellerClient.get('/resellers/me/tenants');
  return res.data;
}

export async function getMyReport() {
  const res = await resellerClient.get('/resellers/me/report');
  return res.data;
}

export async function getMySubscriptions() {
  const res = await resellerClient.get('/resellers/me/subscriptions');
  return res.data;
}

export async function getMyUsage() {
  const res = await resellerClient.get('/resellers/me/usage');
  return res.data;
}

export async function getMyBilling() {
  const res = await resellerClient.get('/resellers/me/billing');
  return res.data;
}

export async function getMyCommissions() {
  const res = await resellerClient.get('/resellers/me/commissions');
  return res.data;
}

export async function getMyWallet() {
  const res = await resellerClient.get('/resellers/me/wallet');
  return res.data;
}

export async function getMySubscriptionPlans() {
  const res = await resellerClient.get('/resellers/me/subscription-plans');
  return res.data;
}

export async function getMyCurrentSubscription() {
  const res = await resellerClient.get('/resellers/me/my-subscription');
  return res.data;
}

export async function subscribeToPlan(planId: number) {
  const res = await resellerClient.post('/resellers/me/subscribe', { planId });
  return res.data;
}

export async function getMyResellerStatus() {
  const res = await resellerClient.get('/resellers/me/status');
  return res.data;
}

export async function updateMyProfile(data: { name?: string; mobile?: string; companyName?: string }) {
  const res = await resellerClient.patch('/resellers/me/profile', data);
  return res.data;
}

export async function changeMyPassword(data: { currentPassword: string; newPassword: string }) {
  const res = await resellerClient.post('/resellers/me/change-password', data);
  return res.data;
}

export async function createTenant(data: { businessName: string; email: string; mobile: string; planId: number }) {
  const res = await resellerClient.post('/resellers/me/tenants', data);
  return res.data;
}

export async function assignPlanToTenant(enterpriseId: number, planId: number) {
  const res = await resellerClient.post(`/resellers/me/tenants/${enterpriseId}/assign-plan`, { planId });
  return res.data;
}

export async function renewTenantPlan(enterpriseId: number, planId?: number) {
  const res = await resellerClient.post(`/resellers/me/tenants/${enterpriseId}/renew`, planId ? { planId } : {});
  return res.data;
}
