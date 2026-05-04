# ERP — Super Admin · Test Flow Document

> **Persona:** Super Admin (logs in via `/superadmin/login`, JWT `type='super_admin'`, full platform-wide access — manages all tenants, resellers, plans, coupons, services, platform employees, support tickets).
> **Audience:** QA tester; run on QA platform (separate from any tenant data).
> **Companion files:** `ERP_Enterprise.md`, `ERP_Employee.md`, `ERP_Reseller.md`, `FSD.md`.
> **Critical:** super-admin actions affect ALL tenants. Test only on QA — never run destructive flows in Production. Block/activate flows MUST be reverted after each run.

---

## How to use this document

1. Always run on QA. Some flows (block tenant, deactivate reseller) need a clean revert step at the end.
2. Each flow names the exact screen and API. Watch DevTools → Network for status codes.
3. Mark every step `[PASS]` / `[FAIL]` / `[BLOCKED]`. Cross-role isolation failures = **P0 SECURITY**.
4. After each cycle, verify reverts:
   - All blocked tenants restored to `active`.
   - Test resellers' wallets returned to seed balance.
   - Test coupons / plans created during run are deleted.

---

## Table of Contents

1. [Pre-requisites & Test Setup](#1-pre-requisites--test-setup)
2. [Authentication (Super-Admin)](#2-authentication-super-admin)
3. [Session, Token, Logout](#3-session-token-logout)
4. [Platform Dashboard](#4-platform-dashboard)
5. [Sidebar & Navigation](#5-sidebar--navigation)
6. [Enterprises (Tenants) Management](#6-enterprises-tenants-management)
7. [Resellers Management](#7-resellers-management)
8. [Reseller Wallets](#8-reseller-wallets)
9. [Reseller Plans](#9-reseller-plans)
10. [Reseller Subscriptions](#10-reseller-subscriptions)
11. [Subscription Plans (Tenant-facing)](#11-subscription-plans-tenant-facing)
12. [Coupons](#12-coupons)
13. [Services Master](#13-services-master)
14. [Support Tickets](#14-support-tickets)
15. [Accounts](#15-accounts)
16. [Platform Employees](#16-platform-employees)
17. [Cross-Role Isolation](#17-cross-role-isolation)
18. [Audit & Activity (platform)](#18-audit--activity-platform)
19. [End-to-End Flows](#19-end-to-end-flows)
20. [Negative / Edge / Security](#20-negative--edge--security)
21. [Sign-off Checklist](#21-sign-off-checklist)

---

## 1. Pre-requisites & Test Setup

### 1.1 Test account

| Field | Value |
|---|---|
| Login URL | `/superadmin/login` |
| Email | `admin@vabinformatics.com` |
| Password | `admin1234` |
| Token storage | `superAdminStore` (zustand) |

### 1.2 Pre-seed data

- ≥ 3 enterprises in different states: `Acme` (active, paid), `Beta` (expiring in 3 days), `Gamma` (blocked).
- ≥ 2 resellers: `rajesh@techresell.in` (active, has 2 tenants), `pending.reseller@vaberp-test.com` (pending activation).
- ≥ 2 reseller plans (`Bronze`, `Gold`).
- ≥ 2 subscription plans (`Pro`, `Enterprise`).
- ≥ 1 coupon (`OFF10`, valid).
- ≥ 1 expired coupon (`EXPIRED5`).
- ≥ 1 open support ticket from a tenant.

### 1.3 Browser & tooling

- Chrome (incognito) so SA token stays separate from any tenant tokens.
- DevTools → Network + Console open during tests.
- Have one tenant browser/session open in parallel to verify cross-effects (e.g. block tenant → verify they can't login).

---

## 2. Authentication (Super-Admin)

### Flow 2.1 — Valid login

| # | Step | Expected |
|---|---|---|
| 1 | Open `/superadmin/login` | Login form renders. Logo + "Super Admin" heading + "Platform administration panel" subheading. |
| 2 | Type `admin@vabinformatics.com` / `admin1234` → Sign In | Toast / silent success.<br/>Redirect `/superadmin/dashboard`.<br/>`superAdminStore.user` populated; token stored.<br/>API: `POST /super-admin/login → 200`. |

### Flow 2.2 — Invalid credentials

| # | Action | Expected |
|---|---|---|
| 1 | Wrong password | Toast `Invalid credentials`. 401. No token. |
| 2 | Unknown email | Toast `Invalid credentials`. |
| 3 | Email blank | Field error. No API call. |
| 4 | Password blank | Field error. |

### Flow 2.3 — Auto-fill demo creds

| # | Step | Expected |
|---|---|---|
| 1 | Click **Auto Fill Credentials** | Email + password populated with demo values (`admin@vabinformatics.com / admin1234`). |
| 2 | Click Sign In | Standard login flow. |

### Flow 2.4 — Already-logged-in user visiting login

| # | Step | Expected |
|---|---|---|
| 1 | While logged in, manually open `/superadmin/login` | Redirect to `/superadmin/dashboard`. |

### Flow 2.5 — Branded super-admin login (if enabled)

| # | Step | Expected |
|---|---|---|
| 1 | `/superadmin/login` | No tenant branding (platform-level). VAB Informatics branding only. |

---

## 3. Session, Token, Logout

### Flow 3.1 — Token persistence

| # | Step | Expected |
|---|---|---|
| 1 | Reload `/superadmin/dashboard` | Stays logged in. `GET /super-admin/me → 200` (or equivalent). |

### Flow 3.2 — Logout

| # | Step | Expected |
|---|---|---|
| 1 | Click Logout | Token cleared from `superAdminStore`. Redirect `/superadmin/login`. |
| 2 | Manually access `/superadmin/dashboard` after logout | Redirect to login. |

### Flow 3.3 — Token expiry mid-session

| # | Step | Expected |
|---|---|---|
| 1 | Delete `access_token` cookie or `superAdminStore` from DevTools | Storage gone. |
| 2 | Click any protected link | Auto-redirect `/superadmin/login`. Toast `Session expired`. |

### Flow 3.4 — Concurrent session

| # | Step | Expected |
|---|---|---|
| 1 | SA logs in on Chrome and Firefox simultaneously | Both work. Logout in one does not invalidate the other. |

---

## 4. Platform Dashboard

URL: `/superadmin/dashboard`

### Flow 4.1 — KPI cards render

| # | Step | Expected |
|---|---|---|
| 1 | Open dashboard | Cards: Total Tenants, Active Tenants, Total Resellers, MRR (Monthly Recurring Revenue), Open Tickets, Trial-Expiring-Soon, Overdue Subscriptions.<br/>API: `GET /super-admin/dashboard → 200`. |
| 2 | Click each card | Drill down to relevant management screen. |

### Flow 4.2 — Recent activity feed

| # | Step | Expected |
|---|---|---|
| 1 | Inspect feed | Recent tenant signups, plan changes, support tickets. |

### Flow 4.3 — Charts (if present)

| # | Step | Expected |
|---|---|---|
| 1 | Tenant growth chart | Renders by month. |
| 2 | Revenue chart | Renders by plan. |

---

## 5. Sidebar & Navigation

### Flow 5.1 — Sidebar visibility (SA-only)

| # | Step | Expected |
|---|---|---|
| 1 | Inspect sidebar | Items: Dashboard, Enterprises, Resellers, Subscriptions, Coupons, Services, Employees, Support, Accounts.<br/>**No tenant modules** (no Customers, Quotations, etc.). |
| 2 | Direct-URL `/dashboard` (tenant route) | Redirect to `/superadmin/dashboard` or 403. |

### Flow 5.2 — Topbar / profile menu

| # | Step | Expected |
|---|---|---|
| 1 | Click avatar | Dropdown: Profile, Logout. |

---

## 6. Enterprises (Tenants) Management

URL: `/superadmin/enterprises`

### Flow 6.1 — Tenant list

| # | Step | Expected |
|---|---|---|
| 1 | Open list | Columns: Tenant ID, Business Name, Email, Plan, Status, Subscription Expiry, Created Date, Reseller (if linked).<br/>Pagination 20/page.<br/>API: `GET /super-admin/enterprises → 200`. |
| 2 | Filter by Status (active/blocked/pending) | Narrows correctly. |
| 3 | Filter by Plan | Narrows. |
| 4 | Search by name / email | Matches. |
| 5 | Sort by Created Date | Reorders. |

### Flow 6.2 — Tenant detail

| # | Step | Expected |
|---|---|---|
| 1 | Click tenant row | `/superadmin/enterprises/<id>` opens. |
| 2 | Inspect | Sections: Profile, Subscription, Usage stats, Employees count, Activity log, Linked Reseller. |
| 3 | API call observed | `GET /super-admin/enterprises/<id> → 200`. |

### Flow 6.3 — Edit tenant profile

| # | Step | Expected |
|---|---|---|
| 1 | Click Edit → modify business address → Save | Saved.<br/>API: `PATCH /super-admin/enterprises/<id> → 200`. |
| 2 | Try invalid GSTIN | Field error. |

### Flow 6.4 — Block tenant

| # | Step | Expected |
|---|---|---|
| 1 | On detail or row Actions, click **Block** → enter reason → Confirm | Tenant `status='blocked'`.<br/>Linked tenant browser session: next API call → 401. Toast `Your enterprise account is blocked`. |
| 2 | Audit log row added | Verify in audit. |

### Flow 6.5 — Unblock / reactivate

| # | Step | Expected |
|---|---|---|
| 1 | On blocked tenant, click **Activate** → Confirm | `status='active'`. Tenant can login again. |

### Flow 6.6 — Activate pending tenant directly

| # | Step | Expected |
|---|---|---|
| 1 | Tenant in `pending` status (just registered) → click **Activate Now** → assign plan + expiry | Tenant `status='active'`, `plan_id` set, `expiry_date` calculated. |
| 2 | First-login OTP flow still works for that tenant | Verified. |

### Flow 6.7 — Assign plan / change plan

| # | Step | Expected |
|---|---|---|
| 1 | Tenant detail → **Change Plan** → pick `Enterprise` → Save | Plan updated; pro-rated billing record created.<br/>API: `PATCH /super-admin/enterprises/<id>/plan → 200`. |
| 2 | Tenant feature flags update accordingly | Verified by logging into tenant. |

### Flow 6.8 — Extend / shorten subscription

| # | Step | Expected |
|---|---|---|
| 1 | Edit `expiry_date` → set to today+30 → Save | `expiry_date` updated. |
| 2 | Set expiry_date in past | Tenant's next login redirects to `/activate`. |

### Flow 6.9 — Delete tenant (soft/hard)

| # | Step | Expected |
|---|---|---|
| 1 | Click Delete on a test tenant → Confirm | Tenant marked deleted (soft) OR removed (hard) — verify per policy. |
| 2 | Tenant data inaccessible to all roles after delete | Confirmed. |

### Flow 6.10 — Audit trail

| # | Step | Expected |
|---|---|---|
| 1 | After block/unblock/plan-change, inspect tenant's activity log | Each action recorded with SA user_id and timestamp. |

### Flow 6.11 — Search & export

| # | Step | Expected |
|---|---|---|
| 1 | Filter to `Plan=Pro` and Status=`active` | Filter applies. |
| 2 | Click Export CSV | Downloads with current filtered set. |

### Flow 6.12 — Empty state

| # | Step | Expected |
|---|---|---|
| 1 | Filter that returns 0 rows | Empty illustration + "Clear filters" CTA. |

---

## 7. Resellers Management

URL: `/superadmin/resellers`

### Flow 7.1 — Reseller list

| # | Step | Expected |
|---|---|---|
| 1 | Open list | Columns: Reseller Code, Name, Email, Wallet Balance, Active Tenants, Status, Plan.<br/>API: `GET /super-admin/resellers → 200`. |
| 2 | Filter / search / sort | Works. |

### Flow 7.2 — Create reseller

| # | Step | Expected |
|---|---|---|
| 1 | **+ Add Reseller** → fill name, email, mobile, GSTIN, plan, initial wallet credit → Save | Reseller created `status='pending'`; activation email dispatched.<br/>API: `POST /super-admin/resellers → 201`. |
| 2 | Duplicate email | 409. |
| 3 | Invalid mobile / GSTIN | Field errors. |

### Flow 7.3 — Reseller detail

| # | Step | Expected |
|---|---|---|
| 1 | Click row | Detail with Profile, Wallet, Tenants, Subscriptions, Commissions, Activity tabs.<br/>API: `GET /super-admin/resellers/<id> → 200`. |

### Flow 7.4 — Activate / block / suspend

| # | Step | Expected |
|---|---|---|
| 1 | On `pending` reseller → Activate | `status='active'`. Reseller can login. |
| 2 | Block active reseller | `status='blocked'`. Reseller's next login fails. |
| 3 | Suspend → reactivate | Status transitions tracked. |

### Flow 7.5 — Edit profile

| # | Step | Expected |
|---|---|---|
| 1 | Edit profile → Save | Saved.<br/>API: `PATCH /super-admin/resellers/<id> → 200`. |

### Flow 7.6 — Reset reseller password

| # | Step | Expected |
|---|---|---|
| 1 | Click Reset Password → enter new → Confirm | Password updated; reseller notified. |

### Flow 7.7 — Delete reseller

| # | Step | Expected |
|---|---|---|
| 1 | Try delete reseller with active tenants | Blocked: 400 `Reseller has active tenants — reassign first`. |
| 2 | Delete reseller with no tenants | Removed (or soft-deleted). |

### Flow 7.8 — Reassign tenant from one reseller to another

| # | Step | Expected |
|---|---|---|
| 1 | Tenant currently linked to Reseller A → reassign to Reseller B | `tenant.reseller_id=B.id`; commission pipeline switches. |

---

## 8. Reseller Wallets

URL: `/superadmin/resellers/wallets` or detail tab

### Flow 8.1 — View wallet balance + ledger

| # | Step | Expected |
|---|---|---|
| 1 | Open reseller detail → Wallet tab | Current balance, ledger (date / type / amount / running balance). |

### Flow 8.2 — Manual adjustment

| # | Step | Expected |
|---|---|---|
| 1 | Click **Adjust Wallet** → amount=+1000, reason='Top-up'  → Confirm | Balance increased; ledger entry created.<br/>API: `POST /super-admin/resellers/<id>/wallet → 200`. |
| 2 | Reason blank | Field error. |
| 3 | Amount=0 | Error or no-op rejected. |

### Flow 8.3 — Negative adjustment

| # | Step | Expected |
|---|---|---|
| 1 | Adjust -200 (deduct) on reseller with balance 1000 | Balance 800. |
| 2 | Try -1500 on balance 1000 | 400 `Insufficient balance`. |

### Flow 8.4 — Wallet history pagination

| # | Step | Expected |
|---|---|---|
| 1 | Reseller with > 20 ledger entries | Pagination 20/page. |

### Flow 8.5 — Export

| # | Step | Expected |
|---|---|---|
| 1 | Export ledger CSV | Downloads. |

---

## 9. Reseller Plans

URL: `/superadmin/resellers/plans`

### Flow 9.1 — List plans

| # | Step | Expected |
|---|---|---|
| 1 | Open list | Columns: Plan Name, Price, Tenant Allocation, Commission %, Active. |

### Flow 9.2 — Create plan

| # | Step | Expected |
|---|---|---|
| 1 | **+ New Plan** → name, price, tenant cap, commission %, validity → Save | Plan persisted.<br/>API: `POST /super-admin/resellers/plans → 201`. |
| 2 | Duplicate name | 409. |
| 3 | Negative price | Field error. |
| 4 | Commission > 100% | Field error. |

### Flow 9.3 — Edit / deactivate plan

| # | Step | Expected |
|---|---|---|
| 1 | Edit → change commission | Saved. New resellers on this plan use new value. |
| 2 | Deactivate plan | Cannot be assigned to new resellers; existing keep using until renewal. |

### Flow 9.4 — Delete plan

| # | Step | Expected |
|---|---|---|
| 1 | Plan with active resellers → Delete | Blocked. |
| 2 | Plan with no resellers → Delete | Removed. |

---

## 10. Reseller Subscriptions

URL: `/superadmin/resellers/subscriptions`

### Flow 10.1 — Subscription list

| # | Step | Expected |
|---|---|---|
| 1 | Open list | Columns: Reseller, Plan, Start, End, Status, Amount Paid. |

### Flow 10.2 — Create subscription

| # | Step | Expected |
|---|---|---|
| 1 | **+ New** → pick reseller + plan + start/end → Save | Subscription persisted; reseller's plan link updated. |
| 2 | Overlapping subscription for same reseller | Warning or blocked. |

### Flow 10.3 — Cancel / refund

| # | Step | Expected |
|---|---|---|
| 1 | Cancel active subscription with reason | Status `cancelled`. Reseller notified. |
| 2 | Process refund (manual flag) | Amount logged; reseller wallet credited if policy. |

---

## 11. Subscription Plans (Tenant-facing)

URL: `/superadmin/subscriptions`

### Flow 11.1 — List

| # | Step | Expected |
|---|---|---|
| 1 | Open list | Columns: Name, Monthly/Annual Price, Features, Tenant Count, Active. |

### Flow 11.2 — Create plan

| # | Step | Expected |
|---|---|---|
| 1 | **+ New Plan** → name (e.g. `Starter`), prices, feature flags, max users, max storage → Save | Plan persisted.<br/>API: `POST /super-admin/plans → 201`. |
| 2 | Duplicate name | 409. |

### Flow 11.3 — Edit feature flags

| # | Step | Expected |
|---|---|---|
| 1 | Toggle feature on/off → Save | Saved. Tenants on this plan see updated feature availability after token refresh / next login. |

### Flow 11.4 — Deactivate plan

| # | Step | Expected |
|---|---|---|
| 1 | Deactivate `Starter` plan | New tenants cannot pick it. Existing tenants stay until renewal. |

### Flow 11.5 — Plan vs tenant linkage

| # | Step | Expected |
|---|---|---|
| 1 | Inspect a plan → see linked tenants count + drill-down | Lists tenants; click tenant → routes to `/superadmin/enterprises/<id>`. |

---

## 12. Coupons

URL: `/superadmin/coupons`

### Flow 12.1 — List

| # | Step | Expected |
|---|---|---|
| 1 | Open list | Columns: Code, Discount %, Max Uses, Used Count, Expiry, Status. |

### Flow 12.2 — Create coupon

| # | Step | Expected |
|---|---|---|
| 1 | **+ New** → code (`OFF20`), discount=20%, max_uses=100, expiry=today+30, applicable plans → Save | Coupon persisted.<br/>API: `POST /super-admin/coupons → 201`. |
| 2 | Duplicate code | 409 `Coupon code exists`. |
| 3 | Discount > 100 | Field error. |
| 4 | Expiry in past | Field error or blocked. |
| 5 | max_uses=0 | Field error. |

### Flow 12.3 — Apply coupon (cross-test)

| # | Step | Expected |
|---|---|---|
| 1 | A tenant or reseller applies the coupon during plan purchase | Discount applied; `used_count` increments. |
| 2 | Apply coupon at max_uses | Reject `Coupon usage limit reached`. |
| 3 | Apply expired coupon | Reject `Coupon expired`. |

### Flow 12.4 — Edit / deactivate

| # | Step | Expected |
|---|---|---|
| 1 | Edit discount % | Updated. Applies to future use only. |
| 2 | Deactivate | Cannot be applied; existing applications unaffected. |

### Flow 12.5 — Delete

| # | Step | Expected |
|---|---|---|
| 1 | Delete unused coupon | Removed. |
| 2 | Delete used coupon | Soft-delete or blocked (preserve history). |

---

## 13. Services Master

URL: `/superadmin/services`

### Flow 13.1 — List

| # | Step | Expected |
|---|---|---|
| 1 | Open list | Platform-wide service offerings (Migration, Implementation, Training, etc.). |

### Flow 13.2 — Create service

| # | Step | Expected |
|---|---|---|
| 1 | **+ New** → name, description, base price → Save | Persisted.<br/>API: `POST /super-admin/services → 201`. |

### Flow 13.3 — Edit / disable

| # | Step | Expected |
|---|---|---|
| 1 | Disable service | Tenants can't request it via support. |

---

## 14. Support Tickets

URL: `/superadmin/support`

### Flow 14.1 — List

| # | Step | Expected |
|---|---|---|
| 1 | Open list | Columns: Ticket #, Tenant, Subject, Priority, Status, Last Updated.<br/>API: `GET /super-admin/support → 200`. |
| 2 | Filter by Status / Priority | Works. |

### Flow 14.2 — Detail

| # | Step | Expected |
|---|---|---|
| 1 | Click ticket | Conversation thread + attachments + tenant info. |

### Flow 14.3 — Reply

| # | Step | Expected |
|---|---|---|
| 1 | Add reply text + attachment → Send | Reply listed; tenant notified by email.<br/>API: `POST /super-admin/support/<id>/reply → 201`. |

### Flow 14.4 — Status transitions

| # | Step | Expected |
|---|---|---|
| 1 | Open → In Progress → Resolved → Closed | Each transition recorded; tenant sees status update. |
| 2 | Reopen closed ticket | Status `open`; thread preserved. |

### Flow 14.5 — Assign internally

| # | Step | Expected |
|---|---|---|
| 1 | Assign ticket to platform employee | Assigned employee notified; appears in their queue. |

### Flow 14.6 — Escalate

| # | Step | Expected |
|---|---|---|
| 1 | Mark priority Critical | Highlighted in list; SLA timer starts. |

---

## 15. Accounts

URL: `/superadmin/accounts`

### Flow 15.1 — Account list

| # | Step | Expected |
|---|---|---|
| 1 | Open list | Platform billing accounts / payment records. |

### Flow 15.2 — View account detail

| # | Step | Expected |
|---|---|---|
| 1 | Click row | Invoices, payments, refunds. |

### Flow 15.3 — Manual payment record

| # | Step | Expected |
|---|---|---|
| 1 | Add manual payment with reference → Save | Recorded; tenant balance updated. |

---

## 16. Platform Employees

URL: `/superadmin/employees`

### Flow 16.1 — Add platform employee

| # | Step | Expected |
|---|---|---|
| 1 | **+ Add** → name, email, role (e.g. SupportAgent), password → Save | Persisted; can login at `/superadmin/login`.<br/>API: `POST /super-admin/employees → 201`. |
| 2 | Duplicate email | 409. |

### Flow 16.2 — Edit role

| # | Step | Expected |
|---|---|---|
| 1 | Change role | Permissions update. |

### Flow 16.3 — Deactivate

| # | Step | Expected |
|---|---|---|
| 1 | Deactivate employee | Can't login. |
| 2 | Try deactivate self | 400 `Cannot deactivate yourself`. |

### Flow 16.4 — Delete

| # | Step | Expected |
|---|---|---|
| 1 | Delete platform employee with no assigned tickets | Removed. |
| 2 | Employee with assigned tickets | Reassign first; otherwise blocked. |

---

## 17. Cross-Role Isolation

### Flow 17.1 — SA cannot perform tenant-scoped actions

| # | Step | Expected |
|---|---|---|
| 1 | Manually call `GET /quotations` with SA token | 403 (SA cannot access tenant API directly). |
| 2 | Manually call `GET /customers` | 403. |
| 3 | Try `/dashboard` (tenant) | Redirect to `/superadmin/dashboard`. |

### Flow 17.2 — SA token rejected on reseller routes

| # | Step | Expected |
|---|---|---|
| 1 | Call `/resellers/me/wallet` with SA token | 403 `Access denied: reseller only`. |

### Flow 17.3 — Other roles cannot access SA routes

| # | Step | Expected |
|---|---|---|
| 1 | Use enterprise admin token to call `/super-admin/dashboard` | 403 `Access denied: super admin only`. |
| 2 | Use employee token | 403. |
| 3 | Use reseller token | 403. |

### Flow 17.4 — JWT type swap (security)

| # | Step | Expected |
|---|---|---|
| 1 | Take an SA JWT, decode, change `type` to `enterprise`, re-sign with attempted secret | Server rejects: signature invalid or DB user.type mismatch. **P0 SECURITY**. |

---

## 18. Audit & Activity (platform)

### Flow 18.1 — Per-tenant activity log

| # | Step | Expected |
|---|---|---|
| 1 | Tenant detail → Activity tab | Lists all SA actions (block, plan change, etc.) with timestamps. |

### Flow 18.2 — Per-reseller activity log

| # | Step | Expected |
|---|---|---|
| 1 | Reseller detail → Activity tab | Lists wallet adjustments, status changes, plan assignments. |

### Flow 18.3 — Platform-wide audit (if exposed)

| # | Step | Expected |
|---|---|---|
| 1 | Open platform audit (if exists) | Cross-tenant log filterable by SA user, date, action. |

---

## 19. End-to-End Flows

### Flow 19.1 — Reseller onboarding

| # | Step | Expected |
|---|---|---|
| 1 | SA creates reseller with initial wallet credit | Reseller `pending`; activation email sent. |
| 2 | Reseller activates account (via email link) | Status `active`. |
| 3 | Reseller logs in at `/reseller/login` | Lands on dashboard. |
| 4 | Reseller provisions a tenant | Tenant created with `reseller_id` set. |
| 5 | Tenant admin completes registration | Tenant `pending` → activated. |
| 6 | SA verifies all linkages (tenant has reseller, reseller wallet decremented, audit logs all in place) | Verified. |

### Flow 19.2 — Tenant lifecycle

| # | Step | Expected |
|---|---|---|
| 1 | Block tenant `Acme` | Tenant blocked; user logged out on next call. |
| 2 | Tenant admin tries login | Fails with appropriate message. |
| 3 | SA reactivates after 5 min | Tenant can login again; data intact. |

### Flow 19.3 — Plan migration

| # | Step | Expected |
|---|---|---|
| 1 | Tenant on `Pro` plan | Verify features match Pro. |
| 2 | SA upgrades to `Enterprise` | Pro-rated billing record; features expand on next token refresh. |
| 3 | SA downgrades back to `Pro` | Features narrow; over-quota flagged if any. |

### Flow 19.4 — Coupon application audit

| # | Step | Expected |
|---|---|---|
| 1 | Create coupon `TEST20` 20% off | Saved. |
| 2 | A tenant uses it during renewal | Discount applied; `used_count++`. |
| 3 | SA inspects coupon usage report | Shows tenant + amount. |

### Flow 19.5 — Support escalation

| # | Step | Expected |
|---|---|---|
| 1 | Tenant raises critical ticket | Visible in `/superadmin/support`. |
| 2 | SA assigns to platform employee | Notification fired. |
| 3 | Employee replies → marks resolved | Tenant sees status; reopens if needed. |

---

## 20. Negative / Edge / Security

### 20.1 Permission tampering

| # | Scenario | Expected |
|---|---|---|
| 1 | Modify `superAdminStore.user.type` in localStorage | Backend re-validates from token; UI may update but APIs reject. |
| 2 | Forge a token with `type='super_admin'` using guessed secret | Signature check fails; 401. **P0 SECURITY** if accepted. |

### 20.2 Cross-tenant ID guessing

| # | Scenario | Expected |
|---|---|---|
| 1 | SA call `/super-admin/enterprises/9999` (non-existent) | 404 `Tenant not found`. |
| 2 | SA call `/super-admin/enterprises/<another_tenant_in_diff_region>` | 200 (SA is platform-wide; expected). |

### 20.3 Concurrency

| # | Scenario | Expected |
|---|---|---|
| 1 | Two SAs block same tenant simultaneously | One succeeds; second is no-op (already blocked). |
| 2 | SA1 blocks while SA2 is editing tenant profile | Edit save still succeeds (status independent). |

### 20.4 Network failures

| # | Scenario | Expected |
|---|---|---|
| 1 | Block tenant request times out | Toast error; tenant status NOT half-updated; retry works. |

### 20.5 Boundary inputs

| # | Field | Bad value | Expected |
|---|---|---|---|
| 1 | Plan price | -10 | Field error. |
| 2 | Plan price | 99,999,999 | Accepted but verify DB column size; otherwise 400. |
| 3 | Wallet adjustment | 0 | No-op or error. |
| 4 | Coupon discount | 110% | Field error. |
| 5 | Coupon expiry | 1900-01-01 | Field error or accepted then immediately expired. |
| 6 | Reseller email | very long | Rejected. |
| 7 | Tenant name | empty | Field error. |

### 20.6 Direct URL access

| # | Scenario | Expected |
|---|---|---|
| 1 | Logout, paste `/superadmin/dashboard` | Redirect `/superadmin/login`. |
| 2 | Use SA URL pattern as tenant | 403. |

### 20.7 SQL/XSS in inputs

| # | Field | Value | Expected |
|---|---|---|---|
| 1 | Tenant name | `<script>alert(1)</script>` | Stored sanitized; rendered as text on display, no script execution. |
| 2 | Coupon code | `' OR 1=1 --` | Stored as string; no SQL injection (parameterized queries). |

### 20.8 File upload (if SA uploads tenant logos / contracts)

| # | Scenario | Expected |
|---|---|---|
| 1 | 50 MB file | Rejected (size limit). |
| 2 | `.exe` upload | Rejected by content-type allowlist. |

### 20.9 Browser & device

| # | Scenario | Expected |
|---|---|---|
| 1 | Chrome / Firefox / Safari | All P0 flows pass. |
| 2 | Mobile (iOS) | Login + dashboard + view tenant works (admin-heavy actions may be desktop-only). |

---

## 21. Sign-off Checklist

### Authentication & session
- [ ] Login (Flow 2.1)
- [ ] Login negatives (Flow 2.2)
- [ ] Logout (Flow 3.2)
- [ ] Token expiry (Flow 3.3)

### Tenants
- [ ] List + filter + sort (Flow 6.1)
- [ ] Detail (Flow 6.2)
- [ ] Edit profile (Flow 6.3)
- [ ] Block + revert (Flows 6.4–6.5)
- [ ] Activate pending (Flow 6.6)
- [ ] Plan change (Flow 6.7)
- [ ] Subscription extend/shorten (Flow 6.8)

### Resellers
- [ ] CRUD (Flows 7.1–7.7)
- [ ] Reassign tenant (Flow 7.8)
- [ ] Wallet adjust (Flow 8.2)
- [ ] Wallet negative balance check (Flow 8.3)

### Plans
- [ ] Reseller plans CRUD (§9)
- [ ] Reseller subscriptions (§10)
- [ ] Tenant plans CRUD (§11)
- [ ] Coupons CRUD + apply (§12)

### Services / Support / Accounts
- [ ] Services master (§13)
- [ ] Support tickets full lifecycle (§14)
- [ ] Accounts (§15)

### Platform employees
- [ ] CRUD (§16)
- [ ] Self-deactivate blocked (Flow 16.3.2)

### Cross-role isolation
- [ ] SA cannot call tenant API (Flow 17.1)
- [ ] Other roles cannot call SA API (Flow 17.3)
- [ ] JWT type swap rejected (Flow 17.4)

### Audit
- [ ] Per-tenant audit (Flow 18.1)
- [ ] Per-reseller audit (Flow 18.2)

### E2E
- [ ] Reseller onboarding (Flow 19.1)
- [ ] Tenant lifecycle (Flow 19.2)
- [ ] Plan migration (Flow 19.3)
- [ ] Coupon usage (Flow 19.4)
- [ ] Support escalation (Flow 19.5)

### Security & edge
- [ ] Permission tampering (§20.1)
- [ ] Cross-tenant guessing (§20.2)
- [ ] Concurrency (§20.3)
- [ ] Network failure (§20.4)
- [ ] Boundary inputs (§20.5)
- [ ] Direct URL (§20.6)
- [ ] SQL/XSS (§20.7)
- [ ] File upload (§20.8)
- [ ] Browser/device (§20.9)

### Final environment & cleanup
- [ ] Zero unhandled console errors during full run.
- [ ] All blocked tenants reverted to `active`.
- [ ] All test resellers' wallets returned to seed balance.
- [ ] All test coupons / plans created during run are deleted.
- [ ] Audit log entries match SA actions.

---

## Run-log template (copy per cycle)

```
# Run YYYY-MM-DD — Super Admin tests
Tester: <name>
Env:    QA
Build:  <git sha>

Failed flows:
- <flow id>: <one-liner> → bug: <link>

Security findings (P0):
- <flow id>: <description>

Reverted state items:
- Tenant Gamma: blocked → active
- Reseller rajesh: wallet 1000 → 500 (refund)

Notes:
- ...
```

---

**Document version 1.0** — Super-admin coverage complete. Update when a new platform module is added.
