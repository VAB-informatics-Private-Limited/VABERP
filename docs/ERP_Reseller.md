# ERP — Reseller · Test Flow Document

> **Persona:** Reseller (logs in via `/reseller/login`, JWT `type='reseller'`, scoped to own tenants only — no platform admin access, no tenant-level data access).
> **Audience:** QA tester; run after super-admin has provisioned the test reseller.
> **Companion files:** `ERP_Enterprise.md`, `ERP_Employee.md`, `ERP_SuperAdmin.md`, `FSD.md`.
> **Critical:** every list endpoint must filter to the reseller's own tenants. Cross-reseller leakage = **P0 SECURITY**.

---

## How to use this document

1. Run on QA. Do **not** run wallet top-ups against real payment gateways.
2. Two reseller personas needed: `rajesh@techresell.in` (active, has tenants) and a second test reseller (e.g. `kumar@techresell.in`) for cross-reseller isolation tests.
3. After each cycle, reset wallet balance to seed value via SA console.
4. Mark `[PASS]` / `[FAIL]` / `[BLOCKED]` per step. Cross-reseller leakage = **P0 SECURITY**.

---

## Table of Contents

1. [Pre-requisites & Personas](#1-pre-requisites--personas)
2. [Authentication](#2-authentication)
3. [Activation Flow](#3-activation-flow)
4. [Session, Token, Logout](#4-session-token-logout)
5. [Reseller Dashboard](#5-reseller-dashboard)
6. [Profile & Self-service](#6-profile--self-service)
7. [Wallet & Top-up](#7-wallet--top-up)
8. [Billing / Invoices](#8-billing--invoices)
9. [Plans Catalog](#9-plans-catalog)
10. [My Subscription](#10-my-subscription)
11. [Subscriptions (assigned to tenants)](#11-subscriptions-assigned-to-tenants)
12. [Tenants — Provisioning & Management](#12-tenants--provisioning--management)
13. [Usage Metrics](#13-usage-metrics)
14. [Commissions](#14-commissions)
15. [Reports](#15-reports)
16. [Cross-Reseller / Cross-Role Isolation](#16-cross-reseller--cross-role-isolation)
17. [Notifications & Audit](#17-notifications--audit)
18. [End-to-End Flows](#18-end-to-end-flows)
19. [Negative / Edge / Security](#19-negative--edge--security)
20. [Sign-off Checklist](#20-sign-off-checklist)

---

## 1. Pre-requisites & Personas

### 1.1 Test accounts

| Account | URL | Email | Password | State |
|---|---|---|---|---|
| Active reseller A (primary) | `/reseller/login` | `rajesh@techresell.in` | `Reseller@123` | Active, ≥2 tenants |
| Active reseller B (for isolation tests) | `/reseller/login` | `kumar@techresell.in` | `Reseller@123` | Active, ≥1 tenant |
| Pending reseller | activation link from SA | `pending.reseller@vaberp-test.com` | (set on activation) | Pending — needs activation |

### 1.2 Pre-seed data

- Reseller A: ≥2 tenants linked (`Acme`, `Beta`).
- Reseller A: wallet balance ≥ `1000` for top-up tests.
- ≥1 reseller plan available (`Bronze`).
- ≥1 tenant subscription plan (`Pro`).

### 1.3 Browser & tooling

- Chrome incognito for clean login.
- DevTools → Network + Console.
- Have SA browser/profile open in parallel for verification.

---

## 2. Authentication

### Flow 2.1 — Valid login

| # | Step | Expected |
|---|---|---|
| 1 | Open `/reseller/login` | Form: email + password. Logo, "Reseller Portal" heading, "Sign in to manage your tenants" subheading. |
| 2 | Type `rajesh@techresell.in` / `Reseller@123` → Sign In | Toast (silent or success). Redirect `/reseller/dashboard`. `resellerStore.reseller` populated.<br/>API: `POST /resellers/login → 200`. |

### Flow 2.2 — Invalid credentials

| # | Action | Expected |
|---|---|---|
| 1 | Wrong password | Toast `Invalid credentials`. 401. |
| 2 | Unknown email | Toast `Invalid credentials`. |
| 3 | Email blank | Field error. |
| 4 | Password blank | Field error. |

### Flow 2.3 — Auto-fill demo creds

| # | Step | Expected |
|---|---|---|
| 1 | Click **Auto Fill Credentials** | Fields populated with demo (`rajesh@techresell.in / Reseller@123`). |

### Flow 2.4 — Inactive / blocked reseller

| # | Step | Expected |
|---|---|---|
| 1 | SA blocks the reseller | Status `blocked`. |
| 2 | Reseller tries login | Toast `Your reseller account is blocked` (or `Invalid credentials` depending on policy). 401. |

### Flow 2.5 — Pending reseller cannot login until activated

| # | Step | Expected |
|---|---|---|
| 1 | SA creates new reseller; reseller has not activated yet | Status `pending`. |
| 2 | Try login | 401 `Account not yet activated` (or generic). |

### Flow 2.6 — Already-logged-in user visiting login

| # | Step | Expected |
|---|---|---|
| 1 | While logged in, paste `/reseller/login` | Auto-redirect `/reseller/dashboard`. |

---

## 3. Activation Flow

URL: `/reseller/activate`

### Flow 3.1 — Activate via email link

| # | Step | Expected |
|---|---|---|
| 1 | SA creates reseller; activation email sent | Email contains link with token. |
| 2 | Open link → `/reseller/activate?token=…` | Activation form: set password, optional profile fields. |
| 3 | Submit | Status `active`. Redirect `/reseller/login` with success toast. |

### Flow 3.2 — Invalid / expired token

| # | Step | Expected |
|---|---|---|
| 1 | Tampered token | Error `Invalid or expired link`. |
| 2 | Expired token (>X hours) | Error; offer "Resend activation". |

### Flow 3.3 — Already-activated link

| # | Step | Expected |
|---|---|---|
| 1 | Use same activation link twice | Second time → `This link has already been used. Please login.` |

### Flow 3.4 — Password rules at activation

| # | Bad value | Expected |
|---|---|---|
| 1 | `12345` (5 chars) | Field error min 6. |
| 2 | Confirm doesn't match | Field error. |

---

## 4. Session, Token, Logout

### Flow 4.1 — Token persistence

| # | Step | Expected |
|---|---|---|
| 1 | After login, reload tab | Stays on `/reseller/dashboard`. |

### Flow 4.2 — Logout

| # | Step | Expected |
|---|---|---|
| 1 | Click Logout | `resellerStore` cleared. Redirect `/reseller/login`. |
| 2 | Manually access `/reseller/dashboard` | Redirect to login. |

### Flow 4.3 — Token expiry mid-session

| # | Step | Expected |
|---|---|---|
| 1 | Delete token cookie or store | Storage gone. |
| 2 | Click any reseller-portal link | 401 → redirect `/reseller/login`. |

### Flow 4.4 — Status flipped to blocked mid-session

| # | Step | Expected |
|---|---|---|
| 1 | Reseller logged in → SA blocks them | Saved. |
| 2 | Reseller triggers next API call | 401 / 403; redirect to login. |

---

## 5. Reseller Dashboard

URL: `/reseller/dashboard`

### Flow 5.1 — KPI cards

| # | Step | Expected |
|---|---|---|
| 1 | Open dashboard | Cards: Active Tenants, Pending Tenants, Wallet Balance, MRR, Open Commissions, Recent Provisions.<br/>API: `GET /resellers/me/dashboard → 200`. |
| 2 | Click Wallet card | Routes `/reseller/wallet`. |
| 3 | Click Tenants card | Routes `/reseller/tenants`. |

### Flow 5.2 — Recent activity

| # | Step | Expected |
|---|---|---|
| 1 | Activity feed | Latest tenant signups, wallet movements, commission credits. |

### Flow 5.3 — Empty state

| # | Step | Expected |
|---|---|---|
| 1 | Fresh reseller (no tenants yet) | Dashboard shows zeros + CTA "Provision your first tenant". |

---

## 6. Profile & Self-service

URL: `/reseller/profile`

### Flow 6.1 — View profile

| # | Step | Expected |
|---|---|---|
| 1 | Open profile | Fields: name, email, mobile, GSTIN, address, bank details (for commissions), assigned plan. |

### Flow 6.2 — Edit profile

| # | Step | Expected |
|---|---|---|
| 1 | Update mobile / address / bank → Save | Saved.<br/>API: `PATCH /resellers/me → 200`. |
| 2 | Try edit email | Disabled (or requires SA). |
| 3 | Invalid mobile | Field error. |
| 4 | Invalid GSTIN | Field error. |

### Flow 6.3 — Change password

| # | Step | Expected |
|---|---|---|
| 1 | Profile → Change Password → current + new + confirm → Save | Saved. Old password no longer works. |
| 2 | Wrong current password | Error. |

### Flow 6.4 — Cannot change plan from profile

| # | Step | Expected |
|---|---|---|
| 1 | Plan field is read-only | Verified. Plan changes go through SA. |

---

## 7. Wallet & Top-up

URL: `/reseller/wallet`

### Flow 7.1 — View balance + ledger

| # | Step | Expected |
|---|---|---|
| 1 | Open wallet | Current balance, ledger table (date, type, amount, running balance, reference).<br/>API: `GET /resellers/me/wallet → 200`. |
| 2 | Filter ledger by date range / type | Works. |
| 3 | Pagination on long ledger | 20/page. |

### Flow 7.2 — Top-up flow (payment gateway)

| # | Step | Expected |
|---|---|---|
| 1 | Click **Top-up** → enter amount → choose gateway | Redirected to payment gateway (or sandbox). |
| 2 | Complete payment | Webhook received → ledger entry; balance increased.<br/>API: `POST /resellers/me/wallet/topup → 200` (or webhook-confirm endpoint). |
| 3 | Cancel mid-payment | No balance change; ledger unchanged. |

### Flow 7.3 — Idempotency

| # | Step | Expected |
|---|---|---|
| 1 | Webhook delivered twice (same payment_id) | Balance credited only once; second event is idempotent (no-op). |

### Flow 7.4 — Coupon at top-up (if supported)

| # | Step | Expected |
|---|---|---|
| 1 | Enter `OFF20` coupon at top-up | Discount applied; balance increase reflects. |
| 2 | Invalid coupon | Error `Invalid coupon`. |
| 3 | Expired coupon | Error `Coupon expired`. |

### Flow 7.5 — Negative inputs

| # | Field | Bad value | Expected |
|---|---|---|---|
| 1 | Top-up amount | 0 | Field error. |
| 2 | Top-up amount | -100 | Field error. |
| 3 | Top-up amount | 9999999999 | Field error or capped. |

### Flow 7.6 — Insufficient balance flow (downstream verification)

| # | Step | Expected |
|---|---|---|
| 1 | Wallet 0; try provision tenant | 400 `Insufficient wallet balance`. |
| 2 | Top-up; retry provision | Succeeds. |

### Flow 7.7 — Export ledger

| # | Step | Expected |
|---|---|---|
| 1 | Click Export CSV | Downloads with current filtered set. |

---

## 8. Billing / Invoices

URL: `/reseller/billing`

### Flow 8.1 — Invoice list

| # | Step | Expected |
|---|---|---|
| 1 | Open list | Columns: Invoice #, Period, Amount, Status (paid / unpaid), Due Date.<br/>API: `GET /resellers/me/billing → 200`. |
| 2 | Filter by status / period | Works. |

### Flow 8.2 — Invoice detail / PDF

| # | Step | Expected |
|---|---|---|
| 1 | Click invoice → detail | Line items + totals. |
| 2 | Download PDF | Branded reseller invoice. |

### Flow 8.3 — Pay outstanding invoice

| # | Step | Expected |
|---|---|---|
| 1 | Click **Pay Now** on unpaid invoice | Routes to gateway; on success → invoice `paid`. |

### Flow 8.4 — Empty state

| # | Step | Expected |
|---|---|---|
| 1 | Fresh reseller with no billing yet | Empty illustration. |

---

## 9. Plans Catalog

URL: `/reseller/plans`

### Flow 9.1 — Available plans list

| # | Step | Expected |
|---|---|---|
| 1 | Open list | Plans the reseller can offer to tenants — name, monthly/annual price, features, max users, max storage. |
| 2 | Click plan card | Detail with comparison features. |

### Flow 9.2 — Cannot edit plans

| # | Step | Expected |
|---|---|---|
| 1 | Try API `PATCH /super-admin/plans/<id>` with reseller token | 403. Plans are SA-controlled. |

---

## 10. My Subscription

URL: `/reseller/my-subscription`

### Flow 10.1 — View own plan

| # | Step | Expected |
|---|---|---|
| 1 | Open page | Current reseller plan, validity, commission %, tenant cap. |

### Flow 10.2 — Renewal CTA

| # | Step | Expected |
|---|---|---|
| 1 | Subscription expiring < 30 days | Banner with **Renew Now** CTA. |
| 2 | Click Renew → gateway → success | Validity extended. |

### Flow 10.3 — Subscription expired flow

| # | Step | Expected |
|---|---|---|
| 1 | Subscription expired | Login still works but dashboard shows blocking banner; provisioning blocked until renewal. |

---

## 11. Subscriptions (assigned to tenants)

URL: `/reseller/subscriptions`

### Flow 11.1 — List subscriptions of own tenants

| # | Step | Expected |
|---|---|---|
| 1 | Open list | Columns: Tenant, Plan, Start, End, Status, Amount.<br/>API: `GET /resellers/me/subscriptions → 200`. |
| 2 | Filter by tenant / status | Works. |

### Flow 11.2 — Renew tenant subscription

| # | Step | Expected |
|---|---|---|
| 1 | Click Renew on a tenant's expiring subscription | Choose plan + duration → pay from wallet → confirm. Wallet decremented; tenant validity extended. |
| 2 | Insufficient wallet | 400. |

### Flow 11.3 — Upgrade / downgrade tenant plan

| # | Step | Expected |
|---|---|---|
| 1 | Pick tenant → change plan | Pro-rated billing; validity adjusts. |

### Flow 11.4 — Cancel subscription

| # | Step | Expected |
|---|---|---|
| 1 | Cancel an active sub | Tenant flagged for non-renewal; validity unchanged until expiry. |

---

## 12. Tenants — Provisioning & Management

URL: `/reseller/tenants`

### Flow 12.1 — List own tenants

| # | Step | Expected |
|---|---|---|
| 1 | Open list | Columns: Tenant, Email, Plan, Status, Expiry, Created.<br/>**Only own tenants visible** — no other reseller's data.<br/>API: `GET /resellers/me/tenants → 200`. |

### Flow 12.2 — Provision new tenant

| # | Step | Expected |
|---|---|---|
| 1 | Click **+ New Tenant** → fill business name, email, mobile, address, plan, initial payment | Form validates fields. |
| 2 | Submit | Tenant created `status='pending'`; tenant admin receives activation email. Wallet decremented by plan price (or 0 for free trial).<br/>API: `POST /resellers/me/tenants → 201`. |
| 3 | Reseller sees new tenant in list | Yes. |
| 4 | Tenant admin completes registration → activates | Tenant `active`. |

### Flow 12.3 — Provision negatives

| # | Field | Bad value | Expected |
|---|---|---|---|
| 1 | Tenant email | Already exists in another tenant | 409 `Email already registered`. |
| 2 | Tenant mobile | Invalid | Field error. |
| 3 | Wallet balance | Insufficient for plan | 400 `Insufficient wallet balance`. |
| 4 | Plan | Inactive plan selected | Blocked. |

### Flow 12.4 — Tenant detail (reseller view)

| # | Step | Expected |
|---|---|---|
| 1 | Click tenant | Detail with profile, plan, expiry, usage stats. |
| 2 | Reseller can edit address/profile? | Allowed if reseller's plan permits; otherwise read-only. |

### Flow 12.5 — Cannot access tenant business data

| # | Step | Expected |
|---|---|---|
| 1 | Try `/customers` or any tenant API with reseller token | 403. Reseller can manage tenant subscription/profile but NOT see tenant's customers, quotations, etc. |

### Flow 12.6 — Suspend / unsuspend tenant

| # | Step | Expected |
|---|---|---|
| 1 | Reseller clicks Suspend on own tenant | Tenant `status='blocked'`; tenant employees can't login. |
| 2 | Click Activate | Restored. |

### Flow 12.7 — Cannot operate on another reseller's tenant

| # | Step | Expected |
|---|---|---|
| 1 | Reseller A manually calls `PATCH /resellers/me/tenants/<beta_tenant_owned_by_reseller_B>` | 403/404. **P0 SECURITY** if 200. |

### Flow 12.8 — Search & filter tenants

| # | Step | Expected |
|---|---|---|
| 1 | Search by tenant name / email | Matches own only. |
| 2 | Filter by status / plan | Works. |

### Flow 12.9 — Empty tenants state

| # | Step | Expected |
|---|---|---|
| 1 | Fresh reseller | Empty illustration with "Provision your first tenant". |

---

## 13. Usage Metrics

URL: `/reseller/usage`

### Flow 13.1 — Per-tenant usage

| # | Step | Expected |
|---|---|---|
| 1 | Open usage | Per-tenant active users, storage consumed, API calls (or relevant metrics). |
| 2 | Filter by tenant / date range | Works. |

### Flow 13.2 — Over-quota flag

| # | Step | Expected |
|---|---|---|
| 1 | Tenant exceeding plan quota | Red badge / banner; suggested upgrade CTA. |

### Flow 13.3 — Charts (if any)

| # | Step | Expected |
|---|---|---|
| 1 | Trend chart | Renders for selected range. |

---

## 14. Commissions

URL: `/reseller/commissions`

### Flow 14.1 — List commissions

| # | Step | Expected |
|---|---|---|
| 1 | Open list | Columns: Period, Tenant, Amount, Status (Pending / Paid). |
| 2 | Filter by period / tenant / status | Works. |

### Flow 14.2 — Commission accrual

| # | Step | Expected |
|---|---|---|
| 1 | Tenant pays subscription | Commission accrues per reseller plan rate; row added with status `pending`. |

### Flow 14.3 — Payout (read-only for reseller, SA settles)

| # | Step | Expected |
|---|---|---|
| 1 | SA marks period commission as Paid | Reseller sees `paid` with payout date. |

### Flow 14.4 — Export

| # | Step | Expected |
|---|---|---|
| 1 | Export CSV | Downloads. |

---

## 15. Reports

URL: `/reseller/reports`

### Flow 15.1 — Reseller reports

| # | Step | Expected |
|---|---|---|
| 1 | Open reports | Tenant growth, MRR, churn, commission trend. |
| 2 | Date range filter | Updates charts. |
| 3 | Export | CSV / PDF. |

### Flow 15.2 — Drill-down

| # | Step | Expected |
|---|---|---|
| 1 | Click MRR card | Routes to subscription list filtered to active. |

---

## 16. Cross-Reseller / Cross-Role Isolation

### Flow 16.1 — Reseller A cannot see Reseller B's tenants

| # | Step | Expected |
|---|---|---|
| 1 | Login as Reseller A | Sees own tenants only. |
| 2 | Manually `GET /resellers/<B_id>/tenants` | 403. |
| 3 | Manually `GET /resellers/me/tenants/<B_tenant_id>` (using B's tenant ID) | 403/404. **P0 SECURITY** if 200. |

### Flow 16.2 — Reseller cannot adjust own wallet manually

| # | Step | Expected |
|---|---|---|
| 1 | Manually `POST /resellers/me/wallet` with positive amount | 403 (wallet adjustments require SA). |
| 2 | Top-up via gateway works (legitimate) | Yes. |

### Flow 16.3 — Reseller cannot access tenant business APIs

| # | Step | Expected |
|---|---|---|
| 1 | Manually `GET /customers` with reseller token | 403. |
| 2 | Manually `GET /quotations` | 403. |
| 3 | Manually `GET /invoices` | 403. |

### Flow 16.4 — Reseller cannot access SA APIs

| # | Step | Expected |
|---|---|---|
| 1 | Manually `GET /super-admin/dashboard` | 403. |
| 2 | Manually `POST /super-admin/coupons` | 403. |

### Flow 16.5 — Tenant employees / admins cannot access reseller portal

| # | Step | Expected |
|---|---|---|
| 1 | Use enterprise admin token to call `/resellers/me/wallet` | 403. |
| 2 | Use employee token | 403. |

### Flow 16.6 — JWT type swap

| # | Step | Expected |
|---|---|---|
| 1 | Take reseller JWT, change `type` to `super_admin` (re-sign attempt) | Rejected. **P0 SECURITY** if accepted. |

### Flow 16.7 — Wallet manipulation guards

| # | Step | Expected |
|---|---|---|
| 1 | Reseller front-end shows balance 1000. Try modifying localStorage `resellerStore.wallet=1000000` and provision tenant | Backend re-reads DB; if balance insufficient → 400. UI may briefly show wrong number but action is gated by server. |

---

## 17. Notifications & Audit

### Flow 17.1 — Notifications

| # | Step | Expected |
|---|---|---|
| 1 | New tenant activates from reseller's provision | Notification fires to reseller. |
| 2 | Wallet balance below threshold | Low-balance notification. |
| 3 | Subscription expiring soon for a tenant | Reminder notification. |

### Flow 17.2 — Activity log (reseller view)

| # | Step | Expected |
|---|---|---|
| 1 | Profile / Activity tab | Lists own actions: tenant provisioned, top-ups, plan changes. |

### Flow 17.3 — Audit on platform side

| # | Step | Expected |
|---|---|---|
| 1 | SA inspects reseller activity log | Includes reseller's actions with timestamps. |

---

## 18. End-to-End Flows

### Flow 18.1 — Reseller onboards a tenant

| # | Step | Expected |
|---|---|---|
| 1 | Reseller logs in (already activated) → Dashboard | Lands. |
| 2 | Tops up wallet (₹5000) | Balance updated. |
| 3 | Provisions new tenant `Cust1 Pvt Ltd` with `Pro` plan | Tenant `pending`; wallet decremented by plan price. |
| 4 | Tenant admin completes registration via emailed link | Tenant `active`. |
| 5 | Reseller sees `Cust1` in /reseller/tenants list | Yes. |
| 6 | Commission accrues at next billing cycle | Reseller's commissions list shows pending row. |

### Flow 18.2 — Renewal of tenant subscription

| # | Step | Expected |
|---|---|---|
| 1 | Tenant sub expiring in 7 days | Reseller receives notification + sees red banner on tenant row. |
| 2 | Click Renew → pick plan duration → pay from wallet | Wallet decremented; tenant validity extended. |
| 3 | Tenant gets receipt; reseller commission row created | Yes. |

### Flow 18.3 — Suspending and reactivating a tenant

| # | Step | Expected |
|---|---|---|
| 1 | Reseller suspends a tenant for non-payment | Tenant blocked; users can't login. |
| 2 | Tenant pays → reseller reactivates | Tenant restored. |

### Flow 18.4 — Reseller plan upgrade

| # | Step | Expected |
|---|---|---|
| 1 | Reseller wants more tenants → asks SA for plan upgrade | SA upgrades reseller's plan. |
| 2 | New tenant cap reflected on next reseller dashboard load | Yes. |

### Flow 18.5 — Cross-reseller isolation drill

| # | Step | Expected |
|---|---|---|
| 1 | Login as Reseller A → note one of B's tenant IDs (from SA) | Pre-condition. |
| 2 | Manually paste `/reseller/tenants/<B_tenant_id>` in URL | 403/404 page. |
| 3 | Manually call API with that ID | 403/404. |

---

## 19. Negative / Edge / Security

### 19.1 Wallet manipulation

| # | Scenario | Expected |
|---|---|---|
| 1 | Modify localStorage to inflate wallet | Backend re-validates on every action; provision still gated. |
| 2 | Replay top-up webhook | Idempotent — credited once. |
| 3 | Forge top-up event without payment | Server signature check rejects (HMAC / IPN signature). **P0 SECURITY** if accepted. |

### 19.2 Tenant data scope

| # | Scenario | Expected |
|---|---|---|
| 1 | Reseller tries to access tenant's `/customers` | 403. |
| 2 | Reseller tries to read tenant's quotations | 403. |
| 3 | Reseller tries to set tenant employee permissions | 403. |

### 19.3 Concurrency

| # | Scenario | Expected |
|---|---|---|
| 1 | Reseller provisions 2 tenants simultaneously consuming wallet | Both succeed if balance covers both; otherwise one fails with 400. No partial state. |
| 2 | Top-up + provision interleaved | Final balance correct (transactional). |

### 19.4 Network failures

| # | Scenario | Expected |
|---|---|---|
| 1 | Network drop during provision | Toast error; tenant NOT created (or rolled back); wallet NOT decremented. Retry works. |

### 19.5 Token expiry mid-payment

| # | Scenario | Expected |
|---|---|---|
| 1 | Token expires while user is on payment gateway | After return, user redirected to login. Webhook still credits wallet (server-side). |

### 19.6 Boundary inputs

| # | Field | Bad value | Expected |
|---|---|---|---|
| 1 | Top-up amount | 0 | Field error. |
| 2 | Top-up amount | very large | Field error or capped. |
| 3 | Tenant name | empty | Field error. |
| 4 | Tenant email | malformed | Field error. |
| 5 | Tenant mobile | invalid | Field error. |
| 6 | Coupon code | very long | Truncated or rejected. |

### 19.7 Direct URL access (logged out)

| # | Scenario | Expected |
|---|---|---|
| 1 | Logout, paste `/reseller/dashboard` | Redirect `/reseller/login`. |
| 2 | Paste `/reseller/wallet` | Redirect login. |

### 19.8 SQL/XSS in inputs

| # | Field | Value | Expected |
|---|---|---|---|
| 1 | Tenant name | `<script>alert(1)</script>` | Stored sanitized; rendered as plain text on detail. |
| 2 | Profile address | `' OR 1=1 --` | Stored as string. |

### 19.9 Browser & device

| # | Scenario | Expected |
|---|---|---|
| 1 | Chrome / Firefox / Safari | All P0 flows pass. |
| 2 | Mobile (iOS) | Login + wallet + tenant list works; provisioning may be desktop-recommended. |

### 19.10 Idempotency keys

| # | Scenario | Expected |
|---|---|---|
| 1 | Click Provision Tenant rapidly twice | Server uses idempotency / lock; only one tenant created; one wallet decrement. |

---

## 20. Sign-off Checklist

### Authentication & session
- [ ] Login (Flow 2.1)
- [ ] Login negatives (Flow 2.2)
- [ ] Activation (Flow 3.1)
- [ ] Token expiry (Flow 4.3)

### Profile
- [ ] View profile (Flow 6.1)
- [ ] Edit profile (Flow 6.2)
- [ ] Change password (Flow 6.3)

### Wallet
- [ ] View ledger (Flow 7.1)
- [ ] Top-up (Flow 7.2)
- [ ] Idempotent webhook (Flow 7.3)
- [ ] Insufficient balance flow (Flow 7.6)
- [ ] Negative inputs (Flow 7.5)

### Billing
- [ ] Invoice list & PDF (§8)
- [ ] Pay outstanding (Flow 8.3)

### Plans & Subscriptions
- [ ] Plans catalog (§9)
- [ ] My subscription (§10)
- [ ] Tenant subscriptions (§11)

### Tenants
- [ ] Provision (Flow 12.2)
- [ ] Provision negatives (Flow 12.3)
- [ ] List own only (Flow 12.1)
- [ ] Cannot access tenant business data (Flow 12.5)
- [ ] Cannot operate on another reseller's tenant (Flow 12.7)
- [ ] Suspend/unsuspend (Flow 12.6)

### Usage / Commissions / Reports
- [ ] Usage view (§13)
- [ ] Commissions accrue + payout (§14)
- [ ] Reports load + export (§15)

### Cross-role isolation
- [ ] A cannot see B's tenants (Flow 16.1)
- [ ] Wallet not manually mutable (Flow 16.2)
- [ ] No tenant business APIs (Flow 16.3)
- [ ] No SA APIs (Flow 16.4)
- [ ] Other roles cannot access reseller portal (Flow 16.5)
- [ ] JWT type swap rejected (Flow 16.6)

### Notifications & audit
- [ ] Notifications fire (Flow 17.1)
- [ ] Activity log present (Flow 17.2)

### E2E
- [ ] Onboard tenant (Flow 18.1)
- [ ] Renewal (Flow 18.2)
- [ ] Suspend/reactivate (Flow 18.3)
- [ ] Cross-reseller drill (Flow 18.5)

### Security & edge
- [ ] Wallet manipulation guards (§19.1)
- [ ] Tenant data scope (§19.2)
- [ ] Concurrency (§19.3)
- [ ] Network failure (§19.4)
- [ ] Token expiry mid-payment (§19.5)
- [ ] Boundary inputs (§19.6)
- [ ] Direct URL (§19.7)
- [ ] SQL/XSS (§19.8)
- [ ] Browser/device (§19.9)
- [ ] Idempotency (§19.10)

### Final environment & cleanup
- [ ] Zero unhandled console errors during full run.
- [ ] Test wallet returned to seed balance.
- [ ] Test tenants created during run cleaned up by SA.
- [ ] Audit log entries match reseller actions.

---

## Run-log template (copy per cycle)

```
# Run YYYY-MM-DD — Reseller tests
Tester: <name>
Env:    QA
Build:  <git sha>
Reseller persona(s): rajesh@techresell.in / kumar@techresell.in

Failed flows:
- <flow id>: <one-liner> → bug: <link>

Security findings (P0):
- <flow id>: <description>

Cleanup actions:
- Reseller wallet rajesh: 5500 → 1000 (refund + remove test top-ups)
- Test tenants deleted by SA: <list>

Notes:
- ...
```

---

**Document version 1.0** — Reseller portal coverage complete. Update when:
- A new reseller-portal screen ships.
- Wallet rules change (e.g. introduce per-tenant credit limits).
- Commission calculation logic changes.
