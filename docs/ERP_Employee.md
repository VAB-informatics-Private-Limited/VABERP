# ERP — Employee · Test Flow Document

> **Persona:** Employee user (logged in via the **Employee** tab on `/login`, JWT `type='employee'`, granular permissions in `MenuPermission` matrix, optional data-scope filters `dataStartDate` and `ownDataOnly`).
> **Audience:** QA tester; run top-to-bottom in a clean QA tenant after Enterprise Admin has finished setup.
> **Companion files:** `ERP_Enterprise.md` (admin-side), `FSD.md`, `TEST_CASES.md`, `tests/00-test-strategy.md`.
> **Critical difference from admin:** every flow must check **what the employee CAN see/do AND what is correctly blocked.** Permission denials are first-class test cases here.

---

## How to use this document

1. Run **§1** first to seed personas; subsequent sections assume those test users exist.
2. Each persona-specific flow names the exact employee account to log in as.
3. For every "happy path" flow, also run the matching **Negative / Permission** section to confirm the same action is blocked for an employee without that permission.
4. Mark each step `[PASS]` / `[FAIL]` / `[BLOCKED]`. If permission test fails (action allowed when it shouldn't be), mark **P0 SECURITY**.
5. Token-expiry / 401 / logout flows live in §3 — re-test on every regression cycle.

---

## Table of Contents

1. [Pre-requisites & Test Personas](#1-pre-requisites--test-personas)
2. [Authentication (Employee tab)](#2-authentication-employee-tab)
3. [Session, Token, Logout](#3-session-token-logout)
4. [Profile & Self-service](#4-profile--self-service)
5. [Dashboard (employee view)](#5-dashboard-employee-view)
6. [Sidebar Visibility by Permission](#6-sidebar-visibility-by-permission)
7. [Data Scope — `ownDataOnly` & `dataStartDate`](#7-data-scope--owndataonly--datastartdate)
8. [Manager Hierarchy (`reportingTo`)](#8-manager-hierarchy-reportingto)
9. [Customers (employee CRUD with permissions)](#9-customers-employee-crud-with-permissions)
10. [Enquiries](#10-enquiries)
11. [CRM Leads & Follow-ups](#11-crm-leads--follow-ups)
12. [Quotations](#12-quotations)
13. [Sales Orders (Purchase Orders UI)](#13-sales-orders-purchase-orders-ui)
14. [Invoices & Proforma](#14-invoices--proforma)
15. [Products / Catalog (read-mostly for non-admin)](#15-products--catalog-read-mostly-for-non-admin)
16. [Inventory, Material Requests, GRN](#16-inventory-material-requests-grn)
17. [Manufacturing (BOM / Job Cards / Stages / Waste)](#17-manufacturing-bom--job-cards--stages--waste)
18. [Procurement](#18-procurement)
19. [Service Management](#19-service-management)
20. [Machinery & Maintenance](#20-machinery--maintenance)
21. [Waste Management](#21-waste-management)
22. [Tasks, Team Updates, Organizer](#22-tasks-team-updates-organizer)
23. [Reports](#23-reports)
24. [Settings (read-only / blocked)](#24-settings-read-only--blocked)
25. [Cross-Role Isolation](#25-cross-role-isolation)
26. [Notifications & Audit (employee perspective)](#26-notifications--audit-employee-perspective)
27. [End-to-End Flows (employee-only paths)](#27-end-to-end-flows-employee-only-paths)
28. [Negative / Edge / Security Scenarios](#28-negative--edge--security-scenarios)
29. [Sign-off Checklist](#29-sign-off-checklist)

---

## 1. Pre-requisites & Test Personas

### 1.1 Six employee personas (created by Enterprise Admin in `/employees`)

| # | Login | Role | Permissions snapshot | Data scope | Reporting To | Used for |
|---|---|---|---|---|---|---|
| 1 | `qa.viewer@vaberp-test.com / Pass@123` | View-only | All `view=1`, every other action `=0` | None | None | Permission-deny tests; sidebar filtering |
| 2 | `qa.salesrep@vaberp-test.com / Pass@123` | Sales Rep | `sales:*:view/create/edit=1`, `enquiry:*:view/create/edit=1`, `crm:*:view/create/edit=1`. **No delete anywhere.** | None | `qa.salesmgr` | Standard sales workflows |
| 3 | `qa.salesmgr@vaberp-test.com / Pass@123` | Sales Manager | Same as salesrep + `reports:*:view=1`, `sales:quotations:delete=1` | None | None (top of branch) | Manager hierarchy data visibility, reports access |
| 4 | `qa.invadmin@vaberp-test.com / Pass@123` | Inventory Admin | `inventory:*=1`, `procurement:*:view=1`, `orders:*:view=1` | None | None | Inventory + GRN + MR flows |
| 5 | `qa.opsmgr@vaberp-test.com / Pass@123` | Operations Manager | All non-admin modules (no `employees:*`, no `configurations:*`) | None | None | Cross-module flow without admin rights |
| 6 | `qa.scoped@vaberp-test.com / Pass@123` | Scoped Sales Rep | Same as `qa.salesrep` | `dataStartDate=2026-01-01`, `ownDataOnly=true` | None | Data-scope filter tests |

### 1.2 Pre-seed reference data (must exist in tenant before this run)

- All §1.1 employees created.
- ≥ 5 customers with mobiles `9000000001`–`9000000005`.
- ≥ 5 quotations: 2 created by `qa.salesrep`, 1 created by `qa.salesmgr`, 1 created by `qa.scoped` after 2026-01-01, 1 created by anyone before 2026-01-01.
- ≥ 1 accepted quote → linked SO → linked job card.
- ≥ 1 BOM linked to a product.
- ≥ 1 raw material with stock > 0.

### 1.3 Browser & tooling

- Chrome (latest) **incognito** between persona switches to avoid stale cookies.
- DevTools open (Network, Application > Cookies, Console).
- Have admin credentials (`acme.admin`) in a separate browser/profile to grant/revoke permissions on the fly.

---

## 2. Authentication (Employee tab)

### Flow 2.1 — Login with valid credentials (happy path)

| # | Step | Expected |
|---|---|---|
| 1 | Open `/login` → click **Employee** tab | Form: email + password + Sign In button. |
| 2 | Type `qa.salesrep@vaberp-test.com` / `Pass@123` | Fields accept. |
| 3 | Click **Sign In** | Toast `Login successful!`<br/>Redirect `/dashboard`.<br/>`access_token` cookie present (httpOnly).<br/>`authStore.user` populated; `authStore.permissions` populated with sales-rep matrix.<br/>API: `POST /auth/employee/login → 200`. |
| 4 | Inspect localStorage `auth-store` | `userType=employee`, `permissions` reflects sales:*:create=1 etc. |

### Flow 2.2 — Invalid credentials

| # | Action | Expected |
|---|---|---|
| 1 | Wrong password | Toast `Invalid email or password`. No token. `POST /auth/employee/login → 401`. |
| 2 | Unknown email | Toast `Invalid email or password`. |
| 3 | Mismatched email casing (e.g. `QA.SALESREP@…`) | Should still log in (case-insensitive email lookup). |

### Flow 2.3 — Inactive employee

| # | Step | Expected |
|---|---|---|
| 1 | Admin sets `qa.viewer.status='inactive'` | Saved. |
| 2 | Try login as `qa.viewer` | Toast `Your account is inactive`. 401. |

### Flow 2.4 — Inactive enterprise blocks employee login

| # | Step | Expected |
|---|---|---|
| 1 | Super-admin blocks Acme tenant | Tenant blocked. |
| 2 | Try login as any Acme employee | Toast `Your enterprise account is inactive`. |
| 3 | Restore tenant | Login resumes normally. |

### Flow 2.5 — Multi-enterprise duplicate email

**Pre-conditions:** the same email exists as employees in two different tenants (DupShare seed: `shared.emp@vaberp-test.com / Shared@123`).

| # | Step | Expected |
|---|---|---|
| 1 | On Employee tab, type `shared.emp@vaberp-test.com` + valid password → Sign In | Toast `This email is registered with more than one business. Please contact your admin.` 401. No token. |
| 2 | Check audit log on each tenant | No successful login recorded. |

### Flow 2.6 — Field validations

| # | Field | Bad value | Expected |
|---|---|---|---|
| 1 | Email | blank | Field error `Email is required` |
| 2 | Email | `bad-email` | `Enter a valid email address` |
| 3 | Password | blank | Field error `Password is required` |
| 4 | Password | `12345` (5 chars) | `Password must be at least 6 characters` |

For each: API call must NOT fire.

### Flow 2.7 — Rate limit (10/min)

| # | Step | Expected |
|---|---|---|
| 1 | Submit 11 login attempts in under a minute | 11th call returns 429 `Too many requests`. |

### Flow 2.8 — Forgot password (employee)

| # | Step | Expected |
|---|---|---|
| 1 | Click **Forgot your password?** → `/forgot-password` | Form with email + old password + new password fields. |
| 2 | Submit with `qa.salesrep@vaberp-test.com / Pass@123 / NewPass@456` | Success screen `Password Updated!` API: `POST /auth/reset-password → 200`. |
| 3 | Login with new password | Works. Old password rejected. |

### Flow 2.9 — Tenant branding via `?org=`

| # | Step | Expected |
|---|---|---|
| 1 | Open `/login?org=acme` → Employee tab | Logo + tagline reflect Acme. |

### Flow 2.10 — Already-logged-in user visiting /login

| # | Step | Expected |
|---|---|---|
| 1 | While logged in, navigate to `/login` | Auto-redirect `/dashboard`. |

---

## 3. Session, Token, Logout

### Flow 3.1 — Token persistence across reload

| # | Step | Expected |
|---|---|---|
| 1 | After login, reload tab | Stays on `/dashboard`. `GET /auth/me → 200`. |

### Flow 3.2 — Logout clears state

| # | Step | Expected |
|---|---|---|
| 1 | Click sidebar **Logout** | API: `POST /auth/logout → 200 'Logged out'`<br/>`access_token` cookie cleared.<br/>localStorage `auth-store` cleared.<br/>Redirect `/login`. |
| 2 | After logout, `GET /auth/me` with stale cookie | 401. |

### Flow 3.3 — Token expiry mid-session (simulated)

| # | Step | Expected |
|---|---|---|
| 1 | DevTools → delete `access_token` cookie | Cookie removed. |
| 2 | Click any sidebar item that triggers an API call | Auto-redirect `/login`. Toast `Session expired` (or similar). authStore cleared. |

### Flow 3.4 — Status flipped to inactive mid-session

| # | Step | Expected |
|---|---|---|
| 1 | Login as `qa.viewer` | Active session. |
| 2 | Admin sets `qa.viewer.status='inactive'` | Saved. |
| 3 | Viewer triggers next API call | 401 (JWT strategy re-validates and rejects inactive). User redirected to `/login`. |

### Flow 3.5 — Permission revoked mid-session

| # | Step | Expected |
|---|---|---|
| 1 | Login as `qa.salesrep` (has `sales:quotations:create=1`). On `/quotations` page. | Create button visible. |
| 2 | Admin toggles `sales:quotations:create=0` | Saved. |
| 3 | Wait for next `/auth/permissions` poll (typically <60s) OR reload page | Create button disappears without re-login. Direct API call returns 403. |

### Flow 3.6 — Duplicate concurrent session

| # | Step | Expected |
|---|---|---|
| 1 | Same employee logs in on two browsers | Both sessions active (no force-logout). |
| 2 | Logout in one | Other remains valid until its own token expires. |

---

## 4. Profile & Self-service

### Flow 4.1 — View own profile

| # | Step | Expected |
|---|---|---|
| 1 | Click avatar → **Profile** | Profile page shows: name, email, mobile, department, designation, reporting-to. Read-mostly. |

### Flow 4.2 — Edit allowed fields

| # | Step | Expected |
|---|---|---|
| 1 | Edit own mobile / address (fields admin allows) → Save | Saved.<br/>API: `PATCH /employees/me → 200`. |
| 2 | Try edit own email | Field disabled or blocked. |
| 3 | Try change own department / designation | Disabled (admin-only). |

### Flow 4.3 — Change own password

| # | Step | Expected |
|---|---|---|
| 1 | Profile → Change Password → enter current + new + confirm → Save | Saved. Old password no longer works. |
| 2 | Wrong current password | Error `Current password is incorrect`. |
| 3 | New password < 6 chars | Field error. |

### Flow 4.4 — Cannot edit own permissions

| # | Step | Expected |
|---|---|---|
| 1 | While logged in as employee, attempt to GET `/employees/me/permissions` and PATCH | PATCH returns 403 `Cannot edit own permissions`. |
| 2 | UI does not expose permission editor for self | Verified. |

### Flow 4.5 — Cannot deactivate self

| # | Step | Expected |
|---|---|---|
| 1 | Try to set own status='inactive' (via API or any UI gate) | 400 `Cannot deactivate yourself`. |

---

## 5. Dashboard (employee view)

### Flow 5.1 — Dashboard renders with permitted KPIs only

| # | Step | Expected |
|---|---|---|
| 1 | Login as `qa.salesrep` → `/dashboard` | KPI cards limited to sales-relevant ones (My Open Quotes, My Closed Sales, My Open Tasks). No admin-only cards (System health, Tenants, etc.). |
| 2 | Login as `qa.viewer` → `/dashboard` | Cards show counts (view-only) — no Create-action shortcuts. |
| 3 | Login as `qa.invadmin` → `/dashboard` | Inventory KPIs (low stock, pending GRN, pending MR) prominent. |

### Flow 5.2 — KPI counts respect data scope

| # | Step | Expected |
|---|---|---|
| 1 | Login as `qa.scoped` (ownDataOnly=true, dataStartDate=2026-01-01) | Quotation count = own quotes after 2026-01-01 only. |
| 2 | Login as `qa.salesmgr` (manager) | Includes own + direct reports' counts. |

### Flow 5.3 — Quick action buttons gated by permission

| # | Step | Expected |
|---|---|---|
| 1 | `qa.viewer` on dashboard | No "+ Create Quotation", "+ Add Customer" etc. quick actions. |
| 2 | `qa.salesrep` on dashboard | "+ Create Quotation", "+ Add Customer", "+ Add Lead" visible. No "+ Add Employee". |

---

## 6. Sidebar Visibility by Permission

### Flow 6.1 — Sidebar items appear only for granted modules

| Persona | Should see | Should NOT see |
|---|---|---|
| qa.viewer | All groups (read-only) | Settings (configurations:edit=0 → may still show but actions disabled) |
| qa.salesrep | Dashboard, Sales (Customers, Quotations), Enquiries, CRM, Tasks, Profile | Employees, Settings, Reports (unless granted), Procurement edit screens |
| qa.salesmgr | Same as rep + Reports | Settings, Employees admin |
| qa.invadmin | Inventory, GRN, MR, Procurement (view), Tasks | Sales create/edit, Employees admin, Settings |
| qa.opsmgr | Most modules except Employees admin and Settings/configurations | Employees admin, Settings |
| qa.scoped | Same as salesrep | (data filtered, but items shown) |

| # | Step | Expected |
|---|---|---|
| 1 | For each persona above, login → inspect sidebar | Matches "Should see / NOT see" matrix exactly. |
| 2 | Direct-URL a hidden module (e.g. salesrep typing `/employees`) | Page returns 403 / blank with `You don't have permission` toast. |

### Flow 6.2 — Hidden actions inside visible pages

| # | Step | Expected |
|---|---|---|
| 1 | `qa.salesrep` on `/quotations` | Sees list (view=1) and **+ Create** (create=1). No Delete option in row Actions (delete=0). |
| 2 | `qa.viewer` on `/quotations` | Sees list. No Create / Edit / Delete / status-change actions. View only. |
| 3 | `qa.salesmgr` on `/quotations` | Sees Delete on draft quotes (delete=1). |

### Flow 6.3 — Permissions polling refresh

| # | Step | Expected |
|---|---|---|
| 1 | `qa.viewer` on `/quotations` (no Create button) | Verified. |
| 2 | Admin grants `sales:quotations:create=1` | Saved. |
| 3 | Wait < 60 s for next `GET /auth/permissions` poll, or reload | Create button appears without re-login. |
| 4 | Admin reverts | Button disappears on next poll. |

---

## 7. Data Scope — `ownDataOnly` & `dataStartDate`

### Flow 7.1 — `ownDataOnly = true` filters list

| # | Step | Expected |
|---|---|---|
| 1 | Pre-condition: `qa.scoped` has `ownDataOnly=true`. Tenant has 5 quotations: 2 by `qa.salesrep`, 1 by `qa.salesmgr`, 2 by `qa.scoped`. | Confirm seed. |
| 2 | Login as `qa.scoped` → `/quotations` | List shows 2 rows (own only). Total in pagination matches. |
| 3 | Disable `ownDataOnly` for `qa.scoped`, reload | All visible rows after `dataStartDate` filter (still respects date). |

### Flow 7.2 — `dataStartDate` hides earlier records

| # | Step | Expected |
|---|---|---|
| 1 | `qa.scoped` has `dataStartDate=2026-01-01`. Existing quote from 2025-12-15 (created by self). | Pre-condition. |
| 2 | Login as `qa.scoped` → `/quotations` | 2025-12-15 quote NOT visible. Quotes from 2026-01-01 onwards visible. |
| 3 | Manually paste `/quotations/<old_id>` URL | 403 / 404 (server enforces scope). |

### Flow 7.3 — Combined filters

| # | Step | Expected |
|---|---|---|
| 1 | `qa.scoped` with both filters active | List = own AND created on/after 2026-01-01. |

### Flow 7.4 — Data scope on enquiries / CRM / tasks

| # | Step | Expected |
|---|---|---|
| 1 | Same `qa.scoped` opens `/enquiries` | Only own enquiries visible. |
| 2 | Opens `/crm` | Only own/assigned leads visible. |
| 3 | Opens `/tasks` | Only own/assigned tasks. |

### Flow 7.5 — Negative: scope cannot be bypassed via API

| # | Step | Expected |
|---|---|---|
| 1 | Login as `qa.scoped`. Find another employee's quotation ID (e.g. via admin). Manually `GET /quotations/<other_id>` from DevTools | 403 or 404. NEVER 200 with data. **P0 SECURITY**. |

---

## 8. Manager Hierarchy (`reportingTo`)

### Flow 8.1 — Manager sees direct reports' data

| # | Step | Expected |
|---|---|---|
| 1 | Pre-condition: `qa.salesrep.reportingTo = qa.salesmgr.id`. Salesrep has 2 quotes; salesmgr has 1 quote. | Verify seed. |
| 2 | Login as `qa.salesmgr` → `/quotations` | List shows 3 rows (own 1 + reports' 2). Server merges. |
| 3 | Same on `/enquiries`, `/crm`, `/tasks` | Manager sees reports' data in each. |
| 4 | Login as `qa.salesrep` → same modules | Sees only own (rep is not a manager). |

### Flow 8.2 — Multi-level hierarchy

| # | Step | Expected |
|---|---|---|
| 1 | Build chain: `A → B → C` (A reports to B, B reports to C). | Pre-condition. |
| 2 | Login as C → list quotes | Sees C's + B's + A's (transitively, IF the system supports multi-level; verify behaviour and document). |
| 3 | Login as B | Sees B's + A's. |
| 4 | Login as A | Sees A's only. |

### Flow 8.3 — Cycle prevention

| # | Step | Expected |
|---|---|---|
| 1 | Admin tries to set C.reportingTo = A | 400 `Reporting cycle detected`. |

### Flow 8.4 — Reassign mid-flow

| # | Step | Expected |
|---|---|---|
| 1 | Manager B currently sees A's quotes. Admin moves A to a different manager. | Saved. |
| 2 | B reloads `/quotations` | A's quotes no longer in B's list. |

---

## 9. Customers (employee CRUD with permissions)

URL: `/customers`

### Flow 9.1 — View customers

| # | Persona | Expected |
|---|---|---|
| 1 | qa.viewer | List loads; no **+ Add Customer** button; row Actions shows only View. |
| 2 | qa.salesrep | Add button visible; Edit visible; Delete absent. |
| 3 | qa.scoped | List filtered to own (ownDataOnly) + dataStartDate. |

### Flow 9.2 — Create customer

| # | Persona | Action | Expected |
|---|---|---|---|
| 1 | qa.salesrep | Create new customer | Persisted; redirect to detail. `POST /customers → 201`. |
| 2 | qa.viewer | Manual `POST /customers` from DevTools | 403 `You don't have permission`. |
| 3 | qa.salesrep | Mobile validation `12345` | Field error. |
| 4 | qa.salesrep | Duplicate mobile blur | Yellow warning (non-blocking). |

### Flow 9.3 — Edit customer

| # | Persona | Action | Expected |
|---|---|---|---|
| 1 | qa.salesrep | Edit (created by self) | Allowed. |
| 2 | qa.salesrep with `ownDataOnly=true` | Edit a customer created by another employee | 403 / 404. |
| 3 | qa.viewer | Edit | Edit button hidden; direct PATCH → 403. |

### Flow 9.4 — Delete customer

| # | Persona | Action | Expected |
|---|---|---|---|
| 1 | qa.salesrep (no delete) | Try delete | Action absent in UI. Direct DELETE → 403. |
| 2 | qa.salesmgr | Delete a customer with no orders | Removed. |
| 3 | qa.salesmgr | Delete with linked orders | 400 `Cannot delete customer with linked orders`. |

### Flow 9.5 — Search & export

| # | Persona | Action | Expected |
|---|---|---|---|
| 1 | qa.salesrep | Search/filter | Works. |
| 2 | qa.viewer | Click Export CSV | Download succeeds (view = export by default) OR 403 if export gated separately. Verify policy. |

---

## 10. Enquiries

URL: `/enquiries`

### Flow 10.1 — Create enquiry

| # | Persona | Action | Expected |
|---|---|---|---|
| 1 | qa.salesrep | Fill form → Save | Persisted; status `New`. |
| 2 | qa.viewer | Add button hidden; direct POST → 403 | Blocked. |

### Flow 10.2 — Edit & status change

| # | Persona | Action | Expected |
|---|---|---|---|
| 1 | qa.salesrep | Move to Contacted, then Quotation Sent | Allowed; activity entry. |
| 2 | qa.viewer | Status dropdown read-only | Edit blocked. |

### Flow 10.3 — Convert enquiry to quotation

| # | Persona | Action | Expected |
|---|---|---|---|
| 1 | qa.salesrep | Click Create Quotation | Routes to `/quotations/create?enquiryId=<id>`. |
| 2 | qa.salesrep without `sales:quotations:create` | Button disabled | Verified; direct URL still loads but final POST → 403. |

### Flow 10.4 — Follow-ups, notes, attachments

| # | Persona | Action | Expected |
|---|---|---|---|
| 1 | qa.salesrep | Add note, schedule follow-up, upload attachment | All allowed. |
| 2 | qa.viewer | Same actions blocked / hidden | Verified. |

### Flow 10.5 — Manager visibility

| # | Step | Expected |
|---|---|---|
| 1 | qa.salesmgr opens `/enquiries` | Sees own + qa.salesrep's enquiries. |

### Flow 10.6 — Auto-status updates from quote

| # | Step | Expected |
|---|---|---|
| 1 | qa.salesrep sends a quote linked to enquiry | Enquiry status auto-flips to `Quotation Sent` even though employee didn't change it manually. |

---

## 11. CRM Leads & Follow-ups

URL: `/crm`

### Flow 11.1 — Create / update lead

| # | Persona | Action | Expected |
|---|---|---|---|
| 1 | qa.salesrep | Create → drag through stages → close | Allowed. |
| 2 | qa.viewer | Drag-drop disabled; create blocked | Verified. |

### Flow 11.2 — Reassign

| # | Persona | Action | Expected |
|---|---|---|---|
| 1 | qa.salesrep | Reassign own lead to another rep | Allowed if `crm:assignments:edit=1`. |
| 2 | qa.salesrep with reassign=0 | Action hidden / 403 | Verified. |

### Flow 11.3 — Bulk reassign

| # | Persona | Action | Expected |
|---|---|---|---|
| 1 | qa.salesmgr | Multi-select 5 leads → Bulk Reassign | Allowed. |
| 2 | qa.salesrep | Same | If granted: works; otherwise 403. |

### Flow 11.4 — Follow-ups list

| # | Persona | Step | Expected |
|---|---|---|---|
| 1 | qa.salesrep | Open `/crm/follow-ups` | Sees own follow-ups (and reports' if manager). |
| 2 | qa.viewer | Open list | View-only; cannot add or close follow-ups. |

### Flow 11.5 — Reports access

| # | Persona | Step | Expected |
|---|---|---|---|
| 1 | qa.salesrep without `crm:reports:view` | Opens `/crm/reports` | 403 page or hidden link. |
| 2 | qa.salesmgr (with `reports:view=1`) | Opens | Loads with own + reports' data. |

### Flow 11.6 — Convert lead to enquiry

| # | Persona | Action | Expected |
|---|---|---|---|
| 1 | qa.salesrep with `enquiry:enquiries:create=1` | Convert → enquiry created | Linked enquiry shows on lead detail. |
| 2 | qa.salesrep without enquiry:create | Button disabled | Direct URL flow blocked by 403. |

### Flow 11.7 — Import / export

| # | Persona | Action | Expected |
|---|---|---|---|
| 1 | qa.salesmgr | Import CSV | Allowed; success count returned. |
| 2 | qa.salesrep | Import CSV | If granted: works. Otherwise hidden / 403. |

---

## 12. Quotations

URL: `/quotations`

### Flow 12.1 — Create draft

| # | Persona | Action | Expected |
|---|---|---|---|
| 1 | qa.salesrep | Create + Save as Draft | Quotation persisted with `status='draft'`, `created_by=qa.salesrep.id`. |
| 2 | qa.viewer | Create blocked | Button hidden; direct POST → 403. |

### Flow 12.2 — Mark as Sent

| # | Persona | Action | Expected |
|---|---|---|---|
| 1 | qa.salesrep on own draft | Mark as Sent | Status → sent. PUT /status → 200. |
| 2 | qa.salesrep on someone else's draft (no manager) | Action hidden | Direct PUT → 403/404 (data scope or perm). |

### Flow 12.3 — Edit own quote

| # | Persona | Action | Expected |
|---|---|---|---|
| 1 | qa.salesrep | Edit own draft | Allowed. New version created. |
| 2 | qa.salesrep | Edit accepted (locked) own quote | Lock screen shown. |

### Flow 12.4 — Reject & accept

| # | Persona | Action | Expected |
|---|---|---|---|
| 1 | qa.salesrep | Reject sent quote with reason | Status → rejected; linked enquiry → Follow Up. |
| 2 | qa.salesrep with `sales:quotations:edit=1` | Accept (close sale → PO) | SO created; quote locked. |
| 3 | qa.viewer | Accept button absent | Direct API POST → 403. |

### Flow 12.5 — Delete quotation

| # | Persona | Action | Expected |
|---|---|---|---|
| 1 | qa.salesrep (no delete) | Delete absent | Direct DELETE → 403. |
| 2 | qa.salesmgr | Delete draft | Allowed. Cascades items + versions. |

### Flow 12.6 — Send Email / Print / PDF

| # | Persona | Step | Expected |
|---|---|---|---|
| 1 | qa.salesrep | Send Email on own quote | Allowed if customer email present. |
| 2 | qa.viewer | Send Email button hidden | Verified. Print/PDF allowed for view. |

### Flow 12.7 — Set ETA

| # | Persona | Action | Expected |
|---|---|---|---|
| 1 | qa.salesrep on own quote | Set ETA → date in future | Saved. |
| 2 | qa.viewer | Set button hidden | Direct PATCH → 403. |

### Flow 12.8 — Mobile duplicate check

| # | Persona | Action | Expected |
|---|---|---|---|
| 1 | qa.salesrep on Create form | Type existing customer mobile, blur | Yellow warning with existing quote # — non-blocking. |

### Flow 12.9 — Tier / discount validation (frontend-enforced)

| # | Persona | Action | Expected |
|---|---|---|---|
| 1 | qa.salesrep | Discount > tier max | Submit blocked with red error. |
| 2 | qa.salesrep | Override via direct API call (DevTools) | Backend stores whatever client sends — verify and log as observation; should ideally also enforce on backend. **P1 SECURITY**. |

### Flow 12.10 — Concurrent edit on own quote (two devices)

| # | Step | Expected |
|---|---|---|
| 1 | qa.salesrep edits in tab A and tab B | Last write wins; both versions in history; no data corruption. |

### Flow 12.11 — Manager visibility & overrides

| # | Step | Expected |
|---|---|---|
| 1 | qa.salesmgr opens `/quotations` | Sees rep's quotes. |
| 2 | qa.salesmgr edits rep's quote | Allowed (manager has edit on team). New version recorded with manager as `updated_by`. |

### Flow 12.12 — Data scope constraints

| # | Step | Expected |
|---|---|---|
| 1 | qa.scoped on `/quotations` | Sees only own + within dataStartDate. |
| 2 | Manually fetch a hidden quote | 403/404. |

---

## 13. Sales Orders (Purchase Orders UI)

URL: `/sales-orders`

### Flow 13.1 — View SO

| # | Persona | Step | Expected |
|---|---|---|---|
| 1 | qa.salesrep with `orders:sales_orders:view=1` | Opens list | SOs visible. |
| 2 | qa.viewer | Opens list | Visible (view=1). No Edit / Dispatch / Cancel buttons. |

### Flow 13.2 — Edit SO header

| # | Persona | Action | Expected |
|---|---|---|---|
| 1 | qa.opsmgr | Edit notes / shipping → Save | Saved. |
| 2 | qa.salesrep without `orders:sales_orders:edit` | Edit button hidden / 403 on PATCH | Verified. |

### Flow 13.3 — Dispatch

| # | Persona | Step | Expected |
|---|---|---|---|
| 1 | qa.opsmgr (with dispatch perm) | Dispatch SO with vehicle + driver | Status `dispatched`. |
| 2 | qa.salesrep | Dispatch button hidden | Direct API POST → 403. |
| 3 | qa.opsmgr on SO with `dispatch_on_hold=true` | Blocked with reason | Verified. |

### Flow 13.4 — Cancel SO

| # | Persona | Step | Expected |
|---|---|---|---|
| 1 | qa.opsmgr | Cancel open SO | Status `cancelled`; linked quote shows PO Cancelled banner. |
| 2 | qa.salesrep | Cancel button absent | Direct DELETE → 403. |

### Flow 13.5 — Linked PO/JC navigation

| # | Step | Expected |
|---|---|---|
| 1 | Click linked quotation on SO detail | Routes to quotation if employee has view perm; otherwise 403. |
| 2 | Click linked job card | Routes if `orders:job_cards:view=1`; otherwise blocked. |

---

## 14. Invoices & Proforma

URL: `/invoices`, `/proforma-invoices`

### Flow 14.1 — Create invoice

| # | Persona | Action | Expected |
|---|---|---|---|
| 1 | qa.opsmgr (`invoicing:invoices:create=1`) | Create from dispatched SO | Invoice persisted. |
| 2 | qa.salesrep without create | Add button hidden / 403 | Verified. |

### Flow 14.2 — Mark as paid

| # | Persona | Action | Expected |
|---|---|---|---|
| 1 | qa.opsmgr | Add payment | Status flips. Audit log entry. |
| 2 | qa.viewer | Payment button hidden | Direct POST → 403. |

### Flow 14.3 — Edit / delete

| # | Persona | Action | Expected |
|---|---|---|---|
| 1 | qa.opsmgr | Edit unpaid header | Allowed. |
| 2 | qa.opsmgr | Edit paid invoice | Blocked / 400. |
| 3 | qa.salesmgr without `invoicing:invoices:delete` | Delete absent | Verified. |

### Flow 14.4 — Send email & PDF

| # | Persona | Step | Expected |
|---|---|---|---|
| 1 | qa.opsmgr | Send invoice email | Allowed if customer email present. |
| 2 | qa.viewer | Send email button hidden | Verified. |

### Flow 14.5 — Proforma → Invoice

| # | Persona | Action | Expected |
|---|---|---|---|
| 1 | qa.opsmgr | Convert proforma | Tax invoice created. |
| 2 | qa.salesrep | Conversion button hidden | Direct POST → 403. |

---

## 15. Products / Catalog (read-mostly for non-admin)

URL: `/products`

### Flow 15.1 — Browse products

| # | Persona | Step | Expected |
|---|---|---|---|
| 1 | qa.salesrep | Open list | Products visible to be added in quotations. |
| 2 | qa.viewer | Open list | Visible; Add Product button hidden. |

### Flow 15.2 — Create / edit product

| # | Persona | Action | Expected |
|---|---|---|---|
| 1 | qa.invadmin (`catalog:products:create=1`) | Create | Allowed. |
| 2 | qa.salesrep without catalog perms | Create blocked | Verified. |

### Flow 15.3 — Volume tiers visible

| # | Persona | Step | Expected |
|---|---|---|---|
| 1 | qa.salesrep on quotation builder | Add product → tier auto-applies | Yes. Hint shows next-tier prompt. |

### Flow 15.4 — Categories / subcategories

| # | Persona | Action | Expected |
|---|---|---|---|
| 1 | qa.invadmin | Create category | Allowed. |
| 2 | qa.salesrep | Create blocked | Verified. |

---

## 16. Inventory, Material Requests, GRN

URL: `/inventory`, `/material-requests`, `/inventory/goods-receipts`

### Flow 16.1 — Stock list & ledger

| # | Persona | Step | Expected |
|---|---|---|---|
| 1 | qa.invadmin | Open `/inventory` | Full list with stock levels. |
| 2 | qa.viewer | View list | View-only. No Add / Adjust. |

### Flow 16.2 — Add stock manually

| # | Persona | Action | Expected |
|---|---|---|---|
| 1 | qa.invadmin | Add 50 units of RM-001 with note | Stock +50; ledger entry. |
| 2 | qa.salesrep | Add button hidden | Direct POST → 403. |

### Flow 16.3 — Stock adjustment

| # | Persona | Action | Expected |
|---|---|---|---|
| 1 | qa.invadmin | Adjust -3 with reason | Saved; ledger row. |
| 2 | Reason blank | Field error | Verified. |

### Flow 16.4 — Issue MR

| # | Persona | Action | Expected |
|---|---|---|---|
| 1 | qa.invadmin (or production employee) | Issue MR against JC | MR `pending`. |
| 2 | qa.viewer | Issue button hidden | Direct POST → 403. |

### Flow 16.5 — Approve MR

| # | Persona | Action | Expected |
|---|---|---|---|
| 1 | qa.invadmin (`inventory:material_requests:approve=1`) | Approve | Stock decremented. |
| 2 | qa.invadmin without approve | Approve button hidden | Verified. |

### Flow 16.6 — GRN

| # | Persona | Action | Expected |
|---|---|---|---|
| 1 | qa.invadmin | Receive against open PO | Stock +X; PO updated. |
| 2 | Over-receipt | Warning / blocked | Verified. |

---

## 17. Manufacturing (BOM / Job Cards / Stages / Waste)

URL: `/manufacturing`

### Flow 17.1 — Job card creation

| # | Persona | Action | Expected |
|---|---|---|---|
| 1 | qa.opsmgr | Create JC from accepted SO | JC `pending`. |
| 2 | qa.salesrep | Create blocked | Direct POST → 403. |

### Flow 17.2 — Stage workflow

| # | Persona | Step | Expected |
|---|---|---|---|
| 1 | Assigned employee with `orders:job_cards:edit` | Start stage → record waste → complete stage | Each transition saves; waste captured to waste-inventory; audit log. |
| 2 | Non-assigned employee | Same actions blocked unless permission allows | Verified. |
| 3 | Direct PATCH on someone else's JC by salesrep | 403 | Verified. |

### Flow 17.3 — Waste capture writes audit

| # | Step | Expected |
|---|---|---|
| 1 | Assignee completes stage with waste qty + raw material | `WasteInventoryLog action='generated' reference_type='job_card' reference_id=JC.id`. Waste-inventory aggregated row updated. |

### Flow 17.4 — JC list visibility

| # | Persona | Step | Expected |
|---|---|---|---|
| 1 | qa.opsmgr | Sees all JCs | Yes. |
| 2 | qa.salesrep without orders perm | Sees nothing or 403 | Verified. |
| 3 | Production worker assigned only | Sees own JCs (or all if perm allows) | Verify per-tenant policy. |

### Flow 17.5 — BOM view

| # | Persona | Step | Expected |
|---|---|---|---|
| 1 | qa.opsmgr | View BOM list | Visible. |
| 2 | qa.salesrep | BOM module hidden | Verified. |

---

## 18. Procurement

URL: `/procurement/*`

### Flow 18.1 — Suppliers

| # | Persona | Action | Expected |
|---|---|---|---|
| 1 | qa.invadmin (`procurement:suppliers:view=1`) | View | Allowed. |
| 2 | qa.invadmin without create | Add button hidden | Direct POST → 403. |

### Flow 18.2 — Indents → RFQ → PO → GRN

| # | Persona | Step | Expected |
|---|---|---|---|
| 1 | qa.invadmin (with `procurement:indents:create+approve`) | Indent → approve → RFQ to suppliers | Allowed. |
| 2 | qa.invadmin with `procurement:rfqs:send=1` | Send RFQ email | Allowed; otherwise hidden. |
| 3 | qa.invadmin | Award winner; create PO; receive GRN | Full chain works. |

### Flow 18.3 — Restricted personas

| # | Persona | Step | Expected |
|---|---|---|---|
| 1 | qa.salesrep | `/procurement/*` | All routes return 403; sidebar hides procurement group. |

---

## 19. Service Management

URL: `/service-products`, `/service-bookings`, `/service-events`, `/service-revenue`

### Flow 19.1 — Service-products CRUD

| # | Persona | Action | Expected |
|---|---|---|---|
| 1 | qa.opsmgr (`service_management:*=1`) | Full CRUD | Allowed. |
| 2 | qa.salesrep | View only or hidden | Verified. |

### Flow 19.2 — Bookings & events

| # | Persona | Step | Expected |
|---|---|---|---|
| 1 | qa.opsmgr | Create booking → start event → complete | Allowed. |
| 2 | qa.salesrep | Same actions hidden | Verified. |

### Flow 19.3 — Revenue summary

| # | Persona | Step | Expected |
|---|---|---|---|
| 1 | qa.opsmgr (with revenue view) | Loads | Yes. |
| 2 | qa.salesrep | 403 / hidden | Verified. |

---

## 20. Machinery & Maintenance

URL: `/machinery/*`, `/maintenance-*`

### Flow 20.1 — Machine asset CRUD

| # | Persona | Action | Expected |
|---|---|---|---|
| 1 | qa.opsmgr (`machinery_management:machines:*=1`) | CRUD | Allowed. |
| 2 | qa.salesrep | All actions hidden | Verified. |

### Flow 20.2 — Work orders & downtime

| # | Persona | Step | Expected |
|---|---|---|---|
| 1 | Assigned maintenance employee | Create / complete WO; log downtime | Allowed. |
| 2 | qa.salesrep | Hidden | Verified. |

### Flow 20.3 — Spare parts

| # | Persona | Action | Expected |
|---|---|---|---|
| 1 | qa.invadmin with `machinery_management:spares=1` | Add spare; map to machine | Allowed. |

---

## 21. Waste Management

URL: `/waste-inventory`, `/waste-disposal`, `/waste-parties`, `/waste-analytics`

### Flow 21.1 — Read-only waste inventory

| # | Persona | Step | Expected |
|---|---|---|---|
| 1 | qa.opsmgr (`waste_management:waste_inventory:view=1`) | Open `/waste-inventory` | Read-only. **+ Source** and **+ Log Waste Entry** absent. **Manage categories** visible. View logs button visible per row. |
| 2 | qa.salesrep | 403 page if no perm; otherwise list shown | Verified per perm. |

### Flow 21.2 — Quarantine / Write-off

| # | Persona | Action | Expected |
|---|---|---|---|
| 1 | qa.opsmgr (`waste_management:waste_inventory:edit=1`) | Quarantine batch | Allowed. |
| 2 | qa.opsmgr without edit | Action hidden / direct API → 403 | Verified. |
| 3 | qa.opsmgr | Write Off | Allowed. |

### Flow 21.3 — Audit-trail modal

| # | Step | Expected |
|---|---|---|
| 1 | Click View logs (3 entry points: button, material name, Entries chip) | Modal opens with full history: Date, Action, Source (JC# · PO# · Customer link), Qty change, Running total, User, Notes. |
| 2 | Click JC link | Routes `/manufacturing/po/<sales_order_id>` if employee has view perm; else 403. |

### Flow 21.4 — Disposal transactions

| # | Persona | Action | Expected |
|---|---|---|---|
| 1 | qa.opsmgr (`waste_management:waste_disposal:create+edit=1`) | Create draft → confirm → complete | Allowed. Inventory deducted; log entry. |
| 2 | Hazardous category line without manifest | 400 `Manifest number required` | Verified. |
| 3 | qa.salesrep | Module hidden | Verified. |

### Flow 21.5 — Waste parties

| # | Persona | Action | Expected |
|---|---|---|---|
| 1 | qa.opsmgr | Create vendor; set rate | Allowed. |
| 2 | qa.salesrep | Hidden | Verified. |

### Flow 21.6 — Analytics

| # | Persona | Step | Expected |
|---|---|---|---|
| 1 | qa.opsmgr | Load summary, trends, by-category | All charts render. |

---

## 22. Tasks, Team Updates, Organizer

URL: `/tasks`, `/team-updates`, `/organizer`

### Flow 22.1 — Tasks

| # | Persona | Action | Expected |
|---|---|---|---|
| 1 | qa.salesrep | Create task assigned to self or peer | Allowed if `tasks:assignments:create=1`. |
| 2 | qa.salesrep | Edit own task | Allowed. |
| 3 | qa.salesrep | Edit another employee's task (not assigned to self) | 403. |
| 4 | qa.salesmgr | Edit reports' tasks | Allowed (manager). |

### Flow 22.2 — Team updates

| # | Persona | Action | Expected |
|---|---|---|---|
| 1 | qa.salesmgr | Post team update | Visible to team. |
| 2 | qa.salesrep | Post update | Allowed if `tasks:settings:create=1` or similar grant; otherwise hidden. |

### Flow 22.3 — Organizer privacy

| # | Step | Expected |
|---|---|---|
| 1 | qa.salesrep adds organizer item | Persisted. |
| 2 | qa.salesmgr opens own organizer | Does NOT see qa.salesrep's items (organizer is private even to managers). |

---

## 23. Reports

URL: `/reports/*`

### Flow 23.1 — Access matrix

| # | Persona | Module | Expected |
|---|---|---|---|
| 1 | qa.salesmgr (`reports:*:view=1`) | All reports | Loads. |
| 2 | qa.salesrep | Customers report | 403 / hidden unless granted. |
| 3 | qa.viewer | Reports | If `reports:dashboard_reports:view=1`, allowed; otherwise hidden. |

### Flow 23.2 — Report data scope

| # | Persona | Step | Expected |
|---|---|---|---|
| 1 | qa.scoped opens `/reports/customers` | Filtered to own / dataStartDate. |
| 2 | qa.salesmgr opens `/reports/employees` | Includes reports' rows but not other branches. |

### Flow 23.3 — Export

| # | Persona | Step | Expected |
|---|---|---|---|
| 1 | qa.salesmgr | Export CSV | Downloads. |
| 2 | qa.viewer | Export | Allowed if export tied to view; verify policy. |

---

## 24. Settings (read-only / blocked)

URL: `/settings/*`

### Flow 24.1 — Branding / print templates / masters

| # | Persona | Step | Expected |
|---|---|---|---|
| 1 | qa.salesrep | Open `/settings/branding` | 403 / blank. |
| 2 | qa.salesrep | Open `/settings/audit-logs` | 403 unless granted. |
| 3 | qa.opsmgr (without `configurations:*`) | Same | All settings 403 / hidden. |
| 4 | Direct PATCH to `/branding` | 403. |

### Flow 24.2 — Email templates

| # | Persona | Step | Expected |
|---|---|---|---|
| 1 | qa.salesrep | Open `/settings/templates` | 403. |
| 2 | qa.opsmgr with `configurations:email_templates:view=1` | Open | View only. Edit only if `:edit=1`. |

### Flow 24.3 — Audit log viewer

| # | Persona | Step | Expected |
|---|---|---|---|
| 1 | qa.viewer with `configurations:audit:view` | Open | List visible. |
| 2 | qa.salesrep | Open | 403. |

---

## 25. Cross-Role Isolation

### Flow 25.1 — Employee cannot access super-admin URLs

| # | Step | Expected |
|---|---|---|
| 1 | Login as any employee. Navigate to `/superadmin/dashboard` | Redirect (route group enforces type) OR 403. |
| 2 | Manually call `GET /super-admin/enterprises` from DevTools with employee token | 403 `Access denied: super admin only`. |

### Flow 25.2 — Employee cannot access reseller URLs

| # | Step | Expected |
|---|---|---|
| 1 | Navigate to `/reseller/dashboard` | Redirect / 403. |
| 2 | Direct API call to `/resellers/me/wallet` | 403. |

### Flow 25.3 — Employee cannot perform tenant-admin actions

| # | Step | Expected |
|---|---|---|
| 1 | qa.opsmgr (no `employees:*=1`) | `/employees` → 403. |
| 2 | Direct POST `/employees` | 403. |
| 3 | PATCH another employee's permissions | 403. |

### Flow 25.4 — JWT type swap (security)

| # | Step | Expected |
|---|---|---|
| 1 | Take an employee JWT, decode, change `type` to `super_admin`, re-encode (without proper signing) | Server rejects: signature invalid. **P0 SECURITY**. |
| 2 | If JWT secret known and re-signed | Server still re-validates against DB user.type — should reject mismatch. **P0 SECURITY** if it doesn't. |

### Flow 25.5 — Token from another tenant

| # | Step | Expected |
|---|---|---|
| 1 | Get an employee token from Acme. Try calling Beta tenant's API endpoints (different `enterpriseId`). | All Beta data filtered by `enterpriseId` from JWT — Acme employee sees only Acme data. **P0 SECURITY** if they see Beta. |

---

## 26. Notifications & Audit (employee perspective)

### Flow 26.1 — Notifications visible

| # | Step | Expected |
|---|---|---|
| 1 | Admin assigns task to qa.salesrep | qa.salesrep's bell shows red dot; notification listed. |
| 2 | qa.salesrep clicks | Routes to task; notification marked read. |

### Flow 26.2 — Audit log visibility

| # | Persona | Step | Expected |
|---|---|---|---|
| 1 | qa.salesmgr with `configurations:audit:view=1` | Open `/settings/audit-logs` | Sees own + reports' actions. |
| 2 | qa.salesrep | Open | 403 unless granted. |

### Flow 26.3 — Employee actions logged

| # | Step | Expected |
|---|---|---|
| 1 | qa.salesrep creates a quotation | Audit row added with user_id=qa.salesrep.id, action='quotation_created'. |
| 2 | qa.salesrep edits → save | New audit row. |

---

## 27. End-to-End Flows (employee-only paths)

### Flow 27.1 — Sales rep full pipeline

| # | Step | Expected |
|---|---|---|
| 1 | qa.salesrep logs in | Lands on dashboard. |
| 2 | Captures lead `/crm/add` | Lead created. |
| 3 | Converts to enquiry | Enquiry created. |
| 4 | Creates quotation linked to enquiry → Send | Quote `sent`; enquiry `Quotation Sent`. |
| 5 | Quote rejected by customer (rep clicks Reject) | Quote `rejected`; enquiry `Follow Up`. |
| 6 | Edits quote → Save | Status reset to `draft` (server logic). |
| 7 | Mark as Sent again | Status `sent`. |
| 8 | Click **Close Sale & Transfer to PO** | SO created; quote locked; enquiry `Sale Closed`. |
| 9 | Verify own dashboard counts updated | Yes. |
| 10 | Verify all actions appear in `/settings/audit-logs` (if rep has access) OR via admin | Audit complete. |

### Flow 27.2 — Manager reviews team

| # | Step | Expected |
|---|---|---|
| 1 | qa.salesmgr logs in | Dashboard shows aggregate KPIs. |
| 2 | Opens `/quotations` | Sees own + qa.salesrep's quotes. |
| 3 | Picks a rep's draft and edits + saves | Allowed; version history records manager as `updated_by`. |
| 4 | Bulk reassigns 3 rep's leads to another rep | Allowed. |
| 5 | Opens `/reports/employees` | Sees per-rep KPIs for own team. |

### Flow 27.3 — Inventory clerk fulfilment

| # | Step | Expected |
|---|---|---|
| 1 | qa.invadmin logs in | Dashboard shows pending GRNs and low stock. |
| 2 | Opens an open PO → receives partial GRN | Stock updated. |
| 3 | Opens a JC's MR → approves | Stock decremented; JC `material_status` progresses. |
| 4 | Adjusts a damaged-stock item with reason | Adjustment recorded. |

### Flow 27.4 — Production operator stage workflow

| # | Step | Expected |
|---|---|---|
| 1 | Operator (assigned to a JC) logs in | Sees own JCs in `/manufacturing`. |
| 2 | Starts stage → records waste → completes stage | Waste captured; audit log entry. |
| 3 | Marks JC `ready_for_dispatch` | SO unlocked for dispatch by ops manager. |

### Flow 27.5 — Permission revocation mid-flow

| # | Step | Expected |
|---|---|---|
| 1 | qa.salesrep on `/quotations` editing a draft | Form open. |
| 2 | Admin removes `sales:quotations:edit=0` mid-edit | Saved by admin. |
| 3 | qa.salesrep clicks Save | API returns 403 `You don't have permission`. UI shows toast; form remains so user can copy data manually. |

### Flow 27.6 — Data scope mid-flow

| # | Step | Expected |
|---|---|---|
| 1 | qa.scoped editing own quote | Open. |
| 2 | Admin sets `qa.scoped.ownDataOnly=true` (was false) | Saved. |
| 3 | qa.scoped reloads list | Other reps' quotes disappear. Current open quote (own) remains accessible. |

---

## 28. Negative / Edge / Security Scenarios

### 28.1 Permission tampering

| # | Scenario | Expected |
|---|---|---|
| 1 | Employee modifies localStorage `auth-store.permissions` to flip `delete=1` | Backend re-validates from DB; UI may briefly show button; API returns 403. **P0 SECURITY** if delete actually succeeds. |
| 2 | Employee intercepts `GET /auth/permissions` and rewrites response to all-1 | Same — backend authoritative on every request. |

### 28.2 IDOR (Insecure Direct Object Reference)

| # | Scenario | Expected |
|---|---|---|
| 1 | Employee in tenant A guesses an entity ID from tenant B (sequential IDs) | Server scopes by `enterpriseId` — 403/404. **P0 SECURITY** if A sees B's data. |
| 2 | qa.scoped manually fetches another employee's quote ID | 403/404. |

### 28.3 Concurrency

| # | Scenario | Expected |
|---|---|---|
| 1 | qa.salesrep edits in 2 tabs and saves both | Both succeed; version history tracks; last write wins. |
| 2 | qa.salesmgr and qa.salesrep both edit the same quote | Both saves persist; verify final state matches whichever is last. |

### 28.4 Network / token

| # | Scenario | Expected |
|---|---|---|
| 1 | Network drops mid-submit | Toast error; no partial state; retry works. |
| 2 | Token expires mid-edit | Next call → 401; redirect `/login`; form data lost (expected). |
| 3 | Cookie cleared by user | Same as above. |

### 28.5 Boundary inputs

| # | Field | Bad value | Expected |
|---|---|---|---|
| 1 | Quotation qty | 1,000,000 | Blocked. |
| 2 | Quotation qty | 0 | Field error / clamp to 1. |
| 3 | Discount | 100 | Field error. |
| 4 | Mobile | 11 chars | Truncated to 10 / error. |
| 5 | Pincode | 5 chars | Field error. |
| 6 | File upload | 20 MB | Rejected. |

### 28.6 Direct URL access (no permission)

| # | Persona | URL | Expected |
|---|---|---|---|
| 1 | qa.salesrep | `/employees` | 403 / blank with toast. |
| 2 | qa.salesrep | `/superadmin/dashboard` | Redirect/403. |
| 3 | qa.salesrep | `/reseller/wallet` | Redirect/403. |
| 4 | qa.viewer | `/quotations/create` | 403 (no `:create=1`). |

### 28.7 Cross-tenant data leak

| # | Step | Expected |
|---|---|---|
| 1 | Login Acme employee. Manually call `/customers/<beta_customer_id>`. | 404/403. **P0 SECURITY** if 200. |

### 28.8 Email enumeration on reset

| # | Step | Expected |
|---|---|---|
| 1 | Submit `/auth/reset-password` with random unknown emails | All return same generic 401 wording (don't leak which emails exist). |

### 28.9 Browser & device

| # | Scenario | Expected |
|---|---|---|
| 1 | Chrome / Firefox / Safari for P0 flows | All pass. |
| 2 | Mobile Safari iOS 16+ | Login + dashboard + quotation list pass. |

---

## 29. Sign-off Checklist

### Authentication
- [ ] Valid login (Flow 2.1)
- [ ] All login negatives (Flows 2.2–2.6)
- [ ] Multi-enterprise duplicate email blocked (Flow 2.5)
- [ ] Forgot password (Flow 2.8)

### Session
- [ ] Token persistence (Flow 3.1)
- [ ] Logout clears state (Flow 3.2)
- [ ] Token expiry mid-session (Flow 3.3)
- [ ] Inactive employee mid-session (Flow 3.4)
- [ ] Permission revoked mid-session (Flow 3.5)

### Profile / self
- [ ] View profile (Flow 4.1)
- [ ] Change own password (Flow 4.3)
- [ ] Cannot edit own permissions (Flow 4.4)
- [ ] Cannot deactivate self (Flow 4.5)

### Sidebar / dashboard
- [ ] Sidebar matches matrix per persona (Flow 6.1)
- [ ] Hidden actions per perm (Flow 6.2)
- [ ] Permission polling refresh (Flow 6.3)

### Data scope
- [ ] ownDataOnly filter (Flow 7.1)
- [ ] dataStartDate filter (Flow 7.2)
- [ ] No bypass via API (Flow 7.5)

### Manager hierarchy
- [ ] Manager sees reports' data (Flow 8.1)
- [ ] Multi-level (Flow 8.2)
- [ ] Cycle prevented (Flow 8.3)

### Module CRUDs (per persona × per module)
- [ ] Customers (§9)
- [ ] Enquiries (§10)
- [ ] CRM (§11)
- [ ] Quotations (§12)
- [ ] Sales Orders (§13)
- [ ] Invoices (§14)
- [ ] Products (§15)
- [ ] Inventory + MR + GRN (§16)
- [ ] Manufacturing (§17)
- [ ] Procurement (§18)
- [ ] Service Mgmt (§19)
- [ ] Machinery (§20)
- [ ] Waste Mgmt (§21)
- [ ] Tasks / Team / Organizer (§22)
- [ ] Reports (§23)

### Restrictions
- [ ] Settings blocked / read-only (§24)
- [ ] Cross-role isolation (§25)
- [ ] Notifications + audit (§26)

### E2E
- [ ] Sales rep full pipeline (Flow 27.1)
- [ ] Manager team review (Flow 27.2)
- [ ] Inventory fulfilment (Flow 27.3)
- [ ] Production operator (Flow 27.4)

### Security & edge
- [ ] Permission tampering (§28.1)
- [ ] IDOR (§28.2)
- [ ] Concurrency (§28.3)
- [ ] Network / token (§28.4)
- [ ] Boundary inputs (§28.5)
- [ ] Direct URL (§28.6)
- [ ] Cross-tenant leak (§28.7)
- [ ] Email enumeration (§28.8)

### Final environment
- [ ] Zero unhandled console errors during full run
- [ ] PM2 procs online throughout
- [ ] Audit log entries match employee actions

---

## Run-log template (copy per cycle)

```
# Run YYYY-MM-DD — Employee tests
Tester: <name>
Env:    QA / Production
Build:  <git sha>
Tenant: Acme Industries
Persona(s) tested: <list>

Failed flows:
- <flow id>: <one-liner> → bug: <link>

Blocked flows:
- <flow id>: <reason>

Security findings (P0):
- <flow id>: <description>

Notes:
- ...
```

---

**Document version 1.0** — Employee role coverage complete. Update when:
- A new module/permission is added to the matrix.
- An action moves from "view" to require `:edit` (or vice versa).
- A regression bug surfaces a permission gap.
