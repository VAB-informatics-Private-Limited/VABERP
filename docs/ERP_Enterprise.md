# ERP — Enterprise Admin · Test Flow Document

> **Persona:** Enterprise Admin (logged in via the Enterprise tab on `/login`, JWT `type='enterprise'`, full access — every module/submodule/action = 1 by default).
> **Audience:** QA tester; run top-to-bottom in a clean QA tenant.
> **Environment:** QA (`64.235.43.187:<qa-port>`) or Production smoke subset.
> **Companion files:** `docs/FSD.md` (specs), `docs/TEST_CASES.md` (tabular cases), `docs/tests/00-test-strategy.md` (template & seed data).

---

## How to use this document

1. Each section is one **module**. Run sections in order — earlier modules seed data the later ones depend on.
2. Each module contains **flows**: numbered, sequential test steps. Inside each step, **Expected** is what you must verify before proceeding.
3. Mark every expected outcome as `[PASS]` or `[FAIL]` directly in your run copy.
4. If a step fails, log a bug using the template in `00-test-strategy.md §9.3`, mark the flow `BLOCKED`, and continue with the next *independent* flow.
5. After finishing, complete the sign-off checklist in §22.

---

## Table of Contents

1. [Pre-requisites & Test Setup](#1-pre-requisites--test-setup)
2. [Authentication & Session](#2-authentication--session)
3. [Dashboard & Navigation](#3-dashboard--navigation)
4. [Customer Master](#4-customer-master)
5. [Enquiries](#5-enquiries)
6. [CRM Leads & Follow-ups](#6-crm-leads--follow-ups)
7. [Quotations](#7-quotations)
8. [Sales Orders (Purchase Orders UI)](#8-sales-orders-purchase-orders-ui)
9. [Invoices & Proforma Invoices](#9-invoices--proforma-invoices)
10. [Products & Catalog](#10-products--catalog)
11. [Raw Materials & Inventory](#11-raw-materials--inventory)
12. [Material Requests & GRN](#12-material-requests--grn)
13. [Manufacturing — BOM, Job Cards, Stages](#13-manufacturing--bom-job-cards-stages)
14. [Procurement — Suppliers, Indents, RFQ, PO](#14-procurement--suppliers-indents-rfq-po)
15. [Service Management](#15-service-management)
16. [Machinery & Maintenance](#16-machinery--maintenance)
17. [Waste Management](#17-waste-management)
18. [Employees & Role-Based Access Control](#18-employees--role-based-access-control)
19. [Tasks, Team Updates, Organizer](#19-tasks-team-updates-organizer)
20. [Reports](#20-reports)
21. [Settings & Configurations](#21-settings--configurations)
22. [Subscription & Activation](#22-subscription--activation)
23. [Notifications & Audit Trail](#23-notifications--audit-trail)
24. [End-to-End Cross-Module Flows](#24-end-to-end-cross-module-flows)
25. [Negative & Edge Scenarios](#25-negative--edge-scenarios)
26. [Sign-off Checklist](#26-sign-off-checklist)

---

## 1. Pre-requisites & Test Setup

### 1.1 Test account

| Field | Value |
|---|---|
| Tenant | Acme Industries (active subscription) |
| URL | `http://64.235.43.187:<qa-port>/login` (or QA-specific) |
| Email | `acme.admin@vaberp-test.com` |
| Password | `Acme@123` |
| OTP delivery | Mailbox `acme.admin@vaberp-test.com` (check inbox + spam) |

### 1.2 Pre-seed data (verify before testing)

- ≥ 5 **customers** (mobiles `9000000001`–`9000000005`)
- ≥ 5 **products** (`PROD-001`..`PROD-005`) — at least one with discount tiers
- ≥ 3 **raw materials** (`RM-001`..`RM-003`)
- ≥ 3 **stage masters** (`Cutting`, `Assembly`, `QC`)
- ≥ 1 **BOM** linked to `PROD-001`
- ≥ 1 **employee** (other than admin)
- ≥ 1 **supplier**
- Default email templates present
- Branding row exists (logo + tagline)

### 1.3 Browser & tooling

- Chrome (latest), incognito to avoid stale session.
- DevTools open: **Network**, **Application > Cookies** (watch `access_token` cookie), **Console** (zero red errors expected).
- Screen size 1366×768 minimum for default tests; switch to mobile viewport for any flow tagged `[MOBILE]`.

### 1.4 Synthetic data conventions

- Customer / lead names: `Test Cust <YYYYMMDD-HHMM>` so you can find your own data later.
- Mobiles: `90000000NN` (10 digits, prefix 9).
- Emails: `<role>.<n>@vaberp-test.com`.
- Money: ₹ format, two decimals.

---

## 2. Authentication & Session

### Flow 2.1 — Enterprise OTP login (happy path)

**Pre-conditions:** browser cleared; on `/login`.

| # | Step | Expected |
|---|---|---|
| 1 | Open `/login` | Page renders with **Employee** and **Enterprise** tabs; logo + tagline visible. No console errors. |
| 2 | Click **Enterprise** tab | Form shows email input + **Continue** button. |
| 3 | Type `acme.admin@vaberp-test.com` | Field accepts; format-valid. |
| 4 | Click **Continue** | Toast `OTP sent to your email.`<br/>Form advances to step 2 (OTP input visible).<br/>Branding info card shows tenant name + email.<br/>API: `POST /auth/enterprise/verify-email → 200`. |
| 5 | Open mailbox; copy 6-digit OTP | OTP arrives within ~30 s. |
| 6 | Type OTP (e.g. `123456`) | Six-digit input filled. |
| 7 | Click **Sign In** | Toast `Login successful!`<br/>Redirect to `/dashboard` (or `/activate` if subscription inactive — should NOT for Acme).<br/>Dev-tools: `access_token` httpOnly cookie present.<br/>Dev-tools localStorage: `auth-store` populated.<br/>API: `POST /auth/enterprise/verify-otp → 200`. |

### Flow 2.2 — Enterprise password login (fallback)

**Pre-conditions:** Acme admin has a known password (created during registration or via reset).

| # | Step | Expected |
|---|---|---|
| 1 | `/login` → **Enterprise** tab → email → **Continue** | OTP step shown. |
| 2 | Click **Login with Password** | Form switches to password field. |
| 3 | Type `Acme@123` | Field accepts. |
| 4 | Click **Sign In** | Toast `Login successful!`<br/>Redirect `/dashboard`.<br/>API: `POST /auth/enterprise/login → 200`. |

### Flow 2.3 — Login negatives

| # | Action | Expected |
|---|---|---|
| 1 | Email blank → **Continue** | Field error `Email is required`; no API call. |
| 2 | Email malformed (`abc`) → **Continue** | Field error `Enter a valid email address`. |
| 3 | Unknown email → **Continue** | Toast `Enterprise not found`; remain on step 1. |
| 4 | Wrong OTP → **Sign In** | Toast `Invalid OTP`; remain on step 2. |
| 5 | Wrong password → **Sign In** | Toast `Invalid email or password`. |
| 6 | Trigger 6 OTP requests within a minute | 6th call → 429 `Too many requests`. |
| 7 | Block tenant in super-admin, retry login | Toast `Your enterprise account is blocked`. |

### Flow 2.4 — Resend OTP

| # | Step | Expected |
|---|---|---|
| 1 | On OTP step, click **Resend OTP** | Toast `OTP resent to your email.` New OTP delivered (different value). Old OTP no longer valid. |

### Flow 2.5 — Back to step 1

| # | Step | Expected |
|---|---|---|
| 1 | On OTP step, click **Back** | Form returns to step 1 with cleared email. |

### Flow 2.6 — Branding via `?org=acme`

| # | Step | Expected |
|---|---|---|
| 1 | Open `/login?org=acme` | Logo + tagline reflect Acme branding (not default). |

### Flow 2.7 — Session persistence

| # | Step | Expected |
|---|---|---|
| 1 | After successful login, reload tab | User remains on `/dashboard`. No redirect to `/login`. |
| 2 | `GET /auth/me` from DevTools | 200 with current user. |

### Flow 2.8 — Logout

| # | Step | Expected |
|---|---|---|
| 1 | From sidebar / topbar, click **Logout** | API: `POST /auth/logout → 200 'Logged out'`<br/>`access_token` cookie cleared.<br/>localStorage `auth-store` cleared.<br/>Redirect `/login`. |
| 2 | Manually call `GET /auth/me` with stale cookie | 401 Unauthorized. |

### Flow 2.9 — Token expiry mid-session (simulated)

| # | Step | Expected |
|---|---|---|
| 1 | DevTools → Application → Cookies → delete `access_token` | Cookie removed. |
| 2 | Click any sidebar link to trigger an API call | Auto-redirect to `/login`; toast `Session expired` (or similar). |

### Flow 2.10 — Already-logged-in user visiting /login

| # | Step | Expected |
|---|---|---|
| 1 | While logged in, paste `/login` in address bar | Auto-redirect to `/dashboard`. |

---

## 3. Dashboard & Navigation

### Flow 3.1 — Dashboard renders

| # | Step | Expected |
|---|---|---|
| 1 | Open `/dashboard` post-login | Header with tenant name + admin avatar.<br/>KPI cards: Sales total, Outstanding invoices, Open enquiries, Active manufacturing, Pending tasks (exact set may vary).<br/>Recent activity feed visible.<br/>No console errors. |
| 2 | Click each KPI card | Navigates to its drill-down (e.g., Sales → /sales-orders, Invoices → /invoices). |

### Flow 3.2 — Sidebar visibility (full access)

| # | Step | Expected |
|---|---|---|
| 1 | Inspect sidebar | All top-level groups visible: Sales, CRM, Enquiries, Orders, Manufacturing, Inventory, Procurement, Invoices, Products, Service, Machinery, Waste, Employees, Tasks, Reports, Settings.<br/>(Reseller / Super-admin sections **NOT** visible — wrong role.) |
| 2 | Expand each group | All submenu items visible. No item is greyed out. |

### Flow 3.3 — Topbar / profile menu

| # | Step | Expected |
|---|---|---|
| 1 | Click avatar in topbar | Dropdown shows: Profile, Settings, Subscription, Logout. |
| 2 | Click **Profile** | Routes to admin profile screen. |

### Flow 3.4 — Notifications bell

| # | Step | Expected |
|---|---|---|
| 1 | Click bell icon | Dropdown lists recent notifications (or `No new notifications` empty state). |
| 2 | Click a notification | Marks as read; routes to relevant entity. |

### Flow 3.5 — Global search (if present)

| # | Step | Expected |
|---|---|---|
| 1 | Press `/` or click search icon | Search input opens. |
| 2 | Type `QTN-` | Matches across entity types (quotations, customers, etc.); each hit clickable. |

---

## 4. Customer Master

URL: `/customers`

### Flow 4.1 — List view

| # | Step | Expected |
|---|---|---|
| 1 | Open `/customers` | Table renders with columns: Customer Name, Mobile, Email, GSTIN, City, Status, Total Orders, Created Date.<br/>Pagination shows ≤20 rows; total count in footer.<br/>Top-right: **+ Add Customer** button visible. |
| 2 | Sort by Customer Name asc/desc | Rows reorder. |
| 3 | Sort by Created Date | Rows reorder. |

### Flow 4.2 — Search & filter

| # | Step | Expected |
|---|---|---|
| 1 | Type `Acme` in search → debounce | List filters to matching customers (name OR mobile OR email). API: `GET /customers?search=Acme`. |
| 2 | Filter by Status = Active | Only active customers shown. |
| 3 | Filter by City | Only matching city shown. |
| 4 | Click **Clear** | All filters reset; full list returns. |

### Flow 4.3 — Create customer (happy path)

| # | Step | Expected |
|---|---|---|
| 1 | Click **+ Add Customer** | Routes to `/customers/add` (or modal opens). |
| 2 | Fill **Customer Name** = `Test Cust 20260427` | Field accepts. |
| 3 | Fill **Mobile** = `9000000099`, blur field | Field accepts. If duplicate, yellow warning with existing record. |
| 4 | Fill **Email** = `test99@vaberp-test.com` | Field accepts. |
| 5 | Fill **Address**, **City**, **State**, **Pincode** = 6-digit | All accept. |
| 6 | Fill **GSTIN** = `27ABCDE1234F1Z5` | Format valid. |
| 7 | Click **Save** | Toast `Customer created`. Redirect to `/customers/<id>` detail.<br/>API: `POST /customers → 201`. |

### Flow 4.4 — Create customer — validation negatives

| # | Field | Bad value | Expected error |
|---|---|---|---|
| 1 | Customer Name | (blank) | `Customer name is required` |
| 2 | Mobile | `12345` | `Enter a valid 10-digit Indian mobile (must start with 6-9)` |
| 3 | Mobile | `5000000000` | Same error (must start with 6-9) |
| 4 | Email | `not-email` | `Enter a valid email address` |
| 5 | Pincode | `12345` (5 digits) | `Enter a valid 6-digit pincode` |
| 6 | GSTIN | `INVALID` | `Enter a valid GSTIN (15 chars)` |

For each: API call must NOT fire; submit button stays enabled; field-level error is shown under the input.

### Flow 4.5 — Duplicate mobile warning

| # | Step | Expected |
|---|---|---|
| 1 | Type a mobile that already exists, blur field | Yellow warning showing existing customer name/code. Save still permitted (non-blocking). |
| 2 | Save anyway | Customer created (creates a new customer with that mobile). |

### Flow 4.6 — Read / detail

| # | Step | Expected |
|---|---|---|
| 1 | Click a row | `/customers/<id>` opens with tabs: Profile, Orders, Invoices, Quotations, Notes, Activity. |
| 2 | Switch each tab | Each loads relevant data; no errors. |
| 3 | Profile tab | All fields displayed read-only with **Edit** button. |

### Flow 4.7 — Update / edit

| # | Step | Expected |
|---|---|---|
| 1 | Click **Edit** | Form opens pre-filled. |
| 2 | Change address | Field accepts. |
| 3 | Click **Save** | Toast `Customer updated`. Detail refreshes.<br/>API: `PATCH /customers/<id> → 200`. |
| 4 | Inspect Activity tab | Edit recorded with timestamp + admin user. |

### Flow 4.8 — Delete customer

| # | Step | Expected |
|---|---|---|
| 1 | On detail / row menu, click **Delete** | Confirm modal `Delete this customer?` with warning about linked orders. |
| 2 | Confirm | If no linked orders → toast `Customer deleted`; row removed.<br/>If linked → 400 `Cannot delete customer with linked orders`. |

### Flow 4.9 — Merge customers

| # | Step | Expected |
|---|---|---|
| 1 | Select two duplicate customers via row checkboxes | Bulk action bar appears. |
| 2 | Click **Merge** | Modal asks which is primary. |
| 3 | Confirm | Secondary's orders/invoices/quotations reassigned to primary; secondary deleted. |

### Flow 4.10 — CSV import

| # | Step | Expected |
|---|---|---|
| 1 | Click **Import** | File picker opens. |
| 2 | Upload CSV with 10 valid + 2 invalid rows | Result modal: `10 imported, 2 rejected`. Rejected rows downloadable with reasons. |

### Flow 4.11 — Export

| # | Step | Expected |
|---|---|---|
| 1 | Click **Export → CSV** | CSV downloads with current filtered set + all visible columns. |

### Flow 4.12 — Empty state

| # | Step | Expected |
|---|---|---|
| 1 | Filter to a value with zero matches | Empty illustration `No customers found` + **Clear filters** CTA. |

---

## 5. Enquiries

URL: `/enquiries`

### Flow 5.1 — List & filter

| # | Step | Expected |
|---|---|---|
| 1 | Open `/enquiries` | Table: Enquiry No, Customer/Lead Name, Mobile, Source, Status (New / Contacted / Quotation Sent / Follow Up / Sale Closed / Lost), Assigned To, Created Date. |
| 2 | Filter by Status = `New` | Only New enquiries shown. |
| 3 | Filter by Source = `Website` | Filter applies. |
| 4 | Date range filter | Applies. |
| 5 | Search by name/mobile | Matches narrowed. |

### Flow 5.2 — Create enquiry

| # | Step | Expected |
|---|---|---|
| 1 | Click **+ Add Enquiry** → fill all fields (name, mobile, email, source, requirement notes, assigned-to employee) → Save | Toast success; redirect to detail.<br/>API: `POST /enquiries → 201`.<br/>Status defaults to `New`. |
| 2 | Verify activity timeline shows creation event | Timeline entry present. |

### Flow 5.3 — Create — validation negatives

| Field | Bad value | Expected error |
|---|---|---|
| Customer Name | blank | required |
| Mobile | invalid | mobile format |
| Email | malformed | email format |
| Requirement Notes | blank | required (if mandatory) |

### Flow 5.4 — Detail

| # | Step | Expected |
|---|---|---|
| 1 | Open detail | Tabs: Profile, Notes, Follow-ups, Linked Quotations, Activity, Attachments. |
| 2 | Each tab loads | No errors. |

### Flow 5.5 — Edit & status change

| # | Step | Expected |
|---|---|---|
| 1 | Click **Edit** → change status to `Contacted` → Save | Status updated; activity entry recorded.<br/>API: `PATCH /enquiries/<id> → 200`. |
| 2 | Try moving directly from `New` to `Sale Closed` | Allowed (admin can override) but verify activity entry shows the jump. |

### Flow 5.6 — Add note

| # | Step | Expected |
|---|---|---|
| 1 | On detail, click **Add Note** → enter text → Save | Note appended to timeline with timestamp + user. |

### Flow 5.7 — Schedule follow-up

| # | Step | Expected |
|---|---|---|
| 1 | Click **Schedule Follow-up** → set date (future) + type (Call/Visit/Email) + notes → Save | Follow-up listed under Follow-ups tab; appears in `/crm/follow-ups`. |
| 2 | Try setting past date | Field disables past dates or shows error. |

### Flow 5.8 — Convert to quotation

| # | Step | Expected |
|---|---|---|
| 1 | Click **Create Quotation** | Routes to `/quotations/create?enquiryId=<id>` with pre-filled customer info. |
| 2 | Save & Send quotation | Enquiry status auto-updates to `Quotation Sent`. Linked Quotations tab now shows the new quote. |

### Flow 5.9 — Attach file

| # | Step | Expected |
|---|---|---|
| 1 | Upload PDF (≤5 MB) | File listed; download link works. |
| 2 | Upload 10 MB file | Error `File too large` (size limit enforced server-side). |
| 3 | Upload `.exe` | Rejected as invalid file type. |

### Flow 5.10 — Print

| # | Step | Expected |
|---|---|---|
| 1 | Click **Print** | Opens `/print/enquiry/<id>` in new tab — clean layout, no chrome, with company branding. |

### Flow 5.11 — Auto status updates from linked quote

| # | Step | Expected |
|---|---|---|
| 1 | Reject the linked quotation (in quotations module) | Enquiry status automatically becomes `Follow Up`. |
| 2 | Accept a quotation linked to this enquiry | Enquiry status becomes `Sale Closed`; `convertedCustomerId` set to the (auto-created or matched) customer. |

### Flow 5.12 — Delete

| # | Step | Expected |
|---|---|---|
| 1 | Click row Delete → confirm | If no linked quote → success.<br/>If linked → 400 `Cannot delete enquiry with linked quotations`. |

---

## 6. CRM Leads & Follow-ups

URL: `/crm`

### Flow 6.1 — Pipeline / list

| # | Step | Expected |
|---|---|---|
| 1 | Open `/crm` | Pipeline view (Kanban) OR list view (toggleable) with stages: New, Contacted, Qualified, Proposal, Closed Won, Closed Lost. |
| 2 | Card shows lead name, value, last-activity date | All fields visible. |

### Flow 6.2 — Create lead

| # | Step | Expected |
|---|---|---|
| 1 | `/crm/add` → fill name, mobile, email, source, expected value, assigned-to → Save | Lead created in stage `New`.<br/>API: `POST /crm/leads → 201`. |
| 2 | Validation: invalid mobile | Field error. |

### Flow 6.3 — Drag-drop stage change (Kanban)

| # | Step | Expected |
|---|---|---|
| 1 | Drag card from `New` to `Contacted` | Stage updated; activity entry recorded.<br/>API: `PATCH /crm/leads/<id> → 200`. |
| 2 | Drag card to `Closed Won` | Optional dialog asks for value confirmation; on confirm, lead closes. |

### Flow 6.4 — Lead detail

| # | Step | Expected |
|---|---|---|
| 1 | Open detail | Sections: Profile, Activity timeline, Follow-ups, Notes, Attachments. |
| 2 | Add note → save | Note in timeline. |
| 3 | Schedule follow-up | Future date enforced; shows in `/crm/follow-ups`. |

### Flow 6.5 — Reassign

| # | Step | Expected |
|---|---|---|
| 1 | Click **Reassign** → pick employee → Save | Lead reassigned; new owner notified.<br/>API: `PATCH /crm/leads/<id>/assign`. |

### Flow 6.6 — Bulk reassign

| # | Step | Expected |
|---|---|---|
| 1 | Multi-select leads → **Bulk Reassign** → pick owner | All selected reassigned; success toast with count. |

### Flow 6.7 — Convert to enquiry

| # | Step | Expected |
|---|---|---|
| 1 | On qualified lead, click **Convert to Enquiry** | New enquiry created with lead's data; lead status updates to `Converted`. |

### Flow 6.8 — Follow-ups view

| # | Step | Expected |
|---|---|---|
| 1 | Open `/crm/follow-ups` | List of upcoming + overdue follow-ups across all leads/enquiries. |
| 2 | Filter by date range / type | Filter applies. |
| 3 | Mark follow-up complete with outcome notes | Status `completed`; activity entry recorded. |
| 4 | Inspect overdue items | Red `OVERDUE` badge; sort by date asc by default. |

### Flow 6.9 — Team view

| # | Step | Expected |
|---|---|---|
| 1 | Open `/crm/team` | Per-rep summary: leads count by stage, conversion %. |

### Flow 6.10 — Reports

| # | Step | Expected |
|---|---|---|
| 1 | Open `/crm/reports` | Source-wise conversion, period-wise pipeline value. Filter by date range, source, owner. |
| 2 | Export | CSV download. |

### Flow 6.11 — Import / export leads

| # | Step | Expected |
|---|---|---|
| 1 | Import 100-row CSV | Result: imported / rejected counts; rejection reasons downloadable. |
| 2 | Export filtered | CSV with current view. |

### Flow 6.12 — Delete

| # | Step | Expected |
|---|---|---|
| 1 | Delete lead with no conversions | Removed; activity recorded in audit log. |
| 2 | Delete converted lead | 400 `Cannot delete converted lead`. |

---

## 7. Quotations

URL: `/quotations`

### Flow 7.1 — List & filters

| # | Step | Expected |
|---|---|---|
| 1 | Open `/quotations` | Columns: Quotation #, Customer, Date, Valid Until, ETA, Total Amount, Status, Created By, Actions.<br/>Pagination 20/page. |
| 2 | Status badges | draft=default, sent=blue, accepted=green, rejected=red, expired=orange, po_cancelled=volcano. |
| 3 | Version chip when `current_version > 1` | Purple `v{N}`. |
| 4 | "In PO" badge when accepted with `sales_order_id` | Green chip. |
| 5 | Search by customer / quotation # | Matches narrow correctly. |
| 6 | Filter by status, date range | Each works independently and combined. |
| 7 | Click **Clear** | Reset to defaults. |
| 8 | Export CSV / Excel / PDF | Files download (PDF via browser print of `/print/quotation/all` or similar). |

### Flow 7.2 — Create quotation (standalone)

| # | Step | Expected |
|---|---|---|
| 1 | Click **+ Create Quotation** | Routes to `/quotations/create`. |
| 2 | Customer panel — pick existing customer or fill new | Existing fills name, mobile, email, addresses. |
| 3 | Mobile blur on new customer with existing mobile | Yellow warning showing existing record (non-blocking). |
| 4 | Items panel — pick `PROD-001` from product selector → click **Add** | Item row appears with name, HSN, qty=1, unit_price, discount=tier max for qty=1, tax=18%. |
| 5 | Try adding `PROD-001` again | Warning `Product already added; update quantity instead`. |
| 6 | Set qty = 12 (where tier `minQty=10` exists) | Discount auto-updates to that tier's %. |
| 7 | Manually set discount above tier max | Red error tooltip; submit blocked. |
| 8 | Set qty = 0 | Field error or auto-clamp to 1. |
| 9 | Try qty = 1000000 | onKeyDown blocks 7-digit entry; max 999999. |
| 10 | Inspect totals card | Subtotal, Discount, Tax, Grand Total recalc on every change. |
| 11 | Right sidebar — set Quotation Date (today), Valid Until (today+30), Expected Delivery (today+45) | DatePicker disables past dates and dates < quotation date for Valid Until. |
| 12 | Add Notes + Terms & Conditions | TextAreas accept multiline. |
| 13 | Click **Save as Draft** | Toast `Quotation created`. Redirect `/quotations`.<br/>New row visible: status `draft`, version `v1`, quotation_number `QTN-XXXXXX`.<br/>API: `POST /quotations → 201`. |

### Flow 7.3 — Create + Send to Customer

| # | Step | Expected |
|---|---|---|
| 1 | Same as 7.2 but click **Create & Send to Customer** | Status saved as `sent`. If linked to enquiry, the enquiry's status auto-updates to `Quotation Sent`. |

### Flow 7.4 — Create from enquiry

| # | Step | Expected |
|---|---|---|
| 1 | From an enquiry detail, click **Create Quotation** | URL becomes `/quotations/create?enquiryId=<id>`. |
| 2 | Customer fields pre-filled from enquiry | Name, mobile, email, addresses populated. |
| 3 | Page title: `Create & Send Quotation for Enquiry #<id>` | Visible. |

### Flow 7.5 — Detail page

| # | Step | Expected |
|---|---|---|
| 1 | Click row | `/quotations/<id>` opens. |
| 2 | Inspect | Header (number, status badge, customer), Items table, Totals card, Right sidebar (Date, Valid Until, ETA `Set` button), Notes, Terms, Version History (collapsible). |
| 3 | Toolbar buttons (when applicable) | Back, Print, Download PDF, Send Email, Mark as Sent (draft), Edit (unlocked), Reject (`[draft, sent]`), Close Sale & Transfer to PO (`[draft, sent]`), View Purchase Order (locked + `sales_order_id`). |

### Flow 7.6 — Mark as Sent (from detail or row menu)

| # | Step | Expected |
|---|---|---|
| 1 | On a draft quote, click **Mark as Sent** | Confirm modal → Confirm → Status badge → `sent`.<br/>API: `PUT /quotations/<id>/status → 200 { status:'sent' }`. |

### Flow 7.7 — Set ETA

| # | Step | Expected |
|---|---|---|
| 1 | Click **Set** next to ETA | DatePicker modal opens; past dates disabled. |
| 2 | Pick today+15 → OK | ETA updated; cell shows formatted date.<br/>API: `PATCH /quotations/<id>/eta → 200`. |
| 3 | Set ETA in past (force) | Validation prevents past dates. If somehow stored past, detail shows orange `Overdue ETA` banner. |

### Flow 7.8 — Send Email

| # | Step | Expected |
|---|---|---|
| 1 | Customer with email → click **Send Email** → modal opens with recipient, subject (template), body (template) → **Send** | Toast `Email sent`.<br/>API: `POST /quotations/<id>/send-email → 200`. |
| 2 | Customer without email → click **Send Email** | Toast `Customer email not available`; modal does not open. |

### Flow 7.9 — Print / PDF

| # | Step | Expected |
|---|---|---|
| 1 | Click **Print** | New tab `/print/quotation/<id>` — full quote layout, no app chrome, with branding. |
| 2 | Click **Download PDF** | New tab `/print/quotation/<id>?pdf=1`; PDF downloads. |

### Flow 7.10 — Reject

| # | Step | Expected |
|---|---|---|
| 1 | On `[draft, sent]` quote, click **Reject** | Modal with optional Reason TextArea. |
| 2 | Type reason → Confirm | Status → `rejected`; yellow banner with reason on detail.<br/>API: `PUT /quotations/<id>/status → 200 { status:'rejected', rejectionReason }`.<br/>If linked enquiry, enquiry → `Follow Up`. |
| 3 | Reject without reason | Allowed; Reason stored as `[REJECTED]` only. |

### Flow 7.11 — Close Sale & Transfer to PO (Accept)

| # | Step | Expected |
|---|---|---|
| 1 | On `[draft, sent]` quote, click **Close Sale & Transfer to PO** | Confirmation modal showing Grand Total. |
| 2 | Confirm | API `POST /quotations/<id>/accept → 201`.<br/>SalesOrder created with `order_number = PR-XXXX`.<br/>Quotation: `is_locked=true`, `status='accepted'`, `sales_order_id` set.<br/>If enquiry linked: customer auto-created if missing; enquiry → `Sale Closed`.<br/>Success modal with **Go to PO** / **Stay** CTAs. |
| 3 | Click **Go to PO** | Routes to `/purchase-orders/<so_id>`. |

### Flow 7.12 — Edit (unlocked)

| # | Step | Expected |
|---|---|---|
| 1 | Click **Edit** on a non-locked quote | Routes to `/quotations/<id>/edit`. |
| 2 | Change qty → **Save Changes** | Toast `Updated`; `current_version` bumps; new entry in version history with admin user + timestamp. |
| 3 | If quotation status was `rejected`, save it | Status auto-resets to `draft`. |

### Flow 7.13 — Edit (locked)

| # | Step | Expected |
|---|---|---|
| 1 | Manually open `/quotations/<id>/edit` for an accepted quote | Full-screen `Quotation is Locked` notice. Form blocked. **View Quotation** / **View Purchase Order** CTAs. |

### Flow 7.14 — Concurrent edit

| # | Step | Expected |
|---|---|---|
| 1 | Open the same quote in two tabs | Both editable. |
| 2 | Save in tab A, then save in tab B with stale data | Both succeed (last-writer-wins); version history shows two entries; final state matches tab B. |

### Flow 7.15 — Status change (generic)

| # | Step | Expected |
|---|---|---|
| 1 | From row Action menu → Status Change → pick `expired` | Status becomes `expired`.<br/>API: `PUT /quotations/<id>/status → 200`. |

### Flow 7.16 — Duplicate

| # | Step | Expected |
|---|---|---|
| 1 | From Action menu → **Duplicate** | New quotation created with a new number, items copied verbatim, status `draft`.<br/>API: `POST /quotations/<id>/duplicate → 201`. |

### Flow 7.17 — Delete

| # | Step | Expected |
|---|---|---|
| 1 | Delete a draft quotation → Confirm | Quote + items + versions cascaded.<br/>API: `DELETE /quotations/<id> → 200`. |
| 2 | Delete option absent on non-draft rows | Verified (UI gate). |

### Flow 7.18 — Mobile duplicate check

| # | Step | Expected |
|---|---|---|
| 1 | On Create form, type a mobile that already has quotations, blur | API: `GET /quotations/check-mobile?mobile=...`. Yellow warning shows existing quotation # + customer name. |

### Flow 7.19 — Volume tier hints

| # | Step | Expected |
|---|---|---|
| 1 | With tiers `[1→5%, 10→10%]` and qty=8 | Helper text under qty cell: `Add 2 more → 10% off`. |

### Flow 7.20 — Calculation correctness

| # | Item config | Expected |
|---|---|---|
| 1 | qty=2, unit_price=100, disc=0%, tax=18% | Subtotal=200, Tax=36, Grand Total=236. |
| 2 | qty=2, unit_price=100, disc=5%, tax=18% | Subtotal=190, Tax=34.20, Grand Total=224.20. |
| 3 | Header discount=10% on subtotal=1000, tax=18% | Discount=100, taxable=900, Tax=162, Grand Total=1062. |

### Flow 7.21 — Auto-numbering

| # | Step | Expected |
|---|---|---|
| 1 | Note last `quotation_number` (e.g. `QTN-000099`) | Reference. |
| 2 | Create new quote | New number = `QTN-000100`. |

### Flow 7.22 — Negative auth

| # | Step | Expected |
|---|---|---|
| 1 | Logout, then GET `/quotations` (cookie cleared) | 401. UI redirects to `/login`. |

### Flow 7.23 — PO cancellation cascade

| # | Step | Expected |
|---|---|---|
| 1 | After accepting, cancel the linked SO (in Sales Orders module) | Quote detail shows red `PO Cancelled` banner with cancelled PO number + timestamp; quote remains locked. |

---

## 8. Sales Orders (Purchase Orders UI)

URL: `/sales-orders` (UI label: **Purchase Orders**)

### Flow 8.1 — List

| # | Step | Expected |
|---|---|---|
| 1 | Open list | Columns: Order #, Customer, Date, Total, Status (open/in_production/ready_for_dispatch/dispatched/cancelled), Linked Quotation. |
| 2 | Filter by status | Works. |
| 3 | Search by `PR-XXXX` | Single match. |

### Flow 8.2 — Create from quotation

| # | Step | Expected |
|---|---|---|
| 1 | Already covered: accept a quotation → SO created automatically | Verify `order_number = PR-XXXX` and items copied. |

### Flow 8.3 — Detail

| # | Step | Expected |
|---|---|---|
| 1 | Open SO detail | Sections: Customer, Items table, Totals, Linked Quotation (clickable), Job Cards list, Dispatch info. |
| 2 | Click linked quotation | Routes to that quote. |
| 3 | Click linked job card | Routes to `/manufacturing/<jc_id>`. |

### Flow 8.4 — Edit (open SO)

| # | Step | Expected |
|---|---|---|
| 1 | Edit notes → Save | Saved.<br/>API: `PATCH /sales-orders/<id> → 200`. |
| 2 | Try edit on dispatched SO | Edit disabled; server returns 400 if forced. |

### Flow 8.5 — Dispatch

| # | Step | Expected |
|---|---|---|
| 1 | When all linked JCs are `ready_for_dispatch`, click **Dispatch** | Modal asks for vehicle, driver, dispatch date. |
| 2 | Fill + Confirm | SO status → `dispatched`. Linked JCs status updates.<br/>API: `POST /sales-orders/<id>/dispatch → 200`. |
| 3 | Try dispatch when JCs not ready | Button disabled or 400 `Order not ready for dispatch`. |
| 4 | Try dispatch when JC has `dispatch_on_hold=true` | Blocked with reason. |

### Flow 8.6 — Cancel

| # | Step | Expected |
|---|---|---|
| 1 | On open SO with no in-process JC, click **Cancel** → reason → Confirm | SO `status='cancelled'`. Linked quotation: `po_cancelled_at` + `cancelled_po_number` set; red banner appears on quote detail. |
| 2 | Try cancel when JC `in_process` | 400 `Cannot cancel order with active production`. |

### Flow 8.7 — Print / PDF

| # | Step | Expected |
|---|---|---|
| 1 | Click **Print** on detail | New tab with branded print layout. |

### Flow 8.8 — Empty / pagination

| # | Step | Expected |
|---|---|---|
| 1 | Fresh tenant | Empty illustration `Accept a quotation to create your first PO`. |
| 2 | ≥21 rows | 20/page; pagination works. |

---

## 9. Invoices & Proforma Invoices

URL: `/invoices`, `/proforma-invoices`

### Flow 9.1 — Invoice list

| # | Step | Expected |
|---|---|---|
| 1 | Open list | Columns: Invoice #, Customer, Date, Due Date, Total, Paid, Balance, Status. |
| 2 | Overdue chip | Red badge when status `unpaid` and due date < today. |

### Flow 9.2 — Create invoice from SO

| # | Step | Expected |
|---|---|---|
| 1 | `/invoices/add` → pick dispatched SO → review items copied → Save | Invoice created; total matches SO grand total.<br/>API: `POST /invoices → 201`. |
| 2 | Try create another invoice for same SO | 400 `Invoice already exists for this order`. |

### Flow 9.3 — Tax breakdown

| # | Customer GSTIN state | Expected |
|---|---|---|
| 1 | Same state as enterprise | CGST + SGST split (e.g. 9% + 9% for tax_percent=18). |
| 2 | Different state | IGST 18%. |

### Flow 9.4 — Detail

| # | Step | Expected |
|---|---|---|
| 1 | Open invoice detail | Header, Items, Totals (with tax split), Payments tab, Send Email, PDF, Print. |

### Flow 9.5 — Mark as Paid (full payment)

| # | Step | Expected |
|---|---|---|
| 1 | Click **Mark as Paid** → enter amount = total, method = UPI/Cash/Bank → Confirm | Status `paid`; payment row created.<br/>API: `POST /invoices/<id>/payments → 201`. |

### Flow 9.6 — Partial payment

| # | Step | Expected |
|---|---|---|
| 1 | Total=1000, add payment 400 | Status `partially_paid`. Balance=600. |
| 2 | Add 600 more | Status flips to `paid`. |
| 3 | Try to add 1500 | 400 `Payment exceeds invoice balance`. |

### Flow 9.7 — Edit

| # | Step | Expected |
|---|---|---|
| 1 | Edit unpaid invoice header (notes, due date) → Save | Saved. |
| 2 | Try edit on paid invoice | Disabled / 400. |

### Flow 9.8 — Send email

| # | Step | Expected |
|---|---|---|
| 1 | Customer with email → Send Email → Confirm | Toast success.<br/>API: `POST /invoices/<id>/send-email → 200`. |

### Flow 9.9 — PDF

| # | Step | Expected |
|---|---|---|
| 1 | **Download PDF** | Branded invoice PDF with tax breakdown + amount in words. |

### Flow 9.10 — Delete

| # | Step | Expected |
|---|---|---|
| 1 | Delete unpaid invoice | Soft delete (status='cancelled'). Linked SO unaffected. |
| 2 | Delete paid invoice | Forbidden (or requires special permission/reversal). |

### Flow 9.11 — Proforma list & create

| # | Step | Expected |
|---|---|---|
| 1 | Open `/proforma-invoices` → **+ Create** from a sent quotation | Proforma created with line items copied. |
| 2 | **Convert to Invoice** | Tax invoice created; proforma marked converted. |

### Flow 9.12 — Reports / KPI

| # | Step | Expected |
|---|---|---|
| 1 | Filter list by `status='unpaid'` and date range | KPI / count updates. |

---

## 10. Products & Catalog

URL: `/products`

### Flow 10.1 — List

| # | Step | Expected |
|---|---|---|
| 1 | Open list | Columns: Code, Name, Category, Subcategory, Unit, Price, GST %, Stock, Image. |
| 2 | Filter by category, search by name/code | Works. |

### Flow 10.2 — Create product

| # | Step | Expected |
|---|---|---|
| 1 | `/products/add` → fill code (`P-NEW-01`), name, category, subcategory, unit, price, GST, HSN, image (≤2MB) → Save | Toast `Product created`.<br/>API: `POST /products → 201`. |
| 2 | Duplicate code | 409 `Product code exists`. |
| 3 | Required fields blank | Field errors. |
| 4 | Upload non-image | Rejected `Only images allowed`. |

### Flow 10.3 — Detail / Edit

| # | Step | Expected |
|---|---|---|
| 1 | Open detail | All fields + Tiers section + Stock tab. |
| 2 | Edit price → Save | Saved.<br/>API: `PATCH /products/<id> → 200`. |

### Flow 10.4 — Volume discount tiers

| # | Step | Expected |
|---|---|---|
| 1 | On detail, **Add Tier** → minQty=10, disc=10% | Tier persisted. |
| 2 | Try add tier with minQty < existing | Error: tiers must be ascending. |
| 3 | Try discount = 100 | Error 0–99 only. |
| 4 | Delete tier | Removed. |

### Flow 10.5 — Categories

| # | Step | Expected |
|---|---|---|
| 1 | `/products/categories` → **New** → name `Metals` → Save | Category persisted.<br/>API: `POST /product-categories → 201`. |
| 2 | Duplicate name | 409. |
| 3 | Edit → Save | Saved. |
| 4 | Delete with linked products | Blocked. |

### Flow 10.6 — Subcategories

| # | Step | Expected |
|---|---|---|
| 1 | Create `Steel` under `Metals` → Save | Subcategory tied to parent. |

### Flow 10.7 — Empty / pagination

| # | Step | Expected |
|---|---|---|
| 1 | Fresh tenant | Empty illustration with **Add your first product** CTA. |
| 2 | ≥21 products | 20/page. |

---

## 11. Raw Materials & Inventory

URL: `/inventory`, `/raw-materials` (or under inventory)

### Flow 11.1 — Raw material master

| # | Step | Expected |
|---|---|---|
| 1 | Create raw material → code, name, unit, reorder level, default supplier → Save | Persisted. |
| 2 | Duplicate code | 409. |

### Flow 11.2 — Stock list

| # | Step | Expected |
|---|---|---|
| 1 | Open `/inventory` | Columns: Material, Current Qty, Unit, Reorder Level, Last Movement, Status. |
| 2 | Below-reorder rows | Red highlight + alert chip. |
| 3 | Search & filter | Works. |

### Flow 11.3 — Add stock manually

| # | Step | Expected |
|---|---|---|
| 1 | `/inventory/add` → pick raw material, qty=50, source notes → Save | Stock increased; ledger entry created.<br/>API: `POST /inventory → 201`. |
| 2 | Negative qty | Field error. |
| 3 | Zero qty | Field error or warning. |

### Flow 11.4 — Stock adjustment

| # | Step | Expected |
|---|---|---|
| 1 | On item detail, **Adjust Stock** → delta=-3, reason=`Damaged` → Save | Stock decremented; ledger row created.<br/>API: `POST /inventory/adjust → 201`. |
| 2 | Reason blank | Error `Reason required`. |
| 3 | Adjust below 0 | Allowed (negative stock visible) or blocked depending on policy — note observed behaviour. |

### Flow 11.5 — Stock ledger

| # | Step | Expected |
|---|---|---|
| 1 | Open ledger for an item | Chronological in/out list with reference (GRN/MR/Adjust). Running balance correct. |
| 2 | Verify movements: +100, -30, +20 | Balances 100, 70, 90. |

---

## 12. Material Requests & GRN

URL: `/material-requests`, `/inventory/goods-receipts`

### Flow 12.1 — Create MR against JC

| # | Step | Expected |
|---|---|---|
| 1 | From JC detail, **Issue Material Request** → pick raw material + qty → Save | MR created `status='pending'`.<br/>API: `POST /material-requests → 201`. |

### Flow 12.2 — Approve MR

| # | Step | Expected |
|---|---|---|
| 1 | Open MR detail → **Approve** | Stock decremented; MR `status='issued'`; ledger entry created.<br/>API: `PATCH /material-requests/<id>/approve → 200`. |
| 2 | When stock < requested | 400 `Insufficient stock`. |

### Flow 12.3 — Reject / cancel MR

| # | Step | Expected |
|---|---|---|
| 1 | Reject pending MR with reason | Status `rejected`. |
| 2 | Cancel issued MR (if supported) | Reverses stock; ledger entry. |

### Flow 12.4 — Create GRN from PO

| # | Step | Expected |
|---|---|---|
| 1 | Open `/inventory/goods-receipts` → **New** → pick open PO → receive line items → Save | Stock increased; ledger updated; PO marked `partially_received` or `received`.<br/>API: `POST /goods-receipts → 201`. |
| 2 | Partial receipt | PO `received_qty` updated. |
| 3 | Over-receipt (more than ordered) | Warning or blocked. |

### Flow 12.5 — GRN detail

| # | Step | Expected |
|---|---|---|
| 1 | Open GRN detail | Items, supplier, PO link, ledger entries, attached invoice. |

---

## 13. Manufacturing — BOM, Job Cards, Stages

URL: `/manufacturing`

### Flow 13.1 — BOM list & create

| # | Step | Expected |
|---|---|---|
| 1 | Open BOM list | Per-product BOMs visible. |
| 2 | **Create BOM** → pick product → add raw material lines (material + qty per unit) → Save | BOM persisted. |
| 3 | Edit BOM | New BOM version created; old version retained for past JCs. |

### Flow 13.2 — Stage Master

| # | Step | Expected |
|---|---|---|
| 1 | `/manufacturing/stages` → **+ New Stage** → name → Save | Stage persisted. |
| 2 | Reorder stages (drag-drop) | Order persisted. |

### Flow 13.3 — Process Templates

| # | Step | Expected |
|---|---|---|
| 1 | `/manufacturing/processes` | Templates with stage sequences. |

### Flow 13.4 — Job Card creation

| # | Step | Expected |
|---|---|---|
| 1 | From an accepted SO with BOM, click **Create Job Card** | Form pre-fills SO, customer, product, qty. |
| 2 | Assign employee, set start date, expected completion → Save | JC created `status='pending'`, `production_stage='MATERIAL_READY'`, `material_status='PENDING_INVENTORY'`.<br/>API: `POST /manufacturing/job-cards → 201`. |
| 3 | Quantity > SO line qty | Validation error. |

### Flow 13.5 — JC list

| # | Step | Expected |
|---|---|---|
| 1 | Open `/manufacturing` | Columns: Job #, Customer, Product, Qty, Status, Production Stage, Material Status, Assigned To. |
| 2 | Filter by status, stage, assignee | Works. |

### Flow 13.6 — JC detail

| # | Step | Expected |
|---|---|---|
| 1 | Open detail | Sections: Profile, Stage tree, BOM with material requests, Stage history, Waste log, Notes. |

### Flow 13.7 — Material Request flow on JC

| # | Step | Expected |
|---|---|---|
| 1 | From JC detail, click **Issue MR** for raw material lines | MR created (see §12). |
| 2 | Approve MR | JC `material_status` progresses (`PARTIALLY_ISSUED` → `FULLY_ISSUED`). |

### Flow 13.8 — Stage workflow

| # | Step | Expected |
|---|---|---|
| 1 | Click **Start** on first stage | Stage `status='in_process'`; `start_time` set; JC status → `in_process`. |
| 2 | Try start stage 2 before stage 1 complete | 400 `Previous stage not complete`. |
| 3 | Click **Complete** on stage 1 → enter waste qty + unit + raw material → Confirm | Stage `status='completed'`; waste captured (see §17.1); audit log entry. |
| 4 | Continue through all stages → final stage complete | JC `production_stage='READY_FOR_APPROVAL'`. |
| 5 | Click **Approve for Dispatch** → JC `status='approved_for_dispatch'` | SO `Dispatch` button enabled. |

### Flow 13.9 — Quantity completed tracking

| # | Step | Expected |
|---|---|---|
| 1 | Set quantity_completed = 90 (of 100) | Saved. |
| 2 | Try quantity_completed = 101 | 400 `Quantity completed cannot exceed total quantity`. |

### Flow 13.10 — Shortage / recheck flow

| # | Step | Expected |
|---|---|---|
| 1 | Set material_status = `REQUESTED_RECHECK` with shortage notes | Saved. |
| 2 | Same change with empty notes | Field error `Shortage notes are required`. |

### Flow 13.11 — Dispatch on hold

| # | Step | Expected |
|---|---|---|
| 1 | Toggle `dispatch_on_hold=true` with reason | JC stays even when ready; SO Dispatch blocked. |

### Flow 13.12 — Per-product BOM application

| # | Step | Expected |
|---|---|---|
| 1 | Create JC for product PROD-001 | BOM lines pre-suggested in JC's MR section. |

### Flow 13.13 — Linked job cards / parent-child

| # | Step | Expected |
|---|---|---|
| 1 | If multi-stage workflow, child JCs reference `parent_job_card_id` | Verify hierarchy displays correctly. |

### Flow 13.14 — JC delete

| # | Step | Expected |
|---|---|---|
| 1 | Delete pending JC | Allowed; SO unaffected. |
| 2 | Delete in-process JC | Blocked or requires confirmation. |

---

## 14. Procurement — Suppliers, Indents, RFQ, PO

URLs: `/procurement/suppliers`, `/procurement/indents`, `/procurement/rfq-quotations`, `/procurement/purchase-orders`

### Flow 14.1 — Suppliers

| # | Step | Expected |
|---|---|---|
| 1 | Create supplier with name, code, mobile (10 digits, prefix 6-9), email, GSTIN, address, payment terms → Save | Supplier persisted.<br/>API: `POST /suppliers → 201`. |
| 2 | Duplicate code | 409. |
| 3 | Invalid GSTIN | Field error. |
| 4 | Edit / delete | Standard CRUD; delete blocked if linked POs. |

### Flow 14.2 — Indents

| # | Step | Expected |
|---|---|---|
| 1 | Create indent (raw material + qty + required-by date + justification) → Save | Indent `status='pending'`.<br/>API: `POST /indents → 201`. |
| 2 | Approve indent → Save | Status `approved`.<br/>API: `PATCH /indents/<id>/approve → 200`. |
| 3 | Convert to RFQ → pick suppliers → Send | RFQ rows created per supplier.<br/>API: `POST /rfqs → 201`. |
| 4 | Reject indent with reason | Status `rejected`. |

### Flow 14.3 — RFQs

| # | Step | Expected |
|---|---|---|
| 1 | Open RFQ list | Columns: RFQ #, Indent, Suppliers, Status. |
| 2 | Open RFQ detail → **Send to Suppliers** | Email dispatched; status `sent`.<br/>API: `POST /rfqs/<id>/send → 200`. |
| 3 | Capture supplier quote (price, lead time, terms) → Save | Quote stored in comparison matrix.<br/>API: `POST /rfqs/<id>/quotes → 201`. |
| 4 | Compare quotes → click **Award** on winner | RFQ status `awarded`; PO draft created.<br/>API: `POST /rfqs/<id>/award → 201`. |

### Flow 14.4 — Purchase Orders

| # | Step | Expected |
|---|---|---|
| 1 | Open `/procurement/purchase-orders` | Columns: PO #, Supplier, Date, Total, Status (open/partially_received/received/cancelled). |
| 2 | Open PO detail → review items → **Issue** | Status `open`; supplier notified.<br/>API: `POST /purchase-orders → 201`. |
| 3 | Receive partial via GRN | PO `received_qty` updates; status `partially_received`. |
| 4 | Receive remainder | Status `received`. |
| 5 | Cancel open PO with reason | Status `cancelled`. |

### Flow 14.5 — PO email & PDF

| # | Step | Expected |
|---|---|---|
| 1 | **Send PO Email** | Email dispatched to supplier. |
| 2 | **Download PDF** | Branded PO PDF. |

---

## 15. Service Management

URLs: `/service-products`, `/service-bookings`, `/service-events`, `/service-revenue`

### Flow 15.1 — Service products

| # | Step | Expected |
|---|---|---|
| 1 | Create service product (name, duration, price, tax) → Save | Persisted.<br/>API: `POST /service-products → 201`. |
| 2 | Edit / delete | Standard. |

### Flow 15.2 — Bookings

| # | Step | Expected |
|---|---|---|
| 1 | Create booking (customer + service + scheduled date) → Save | Booking `status='scheduled'`.<br/>API: `POST /service-bookings → 201`. |
| 2 | Past date | Field error. |
| 3 | Reschedule booking | Updated; notification sent. |
| 4 | Cancel booking with reason | Status `cancelled`. |

### Flow 15.3 — Events

| # | Step | Expected |
|---|---|---|
| 1 | From booking, **Start Event** | Event `status='in_progress'`; `start_time` set.<br/>API: `POST /service-events → 201`. |
| 2 | **Complete Event** with notes / outcome | Event `status='completed'`; `end_time` set; revenue posted.<br/>API: `PATCH /service-events/<id> → 200`. |

### Flow 15.4 — Revenue summary

| # | Step | Expected |
|---|---|---|
| 1 | Open `/service-revenue` | Period-wise revenue by service, by employee. |

---

## 16. Machinery & Maintenance

URLs: `/machinery`, `/machinery/spare-parts`, `/machinery/spare-map`, `/maintenance-work-orders`, `/maintenance-reminders`, `/maintenance-vendors`

### Flow 16.1 — Machine registry

| # | Step | Expected |
|---|---|---|
| 1 | Add machine (code, name, location, purchase date) → Save | Persisted. |
| 2 | Duplicate code | 409. |

### Flow 16.2 — Spare parts

| # | Step | Expected |
|---|---|---|
| 1 | Add spare part with stock, reorder level | Persisted. |
| 2 | Map spare to machine in `/machinery/spare-map` | Mapping visible on both sides. |

### Flow 16.3 — Work orders

| # | Step | Expected |
|---|---|---|
| 1 | Create WO (machine, type=Preventive/Breakdown, scheduled date, assignee) → Save | WO `status='open'`.<br/>API: `POST /maintenance-work-orders → 201`. |
| 2 | Mark WO **Complete** with hours-spent + spare parts used | Status `completed`; downtime entry generated. |

### Flow 16.4 — Reminders

| # | Step | Expected |
|---|---|---|
| 1 | Schedule preventive reminder (machine, frequency=monthly, lead-time=7d) → Save | Reminder created; cron will fire near schedule and create WO.<br/>API: `POST /maintenance-reminders → 201`. |

### Flow 16.5 — Downtime log

| # | Step | Expected |
|---|---|---|
| 1 | Log downtime (machine, start, end, reason) | Persisted.<br/>API: `POST /maintenance-downtime → 201`. |
| 2 | End < start or negative duration | Field error. |

### Flow 16.6 — AMC vendors

| # | Step | Expected |
|---|---|---|
| 1 | Add vendor with contract validity → Save | Persisted; expiry alert flag set if < 30 days. |

---

## 17. Waste Management

URLs: `/waste-inventory`, `/waste-disposal`, `/waste-parties`, `/waste-analytics`

### Flow 17.1 — Waste inventory (read-only)

| # | Step | Expected |
|---|---|---|
| 1 | Open `/waste-inventory` after JC stage waste capture (§13.8) | Aggregated row appears: material name, qty, unit, status. |
| 2 | Toolbar | **Manage categories** button visible; **+ Source** and **+ Log Waste Entry** **NOT** visible (read-only page). |
| 3 | Dashboard stats | Cards: Total batches, Available, Reserved, Quarantined, Disposed, Expiring ≤7d. |
| 4 | Click **View logs** in row Actions | Modal opens with full audit trail: Date, Action (Generated / Disposed / Quarantined / Written Off / Expired), Source (JC# · PO · Customer link), Qty change, Running total, User, Notes. |
| 5 | Click JC link in log | Routes to `/manufacturing/po/<sales_order_id>`. |
| 6 | Click material name | Same audit-trail modal opens (alt entry point). |
| 7 | Click `Entries` chip | Same modal opens. |

### Flow 17.2 — Quarantine

| # | Step | Expected |
|---|---|---|
| 1 | On available batch row → **Quarantine** → reason → Confirm | Status `quarantined`; log entry `action='quarantined'`, `qty_delta=0`.<br/>API: `POST /waste-inventory/<id>/quarantine → 200`. |
| 2 | Try quarantine on `fully_disposed` row | 400 `Cannot quarantine item with status: fully_disposed`. |

### Flow 17.3 — Write off

| # | Step | Expected |
|---|---|---|
| 1 | On row with `quantity_available > 0` → **Write Off** → Confirm | qty=0; status `fully_disposed`; log entry `action='written_off'`, qty_delta=-X.<br/>API: `POST /waste-inventory/<id>/write-off → 200`. |
| 2 | Try Write Off on row with qty=0 | 400 `No available quantity to write off`. |

### Flow 17.4 — Manage categories

| # | Step | Expected |
|---|---|---|
| 1 | Click **Manage categories** → modal → New → name, classification (recyclable/hazardous/general/e-waste/organic), unit, max storage days, requires_manifest, handling notes → Save | Category persisted.<br/>API: `POST /waste-inventory/categories → 201`. |
| 2 | Duplicate code | 409. |

### Flow 17.5 — Auto-expiry cron

| # | Step | Expected |
|---|---|---|
| 1 | Wait for daily 6 AM job (or trigger manually if available) | Rows with `expiry_alert_date < today` and statuses [available, partially_disposed] flip to `expired`; log entry created. |

### Flow 17.6 — Disposal transactions

| # | Step | Expected |
|---|---|---|
| 1 | `/waste-disposal` → **+ New Disposal** → pick waste party → add line items (batch + qty + rate) → Save | Transaction `status='draft'`.<br/>API: `POST /waste-disposal → 201`. |
| 2 | Hazardous category line without manifest | 400 `Manifest number required`. |
| 3 | **Confirm** | Status `confirmed` / `in_transit`; reserved qty marked on inventory. |
| 4 | **Complete** with actual qty | Inventory qty deducted; log entry `action='disposed'`.<br/>API: `POST /waste-disposal/<id>/complete → 200`. |
| 5 | **Cancel** confirmed transaction | Reserved qty released back. |

### Flow 17.7 — Waste parties

| # | Step | Expected |
|---|---|---|
| 1 | Create party (vendor / customer / both) with pollution-board cert + cert expiry → Save | Persisted. |
| 2 | Cert expiring ≤30 days | Red badge on list; appears in `/waste-parties/expiring-certs`. |
| 3 | Add buy/disposal rate per category | Rate persisted.<br/>API: `POST /waste-parties/<id>/rates → 201`. |

### Flow 17.8 — Waste analytics

| # | Step | Expected |
|---|---|---|
| 1 | Open `/waste-analytics` | Summary KPIs (total generated, disposed, revenue, cost), trends chart, by-category, by-source, aging, disposal methods. |
| 2 | Date range filter | Updates all charts. |

---

## 18. Employees & Role-Based Access Control

URL: `/employees`, `/employees/departments`, `/employees/designations`, `/employees/reporters`

### Flow 18.1 — Employee list

| # | Step | Expected |
|---|---|---|
| 1 | Open `/employees` | Columns: Name, Email, Department, Designation, Reporting To, Status. |
| 2 | Filter by department, status | Works. |

### Flow 18.2 — Create employee

| # | Step | Expected |
|---|---|---|
| 1 | **+ Add Employee** → name, email, mobile, department, designation, reporting-to (optional), initial password → Save | Employee created with default empty permission matrix.<br/>API: `POST /employees → 201`. |
| 2 | Duplicate email within tenant | 409 `Email already exists`. |
| 3 | Same email across tenants (other tenant uses same) | Allowed (Acme can use email that exists in Beta). Multi-match login flow validated separately. |

### Flow 18.3 — Permission matrix

| # | Step | Expected |
|---|---|---|
| 1 | Open employee detail → **Permissions** tab | Matrix renders 17 modules × submodules × actions (view/create/edit/delete/etc.). All checkboxes start unchecked.<br/>API: `GET /employees/<id>/permissions → 200`. |
| 2 | Toggle `sales:quotations:create` = ✓ | Pending change indicator. |
| 3 | **Save** | API: `PATCH /employees/<id>/permissions → 200`. Employee picks up new permission on next `/auth/permissions` poll without re-login. |
| 4 | Apply role template (e.g. **Sales Rep**) | Bulk-toggles relevant module rows. |
| 5 | Open own permissions while logged in as admin | Cannot edit own (disabled / 403). |
| 6 | Verify each toggle persists across reload | Re-open detail; values match. |

### Flow 18.4 — Data scope filters

| # | Step | Expected |
|---|---|---|
| 1 | On employee detail, set **Data Start Date** = `2026-01-01` | Saved. Employee won't see records older than that. |
| 2 | Toggle **Own Data Only** | Saved. Employee sees only records they created. |
| 3 | Login as that employee, open `/quotations` | Older quotations hidden; only own visible. |

### Flow 18.5 — Departments

| # | Step | Expected |
|---|---|---|
| 1 | Open `/employees/departments` → **+ Add** | Department created. |
| 2 | Try delete department with linked employees | 400 `Department has assigned employees`. |

### Flow 18.6 — Designations

| # | Step | Expected |
|---|---|---|
| 1 | `/employees/designations` → **+ Add** → name → Save | Persisted. |

### Flow 18.7 — Reporting hierarchy

| # | Step | Expected |
|---|---|---|
| 1 | Set Employee A's `reportingTo = Employee B` | A.reportingTo=B; B.isReportingHead=true. |
| 2 | B logs in → opens `/quotations` | A's quotations included alongside B's own (manager hierarchy). |
| 3 | Try set B → A (cycle) | 400 `Reporting cycle detected`. |
| 4 | View `/employees/reporters` | Tree view of hierarchy. |

### Flow 18.8 — Deactivate / activate

| # | Step | Expected |
|---|---|---|
| 1 | On employee detail → **Deactivate** | `status='inactive'`. Employee can't login. |
| 2 | Self-deactivate attempt | 400 `Cannot deactivate yourself`. |
| 3 | Reactivate → Save | `status='active'`. |

### Flow 18.9 — Reset employee password (admin)

| # | Step | Expected |
|---|---|---|
| 1 | **Reset Password** → enter new password (min 6) → Confirm | Saved; employee notified.<br/>API: `POST /employees/<id>/reset-password → 200`. |

### Flow 18.10 — Delete employee

| # | Step | Expected |
|---|---|---|
| 1 | Delete with no linked records | Removed; activity log entry. |
| 2 | Delete with linked records | Soft-delete (`is_active=false`) or 400 depending on policy. |

---

## 19. Tasks, Team Updates, Organizer

URLs: `/tasks`, `/team-updates`, `/team`, `/organizer`

### Flow 19.1 — Tasks

| # | Step | Expected |
|---|---|---|
| 1 | `/tasks/add` → title, due date, assignee, priority, description → Save | Task created; assignee notified.<br/>API: `POST /tasks → 201`. |
| 2 | Past due date | Allowed (or flagged `Overdue` immediately depending on UX). |
| 3 | Filter Mine vs All | Works. |
| 4 | Open task detail → add comment | Comment listed.<br/>API: `POST /tasks/<id>/comments → 201`. |
| 5 | Mark Done | Status `completed`. |
| 6 | Try edit other employee's task | If admin: allowed. (For non-admin: 403.) |

### Flow 19.2 — Team Updates

| # | Step | Expected |
|---|---|---|
| 1 | `/team-updates` → **+ Post Update** → text, optional attachments → Post | Update visible team-wide.<br/>API: `POST /team-updates → 201`. |
| 2 | React / comment | Tracked. |
| 3 | Edit / delete own post | Works. |

### Flow 19.3 — Team view

| # | Step | Expected |
|---|---|---|
| 1 | `/team` | Per-employee summary: open tasks, recent activity. |

### Flow 19.4 — Organizer

| # | Step | Expected |
|---|---|---|
| 1 | `/organizer` → **+ Add Item** → title, due date, notes → Save | Item persisted (private to user).<br/>API: `POST /organizer → 201`. |
| 2 | Login as another user → open organizer | Does NOT see admin's items. |

---

## 20. Reports

URLs: `/reports/customers`, `/reports/employees`, `/reports/enquiries`, `/reports/follow-ups`, `/reports/prospects`

### Flow 20.1 — Customers report

| # | Step | Expected |
|---|---|---|
| 1 | Open `/reports/customers` → set date range, status filter | Data renders: per-customer order count, revenue, last-order date.<br/>API: `GET /reports/customers → 200`. |
| 2 | Click row | Drill down to `/customers/<id>`. |
| 3 | Export CSV | Downloads. |

### Flow 20.2 — Employees report

| # | Step | Expected |
|---|---|---|
| 1 | Open `/reports/employees` | Per-employee KPIs: quotes created, sales closed, leads handled. |
| 2 | Filter by department | Filter applies. |

### Flow 20.3 — Enquiries report

| # | Step | Expected |
|---|---|---|
| 1 | Open `/reports/enquiries` | Funnel: New → Contacted → Quotation Sent → Sale Closed / Lost. Conversion %. |

### Flow 20.4 — Follow-ups report

| # | Step | Expected |
|---|---|---|
| 1 | Open `/reports/follow-ups` | Overdue follow-ups by employee; pending in next 7 days. |

### Flow 20.5 — Prospects report

| # | Step | Expected |
|---|---|---|
| 1 | Open `/reports/prospects` | Pipeline by stage; expected revenue. |

### Flow 20.6 — Print / export each

| # | Step | Expected |
|---|---|---|
| 1 | Print | Print preview. |
| 2 | Export CSV | Downloads with current filtered set. |

### Flow 20.7 — Empty data state

| # | Step | Expected |
|---|---|---|
| 1 | Filter to empty | Empty illustration `No data for selected filters`. |

---

## 21. Settings & Configurations

URLs under `/settings/*`

### Flow 21.1 — Branding

| # | Step | Expected |
|---|---|---|
| 1 | `/settings/branding` → upload logo (≤2 MB), set primary color, tagline → Save | Applied tenant-wide; visible on /login when `?org=acme`, prints, emails.<br/>API: `PATCH /branding → 200`. |
| 2 | Upload 5 MB logo | Error `Max 2MB`. |
| 3 | Reset to default | Defaults restored. |

### Flow 21.2 — Print templates

| # | Step | Expected |
|---|---|---|
| 1 | `/settings/print-template` | List: Quotation, Invoice, Proforma, PO, Enquiry. |
| 2 | Edit footer text + signatory placement → Preview → Save | Template persisted; print pages reflect changes.<br/>API: `PATCH /print-templates/<id> → 200`. |

### Flow 21.3 — Stage master

| # | Step | Expected |
|---|---|---|
| 1 | `/settings/stage-master` → **+ Add** → name → Save | Persisted.<br/>API: `POST /stage-masters → 201`. |
| 2 | Drag-drop reorder | Order persisted. |
| 3 | Edit / delete | Standard CRUD; delete blocked if used in active JCs. |

### Flow 21.4 — Unit master

| # | Step | Expected |
|---|---|---|
| 1 | `/settings/unit-master` → **+ Add** → code (`LTR`), name (`Litre`), conversion factor → Save | Persisted.<br/>API: `POST /unit-masters → 201`. |
| 2 | Duplicate code | 409. |

### Flow 21.5 — Sources

| # | Step | Expected |
|---|---|---|
| 1 | `/settings/sources` → **+ Add** → name (`LinkedIn`) → Save | Persisted; appears in lead/enquiry source dropdowns. |

### Flow 21.6 — Status config

| # | Step | Expected |
|---|---|---|
| 1 | `/settings/status` → **+ Add** custom status → Save | Persisted; appears in dropdowns. |
| 2 | Try delete a system status | Blocked. |

### Flow 21.7 — Email templates

| # | Step | Expected |
|---|---|---|
| 1 | `/settings/templates` → pick `Quotation Send` → edit subject + body (with placeholders) → Save | Persisted.<br/>API: `PATCH /email-templates/<id> → 200`. |
| 2 | **Preview** | Renders sample with placeholder values. |
| 3 | Reset to default | Defaults restored. |

### Flow 21.8 — Audit logs viewer

| # | Step | Expected |
|---|---|---|
| 1 | `/settings/audit-logs` | Table: timestamp, user, action, entity, before/after diff (where applicable).<br/>API: `GET /audit-logs → 200`. |
| 2 | Filter by user, date, action | Works. |
| 3 | Click row | Detail with full diff. |
| 4 | Export CSV | Downloads. |
| 5 | Verify recent actions taken in this test run | They appear here within seconds. |

### Flow 21.9 — Product types

| # | Step | Expected |
|---|---|---|
| 1 | `/settings/product-types` → **+ Add** | Persisted; affects classification in Products module. |

---

## 22. Subscription & Activation

URL: `/activate`, profile/subscription card on dashboard

### Flow 22.1 — View current plan

| # | Step | Expected |
|---|---|---|
| 1 | Open profile / subscription card | Plan name, validity, features, payment history visible.<br/>API: `GET /auth/enterprise/status → 200`. |

### Flow 22.2 — Plan expired flow

| # | Step | Expected |
|---|---|---|
| 1 | (Set tenant to expiring/expired in super-admin) → admin logs in fresh | Redirected to `/activate` instead of `/dashboard`. |
| 2 | `/activate` page shows current plan + renewal CTA | Visible. |

### Flow 22.3 — Renewal / payment

| # | Step | Expected |
|---|---|---|
| 1 | Click **Renew** → pick plan / coupon code → Pay (gateway) | After webhook, subscription extended; user can access dashboard. |
| 2 | Apply invalid coupon | Error `Invalid coupon`. |
| 3 | Apply expired coupon | Error `Coupon expired`. |

### Flow 22.4 — Plan change

| # | Step | Expected |
|---|---|---|
| 1 | Upgrade plan from Pro to Enterprise | Pro-rated billing handled; feature flags update. |

---

## 23. Notifications & Audit Trail

### Flow 23.1 — Notifications bell

| # | Step | Expected |
|---|---|---|
| 1 | Trigger an action that fires notification (e.g. quotation accepted) | Bell shows red dot. |
| 2 | Open bell dropdown | Notification listed: `Quotation #QTN-XXXX converted to Purchase Order`. |
| 3 | Click notification | Routes to relevant entity; marks as read. |
| 4 | **Mark all as read** | Counter resets. |

### Flow 23.2 — Audit log

| # | Step | Expected |
|---|---|---|
| 1 | Perform any create/update/delete action | Within 2 s, `/settings/audit-logs` shows the row. |
| 2 | Inspect row | Includes: timestamp, user, action verb, entity type, entity id, IP (if logged), before/after diff for updates. |

---

## 24. End-to-End Cross-Module Flows

### Flow 24.1 — Lead → Customer pipeline (full)

| # | Step | Expected |
|---|---|---|
| 1 | Create CRM lead `Test Lead 20260427` (no customer yet) | Lead in `New`. |
| 2 | Move stage → Qualified → click **Convert to Enquiry** | Enquiry created with lead data. |
| 3 | From enquiry, **Create Quotation** → add items → **Create & Send** | Quotation `sent`; enquiry status `Quotation Sent`. |
| 4 | Open quotation → **Close Sale & Transfer to PO** | SO created; quote locked; enquiry `Sale Closed`; customer auto-created (if not existing). |
| 5 | From SO, ensure BOM exists for product → **Create Job Card** | JC created. |
| 6 | On JC, issue MRs → approve → start stages → record waste at each → complete all → mark approved-for-dispatch | Stock decremented; waste captured; final stage complete. |
| 7 | From SO, **Dispatch** with vehicle/driver | SO dispatched. |
| 8 | From SO, **Create Invoice** → save | Invoice generated. |
| 9 | Mark invoice paid (full or partial) | Status updated. |

**Verifications across flow:**
- Audit log shows every step with admin user and timestamps.
- Customer master now contains the auto-created customer.
- Waste inventory's audit trail (Flow 17.1.4) shows every JC's contribution with PO + customer link.
- Reports reflect the new sale (Customers, Employees, Enquiries reports).
- Notifications fired at critical transitions (quote sent, accepted, dispatched, paid).

### Flow 24.2 — Procurement pipeline (full)

| # | Step | Expected |
|---|---|---|
| 1 | Create indent for raw material `RM-001`, qty=100 | Indent pending. |
| 2 | Approve → convert to RFQ to 3 suppliers | RFQs sent. |
| 3 | Capture quotes from suppliers | Quotes stored. |
| 4 | Award winner | PO draft created. |
| 5 | Issue PO | Status `open`; supplier notified. |
| 6 | Receive partial GRN (60 of 100) | Stock=+60; PO `partially_received`. |
| 7 | Receive remaining (40) | Stock=+40; PO `received`. |
| 8 | Audit log shows all transitions | Verified. |

### Flow 24.3 — Quote rejection round-trip

| # | Step | Expected |
|---|---|---|
| 1 | Sent quote linked to enquiry → **Reject** with reason | Quote `rejected`; enquiry `Follow Up`. |
| 2 | Edit and save quote | Status auto-resets to `draft`. |
| 3 | Mark as Sent again | Quote `sent`; enquiry returns to `Quotation Sent`. |

### Flow 24.4 — PO cancellation cascade

| # | Step | Expected |
|---|---|---|
| 1 | Accept a quote → SO created | Quote locked. |
| 2 | Cancel SO with reason | Quote shows red `PO Cancelled` banner; quote stays locked; cancelled PO number retained. |

### Flow 24.5 — Permission propagation

| # | Step | Expected |
|---|---|---|
| 1 | Login as non-admin employee with no `sales:quotations:create` | Create button hidden on `/quotations`. |
| 2 | As admin, grant the permission | Save. |
| 3 | Switch back to employee tab → wait for next `/auth/permissions` poll → reload `/quotations` | Create button now visible without re-login. |

---

## 25. Negative & Edge Scenarios

These cut across modules; run them at least once during the cycle.

### 25.1 Concurrency

| # | Scenario | Expected |
|---|---|---|
| 1 | Two browsers, same admin, edit same quotation simultaneously | Both saves succeed; version history records both; last writer wins. |
| 2 | Two browsers, same admin, accept the same quote within seconds | Only one accept succeeds; the other returns 400 (already accepted). |
| 3 | Approve same MR twice in parallel | Stock deducted only once. |

### 25.2 Network failure

| # | Scenario | Expected |
|---|---|---|
| 1 | DevTools throttle to Offline mid-submit | Toast error; no partial state; retry on reconnect succeeds (idempotent if applicable). |
| 2 | API returns 500 | Toast error with response message; UI keeps last good state. |

### 25.3 Token expiry

| # | Scenario | Expected |
|---|---|---|
| 1 | Cookie deleted manually mid-flow | Next API call returns 401; UI redirects to `/login`. |
| 2 | Login again → resume | Previous form data may be lost (expected). |

### 25.4 Boundary inputs

| # | Field | Bad value | Expected |
|---|---|---|---|
| 1 | Quotation qty | 1,000,000 | Blocked. |
| 2 | Quotation qty | 0 | Field error or auto-clamp to 1. |
| 3 | Discount % | 100 | Field error. |
| 4 | Discount % | -1 | Field error. |
| 5 | Tax % | 105 | Field error. |
| 6 | Pincode | 5 chars | Field error. |
| 7 | Mobile | 11 chars | Truncated to 10 or error. |
| 8 | Note / Description | 10,000 chars | Either truncated by server or accepted; no UI break. |
| 9 | File upload | 20 MB image | Rejected. |
| 10 | File upload | empty file | Rejected. |
| 11 | Email | very long (300 chars) | Rejected by max length. |

### 25.5 Direct URL access

| # | Scenario | Expected |
|---|---|---|
| 1 | Logout, paste `/quotations` | Redirect `/login`. |
| 2 | Manually call `DELETE /quotations/<id>` from DevTools without permission | 403. |
| 3 | Visit `/superadmin/dashboard` as enterprise admin | Redirect (different layout group). |

### 25.6 Browser & device

| # | Scenario | Expected |
|---|---|---|
| 1 | Chrome → Firefox → Safari (latest) for P0 flows | All pass. |
| 2 | Mobile Safari (iOS 16+) for `[MOBILE]` flows | All pass; layout responsive. |
| 3 | Long copy paste with embedded HTML / scripts | Sanitized; no XSS. |

### 25.7 Localisation / formatting

| # | Scenario | Expected |
|---|---|---|
| 1 | Currency display | Always ₹ with two decimals. |
| 2 | Dates | Locale set to `en-IN`; format `DD-MM-YYYY` consistently. |
| 3 | Times | 24-hour or 12-hour consistent across pages. |

### 25.8 Permission matrix sanity (admin specific)

| # | Scenario | Expected |
|---|---|---|
| 1 | Admin should NEVER see `/superadmin/*` or `/reseller/*` | Verified. |
| 2 | Admin should see ALL tenant-scoped modules in sidebar | Verified. |
| 3 | Admin should NOT have a "data scope" filter applied (sees all data) | Verified by listing all entities and confirming counts match DB. |

---

## 26. Sign-off Checklist

Tester ticks off only when the entire flow passed in QA + (optionally) Production smoke.

### Authentication
- [ ] OTP login (Flow 2.1)
- [ ] Password login (Flow 2.2)
- [ ] All login negatives (Flow 2.3)
- [ ] Logout & token expiry (Flows 2.8, 2.9)

### Sales pipeline
- [ ] Customer CRUD (Flows 4.3–4.8)
- [ ] Enquiry CRUD + conversion (Flows 5.2–5.11)
- [ ] CRM lead CRUD + pipeline (Flows 6.2–6.7)
- [ ] Quotation CRUD + builder + accept (Flows 7.2–7.21)
- [ ] Sales Order detail + dispatch + cancel (Flows 8.3–8.6)
- [ ] Invoice CRUD + payments (Flows 9.2–9.10)

### Catalog & Inventory
- [ ] Product CRUD + tiers + categories (Flows 10.2–10.6)
- [ ] Raw materials + stock + ledger (Flows 11.1–11.5)
- [ ] MR + GRN flow (Flows 12.1–12.4)

### Manufacturing
- [ ] BOM + JC + stages + waste capture (Flows 13.1–13.13)

### Procurement
- [ ] Suppliers + Indents + RFQ + PO (Flows 14.1–14.5)

### Service / Machinery / Waste
- [ ] Service products + bookings + events (Flows 15.1–15.4)
- [ ] Machinery + WO + downtime (Flows 16.1–16.6)
- [ ] Waste inventory read-only + disposal + parties (Flows 17.1–17.8)

### People & RBAC
- [ ] Employee CRUD (Flow 18.2)
- [ ] Permission matrix saves & propagates (Flows 18.3, 18.4)
- [ ] Departments / designations / hierarchy (Flows 18.5–18.7)
- [ ] Deactivate / reactivate / reset password (Flows 18.8–18.9)

### Tasks / Settings / Reports
- [ ] Tasks + Team Updates + Organizer (Flows 19.1–19.4)
- [ ] All reports load + export (Flows 20.1–20.6)
- [ ] Branding + print templates + masters + audit logs (Flows 21.1–21.8)

### Subscription
- [ ] Plan view + renewal + expired flow (Flows 22.1–22.4)

### Cross-cutting
- [ ] Notifications + Audit (Flows 23.1, 23.2)
- [ ] E2E lead-to-invoice (Flow 24.1)
- [ ] E2E procurement (Flow 24.2)
- [ ] Permission propagation (Flow 24.5)
- [ ] Concurrency, network, token edge (§25.1–25.3)
- [ ] Boundary inputs (§25.4)
- [ ] Direct URL / cross-role isolation (§25.5)
- [ ] Browser & mobile matrix (§25.6)

### Final environment check
- [ ] Zero unhandled console errors during full run.
- [ ] PM2 `vab-frontend` and `vab-api` reported `online` throughout.
- [ ] Response times for list endpoints < 1.5 s on QA dataset.
- [ ] Audit log entries present for every write performed in this run.

---

## Run-log template (copy per cycle)

```
# Run YYYY-MM-DD — Enterprise Admin smoke
Tester: <name>
Env:    QA / Production
Build:  <git sha>
Tenant: Acme Industries
Browser:Chrome <version>

Failed flows:
- <flow id>: <one-liner>  → bug: <link>

Blocked flows:
- <flow id>: <reason>

Notes:
- ...
```

---

**Document version 1.0** — Enterprise Admin coverage complete. Update this doc when:
- A new module is added to the platform.
- An existing flow's API contract or status workflow changes.
- A regression bug surfaces a flow that was missing.
