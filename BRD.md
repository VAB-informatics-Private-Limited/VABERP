# Business Requirements Document — VAB Enterprise ERP

**Audience:** QA Team
**Version:** 1.0
**Date:** 2026-04-22
**Scope:** Current production behavior on `master` branch, deployed at `vaberp.com`

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Product Overview](#2-product-overview)
3. [Technology Stack](#3-technology-stack)
4. [Portal Architecture](#4-portal-architecture)
5. [Users & Access Control](#5-users--access-control)
6. [Functional Modules — Main Dashboard](#6-functional-modules--main-dashboard)
7. [Reseller Portal](#7-reseller-portal)
8. [Superadmin Portal](#8-superadmin-portal)
9. [Cross-Module Workflows](#9-cross-module-workflows)
10. [Non-Functional Requirements](#10-non-functional-requirements)
11. [Test Focus Areas](#11-test-focus-areas)
12. [Glossary](#12-glossary)
13. [Appendices](#13-appendices)

---

## 1. Introduction

### 1.1 Purpose
This document describes the behavior of the VAB Enterprise ERP platform at its current production state. It is intended for the QA team to plan test coverage, author test cases, identify edge cases, and verify cross-module workflows.

### 1.2 Scope
- **In scope:** Every module currently deployed on `master` / `vaberp.com` across the three portals.
- **Out of scope:** Future roadmap items, experimental features behind flags, migration scripts, infrastructure provisioning.

### 1.3 How to Use This Document
- Read sections 1–5 cover-to-cover once. They describe the foundation.
- Use section 6 as a reference — jump to the module you are testing.
- Use section 9 (Cross-Module Workflows) when authoring integration / end-to-end tests.
- Use section 11 as a QA checklist.
- When a behavior surprises you, check section 13 — it may be a documented quirk.

---

## 2. Product Overview

VAB Enterprise ERP is a **multi-tenant SaaS ERP** aimed at Indian SMBs. It covers the full order-to-cash and procure-to-pay cycles, along with manufacturing, maintenance, after-sales service, and waste management.

**Core value streams:**
- **Sales:** Enquiry → Quotation → Sales Order → Invoice → Payment
- **Procurement:** Material Request → RFQ → Purchase Order → Goods Receipt
- **Manufacturing:** Sales Order → BOM → Job Cards → Stages → Dispatch
- **Service:** Registered Product → Booking → Event → Revenue
- **Maintenance:** Machine → Reminder → Work Order → Downtime

The platform supports **multiple tenants (enterprises)**, managed either directly by the Super Admin or via **Resellers** (channel partners) who onboard and maintain their own portfolio of tenant enterprises.

---

## 3. Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Ant Design, React Query (TanStack), Zustand |
| Backend | NestJS (Node.js), TypeScript, TypeORM |
| Database | PostgreSQL |
| Auth | JWT (Passport strategy), bcrypt for passwords |
| Deployment | PM2 on Linux VPS at `64.235.43.187`, reverse-proxied via `vaberp.com` |
| Process names | `vab-frontend` (port 2262), `vab-api` (port 2261) |

---

## 4. Portal Architecture

Three independent portals share the same database but have isolated authentication:

| Portal | URL | User Types |
|---|---|---|
| **Main Dashboard** | `vaberp.com/login` | Enterprise owners, Employees |
| **Reseller Portal** | `vaberp.com/reseller/login` | Resellers (channel partners) |
| **Superadmin Portal** | `vaberp.com/superadmin/login` | Platform operators (VAB staff) |

Each portal has its own Zustand store for session state (`useAuthStore`, `useResellerStore`, `useSuperAdminStore`). Credentials and tokens are **not** shared across portals.

---

## 5. Users & Access Control

### 5.1 User Types

| User Type | Login Portal | Permission Level |
|---|---|---|
| **Super Admin** | Superadmin Portal | Full platform access |
| **Reseller** | Reseller Portal | Scoped to own tenants |
| **Enterprise** | Main Dashboard | Full access within own enterprise |
| **Employee** | Main Dashboard | Granular permissions assigned by enterprise |

### 5.2 RBAC Model (Employees)

Permissions are stored as a JSON tree on the `MenuPermission` table, one row per employee:

```
{
  "sales": {
    "enquiries": { "view": 1, "create": 1, "edit": 1, "delete": 0, "approve": 0 },
    "customers": { ... }
  },
  "manufacturing": { ... },
  ...
}
```

**Actions:** `view | create | edit | delete | approve`

**Enforcement:**
- **Backend:** `PermissionGuard` reads `@RequirePermission('module','submodule','action')` metadata on each controller method and verifies against the employee's `MenuPermission` record.
- **Frontend:** `usePermissions().hasPermission('module','submodule','action')` gates UI elements and the sidebar menu.

**Key rule:** Permissions are **not** embedded in the JWT. They are fetched fresh from `/auth/permissions` on every request and on a **5-second auto-poll** from the client, so admin changes take effect without re-login.

### 5.3 Enterprise Bypass

Users of type `enterprise` automatically bypass permission checks and have full access to everything in their enterprise. The same applies to `super_admin` and `reseller` within their respective portals.

### 5.4 Data Scoping

Two additional flags on `MenuPermission` restrict *what rows* an employee sees (not just what actions):

- **`dataStartDate`** — employee can only see records with `created_date >= dataStartDate`. Typical use: "show only records from the employee's joining date onwards".
- **`ownDataOnly`** — employee only sees records where `created_by = employee.id`. Typical use: sales reps who should only see their own leads.

### 5.5 Multi-Tenancy

Every business entity carries an `enterpriseId` column. Every query filters by it (either via middleware-attached `@EnterpriseId()` decorator or explicit WHERE clause). Two enterprises with identical customer names / emails cannot see each other's records.

### 5.6 Authentication Flows

| Flow | Endpoint | Behavior |
|---|---|---|
| Enterprise Login | `POST /auth/enterprise/login` | Returns JWT + permissions = full |
| Employee Login | `POST /auth/employee/login` | Returns JWT + permissions from `MenuPermission` |
| Reseller Login | `POST /reseller/login` | Returns reseller-scoped JWT |
| Superadmin Login | `POST /superadmin/login` | Returns platform-scoped JWT |
| Enterprise Registration | `POST /auth/register` | Creates enterprise in `pending`; triggers OTP email |
| OTP Verify | `POST /auth/verify-otp` | Activates enterprise → `active` status |
| Forgot Password | `POST /auth/forgot-password` | Sends reset email |
| Permission Sync | `GET /auth/permissions` | Called every 5s by logged-in employees |

---

## 6. Functional Modules — Main Dashboard

Each module uses the following template:

> **Purpose · Entities · Status Lifecycle · Key Flows · Business Rules · Cross-Links · QA Focus**

### 6.1 Sales & CRM

#### 6.1.1 Enquiries
- **Purpose:** Capture prospect enquiries and track follow-ups until they convert to sale or are dropped.
- **Entities:** `Enquiry(customer_name, email, mobile, source, interest_status, assigned_to, next_followup_date, expected_value, converted_customer_id)`, `Followup(date, outcome, notes)`.
- **Status (interest_status):** `hot | warm | cold | follow_up | not_available | not_interested | sale_closed | converted`.
- **Key Flows:**
  - List at `/enquiries` with filter by status, source, date range, customer.
  - Add at `/enquiries/add`; Edit at `/enquiries/[id]/edit`; View at `/enquiries/[id]`.
  - Log follow-up outcome (Schedule next / Not available / Not interested).
  - Convert to Customer — sets `converted_customer_id` and moves off the active list.
- **Business Rules:**
  - Cannot delete an enquiry that has a linked Quotation → error: *"Quotation X has already been created for it. Please delete the quotation first."*
  - Cannot delete if linked to a Sales Order or converted to Customer — similar messages.
  - Deleting cleans up the enquiry's followups (hard-owned child records).
  - Overdue follow-ups (past `next_followup_date`) appear in the **Overdue Follow-ups modal** on dashboard entry.
- **Cross-Links:** Customer (conversion), Quotation, Sales Order, Employee (assigned_to).
- **QA Focus:** Delete protection messages; overdue modal trigger; source/status filters; convert-to-customer idempotency.

#### 6.1.2 Follow-ups
- **Purpose:** Operational view of today's + overdue follow-ups across all enquiries.
- **Key Flows:** List at `/follow-ups` and `/crm/follow-ups`; Action button opens outcome modal.
- **Outcomes:** `follow_up` (reschedule), `not_available`, `not_interested` (closes enquiry).
- **QA Focus:** Outcome submission updates both enquiry and followup record; rescheduling removes item from today's overdue list.

#### 6.1.3 Customers
- **Purpose:** Master list of converted prospects.
- **Entities:** `Customer(customer_name, business_name, mobile, email, gst_number, address, source_enquiry_id, status)`.
- **Status:** `active | inactive`.
- **Key Flows:** List `/customers`; add `/customers/add`; edit `/customers/[id]/edit`; view `/customers/[id]`.
- **Business Rules:** Cannot delete if linked to Quotation/Sales Order/Invoice. `source_enquiry_id` is nullable (set when converted from enquiry).
- **Cross-Links:** Enquiry, Quotation, Sales Order, Invoice.

#### 6.1.4 Quotations
- **Purpose:** Priced sales proposals to customers.
- **Entities:** `Quotation(quotation_number, customer_id, enquiry_id, quotation_date, valid_until, expected_delivery, sub_total, discount, tax, grand_total, status, is_locked, sales_order_id, current_version)`, `QuotationItem`, `QuotationVersion`.
- **Status Lifecycle:** `draft → sent → accepted | rejected | expired`.
- **Key Flows:**
  - Create from scratch or from enquiry at `/quotations/create`.
  - Edit at `/quotations/[id]/edit` — only allowed while `draft`.
  - "Mark as Sent" button transitions draft → sent.
  - "Close Sale & Transfer to PO" transitions sent → accepted and creates a Sales Order.
  - "Reject" transitions to rejected; offers to revise or return enquiry to follow-up.
  - ETA setter (`expected_delivery`) — date picker disables past dates.
  - Revise: creates a new QuotationVersion; current_version increments on content changes only.
- **Business Rules:**
  - Once `accepted`, quotation is `is_locked = true` and cannot be edited.
  - Overdue delivery banner appears if `expected_delivery < today` and status is not draft/rejected/expired.
  - "Delete" only visible in `draft` status.
  - Post-rejection actions show only on non-locked rejected quotations.
- **Cross-Links:** Enquiry, Customer, Sales Order, Invoice.
- **QA Focus:** Lock semantics; revision vs status change; ETA past-date disablement; reject+revise flow from rejected state.

#### 6.1.5 CRM (Leads, Team, Reports)
- **Purpose:** Dedicated CRM surface separate from Enquiries.
- **Pages:** `/crm` (dashboard), `/crm/add`, `/crm/follow-ups`, `/crm/team`, `/crm/reports`, `/crm/[id]`, `/crm/[id]/edit`.
- **Permission keys:** `crm.leads.*`.
- **QA Focus:** Permission gating on Add/Delete buttons; team assignment; report accuracy.

#### 6.1.6 Sources / Interest Statuses / Stage Masters
- **Purpose:** Master-data configurability for enquiry pipelines.
- **Location:** `/settings/sources`, `/settings/status`, `/settings/stage-master`.

### 6.2 Orders & Fulfillment

#### 6.2.1 Sales Orders (displayed as "Purchase Orders" in UI)
> **QA NOTE:** Internally this module is `sales-orders` / `SalesOrder`. In the UI sidebar and page titles it is labelled **"Purchase Orders"**. The `/purchase-orders` route shows sales orders; the `/procurement/purchase-orders` route shows *supplier* purchase orders. Be careful to disambiguate.

- **Purpose:** Confirmed customer orders created from accepted quotations.
- **Entities:** `SalesOrder(order_number, customer_id, quotation_id, enquiry_id, status, sub_total, discount, tax, grand_total, expected_delivery, is_on_hold, po_cancelled_at)`, `SalesOrderItem`.
- **Status:** `draft → confirmed → in_manufacturing → ready_for_dispatch → dispatched → delivered | cancelled | on_hold`.
- **Key Flows:**
  - Auto-created when Quotation is accepted.
  - Send to Manufacturing (if applicable) — creates Job Cards.
  - Generate Invoice — once SO is ready.
  - Record Payment against invoice.
  - Hold / Resume order.
  - Report delay with note.
  - Delete SO → cancels the downstream link and reopens the source quotation (if not locked elsewhere).
  - Full Dispatch banner (emerald gradient) shows when `status = dispatched`.
- **Business Rules:** Cannot edit once in manufacturing; deletion cancels linked quotation acceptance.
- **QA Focus:** Cancel propagation to quotation; hold/resume; full-dispatch banner rendering; numbering uniqueness per enterprise.

#### 6.2.2 Manufacturing (Job Cards)
- **Purpose:** Production execution per sales order.
- **Entities:** `ManufacturingOrder(job_card_number, product_id, quantity, status, start_date, expected_completion_date)`, `ManufacturingBOM`, `JobCardStage`.
- **Status Lifecycle:** `pending → in_process → completed_production → ready_for_approval → approved_for_dispatch → dispatched`.
- **Key Flows:**
  - List `/manufacturing`; detail `/manufacturing/[id]`; PO-centric view `/manufacturing/po/[id]`.
  - Progress through stages; consume raw materials via BOM.
  - Approve for dispatch; mark as dispatched.
  - Manufacture status dashboard `/manufacture-status`; dispatched list `/manufacture-status/dispatched`.
- **Cross-Links:** Sales Order, Product, Raw Material (consumption), Inventory.
- **QA Focus:** Stage transitions are one-way; BOM consumption posts to raw material ledger; approval role gating.

### 6.3 Invoicing & Finance

#### 6.3.1 Invoices
- **Purpose:** Customer billing.
- **Entities:** `Invoice(invoice_number, customer_id, sales_order_id, invoice_date, due_date, sub_total, discount, tax, grand_total, total_paid, balance_due, status)`, `InvoiceItem`, `Payment`.
- **Status:** `draft → sent → partially_paid → paid | overdue`.
- **Key Flows:** List `/invoices`; add `/invoices/add`; edit/view `/invoices/[id]`; record payment (with payment method, reference, verify flag).
- **Business Rules:** Auto-overdue flag when `due_date < today` and unpaid; `balance_due = grand_total - total_paid`.
- **Cross-Links:** Sales Order, Customer, Payment.
- **QA Focus:** Payment idempotency; verification workflow; overdue auto-flag; print template consistency.

#### 6.3.2 Payments
- **Purpose:** Payment tracking, both incoming and outgoing.
- **Entities:** `Payment(payment_date, amount, method, reference, status)`.
- **Key Flows:** List `/payments`; record against invoice; verify pending payment.
- **QA Focus:** Amount cannot exceed balance due; method values valid; verify flips status.

#### 6.3.3 Proforma Invoices
- **Purpose:** Preliminary invoices for advance / deposit billing.
- **Entities:** `ProformaInvoice(...)`.
- **Status:** `draft → sent → converted | expired`.
- **Key Flows:** `/proforma-invoices` list and detail.
- **Business Rules:** Can be converted to a real Invoice, which links both.

#### 6.3.4 Coupons
- **Purpose:** Discount/promo codes for quotations and invoices.
- **Entities:** `Coupon(coupon_code, discount_type, discount_value, max_uses, used_count, expiry_date, status)`.
- **Status:** `active | inactive | expired`.
- **Business Rules:** Expiry and usage cap both enforced on validation.

### 6.4 Procurement

#### 6.4.1 Material Requests
- **Purpose:** Internal request for raw materials.
- **Status:** `pending → approved → ordered | rejected`.
- **Key Flows:** `/material-requests` list, detail `/material-requests/[id]`.
- **Sidebar badge:** pending count is shown in the sidebar (refreshes every 60s).
- **QA Focus:** Approval gating; conversion to purchase order; badge accuracy.

#### 6.4.2 Indents
- **Purpose:** Stock-transfer / warehouse indents.
- **Pages:** `/procurement/indents`, `/procurement/indents/[id]`.
- **Status:** `pending → approved → fulfilled | cancelled`.

#### 6.4.3 Suppliers
- **Purpose:** Vendor master.
- **Pages:** `/procurement/suppliers`.
- **Entities:** `Supplier(supplier_code, supplier_name, contact_person, phone, email, gst_number, payment_terms, status)`.
- **QA Focus:** Unique supplier code; payment term validation.

#### 6.4.4 RFQ Quotations
- **Purpose:** Request-for-quotation solicitation to suppliers.
- **Pages:** `/procurement/rfq-quotations`, `/procurement/rfq-quotations/[id]`.
- **Status:** `draft → sent → received → completed | cancelled`.
- **Business Rules:** Multi-supplier; one chosen to become a PO.

#### 6.4.5 Purchase Orders (Procurement)
- **Purpose:** Supplier PO for raw materials.
- **Pages:** `/procurement/purchase-orders`, `/procurement/purchase-orders/[id]`.
- **Status:** `draft → pending_approval → approved → ordered → partially_received → received | cancelled`.
- **Business Rules:**
  - `po_number` is `'DRAFT'` until status leaves draft.
  - Draft/cancelled excluded from super-admin financial reports.
  - Stock inventory updated only on receipt.
- **QA Focus:** Receipt → inventory posting; cancellation → stock unwind; approval workflow gating.

#### 6.4.6 Goods Receipts (GRN)
- **Purpose:** Inbound logistics — receiving materials from suppliers.
- **Pages:** `/inventory/goods-receipts`, `/inventory/goods-receipts/[id]`.
- **Key Flows:** Create GR from PO; record accepted/rejected quantities; inspect.
- **Cross-Links:** PO, Raw Material Ledger, Inventory.

### 6.5 Inventory & Products

#### 6.5.1 Products
- **Purpose:** Finished-goods SKU master.
- **Entities:** `Product(product_code, product_name, category_id, subcategory_id, unit_of_measure, base_price, selling_price, hsn_code, gst_rate, min_stock_level, discount_tiers, status)`.
- **Pages:** `/products`, `/products/add`, `/products/[id]/edit`, `/products/[id]/attributes`.
- **Cross-Links:** Category, Subcategory, Inventory, Quotation Item, Invoice Item.

#### 6.5.2 Categories / Subcategories / Product Types / Unit Master
- Masters at `/products/categories`, `/products/subcategories`, `/settings/product-types`, `/settings/unit-master`.

#### 6.5.3 Raw Materials
- **Purpose:** Consumable material master.
- **Pages:** `/inventory/add`, listed under Inventory.
- **Ledger:** `/inventory/ledger` shows all stock movements.

#### 6.5.4 Inventory Ledger
- **Purpose:** Authoritative record of stock movements.
- **Entry types:** `stock_in` (GRN), `stock_out` (manufacturing, indent fulfill), `adjustment`, `reserved`.
- **Business Rules:** Reserved qty decremented from available; oversell prevented.

### 6.6 Machinery & Maintenance

#### 6.6.1 Machinery
- **Purpose:** Equipment asset registry.
- **Pages:** `/machinery`, `/machinery/[id]`, `/machinery/spare-parts`, `/machinery/spare-map`.
- **Entities:** `Machine(machine_code, machine_name, category, purchase_date, warranty_expiry, meter_reading, status)`.
- **Status:** `active | inactive | retired`.

#### 6.6.2 Maintenance Reminders
- **Purpose:** Automated preventive maintenance scheduling.
- **Pages:** `/maintenance-reminders`.
- **Status:** `pending → work_order_created | snoozed → overdue`.
- **Triggers:** Calendar (dueDate) or Meter (dueAtMeter).
- **Business Rules:** Snooze support; auto-overdue on dueDate; one-click "Create Work Order".

#### 6.6.3 Maintenance Work Orders
- **Purpose:** Maintenance task execution.
- **Pages:** `/maintenance-work-orders`, `/maintenance-work-orders/[id]`.
- **Status:** `pending → assigned → in_progress → completed | cancelled`.
- **Types:** `preventive` (from reminder) or `corrective` (manual).

#### 6.6.4 Maintenance Vendors
- **Purpose:** Third-party service providers + AMC contracts.
- **Pages:** `/maintenance-vendors`.

#### 6.6.5 Spare Parts
- **Purpose:** Spare-parts inventory.
- **Pages:** `/machinery/spare-parts`, `/machinery/spare-map`.

### 6.7 Service Management (Post-Sale)

#### 6.7.1 Service Products (Registered Products)
- **Pages:** `/service-products`, `/service-products/add`, `/service-products/[id]`.
- **Purpose:** Products registered under service contracts.

#### 6.7.2 Service Bookings
- **Pages:** `/service-bookings`.
- **Status:** `pending → confirmed → assigned → in_progress → completed | cancelled`.

#### 6.7.3 Service Events
- **Pages:** `/service-events`.
- **Purpose:** Attendance logs for completed service visits; links spare parts consumed.
- **Sidebar badge:** overdue (red) + pending (orange) counts.

#### 6.7.4 Service Revenue
- **Pages:** `/service-revenue`. Aggregates completed bookings.

### 6.8 Waste Management

#### 6.8.1 Waste Inventory
- **Pages:** `/waste-inventory`. Tracks waste stock by type.

#### 6.8.2 Waste Disposal
- **Pages:** `/waste-disposal`.
- **Status:** `draft → confirmed → in_transit → completed | cancelled`.
- **Business Rules:** Line items can only be edited while draft; confirming reserves inventory; cancelling releases it.

#### 6.8.3 Waste Parties
- **Pages:** `/waste-parties`. Vendors and customers for waste handling.

#### 6.8.4 Waste Analytics
- **Pages:** `/waste-analytics`.

### 6.9 Human Resources

#### 6.9.1 Employees
- **Pages:** `/employees`, `/employees/add`, `/employees/[id]`, `/employees/[id]/edit`, `/employees/[id]/permissions`.
- **Entities:** `Employee(first_name, last_name, email, department_id, designation_id, reporting_to, is_reporting_head, status)`.
- **Status:** `active | inactive` — inactive users cannot log in.

#### 6.9.2 Departments / Designations / Reporting Managers
- **Pages:** `/employees/departments`, `/employees/designations`, `/employees/reporters`.

#### 6.9.3 Employee Permissions
- **Page:** `/employees/[id]/permissions`.
- **Controls:**
  - Matrix toggle for every `module.submodule.action` triple.
  - `dataStartDate` selector: "Full Access" vs "From Today".
  - `ownDataOnly` toggle.
- **Client effect:** Target employee's browser sees updates within 5 seconds (auto-poll).

#### 6.9.4 My Team / Manager Updates
- **My Team:** `/team` — visible only to employees with `is_reporting_head = true`.
- **Manager Updates:** `/manager-updates` — announcements to direct reports.

### 6.10 Organizer & Tasks

#### 6.10.1 Organizer
- **Pages:** `/organizer`, `/organizer/[id]`. Calendar/events.

#### 6.10.2 Tasks
- **Pages:** `/tasks`, `/tasks/add`, `/tasks/[id]`, `/tasks/[id]/edit`.
- **Polymorphic link:** `relatedEntityType + relatedEntityId` attaches a task to any other record.
- **Status:** `pending → in_progress → completed | cancelled`.
- **Priority:** `low | medium | high | urgent`.

### 6.11 Reports & Analytics

- `/analytics` — dashboard analytics.
- `/reports` — index of reports.
- `/reports/customers`, `/reports/employees`, `/reports/enquiries`, `/reports/follow-ups`, `/reports/prospects`.
- **QA Focus:** Date-range filters; export; drill-down links.

### 6.12 Settings

| Page | Purpose |
|---|---|
| `/settings` | General |
| `/settings/branding` | Logo, colors, font, favicon, app name — with version history and rollback |
| `/settings/print-template` | CMS-style template editor for printable documents |
| `/settings/audit-logs` | Audit trail viewer |
| `/settings/sources` | Lead source master |
| `/settings/stage-master` | Sales pipeline stages |
| `/settings/status` | Status master |
| `/settings/templates` | Email / SMS templates |
| `/settings/product-types` | Product type master |
| `/settings/unit-master` | Unit of measurement master |

### 6.13 Locations / Notifications / Communication

- **Locations:** Pincode/city/state autocomplete for address fields.
- **Notifications:** In-app notification bell; refreshes every 60s.
- **Email / SMS:** Transactional (OTP, welcome, password reset) + template-driven.

---

## 7. Reseller Portal

### 7.1 Pages

| URL | Purpose |
|---|---|
| `/reseller/login` | Authentication |
| `/reseller/activate` | New reseller onboarding |
| `/reseller/dashboard` | KPIs: tenants, revenue, commissions |
| `/reseller/my-subscription` | The reseller's own subscription with VAB |
| `/reseller/wallet` | Wallet balance + transaction history |
| `/reseller/tenants` | Tenant (customer enterprise) list + add + assign plan + renew |
| `/reseller/plans` | Available subscription plans to sell |
| `/reseller/subscriptions` | Subscriptions sold to tenants |
| `/reseller/usage` | API / feature usage metrics per tenant |
| `/reseller/billing` | Billing history + invoices |
| `/reseller/commissions` | Commission breakdown by period |
| `/reseller/reports` | Aggregated reports |
| `/reseller/profile` | Reseller account info |

### 7.2 Key Flows

- **Onboarding:** Register → Activate → Wallet top-up → Create first tenant.
- **Tenant Lifecycle:** Create enterprise under this reseller → Assign plan → Monitor usage → Renew on expiry.
- **Commission:** Reseller earns a margin % set by Superadmin; visible on `/reseller/commissions`.

### 7.3 Business Rules

- Reseller only sees enterprises where `reseller_id = <self>`. No cross-reseller visibility.
- The `Reports` page's "Total Tenants" count uses `COUNT(DISTINCT enterprise_id)` to avoid over-counting via payment joins.
- Wallet negative balance blocks plan assignment.

### 7.4 QA Focus

- Tenant isolation: Reseller A cannot see Reseller B's tenants even with URL guessing.
- Commission calculation accuracy.
- Plan assignment sets correct `expiry_date = today + plan_duration`.

---

## 8. Superadmin Portal

### 8.1 Pages

| URL | Purpose |
|---|---|
| `/superadmin/login` | Authentication |
| `/superadmin/dashboard` | Platform-wide KPIs |
| `/superadmin/enterprises` | All enterprises (direct + via reseller) |
| `/superadmin/enterprises/[id]` | Enterprise detail: activate / block / assign plan |
| `/superadmin/employees` | Cross-tenant employee view |
| `/superadmin/accounts` | Platform financial accounts |
| `/superadmin/subscriptions` | Global subscription tracking; **Assign Plan** button (solid dark style) opens modal |
| `/superadmin/support` | Support tickets |
| `/superadmin/services` | Service catalog |
| `/superadmin/coupons` | Coupon/promo code management |
| `/superadmin/resellers` | All resellers |
| `/superadmin/resellers/[id]` | Reseller detail |
| `/superadmin/resellers/plans` | Reseller-tier plan templates |
| `/superadmin/resellers/subscriptions` | Reseller subscription status |
| `/superadmin/resellers/wallets` | Reseller wallet ledger |

### 8.2 Key Flows

- **Enterprise Lifecycle:** Create → Activate → Assign plan → Block/unblock → Force re-verify email.
- **Reseller Lifecycle:** Create reseller → Assign plan template → Monitor subscriptions and wallets.
- **Subscription Assignment:** `/superadmin/subscriptions` → Assign Plan → Confirm & Assign → expiry date = today + plan duration.

### 8.3 Business Rules

- Superadmin can see *every* tenant regardless of reseller.
- Blocking an enterprise sets `is_locked = true` — all users for that enterprise lose access immediately on next request (guard check).
- Deleting an enterprise is *not* supported; use Block instead.

---

## 9. Cross-Module Workflows

### 9.1 Sales-to-Cash
**Path:** Enquiry → Quotation → Sales Order → (optional Manufacturing) → Dispatch → Invoice → Payment.

**Steps:**
1. Employee creates Enquiry with customer details and interest status `hot`.
2. Employee schedules a Follow-up; logs outcome.
3. Employee creates Quotation from the enquiry; status `draft`.
4. Employee clicks "Mark as Sent" → status `sent`.
5. Customer accepts → Employee clicks "Close Sale & Transfer to PO" → Quotation becomes `accepted`, `is_locked = true`; Sales Order is created with status `draft` / `confirmed`.
6. SO progresses through Manufacturing stages (pending → … → dispatched).
7. Invoice is generated from SO; customer pays; payment records posted; invoice status → `paid`.

**Invariants:**
- Quotation cannot be edited after acceptance.
- Cannot delete Enquiry at any point on this path.
- Sales Order cannot be edited once in manufacturing.

### 9.2 Procure-to-Pay
**Path:** Material Request → Indent → RFQ → Purchase Order → Goods Receipt → Supplier Payment.

**Invariants:** Stock ledger updates only on GR receipt; PO `draft` status yields `po_number = 'DRAFT'`; approval required before sending.

### 9.3 Manufacturing
**Path:** Sales Order → BOM → Job Cards → Stages → Dispatch.

**Stages:** `pending → in_process → completed_production → ready_for_approval → approved_for_dispatch → dispatched`.

**Invariants:** Stages are one-way; raw material ledger debited when stage consumes BOM; inventory stock-out on dispatch.

### 9.4 Service Lifecycle
**Path:** Register Product → Service Booking → Service Event → Revenue.

**Invariants:** Completing a Service Event auto-closes the booking; spare parts consumed post to Spare Part inventory; revenue row appears in `/service-revenue`.

### 9.5 Maintenance Trigger
**Path:** Machine meter reading / calendar → Reminder fires → Work Order created → Assign technician → Consume spare parts → Complete → Downtime logged.

**Invariants:** Reminder `status → work_order_created` upon WO creation; spare parts decremented atomically; downtime duration recorded.

### 9.6 Permission Change Propagation
**Path:** Admin toggles permission on `/employees/[id]/permissions` → saved to `MenuPermission` → target employee's `/auth/permissions` call (every 5s) returns new tree → Zustand store updates → sidebar and buttons update without reload.

**Invariants:** Admin does not need to tell employee to refresh; change visible within ≤ 5 seconds plus network latency.

### 9.7 Multi-Tenant Isolation
**Test scenario:** Create enterprise A with customer `Acme`; create enterprise B with customer `Acme` (same email, name). Log in as A's employee; search/list customers → must see only A's. Attempt direct URL `/customers/<B's customer id>` → must return 404 / forbidden.

### 9.8 Subscription Expiry
**Path:** Enterprise `expiry_date < today` → Superadmin or Reseller assigns a new plan → `expiry_date` extended → users regain access.

**Invariants:** Expired enterprise cannot log in until renewal; reseller sees tenant as expired in their dashboard.

### 9.9 Delete-Cascade Protection
**Examples:**
- Delete Enquiry with linked Quotation → blocked with message.
- Delete Product in use on a Quotation → blocked.
- Delete Customer with Invoice → blocked.

**Invariant:** Parent-with-children delete always produces a clear user-facing message telling them which child to remove first.

### 9.10 Draft Behavior
Applies to Quotations, Proforma Invoices, POs (procurement), RFQs, Waste Disposal.

**Properties of a draft:**
- Freely editable.
- Deletable (delete button only visible in draft).
- Excluded from reports and dashboards.
- Does not consume stock.
- Does not receive a real document number until it leaves draft.
- Once promoted (sent / approved / confirmed), it is locked or tightly constrained.

---

## 10. Non-Functional Requirements

### 10.1 Security
- Passwords hashed with **bcrypt**.
- JWT tokens signed with platform secret; no refresh-token rotation (single-lived).
- OTP email verification required for new enterprise registration.
- Guards enforce RBAC at every controller endpoint.
- Audit log is immutable (append-only).

### 10.2 Performance Targets

| Endpoint Class | Target P95 |
|---|---|
| List endpoints (paginated) | < 1 s |
| Detail endpoints | < 500 ms |
| Report endpoints | < 3 s |
| Login | < 1 s |
| Permission sync (`/auth/permissions`) | < 300 ms |

### 10.3 Auditability
Every create / update / delete / login is written to `AuditLog` with:
- `enterpriseId`, `userId`, `userType`, `userName`
- `entityType`, `entityId`, `action`, `description`
- `timestamp`, `ipAddress`, `changes` (delta)

Viewable at `/settings/audit-logs`.

### 10.4 Branding
- Per-enterprise: logo, favicon, primary color, secondary color, font family, border radius, app name.
- Applied via `ConfigProvider` in `BrandingProvider.tsx`.
- Primary color default: `#1677ff` (Ant Design blue).
- Branding versions stored for rollback.

### 10.5 Print Engine
Four-layer architecture:
1. **Template** — HTML skeleton.
2. **Style** — CSS variables (e.g. `--pt-primary`).
3. **Config** — from Print Template CMS per document type.
4. **Render** — merged with entity data.

Printable routes: `/print/enquiry/[id]`, `/print/invoice/[id]`, `/print/payment/[id]`, `/print/proforma-invoice/[id]`, `/print/quotation/[id]`.

### 10.6 Auto-Sync Intervals

| What | Interval | Source |
|---|---|---|
| Employee permissions | 5 s | `ProtectedRoute.tsx` poll |
| Material request badge | 60 s | React Query `refetchInterval` |
| Notifications | 60 s | React Query `refetchInterval` |
| Service event counts | 60 s | React Query `refetchInterval` |

Polls pause when `document.hidden` to save battery and server load.

### 10.7 Data Integrity
- FK constraints enforced at DB level.
- Deletes run in transactions (`dataSource.transaction`).
- Downstream FKs with `nullable: true` allow decoupling on parent delete when appropriate.
- Status transitions guarded in service layer.

---

## 11. Test Focus Areas

### 11.1 Must-Pass Scenarios
- Login for each user type (enterprise, employee, reseller, superadmin) with valid and invalid credentials.
- Logout clears session.
- Multi-tenant isolation: a user from Enterprise A cannot see Enterprise B's data, even via URL guessing.
- Permission change propagation within 5 seconds.
- Every draft → next-status transition works on every module that has drafts.
- Delete protection messages appear on every parent-with-children delete attempt.

### 11.2 Status Guards to Verify
| Module | Rule |
|---|---|
| Quotation | Cannot edit after `is_locked = true` |
| Sales Order | Cannot edit once in manufacturing |
| Manufacturing Job Card | Stages are one-way |
| Waste Disposal | Line items editable only in draft |
| Proforma Invoice | Cannot edit after converted |
| PO (procurement) | Stock updated only on receipt |

### 11.3 Permission Matrix Scenarios
- 2-arg check: `hasPermission('sales', 'view')` — returns true if any submodule under `sales` has `view = 1`.
- 3-arg check: `hasPermission('sales', 'customers', 'delete')` — exact match.
- Enterprise bypass: logged-in enterprise sees every button regardless of `MenuPermission` contents.
- `dataStartDate` filter: employee joined 2025-01-01 sees only records after that date.
- `ownDataOnly` filter: sales rep sees only leads they created.

### 11.4 UI Regression Checks
- **Overdue Follow-ups modal** triggers on entering any dashboard page if today's followups are past due.
- **Fully Dispatched banner** on `/purchase-orders/[id]` when SO is dispatched (emerald gradient).
- **Sidebar menu** hides items the employee lacks `view` permission for.
- **Branding color change** on `/settings/branding` reflects instantly across all open tabs of that enterprise.
- **ETA date picker** (Quotations) disables past dates.
- **Delete enquiry** with linked quotation shows the exact message: *"Cannot delete this enquiry. Quotation XXX has already been created for it. Please delete the quotation first."*

### 11.5 Printing
Every printable document renders without layout breakage and uses the enterprise's branding colors / logo / template.

### 11.6 Export
CSV/PDF exports from list pages (Enquiries, Quotations, POs, Invoices, Customers, Employees) produce rows matching the on-screen filter state.

### 11.7 Mobile Responsiveness
- Sidebar switches to drawer on < 768 px.
- Tables scroll horizontally without overflow breakage.
- Modals fit screen; buttons reachable with thumb.

### 11.8 Audit Trail
Every action taken during the QA session should appear in `/settings/audit-logs` with the correct user attribution.

---

## 12. Glossary

| Term | Meaning |
|---|---|
| **Draft** | First status for new documents — editable, deletable, invisible to reports. |
| **Locked Quotation** | `is_locked = true`; set after acceptance; read-only forever. |
| **Sales Order** (aka **Purchase Order** in UI) | Confirmed customer order. Displayed as "Purchase Order" in sidebar/pages. |
| **PO (Procurement)** | Supplier purchase order; distinct from the SO-as-PO above. |
| **Job Card** | Unit of manufacturing work for a specific product in an order. |
| **BOM** | Bill of Materials — raw materials required to produce a product. |
| **GRN** | Goods Receipt Note — inbound receipt from supplier. |
| **Indent** | Internal warehouse stock transfer request. |
| **RFQ** | Request for Quotation — sent to suppliers to solicit quotes. |
| **Dispatched** | Manufacturing stage after approval — goods have left the premises. |
| **MenuPermission** | Row in DB holding an employee's JSON permission tree. |
| **dataStartDate** | Cut-off date for what records an employee can see. |
| **ownDataOnly** | If true, employee only sees records they created. |
| **EnterpriseBranding** | Per-tenant theme settings (logo, colors, etc.). |
| **WasteParty** | Vendor or customer for waste materials. |
| **ServiceEvent** | Attendance log for a completed service booking visit. |
| **Overdue Follow-up** | A follow-up whose `next_followup_date` is past today. |
| **Reseller** | Channel partner who manages tenant enterprises on VAB's behalf. |
| **Super Admin** | Platform-level operator (VAB staff). |

---

## 13. Appendices

### 13.1 Appendix A — Status Lifecycle Quick Reference

| Module | Statuses |
|---|---|
| Enquiry (interest_status) | hot, warm, cold, follow_up, not_available, not_interested, sale_closed, converted |
| Quotation | draft, sent, accepted, rejected, expired |
| Sales Order | draft, confirmed, in_manufacturing, ready_for_dispatch, dispatched, delivered, cancelled, on_hold |
| Job Card | pending, in_process, completed_production, ready_for_approval, approved_for_dispatch, dispatched |
| Invoice | draft, sent, partially_paid, paid, overdue |
| Proforma Invoice | draft, sent, converted, expired |
| Payment | pending, verified |
| PO (procurement) | draft, pending_approval, approved, ordered, partially_received, received, cancelled |
| Material Request | pending, approved, ordered, rejected |
| Indent | pending, approved, fulfilled, cancelled |
| RFQ | draft, sent, received, completed, cancelled |
| Manufacturing Order | draft, in_progress, completed, cancelled |
| Maintenance Reminder | pending, work_order_created, snoozed, overdue |
| Maintenance Work Order | pending, assigned, in_progress, completed, cancelled |
| Service Booking | pending, confirmed, assigned, in_progress, completed, cancelled |
| Waste Disposal | draft, confirmed, in_transit, completed, cancelled |
| Coupon | active, inactive, expired |
| Enterprise | pending, active, blocked |
| Employee | active, inactive |
| Customer | active, inactive |
| Supplier | active, inactive |
| Machine | active, inactive, retired |
| Task | pending, in_progress, completed, cancelled |

### 13.2 Appendix B — Permission Module Tree

Authoritative source: `API/src/common/constants/permissions.ts`. Top-level modules include (full tree in source file):

- `enquiry` → enquiries, follow_ups
- `sales` → customers, quotations
- `orders` → purchase_orders, sales_orders
- `manufacturing` → overview, job_cards, stages, processes
- `inventory` → raw_materials, stock_ledger, material_requests, goods_receipts
- `procurement` → indents, rfq_quotations, suppliers, purchase_orders
- `invoicing` → invoices, payments, proforma_invoices
- `products` → products, categories, subcategories, product_types
- `employees` → employees, departments, designations, permissions
- `service_management` → service_products, service_bookings, service_events, service_revenue
- `machinery` → machines, spare_parts, work_orders, reminders, vendors
- `waste_management` → waste_inventory, waste_disposal, parties, analytics
- `crm` → leads, follow_ups, team, reports
- `organizer` → events
- `tasks` → tasks
- `reports` → analytics, enquiry_reports
- `settings` → general, branding, print_templates, audit_logs, sources, stage_master, status, templates, unit_master

Actions on each submodule: `view | create | edit | delete | approve`.

### 13.3 Appendix C — URL Map (Main Dashboard)

| URL | Purpose |
|---|---|
| `/login` | Main login |
| `/register` | Enterprise self-registration |
| `/verify-otp` | OTP step during registration |
| `/forgot-password` | Password reset request |
| `/dashboard` | Home dashboard |
| `/enquiries` + `/add` + `/[id]` + `/[id]/edit` | Enquiry CRUD |
| `/follow-ups` | Follow-ups list |
| `/customers` + `/add` + `/[id]` + `/[id]/edit` | Customer CRUD |
| `/quotations` + `/create` + `/[id]` + `/[id]/edit` | Quotation CRUD |
| `/purchase-orders` + `/[id]` | Sales Orders (labelled PO in UI) |
| `/sales-orders` + `/[id]` | Alt route for sales orders |
| `/invoices` + `/add` + `/[id]` + `/[id]/edit` | Invoice CRUD |
| `/payments` | Payment tracking |
| `/proforma-invoices` + `/[id]` | Proforma CRUD |
| `/manufacturing` + `/[id]` + `/[id]/edit` + `/create` + `/po/[id]` + `/processes` + `/stages` | Manufacturing |
| `/manufacture-status` + `/dispatched` | Status dashboards |
| `/material-requests` + `/[id]` | Material Requests |
| `/procurement/indents` + `/[id]` | Indents |
| `/procurement/rfq-quotations` + `/[id]` | RFQ |
| `/procurement/suppliers` | Suppliers |
| `/procurement/purchase-orders` + `/[id]` | Supplier POs |
| `/inventory` + `/add` + `/ledger` + `/goods-receipts` + `/goods-receipts/[id]` | Inventory |
| `/products` + `/add` + `/[id]/edit` + `/[id]/attributes` + `/categories` + `/subcategories` | Products |
| `/machinery` + `/[id]` + `/spare-parts` + `/spare-map` | Machinery |
| `/maintenance-reminders` | Maintenance reminders |
| `/maintenance-work-orders` + `/[id]` | WO |
| `/maintenance-vendors` | WO vendors |
| `/service-products` + `/add` + `/[id]` | Service products |
| `/service-bookings` | Service bookings |
| `/service-events` | Service events |
| `/service-revenue` | Service revenue |
| `/waste-inventory` / `/waste-disposal` / `/waste-parties` / `/waste-analytics` | Waste mgmt |
| `/employees` + `/add` + `/[id]` + `/[id]/edit` + `/[id]/permissions` + `/departments` + `/designations` + `/reporters` | HR |
| `/team` | My Team (reporting heads) |
| `/manager-updates` | Manager updates |
| `/organizer` + `/[id]` | Calendar |
| `/tasks` + `/add` + `/[id]` + `/[id]/edit` | Tasks |
| `/analytics`, `/reports`, `/reports/*` | Reports |
| `/settings/*` | All settings pages |
| `/print/*` | Printable views |

### 13.4 Appendix D — Known Quirks (Not Bugs)

1. **"Sales Order" shown as "Purchase Order" in UI.** Internal name is `sales-orders`; UI label is "Purchase Orders". The `/procurement/purchase-orders` route is the *other* kind (supplier POs). This is intentional — historically the business called sales orders "POs".
2. **Permissions refresh every 5 s, not via WebSocket.** Simpler and sufficient for this use case; no WS infrastructure needed. Tab pauses when hidden.
3. **`poNumber = 'DRAFT'` for draft POs.** Real number assigned only when the PO leaves draft; intentional to avoid gaps in numbering.
4. **Enterprise login gives full permissions regardless of `MenuPermission` rows.** Enterprise type bypasses RBAC. Employee-type users are the only ones whose permissions are enforced.
5. **Two directories on the server:** `/var/www/html/enterprise/API` and `/var/www/html/enterprise/api`. PM2 runs from the **lowercase** ones (`api`, `frontend`). Uppercase ones exist but are not served.
6. **Sidebar may briefly show all items on first paint**, then hide the ones the user lacks access to once permissions sync. This is expected; the initial paint uses the localStorage cache, and the server response refines it.
7. **Reports `Total Tenants` uses `COUNT(DISTINCT enterprise_id)`.** Earlier versions could show inflated counts (e.g. 10 instead of 3) because of a `LEFT JOIN platform_payments` — now fixed.
8. **"Overdue Follow-ups" modal** is global across all dashboard routes — it follows the user, not the page.
9. **Default colors** — primary `#1677ff`, link `#7c3aed`, success `#059669`, warning `#d97706`, error `#dc2626`. Override any of these via Settings → Branding.

---

*End of document. For changes, edit `BRD.md` in the repo root and commit.*
