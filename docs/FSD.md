# Functional Specification Document — vaberp ERP

> **Audience:** Internal development team
> **Repository:** `C:\Users\UNITECH2\Desktop\enterprise`
> **Stack:** NestJS (API) + Next.js 14 / Ant Design (Frontend) + PostgreSQL + TypeORM
> **Live URL:** https://vaberp.com (`64.235.43.187:2262`)
> **Document status:** Skeleton + Authentication + Quotations modules fully detailed. Remaining modules listed as titled stubs — fill on demand.

---

## Table of Contents

1. [Module Overview](#1-module-overview)
2. [User Roles](#2-user-roles)
3. [Detailed Screen-wise Breakdown](#3-detailed-screen-wise-breakdown)
4. [Button-Level Functionality](#4-button-level-functionality)
5. [Navigation Flow](#5-navigation-flow)
6. [End-to-End User Flows](#6-end-to-end-user-flows)
7. [Validation Rules](#7-validation-rules)
8. [State Handling](#8-state-handling)
9. [Permissions & Role-Based Access](#9-permissions--role-based-access)
10. [Edge Cases & Failure Scenarios](#10-edge-cases--failure-scenarios)

---

## 1. Module Overview

### 1.1 Backend modules (`API/src/modules/`)

| Module | Purpose | Primary entity | Route prefix |
|---|---|---|---|
| `auth` | Authentication, JWT issuance, OTP, password reset | (token payload) | `/auth` |
| `customers` | Customer master & accounts | `Customer` | `/customers` |
| `enquiries` | Sales enquiries / leads pre-customer | `Enquiry` | `/enquiries` |
| `crm` | Lead pipeline, follow-ups, assignments, reports | `CRMLead` | `/crm` |
| `quotations` | Quote generation, versioning, accept→PO conversion | `Quotation` | `/quotations` |
| `sales-orders` | Sales orders / Purchase Orders (UI alias) | `SalesOrder` | `/sales-orders` |
| `purchase-orders` | Procurement purchase orders | `PurchaseOrder` | `/purchase-orders` |
| `invoices` | Tax invoice generation + payments | `Invoice` | `/invoices` |
| `proforma-invoices` | Proforma invoice templates | `ProformaInvoice` | `/proforma-invoices` |
| `suppliers` | Supplier master | `Supplier` | `/suppliers` |
| `rfqs` | RFQ to vendors | `RFQ` | `/rfqs` |
| `indents` | Material indent requests | `Indent` | `/indents` |
| `products` | Finished-goods catalog with volume tiers | `Product` | `/products` |
| `product-types` | Service vs goods classification | `ProductType` | `/product-types` |
| `raw-materials` | Raw-material master | `RawMaterial` | `/raw-materials` |
| `inventory` | Stock levels & ledger | `Inventory` | `/inventory` |
| `goods-receipts` | GRN reconciliation | `GoodsReceipt` | `/goods-receipts` |
| `material-requests` | Stock requisitions | `MaterialRequest` | `/material-requests` |
| `manufacturing` | Job cards, BOM, production stages | `JobCard`, `Bom` | `/manufacturing` |
| `machines` | Equipment registry | `Machine` | `/machines` |
| `spare-parts` | Machine spare-parts inventory | `SparePart` | `/spare-parts` |
| `maintenance-work-orders` | Work-order scheduling | `MaintenanceWorkOrder` | `/maintenance-work-orders` |
| `maintenance-bom` | BOM for maintenance kits | `MaintenanceBomTemplate` | `/maintenance-bom` |
| `maintenance-reminders` | Preventive-maintenance scheduler | `MaintenanceReminder` | `/maintenance-reminders` |
| `maintenance-downtime` | Machine downtime logging | `DowntimeLog` | `/maintenance-downtime` |
| `maintenance-vendors` | AMC contracts | `MaintenanceVendor` | `/maintenance-vendors` |
| `service-products` | Service-item catalog | `ServiceProduct` | `/service-products` |
| `service-bookings` | Service bookings | `ServiceBooking` | `/service-bookings` |
| `service-events` | Per-event service tracking | `ServiceEvent` | `/service-events` |
| `services-master` | Platform service master (super-admin) | `ServiceMaster` | `/super-admin/services` |
| `employees` | Staff registry, departments, designations, RBAC | `Employee`, `MenuPermission` | `/employees` |
| `tasks` | Task assignment & tracking | `Task` | `/tasks` |
| `team-updates` | Manager team updates feed | `TeamUpdate` | `/team-updates` |
| `organizer` | Personal task/event organizer | `OrganizerItem` | `/organizer` |
| `waste-inventory` | Production-waste inventory | `WasteInventory` | `/waste-inventory` |
| `waste-disposal` | Waste disposal transactions | `WasteDisposalTransaction` | `/waste-disposal` |
| `waste-parties` | Waste vendor registry | `WasteParty` | `/waste-parties` |
| `waste-analytics` | Waste KPIs & reports | (computed) | `/waste-analytics` |
| `coupons` | Discount coupons (super-admin) | `Coupon` | `/super-admin/coupons` |
| `resellers` | Reseller account management | `Reseller` | `/resellers` |
| `super-admin` | Platform admin | `SuperAdmin` | `/super-admin` |
| `enterprises` | Enterprise tenant management | `Enterprise` | `/enterprises` |
| `enterprise-branding` | Per-tenant branding | `EnterpriseBranding` | `/branding` |
| `email`, `email-templates` | Email dispatch + templates | (service), `EmailTemplate` | `/email`, `/email-templates` |
| `sms` | SMS dispatch | (service) | `/sms` |
| `notifications` | In-app notifications | `Notification` | `/notifications` |
| `print-templates` | Custom print layouts | `PrintTemplateConfig` | `/print-templates` |
| `locations` | Country/state/city/pincode | `City`, `State` | `/locations` |
| `unit-masters` | UOM config | `UnitMaster` | `/unit-masters` |
| `stage-masters` | Pipeline stages | `StageMaster` | `/stage-masters` |
| `sources` | Lead source taxonomy | `Source` | `/sources` |
| `audit-logs` | Cross-module activity log | `AuditLog` | `/audit-logs` |
| `interest-statuses` | Customer interest classification | `InterestStatus` | `/interest-statuses` |
| `reports` | BI exports / analytics | (computed) | `/reports` |

### 1.2 Frontend route groups (`Frontend/src/app/`)

| Group | Layout file | Auth required | Roles allowed |
|---|---|---|---|
| `(auth)` | `(auth)/layout.tsx` | No | Anyone (public) |
| `(dashboard)` | `(dashboard)/layout.tsx` | Yes | `enterprise`, `employee` |
| `superadmin` | `superadmin/layout.tsx` | Yes | `super_admin` only |
| `reseller` | `reseller/layout.tsx` | Yes | `reseller` only |
| `print` | (no layout chrome) | Yes | Same as `(dashboard)` |

A complete route enumeration appears in the **Section 3** screen-wise breakdown table.

---

## 2. User Roles

### 2.1 User-type matrix

| Role | JWT `type` | Tenant-bound? | Issued by | Token TTL | Auth endpoint |
|---|---|---|---|---|---|
| **Enterprise Admin** | `enterprise` | Yes | OTP / password login | env-driven | `POST /auth/enterprise/login`, `POST /auth/enterprise/verify-otp` |
| **Employee** | `employee` | Yes (1 enterprise) | Enterprise admin via Employees module | env-driven | `POST /auth/employee/login` |
| **Reseller** | `reseller` | No (multi-tenant) | Super admin | env-driven | `POST /resellers/login` |
| **Super Admin** | `super_admin` | No (platform) | Bootstrapped at install | env-driven | `POST /super-admin/login` |

### 2.2 Permission storage

- **Where:** `MenuPermission` entity — `API/src/modules/employees/entities/menu-permission.entity.ts`.
- **Shape:** `permissions: Record<module, Record<submodule, Record<action, 0|1>>>` stored as `jsonb`.
- **Module catalog:** 17 top-level modules — `sales`, `enquiry`, `orders`, `catalog`, `inventory`, `procurement`, `invoicing`, `employees`, `reports`, `configurations`, `crm`, `tasks`, `service_management`, `machinery_management`, `waste_management`, `organizer`. Defined in `API/src/common/constants/permissions.ts`.
- **Actions:** `view`, `create`, `edit`, `delete`, plus per-module specials (`approve`, `send`, etc.).

### 2.3 Default permission sets

| Role | Default | Data scope filters |
|---|---|---|
| `enterprise` | All modules / all actions = 1 (auto-built by `buildFullAccessPermissions()`) | Full tenant data |
| `employee` | All actions = 0; admin grants per submodule | `dataStartDate`, `ownDataOnly`, `currentUserId` enforced in service layer via `PermissionGuard` request decoration |
| `reseller` | Reseller-portal endpoints only | Limited to assigned enterprises |
| `super_admin` | All `/super-admin/*` endpoints | Platform-wide |

### 2.4 Permission check (back-end)

- Guard: `API/src/common/guards/permission.guard.ts`.
- Decorator: `@RequirePermission(module, submodule?, action)` — supports 2-arg (any submodule) and 3-arg (exact submodule) forms.
- `enterprise` user type **bypasses** the matrix check.
- For `employee`: `record.permissions[module][submodule][action] === 1` must hold.
- The guard attaches `dataStartDate`, `ownDataOnly`, `currentUserId`, `permissions` to `req` for service-layer scoping.

### 2.5 Permission check (front-end)

- Hook: `usePermissions().hasPermission(module, submodule, action)` from `Frontend/src/stores/authStore.ts`.
- Permissions are fetched on login via `GET /auth/permissions` and refreshed periodically so admin grants take effect without re-login.
- Used to conditionally render buttons (e.g., `{ canEdit && <EditButton /> }`); the back-end guard remains authoritative.

---

## 3. Detailed Screen-wise Breakdown

> Sections 3.1 (Authentication) and 3.2 (Quotations) are fully detailed below.
> All other screens appear in the section 3.3 inventory table — drilled-down detail to be filled on demand.

### 3.1 Authentication module — full detail

#### 3.1.1 Login page (tabbed: Employee / Enterprise)

| Field | Value |
|---|---|
| Route | `/login` |
| File | `Frontend/src/app/(auth)/login/page.tsx` |
| Layout group | `(auth)` |
| Auth required | No |
| Components | `<LoginForm>` (`components/auth/LoginForm.tsx`), `<EnterpriseLoginForm>` (`components/auth/EnterpriseLoginForm.tsx`) |

**Purpose:** Primary authentication page with two tabs — **Employee** (email + password) and **Enterprise** (email → OTP, with optional password fallback). Optional `?org=<slug>` query param pre-loads tenant branding.

**UI elements:**

| Element | Type | Notes |
|---|---|---|
| Tenant logo + app name | Image + text | Branding swap if `?org=`; defaults to "VAB Informatics" |
| Tab "Employee" | Tab | Renders `<LoginForm>` |
| Tab "Enterprise" | Tab | Renders `<EnterpriseLoginForm>` |
| Email input | Email | Both tabs; validated as RFC email |
| Password input | Password | Min 6 chars |
| OTP input (Enterprise tab, step 2) | 6-digit numeric | `<OtpInput length={6}>` |
| "Forgot your password?" | Link | → `/forgot-password` |
| "Register your business" | Link | → `/register` (Enterprise tab only) |
| "Reseller Login" | Link | → `/reseller/login` |
| "Super Admin Login" | Link | → `/superadmin/login` |

#### 3.1.2 Register page

| Field | Value |
|---|---|
| Route | `/register` |
| File | `Frontend/src/app/(auth)/register/page.tsx` |
| Layout group | `(auth)` |
| Auth required | No |

**Purpose:** New-enterprise self-registration. Generates a temp password (`last4OfMobile + first3OfBusinessNameLowercase`), sends both email and SMS OTP, redirects to `/verify-otp`.

**Form fields:**

| Field | Type | Required | Validation |
|---|---|---|---|
| `businessName` | Text | Yes | min 1 char |
| `businessEmail` | Email | Yes | RFC email; unique globally |
| `businessMobile` | Text | Yes | Exactly 10 digits |
| `businessAddress` | TextArea | Yes | min 1 char |
| `businessState` | Select | Yes | One of 31 Indian states |
| `businessCity` | Text | Yes | min 1 char |
| `pincode` | Text | Yes | 6 digits |
| `gstNumber` | Text | No | No regex (optional) |
| `cinNumber` | Text | No | No regex (optional) |

#### 3.1.3 OTP verification page

| Field | Value |
|---|---|
| Route | `/verify-otp` |
| File | `Frontend/src/app/(auth)/verify-otp/page.tsx` |
| Layout group | `(auth)` |
| Auth required | No (relies on `sessionStorage.pendingVerification`) |

**Purpose:** Two-step OTP verification (email 6-digit → mobile 4-digit) for newly-registered enterprises. Auto-redirects to `/login` after both steps.

**Steps Component:** Email → Mobile → Done.

**Guard:** If `sessionStorage.pendingVerification` is `null` on mount, redirects to `/register`.

#### 3.1.4 Forgot password page

| Field | Value |
|---|---|
| Route | `/forgot-password` |
| File | `Frontend/src/app/(auth)/forgot-password/page.tsx` |
| Layout group | `(auth)` |
| Auth required | No |

**Purpose:** Reset-password flow that requires the **current** password (acts as a verified-self-service reset). Tries enterprise account first, then employee.

**Form fields:**

| Field | Type | Required | Validation |
|---|---|---|---|
| `email_id` | Email | Yes | RFC email |
| `oldpassword` | Password | Yes | min 6 chars |
| `confirmpassword` | Password | Yes | min 6 chars |

> Note: there is no "email reset link" flow at present — old password is required.

#### 3.1.5 Reseller login

| Field | Value |
|---|---|
| Route | `/reseller/login` |
| File | `Frontend/src/app/reseller/login/page.tsx` |
| Auth required | No |

#### 3.1.6 Super-admin login

| Field | Value |
|---|---|
| Route | `/superadmin/login` |
| File | `Frontend/src/app/superadmin/login/page.tsx` |
| Auth required | No |

#### 3.1.7 Logout flow

- Endpoint: `POST /auth/logout` (public).
- Server clears `access_token` httpOnly cookie (`maxAge: 0`).
- Frontend additionally clears `authStore` (zustand) and routes to `/login`.

---

### 3.2 Quotations module — full detail

#### 3.2.1 Quotation list

| Field | Value |
|---|---|
| Route | `/quotations` |
| File | `Frontend/src/app/(dashboard)/quotations/page.tsx` |
| Component | `<QuotationTable>` |
| Permission | `sales:quotations:view` |

**UI elements:**

| Element | Type | Notes |
|---|---|---|
| Title + subtitle | Header | "Quotations" / "Create and manage customer quotations" |
| Search input | Text | Searches customer name OR quotation # (ILIKE) |
| Status select | Dropdown | `QUOTATION_STATUS_OPTIONS`: draft, sent, accepted, rejected, expired, po_cancelled |
| Date range picker | DatePicker | DD-MM-YYYY |
| Search button | Primary | Triggers query refetch |
| Clear button | Default | Resets filters |
| Export menu | Dropdown | CSV / Excel / PDF (only when results) |
| Create Quotation button | Primary | Hidden unless `sales:quotations:create` |
| Data table | Table | See columns below |

**Table columns:** Quotation #, Customer, Date, Valid Until, ETA (`expected_delivery`), Total Amount, Status (color-coded badge), Created By, Actions menu.

**Status badge colors:** `draft` = default, `sent` = blue, `accepted` = green, `rejected` = red, `expired` = orange, `po_cancelled` = volcano.

**Per-row indicators:**
- Purple `v{N}` tag when `current_version > 1`.
- Green "In PO" badge when `sales_order_id` is set.

**Actions menu (per row):** View, Edit (hidden if `is_locked`), Download PDF, Mark as Sent (draft only), Transfer to PO (draft/sent), Status Change submenu, Delete (draft only + delete permission).

#### 3.2.2 Quotation detail

| Field | Value |
|---|---|
| Route | `/quotations/[id]` |
| File | `Frontend/src/app/(dashboard)/quotations/[id]/page.tsx` |
| Permission | `sales:quotations:view` |

**Layout:** left pane = customer + items + totals; right pane = quotation metadata (Date, Valid Until, ETA with "Set" button).

**Items table columns:** #, Product (name + SKU), HSN, Qty, Unit, Unit Price, Disc %, Tax %, Total.

**Totals block:** Subtotal, Discount (red if > 0), Tax, **Total Amount** (large bold).

**Action bar (top-right):** Back, Print, Download PDF, Send Email, Mark as Sent (draft only), Edit (if not locked), Reject (if `[draft, sent]`), Close Sale & Transfer to PO (if `[draft, sent]`), View Purchase Order (if locked + has `sales_order_id`).

**Conditional alerts:**
- Red **PO Cancelled alert** when `po_cancelled_at` is set.
- Blue **Locked alert** when `is_locked = true`.
- Yellow **Rejection alert** when `status = 'rejected'`.
- Orange **Overdue ETA alert** when `expected_delivery < today AND status NOT IN [draft, rejected, expired]`.

**Version history:** collapsible section, newest-first, shows `changed_by`, `change_notes`, `changed_at`.

#### 3.2.3 Quotation edit

| Field | Value |
|---|---|
| Route | `/quotations/[id]/edit` |
| File | `Frontend/src/app/(dashboard)/quotations/[id]/edit/page.tsx` |
| Permission | `sales:quotations:edit` |

- Loads quotation via `getQuotationById(id)`.
- If `is_locked = true`, shows full-screen lock notice with "View Quotation" / "View Purchase Order" buttons; form blocked.
- Otherwise renders `<QuotationBuilder initialData submitText="Save Changes" isEdit />`.
- Save → `PUT /quotations/:id` → invalidates `['quotation', id]` and `['quotations']` → routes back to detail.
- If status was `rejected`, save resets it to `draft` (service line ~334).

#### 3.2.4 Quotation create

| Field | Value |
|---|---|
| Route | `/quotations/create` |
| File | `Frontend/src/app/(dashboard)/quotations/create/page.tsx` |
| Permission | `sales:quotations:create` |

- Optional `?enquiryId=N` pre-fills customer fields from the enquiry.
- Title: "Create & Send Quotation for Enquiry #N" (linked) or "Create & Send Quotation" (standalone).
- Two submit buttons: **Create & Send to Customer** (`status='sent'`) and **Save as Draft** (`status='draft'`).

#### 3.2.5 QuotationBuilder component

| Field | Value |
|---|---|
| File | `Frontend/src/components/quotations/QuotationBuilder.tsx` |
| Reused by | Create page, Edit page, Drawer-mode flows |

**Sections:**

**A. Customer details (16-col grid)**

| Field | Type | Required | Validation |
|---|---|---|---|
| Existing customer selector | Select (multi) | No | Hidden when `initialEnquiryData` |
| Customer name | Text | Yes | min 1 char |
| Mobile | Text | Yes | Regex `^[6-9]\d{9}$` (Indian 10-digit). On blur (create only): `GET /quotations/check-mobile` → yellow warning if duplicate (non-blocking) |
| Email | Email | No | RFC email |
| Business name | Text | No | — |
| Billing address | TextArea | No | — |
| Shipping address | TextArea | No | — |

**B. Items (16-col grid)**

| Element | Notes |
|---|---|
| Product selector | Multi-select, searchable; shows product name + code + price |
| Add button | Validates: product selected, no duplicates (warns to update qty). Auto-applies tier discount for qty=1 |
| Items table | Columns: Product (name + SKU), HSN, Qty, Unit Price, Discount %, Tax %, Total |

Item-row behaviour:
- **Qty:** `InputNumber` min=1 max=999999. `onKeyDown` blocks 7+ digits. Tier-hint helper text: "Add 5 more → 10% off".
- **Discount %:** `InputNumber` 0–99. Red error if exceeds tier max for current qty (blocks submit). Blue help text if below tier max.
- **Tax %:** Defaults to 18 (GST); typically 5 / 12 / 18.
- **Delete:** removes row.

Totals are derived (see `calculateTotals` in section 3.2.6).

**C. Quotation metadata (right sidebar, 8-col)**

| Field | Type | Required | Validation |
|---|---|---|---|
| Quotation date | DatePicker | Yes | Disables dates < today |
| Valid until | DatePicker | No | Disables dates < quotation date |
| Expected delivery | DatePicker | No | Disables dates < today |
| Status | Select | No | `Draft` / `Sent`. Hidden in drawer mode |
| Notes | TextArea | No | — |
| Terms & conditions | TextArea | No | — |

#### 3.2.6 Calculation rules

```text
Per item:
  itemSubtotal   = qty × unit_price
  discountAmount = itemSubtotal × (discount_percent / 100)
  afterDiscount  = itemSubtotal − discountAmount
  taxAmount      = afterDiscount × (tax_percent / 100)
  lineTotal      = afterDiscount + taxAmount

Quotation totals:
  subTotal       = Σ afterDiscount
  taxAmount      = Σ item.taxAmount
  discountAmount = Σ (itemSubtotal − afterDiscount) + header-level discount
  grandTotal     = subTotal − headerDiscount + taxAmount + shippingCharges
```

Reference: `quotations.service.ts → calculateTotals()`.

#### 3.2.7 Volume discount tiers

- Stored on `Product.discount_tiers` as `jsonb`: `Array<{ minQty, discountPercent }>`.
- **Front-end authoritative** — backend does NOT enforce tiers; it stores whatever `discount_percent` the client sends.
- Auto-apply rules (in `QuotationBuilder`):
  1. On product add → applies tier matching qty=1.
  2. On qty change → applies the highest tier with `minQty ≤ qty`.
  3. User can manually override.
  4. Submit blocked if `discount_percent > tier max` for current qty.

---

### 3.3 Other screens — inventory (stub)

> Each row below is a stub. Detail blocks (purpose, UI elements, buttons, validations, edge cases) to be filled on request.

| Route | File | One-line purpose |
|---|---|---|
| `/dashboard` | `(dashboard)/dashboard/page.tsx` | Tenant home + KPI cards |
| `/analytics` | `(dashboard)/analytics/page.tsx` | Charts + business analytics |
| `/crm` | `(dashboard)/crm/page.tsx` | Lead-pipeline list view |
| `/crm/add` | `(dashboard)/crm/add/page.tsx` | Create new lead |
| `/crm/[id]` | `(dashboard)/crm/[id]/page.tsx` | Lead profile, activity, follow-ups |
| `/crm/follow-ups` | `(dashboard)/crm/follow-ups/page.tsx` | Scheduled follow-ups list |
| `/crm/team` | `(dashboard)/crm/team/page.tsx` | Team-wise lead distribution |
| `/crm/reports` | `(dashboard)/crm/reports/page.tsx` | CRM analytics |
| `/customers` | `(dashboard)/customers/page.tsx` | Customer master list |
| `/customers/add` | `(dashboard)/customers/add/page.tsx` | Add customer |
| `/customers/[id]` | `(dashboard)/customers/[id]/page.tsx` | Customer profile (orders, invoices, history) |
| `/enquiries` | `(dashboard)/enquiries/page.tsx` | Enquiry/lead list |
| `/enquiries/add` | `(dashboard)/enquiries/add/page.tsx` | Log new enquiry |
| `/enquiries/[id]` | `(dashboard)/enquiries/[id]/page.tsx` | Enquiry detail with quote-conversion CTA |
| `/sales-orders` | `(dashboard)/sales-orders/page.tsx` | Sales-order list (UI label: Purchase Orders) |
| `/sales-orders/[id]` | `(dashboard)/sales-orders/[id]/page.tsx` | Sales-order detail with line items, shipments |
| `/purchase-orders` | `(dashboard)/purchase-orders/page.tsx` | Buyer-side PO list |
| `/purchase-orders/[id]` | `(dashboard)/purchase-orders/[id]/page.tsx` | PO detail with GRN linkage |
| `/invoices` | `(dashboard)/invoices/page.tsx` | Invoice list |
| `/invoices/add` | `(dashboard)/invoices/add/page.tsx` | Create invoice |
| `/invoices/[id]` | `(dashboard)/invoices/[id]/page.tsx` | Invoice detail + payments |
| `/proforma-invoices` | `(dashboard)/proforma-invoices/page.tsx` | Proforma list |
| `/proforma-invoices/[id]` | `(dashboard)/proforma-invoices/[id]/page.tsx` | Proforma detail |
| `/procurement/suppliers` | `(dashboard)/procurement/suppliers/page.tsx` | Supplier master |
| `/procurement/indents` | `(dashboard)/procurement/indents/page.tsx` | Material indents |
| `/procurement/purchase-orders` | `(dashboard)/procurement/purchase-orders/page.tsx` | Procurement PO list |
| `/procurement/rfq-quotations` | `(dashboard)/procurement/rfq-quotations/page.tsx` | RFQ tracking |
| `/inventory` | `(dashboard)/inventory/page.tsx` | Stock list |
| `/inventory/add` | `(dashboard)/inventory/add/page.tsx` | Add stock |
| `/inventory/goods-receipts` | `(dashboard)/inventory/goods-receipts/page.tsx` | GRN log |
| `/inventory/ledger` | `(dashboard)/inventory/ledger/page.tsx` | Stock ledger / movements |
| `/material-requests` | `(dashboard)/material-requests/page.tsx` | Material request list |
| `/material-requests/[id]` | `(dashboard)/material-requests/[id]/page.tsx` | MR detail with issue tracking |
| `/products` | `(dashboard)/products/page.tsx` | Product catalog |
| `/products/add` | `(dashboard)/products/add/page.tsx` | Add product (incl. discount tiers) |
| `/products/[id]` | `(dashboard)/products/[id]/page.tsx` | Product detail |
| `/products/categories` | `(dashboard)/products/categories/page.tsx` | Categories CRUD |
| `/products/subcategories` | `(dashboard)/products/subcategories/page.tsx` | Subcategories CRUD |
| `/manufacturing` | `(dashboard)/manufacturing/page.tsx` | Job-card list |
| `/manufacturing/create` | `(dashboard)/manufacturing/create/page.tsx` | Create job card |
| `/manufacturing/[id]` | `(dashboard)/manufacturing/[id]/page.tsx` | Job-card detail with stages, BOM, waste |
| `/manufacturing/po/[id]` | `(dashboard)/manufacturing/po/[id]/page.tsx` | Production-side PO with stage workflow |
| `/manufacturing/processes` | `(dashboard)/manufacturing/processes/page.tsx` | Process templates |
| `/manufacturing/stages` | `(dashboard)/manufacturing/stages/page.tsx` | Stage master |
| `/manufacture-status` | `(dashboard)/manufacture-status/page.tsx` | Cross-job status tracker |
| `/manufacture-status/dispatched` | `(dashboard)/manufacture-status/dispatched/page.tsx` | Dispatched-orders view |
| `/machinery` | `(dashboard)/machinery/page.tsx` | Machine registry |
| `/machinery/[id]` | `(dashboard)/machinery/[id]/page.tsx` | Machine detail |
| `/machinery/spare-parts` | `(dashboard)/machinery/spare-parts/page.tsx` | Spare-parts inventory |
| `/machinery/spare-map` | `(dashboard)/machinery/spare-map/page.tsx` | Machine ↔ spare mapping |
| `/maintenance-work-orders` | `(dashboard)/maintenance-work-orders/page.tsx` | Work-order list |
| `/maintenance-work-orders/[id]` | `(dashboard)/maintenance-work-orders/[id]/page.tsx` | Work-order detail |
| `/maintenance-reminders` | `(dashboard)/maintenance-reminders/page.tsx` | Preventive-maintenance rules |
| `/maintenance-vendors` | `(dashboard)/maintenance-vendors/page.tsx` | AMC vendors |
| `/service-products` | `(dashboard)/service-products/page.tsx` | Service catalog |
| `/service-products/add` | `(dashboard)/service-products/add/page.tsx` | Add service product |
| `/service-products/[id]` | `(dashboard)/service-products/[id]/page.tsx` | Service-product detail |
| `/service-bookings` | `(dashboard)/service-bookings/page.tsx` | Booking list |
| `/service-events` | `(dashboard)/service-events/page.tsx` | Event tracker |
| `/service-revenue` | `(dashboard)/service-revenue/page.tsx` | Service-revenue analytics |
| `/employees` | `(dashboard)/employees/page.tsx` | Staff registry |
| `/employees/add` | `(dashboard)/employees/add/page.tsx` | Add employee |
| `/employees/[id]` | `(dashboard)/employees/[id]/page.tsx` | Employee profile + permissions |
| `/employees/departments` | `(dashboard)/employees/departments/page.tsx` | Departments CRUD |
| `/employees/designations` | `(dashboard)/employees/designations/page.tsx` | Designations CRUD |
| `/employees/reporters` | `(dashboard)/employees/reporters/page.tsx` | Reporting hierarchy |
| `/tasks` | `(dashboard)/tasks/page.tsx` | Task list |
| `/tasks/add` | `(dashboard)/tasks/add/page.tsx` | Create task |
| `/tasks/[id]` | `(dashboard)/tasks/[id]/page.tsx` | Task detail / chat |
| `/team` | `(dashboard)/team/page.tsx` | Team view |
| `/team-updates` | `(dashboard)/team-updates/page.tsx` | Manager updates feed |
| `/organizer` | `(dashboard)/organizer/page.tsx` | Personal organizer |
| `/organizer/[id]` | `(dashboard)/organizer/[id]/page.tsx` | Organizer item detail |
| `/waste-inventory` | `(dashboard)/waste-inventory/page.tsx` | Production-waste read-only inventory |
| `/waste-disposal` | `(dashboard)/waste-disposal/page.tsx` | Waste-disposal transactions |
| `/waste-parties` | `(dashboard)/waste-parties/page.tsx` | Waste-vendor registry |
| `/waste-analytics` | `(dashboard)/waste-analytics/page.tsx` | Waste KPIs |
| `/settings/audit-logs` | `(dashboard)/settings/audit-logs/page.tsx` | Activity audit trail |
| `/settings/branding` | `(dashboard)/settings/branding/page.tsx` | Tenant branding |
| `/settings/print-template` | `(dashboard)/settings/print-template/page.tsx` | Print-layout config |
| `/settings/product-types` | `(dashboard)/settings/product-types/page.tsx` | Product-type config |
| `/settings/sources` | `(dashboard)/settings/sources/page.tsx` | Lead sources |
| `/settings/stage-master` | `(dashboard)/settings/stage-master/page.tsx` | Pipeline stages |
| `/settings/status` | `(dashboard)/settings/status/page.tsx` | Status taxonomy |
| `/settings/templates` | `(dashboard)/settings/templates/page.tsx` | Email-template library |
| `/settings/unit-master` | `(dashboard)/settings/unit-master/page.tsx` | UOM config |
| `/reports/customers` | `(dashboard)/reports/customers/page.tsx` | Customer report |
| `/reports/employees` | `(dashboard)/reports/employees/page.tsx` | Employee report |
| `/reports/enquiries` | `(dashboard)/reports/enquiries/page.tsx` | Enquiry report |
| `/reports/follow-ups` | `(dashboard)/reports/follow-ups/page.tsx` | Follow-up report |
| `/reports/prospects` | `(dashboard)/reports/prospects/page.tsx` | Prospect report |
| `/reseller/dashboard` | `reseller/(panel)/dashboard/page.tsx` | Reseller KPI |
| `/reseller/profile` | `reseller/(panel)/profile/page.tsx` | Reseller profile |
| `/reseller/wallet` | `reseller/(panel)/wallet/page.tsx` | Credit wallet |
| `/reseller/billing` | `reseller/(panel)/billing/page.tsx` | Invoice history |
| `/reseller/subscriptions` | `reseller/(panel)/subscriptions/page.tsx` | Reseller subscription list |
| `/reseller/my-subscription` | `reseller/(panel)/my-subscription/page.tsx` | Current plan |
| `/reseller/plans` | `reseller/(panel)/plans/page.tsx` | Available plans |
| `/reseller/tenants` | `reseller/(panel)/tenants/page.tsx` | Customer accounts |
| `/reseller/usage` | `reseller/(panel)/usage/page.tsx` | Usage metrics |
| `/reseller/commissions` | `reseller/(panel)/commissions/page.tsx` | Commission tracking |
| `/reseller/reports` | `reseller/(panel)/reports/page.tsx` | Reseller analytics |
| `/superadmin/dashboard` | `superadmin/(panel)/dashboard/page.tsx` | Platform KPI |
| `/superadmin/enterprises` | `superadmin/(panel)/enterprises/page.tsx` | Tenant management |
| `/superadmin/enterprises/[id]` | `superadmin/(panel)/enterprises/[id]/page.tsx` | Tenant detail |
| `/superadmin/resellers` | `superadmin/(panel)/resellers/page.tsx` | Reseller account list |
| `/superadmin/resellers/[id]` | `superadmin/(panel)/resellers/[id]/page.tsx` | Reseller detail |
| `/superadmin/resellers/plans` | `superadmin/(panel)/resellers/plans/page.tsx` | Reseller plan config |
| `/superadmin/resellers/subscriptions` | `superadmin/(panel)/resellers/subscriptions/page.tsx` | Reseller subscription admin |
| `/superadmin/resellers/wallets` | `superadmin/(panel)/resellers/wallets/page.tsx` | Reseller wallet admin |
| `/superadmin/accounts` | `superadmin/(panel)/accounts/page.tsx` | Account admin |
| `/superadmin/coupons` | `superadmin/(panel)/coupons/page.tsx` | Coupon CRUD |
| `/superadmin/subscriptions` | `superadmin/(panel)/subscriptions/page.tsx` | Subscription/plan config |
| `/superadmin/services` | `superadmin/(panel)/services/page.tsx` | Service master |
| `/superadmin/employees` | `superadmin/(panel)/employees/page.tsx` | Platform staff |
| `/superadmin/support` | `superadmin/(panel)/support/page.tsx` | Support tickets |
| `/print/quotation/[id]` | `print/quotation/[id]/page.tsx` | Quote print/PDF layout |
| `/print/invoice/[id]` | `print/invoice/[id]/page.tsx` | Invoice print/PDF |
| `/print/proforma-invoice/[id]` | `print/proforma-invoice/[id]/page.tsx` | Proforma print/PDF |
| `/print/payment/[id]` | `print/payment/[id]/page.tsx` | Payment receipt |
| `/print/enquiry/[id]` | `print/enquiry/[id]/page.tsx` | Enquiry print |

---

## 4. Button-Level Functionality

### 4.1 Authentication module — buttons

#### Login page — Employee tab

| Button | Action | Endpoint | Request DTO | Success | Errors / edge cases |
|---|---|---|---|---|---|
| **Sign In** | `handleSubmit(onSubmit)` | `POST /auth/employee/login` | `{ email, password }` | Stores `data.token`, `data.user`, `data.permissions` in `authStore`; toast "Login successful!"; routes to `/dashboard` | 401 invalid creds → "Invalid email or password" / 401 inactive employee → "Your account is inactive" / 401 inactive enterprise → "Your enterprise account is inactive" / 401 multi-match → "This email is registered with more than one business. Please contact your admin." / network → "Login failed. Please try again." |

#### Login page — Enterprise tab (Step 1: email)

| Button | Action | Endpoint | Request DTO | Success | Errors / edge cases |
|---|---|---|---|---|---|
| **Continue** | `handleEmailSubmit` | `POST /auth/enterprise/verify-email` | `{ email }` | Stores branding + advances to step 2; toast "OTP sent to your email." | 401 not found → "Enterprise not found" / 401 blocked → "Your enterprise account is blocked" |

#### Login page — Enterprise tab (Step 2a: OTP)

| Button | Action | Endpoint | Request DTO | Success | Errors / edge cases |
|---|---|---|---|---|---|
| **Sign In** (OTP) | `handleOtpSubmit` | `POST /auth/enterprise/verify-otp` | `{ email, otp }` | Stores token + full permissions; auto-activates `status='pending'` enterprises; routes to `/dashboard` if subscription active else `/activate` | 400 → "Invalid OTP" / 400 no OTP → "No OTP was requested. Please verify your email first." |
| **Resend OTP** | re-call step 1 | `POST /auth/enterprise/verify-email` | `{ email }` | toast "OTP resent" | toast "Failed to resend OTP" |
| **Login with Password** | client toggle to step 2b | — | — | Form switches to password input | — |
| **Back** | reset to step 1 | — | — | Clears verified email | — |

#### Login page — Enterprise tab (Step 2b: password)

| Button | Action | Endpoint | Request DTO | Success | Errors / edge cases |
|---|---|---|---|---|---|
| **Sign In** (password) | `handlePasswordSubmit` | `POST /auth/enterprise/login` | `{ email, password }` | Same as OTP success | 401 invalid → "Invalid email or password" / 401 blocked → "Your enterprise account is blocked" / 401 locked → "Your enterprise account is locked" |
| **Login with OTP** | re-send OTP + toggle | `POST /auth/enterprise/verify-email` | `{ email }` | Form switches back to OTP | toast "Failed to send OTP" |

#### Register page

| Button | Action | Endpoint | Request DTO | Success | Errors / edge cases |
|---|---|---|---|---|---|
| **Register Business** | `handleSubmit(onSubmit)` | `POST /auth/register` | `RegisterEnterpriseDto` (see 3.1.2) | Stores `{email, mobile}` in `sessionStorage.pendingVerification`; if `tempPassword` present, toast it for 10 s; routes to `/verify-otp` | 409 → "Email already registered" / 400 → field-specific error message / network → generic |

#### OTP verification page

| Button | Action | Endpoint | Request DTO | Success | Errors |
|---|---|---|---|---|---|
| **Verify Email** (step 1) | `handleEmailVerify` | `POST /auth/enterprise/verify-email` | `{ email_id, otp }` | toast "Email verified successfully!"; advances step | 400 → "Invalid OTP" |
| **Resend OTP** (step 1) | re-call | `POST /auth/enterprise/verify-email` | `{ email_id }` | toast "OTP resent successfully!" | network error toast |
| **Verify Mobile** (step 2) | `handleMobileVerify` | `POST /auth/enterprise/verify-mobile` | `{ mobile_number, otp }` | toast "Mobile verified successfully!"; advances to "Done"; clears `sessionStorage`; redirects `/login` after 2 s | 400 → "Invalid OTP" |
| **Resend OTP** (step 2) | re-call | `POST /auth/enterprise/verify-mobile` | `{ mobile_number }` | toast "OTP resent successfully!" | network error toast |

#### Forgot password page

| Button | Action | Endpoint | Request DTO | Success | Errors |
|---|---|---|---|---|---|
| **Reset Password** | `handleSubmit(onSubmit)` | `POST /auth/reset-password` | `{ emailId, oldpassword, confirmpassword }` | Replaces form with success screen + "Go to Login" CTA | 401 not found → "Account not found with this email" / 401 wrong old pwd → "Current password is incorrect" / 400 validation → field-specific |
| **Go to Login** | router push | — | — | Navigates `/login` | — |
| **Back to Login** | link | — | — | Navigates `/login` | — |

#### Reseller login

| Button | Action | Endpoint | Request DTO | Success | Errors |
|---|---|---|---|---|---|
| **Sign In** | `onFinish` | `POST /resellers/login` | `{ email, password }` | Stores token in `resellerStore`; routes `/reseller/dashboard` | 401 → "Invalid credentials" |
| **Auto Fill Credentials** | client | — | — | Fills demo creds (`rajesh@techresell.in / Reseller@123`) | — |

#### Super-admin login

| Button | Action | Endpoint | Request DTO | Success | Errors |
|---|---|---|---|---|---|
| **Sign In** | `onFinish` | `POST /super-admin/login` | `{ email, password }` | Stores token in `superAdminStore`; routes `/superadmin/dashboard` | 401 → "Invalid credentials" |
| **Auto Fill Credentials** | client | — | — | Fills demo creds (`admin@vabinformatics.com / admin1234`) | — |

### 4.2 Quotations module — buttons

#### Quotation list

| Button | Where | Action | Endpoint | Notes |
|---|---|---|---|---|
| **Search** | Filter bar | Trigger refetch with current filters | `GET /quotations?search&status&fromDate&toDate&page&limit` | — |
| **Clear** | Filter bar | Reset filters + page=1 | — | — |
| **Export → CSV / Excel / PDF** | Top-right | Client-side from current page; PDF via `/print/quotation/all` (browser print) | — | Hidden when no rows |
| **Create Quotation** | Top-right | Route → `/quotations/create` | — | Hidden unless `sales:quotations:create` |
| **Row → View** | Action menu | Route → `/quotations/[id]` | — | — |
| **Row → Edit** | Action menu | Route → `/quotations/[id]/edit` | — | Hidden if `is_locked` |
| **Row → Download PDF** | Action menu | Open `/print/quotation/{id}?pdf=1` | — | New tab |
| **Row → Mark as Sent** | Action menu | mutate | `PUT /quotations/{id}/status` `{ status:'sent' }` | Draft only + can edit |
| **Row → Transfer to PO** | Action menu | mutate (with confirm) | `POST /quotations/{id}/accept` | Draft/sent + can edit; locks quotation |
| **Row → Status Change → \*** | Action menu | mutate | `PUT /quotations/{id}/status` | Available statuses depend on current |
| **Row → Delete** | Action menu | confirm + mutate | `DELETE /quotations/{id}` | Draft only + delete permission |

#### Quotation detail

| Button | Trigger | Endpoint | Request | Success | Errors / edge cases |
|---|---|---|---|---|---|
| **Back** | header | — | — | Routes `/quotations` | — |
| **Print** | toolbar | — | — | Opens `/print/quotation/{id}` (HTML, browser print) | — |
| **Download PDF** | toolbar | — | — | Opens `/print/quotation/{id}?pdf=1` | — |
| **Send Email** | toolbar | (modal) `POST /quotations/{id}/send-email` | `{ recipient, subject, body }` | toast "Email sent" | 400 if no `customer_email` → toast "Customer email not available" |
| **Mark as Sent** | toolbar (draft only) | `PUT /quotations/{id}/status` | `{ status:'sent' }` | Refresh + toast | — |
| **Edit** | toolbar (not locked) | — | — | Routes `/quotations/{id}/edit` | — |
| **Reject** | toolbar (`[draft, sent]`) | `PUT /quotations/{id}/status` | `{ status:'rejected', rejectionReason? }` | Linked enquiry → status "Follow Up"; refresh; alert shown | — |
| **Close Sale & Transfer to PO** | toolbar (`[draft, sent]`) | `POST /quotations/{id}/accept` | `{}` | Creates SalesOrder; locks quotation; success modal with "Go to PO" / "Stay" | toast "Failed to accept quotation" |
| **View Purchase Order** | toolbar (locked + `sales_order_id`) | — | — | Routes `/purchase-orders/{sales_order_id}` | — |
| **Set ETA** (modal) | right pane | `PATCH /quotations/{id}/eta` | `{ expectedDelivery:'YYYY-MM-DD' }` | refresh | DatePicker disables dates < today |

#### QuotationBuilder — submit buttons

| Button | Mode | Action | Endpoint | Body |
|---|---|---|---|---|
| **Create & Send to Customer** | Create | mutate | `POST /quotations` | `{ ...header, items, status:'sent' }` |
| **Save as Draft** | Create | mutate | `POST /quotations` | `{ ...header, items, status:'draft' }` |
| **Save Changes** | Edit | mutate | `PUT /quotations/{id}` | `{ ...header, items }` (status preserved unless was rejected → reset to draft server-side) |
| **Cancel** | Both | navigate or `onCancel()` | — | — |

#### QuotationBuilder — items table

| Button | Action | Notes |
|---|---|---|
| **Add product** | Adds selected products to items array | Blocks duplicates; auto-applies tier discount for qty=1 |
| **Delete row** | Removes item | — |

---

## 5. Navigation Flow

### 5.1 Authentication

```text
                    ┌───────────────┐
                    │ /             │  ← lands here unauthenticated
                    └──────┬────────┘
                           ▼
                    /login (tabs)
        ┌──────────────┴───────────────┐
        ▼                              ▼
  Employee tab                  Enterprise tab
        │                              │
        │ Sign In                      │ Continue (email)
        ▼                              ▼
  Token stored                  OTP sent → step 2
        │                              │
        │                       Sign In OTP / password
        │                              │
        ▼                              ▼
   /dashboard                /dashboard (or /activate
                                if subscription inactive)

  Forgot password?  → /forgot-password → success → /login
  Register?         → /register → /verify-otp → /login
```

### 5.2 Quotation lifecycle

```text
/quotations
  ├── Create → /quotations/create → POST /quotations
  │                                  ├─ status='draft' → returns to /quotations
  │                                  └─ status='sent'  → returns to /quotations
  │
  ├── Row click → /quotations/:id (detail)
  │     ├── Edit (if !locked) → /quotations/:id/edit → PUT → /quotations/:id
  │     ├── Mark as Sent (draft) → PUT /:id/status
  │     ├── Reject → PUT /:id/status (rejected) → alert; if enquiry linked → "Follow Up"
  │     ├── Close Sale & Transfer to PO → POST /:id/accept → creates SalesOrder
  │     │     → success modal → "View PO" → /purchase-orders/{soId}
  │     │     → quotation now locked
  │     ├── Send Email → modal → POST /:id/send-email
  │     ├── Print / Download PDF → /print/quotation/:id (?pdf=1)
  │     └── Set ETA → PATCH /:id/eta
  │
  └── If status=accepted (locked):
        Edit replaced by "View Purchase Order"
```

### 5.3 Conditions for navigation

| Condition | Behaviour |
|---|---|
| Unauthenticated visit to `/(dashboard)/*` | `(dashboard)/layout.tsx` redirects to `/login` |
| Unauthenticated visit to `/superadmin/*` (other than `/login`) | redirect to `/superadmin/login` |
| Unauthenticated visit to `/reseller/*` (other than `/login`, `/activate`) | redirect to `/reseller/login` |
| `enterprise` user without active subscription on `/dashboard` | redirect to `/activate` |
| `employee` lacking `view` on a module → sidebar item hidden, direct URL → blank page or 403 |  |

---

## 6. End-to-End User Flows

### 6.1 Enterprise registration → first login

1. Visitor opens `/register`.
2. Fills `RegisterEnterpriseDto` form → **Register Business**.
3. `POST /auth/register` → server creates `Enterprise (status='active')`, generates temp password, sends email + SMS OTPs.
4. Server response stored in `sessionStorage.pendingVerification = { email, mobile }`; user redirected to `/verify-otp`.
5. Step 1 — enter 6-digit email OTP → **Verify Email** → `POST /auth/enterprise/verify-email`.
6. Step 2 — enter 4-digit mobile OTP → **Verify Mobile** → `POST /auth/enterprise/verify-mobile`.
7. Step 3 — success screen → auto-redirect to `/login` after 2 s.
8. User goes to `/login` → Enterprise tab → enters email → **Continue** → OTP delivered.
9. Enters OTP → **Sign In** → token stored, redirected to `/dashboard` (or `/activate` if no subscription).

### 6.2 Employee login

1. Open `/login` → Employee tab.
2. Enter email + password → **Sign In** (`POST /auth/employee/login`).
3. Token + permissions stored; redirected to `/dashboard`.
4. Sidebar items render based on `MenuPermission` matrix (FE) + each request validated by `PermissionGuard` (BE).

### 6.3 Logout

1. User clicks "Logout" (sidebar).
2. Front-end calls `POST /auth/logout` (clears `access_token` cookie).
3. `authStore.logout()` clears token / user / permissions.
4. Redirect to `/login`.

### 6.4 Quotation creation (from enquiry)

1. CRM user opens enquiry detail at `/enquiries/:id`.
2. Clicks "Create Quotation" → routes to `/quotations/create?enquiryId=:id`.
3. Builder pre-fills customer fields (name, mobile, email, address) from enquiry.
4. User adds line items → tiers auto-apply → totals recompute.
5. **Create & Send to Customer** → `POST /quotations` with `status='sent'`.
6. Server: generates `quotation_number = QTN-XXXXXX`, calculates totals, saves quotation + items in transaction; updates linked enquiry to `Quotation Sent`; logs audit event.
7. Front-end invalidates `['quotations']` and enquiry queries; routes back to `/quotations`.

### 6.5 Quotation acceptance → PO conversion

1. Sales user opens `/quotations/:id` for a `sent` quotation.
2. Clicks **Close Sale & Transfer to PO** → confirmation modal showing grand total.
3. On confirm → `POST /quotations/:id/accept`.
4. Server (transactional):
   - Creates `SalesOrder` with all items; `order_number = PR-XXXX`.
   - Sets `quotation.is_locked = true`, `status='accepted'`, `sales_order_id = SO.id`.
   - If enquiry linked: looks up customer by mobile, creates one if missing, sets `enquiry.convertedCustomerId`, marks enquiry `Sale Closed`.
   - Logs audit; pushes "Quotation Converted to Purchase Order" notification.
5. Success modal offers "Go to PO" → `/purchase-orders/{salesOrderId}` or "Stay" on detail.

### 6.6 Quotation rejection

1. User opens `/quotations/:id` (`[draft, sent]`).
2. Clicks **Reject** → modal with optional `rejectionReason` text area.
3. On confirm → `PUT /quotations/:id/status` with `{ status:'rejected', rejectionReason }`.
4. Server stores reason as `change_notes = "[REJECTED] {reason}"`; if enquiry linked, moves it to `Follow Up`.
5. Detail page renders yellow rejection alert with "Revise" (→ edit page; resets to draft on save) and "Schedule Follow-up" (if enquiry linked) CTAs.

### 6.7 Production-waste capture (read-only inventory)

> Detail outline; per-button table to be filled when this module is fully written up.

1. Operator completes a production stage on a job card at `/manufacturing/po/:id`.
2. Job-card stage submission calls `recordProductionWaste({ jobCardId, rawMaterialId, quantity, unit, consumedQuantity, notes })`.
3. Front-end `recordProductionWaste()` → `POST /waste-inventory/production-waste`.
4. Server aggregates by `(enterprise, raw_material, category)`: finds existing `available` row or creates one; appends a `WasteInventoryLog { action:'generated', referenceType:'job_card', referenceId:jobCardId, ... }`.
5. `/waste-inventory` lists the aggregate row; clicking **View logs** opens an audit-trail modal showing every contributing job card → PO → customer.

---

## 7. Validation Rules

### 7.1 Field-level validations (centralised)

`Frontend/src/lib/validations/shared.ts` exports the canonical validation rules. **Note:** this file is referenced from `QuotationBuilder.tsx`, `EnquiryForm.tsx`, `LeadForm.tsx`, settings, etc. CI build will fail if it is not committed to the branch under test.

| Constant | Pattern | Error message |
|---|---|---|
| `MOBILE_RULE` | `^[6-9]\d{9}$` | "Enter a valid 10-digit Indian mobile (must start with 6-9)" |
| `PINCODE_RULE` | `^\d{6}$` | "Enter a valid 6-digit pincode" |
| `GSTIN_RULE` / `GSTIN_REGEX` | GSTIN format regex | "Enter a valid GSTIN (15 chars)" |

### 7.2 Common field-type rules

| Field | Rule | Message |
|---|---|---|
| Email | RFC 5322 (Ant Design `type:'email'`) | "Enter a valid email address" |
| Password | min 6 chars | "Password must be at least 6 characters" |
| OTP (email) | exactly 6 digits | "Enter the 6-digit OTP" |
| OTP (mobile) | exactly 4 digits | "Enter the 4-digit OTP" |
| Required text | trim length ≥ 1 | "{Label} is required" |
| Quantity | integer ≥ 1, ≤ 999 999 | "Quantity must be between 1 and 999999" |
| Discount % | 0–99 | "Discount cannot exceed tier max ({tierMax}%)" — tier-specific |
| Tax % | 0–100 (typically 5/12/18) | "Tax % must be between 0 and 100" |

### 7.3 Quotation-specific

- At least 1 line item required (modal error if 0).
- Line discount ≤ tier max (frontend-enforced).
- `valid_until ≥ quotation_date`.
- `expected_delivery ≥ today` on input (existing past dates are read-only and trigger "Overdue ETA" banner).
- Mobile uniqueness warned (yellow, non-blocking) on create only.

### 7.4 Auth-specific

- Enterprise email must be globally unique (server 409 on duplicate).
- Employee email is unique **per enterprise** — if two enterprises share an email, login must surface the multi-match message (see 4.1 errors).
- Pincode min 6 chars per `RegisterEnterpriseDto` (DTO uses `MinLength(6)`).

---

## 8. State Handling

### 8.1 Loading states

| Surface | Implementation |
|---|---|
| Form submit | Submit button shows spinner + `disabled={isPending}`; all inputs disabled |
| Table fetch | Ant `Table loading={isFetching}`; skeleton placeholder rows |
| Detail page | Top-of-page spinner; empty cards until data arrives |
| Mutations | TanStack Query `useMutation.isPending` controls button spinner |

### 8.2 Empty states

| Surface | Behaviour |
|---|---|
| Empty list | Ant Table empty illustration with optional CTA (e.g., "Create your first quotation") |
| Empty filter result | Same illustration + "Clear filters" hint |
| Empty audit-trail modal | "No log entries yet." centered text |

### 8.3 Error states

| Source | Behaviour |
|---|---|
| Network / 5xx | `message.error` toast with response message or generic fallback |
| 401 in non-auth route | `apiClient` interceptor clears `authStore` and redirects to `/login` |
| 403 (permission) | toast "You don't have permission to perform this action" |
| Validation 400 | field-level errors displayed under each input via Ant `Form.Item` `validateStatus` |
| Locked-quote edit attempt | Full-screen lock notice with "View Quotation" / "View PO" CTAs |
| PO cancelled post-acceptance | Red banner on quotation detail with cancelled PO number |

### 8.4 Success states

| Source | Behaviour |
|---|---|
| Form submit | `message.success` toast + invalidate relevant queries + optional redirect |
| Status change | toast + table refresh |
| Email sent | toast "Email sent" |
| Password reset | full-screen success card with "Go to Login" |

---

## 9. Permissions & Role-Based Access

### 9.1 Role × top-level module visibility

| Module | Enterprise | Employee | Reseller | Super Admin |
|---|---|---|---|---|
| Dashboard | ✅ | ✅ (perm-gated) | — | ✅ (own panel) |
| CRM | ✅ | ⚙ `crm:*` | — | — |
| Sales (customers, quotations) | ✅ | ⚙ `sales:*` | — | — |
| Enquiries | ✅ | ⚙ `enquiry:*` | — | — |
| Orders / PO / SO / BOM / Job Cards | ✅ | ⚙ `orders:*` | — | — |
| Catalog (products / categories) | ✅ | ⚙ `catalog:*` | — | — |
| Inventory / GRN / MR | ✅ | ⚙ `inventory:*` | — | — |
| Procurement / RFQ / Indents / Suppliers | ✅ | ⚙ `procurement:*` | — | — |
| Invoicing / Payments | ✅ | ⚙ `invoicing:*` | — | — |
| Employees / Departments | ✅ | ⚙ `employees:*` | — | — |
| Reports | ✅ | ⚙ `reports:*` | — | — |
| Configurations / Settings | ✅ | ⚙ `configurations:*` | — | — |
| Tasks / Organizer / Team | ✅ | ⚙ per-module | — | — |
| Service management | ✅ | ⚙ `service_management:*` | — | — |
| Machinery management | ✅ | ⚙ `machinery_management:*` | — | — |
| Waste management | ✅ | ⚙ `waste_management:*` | — | — |
| Reseller portal | — | — | ✅ | — |
| Super-admin panel (tenants, plans, coupons, services, support) | — | — | — | ✅ |

Legend: ✅ full / ⚙ permission-gated / — not visible.

### 9.2 Restricted actions

| Action | Allowed roles | Notes |
|---|---|---|
| Edit quotation | enterprise + employee with `sales:quotations:edit` | Blocked when `is_locked=true` |
| Delete quotation | enterprise + employee with `sales:quotations:delete` | UI gate: draft-only; backend allows any non-locked status |
| Create employee / set permissions | enterprise only | Employees cannot edit their own permissions |
| Create enterprise / reseller | super-admin only | |
| Issue coupon | super-admin only | |
| Manage tenant subscriptions | super-admin or reseller (for own tenants) | |
| Fetch full tenant data | enterprise (own tenant) / employee (with `dataStartDate`/`ownDataOnly` filters) | enforced in service layer |

### 9.3 Data-scope rules (employee)

| Filter | Effect |
|---|---|
| `dataStartDate` | Employee can only view records where `created_date ≥ dataStartDate` |
| `ownDataOnly` | Employee can only view records where `created_by = currentUserId` (or assigned to them, depending on module) |
| `currentUserId` | Used by services to scope queries (e.g., assigned tasks, own quotations) |

---

## 10. Edge Cases & Failure Scenarios

### 10.1 Authentication

| Scenario | Behaviour |
|---|---|
| Invalid credentials | 401 `Invalid email or password` |
| Inactive employee | 401 `Your account is inactive` |
| Inactive enterprise | 401 `Your enterprise account is inactive` / `is blocked` / `is locked` |
| Same employee email across multiple enterprises | 401 `This email is registered with more than one business. Please contact your admin.` |
| Token expired | `apiClient` 401 → clear store → `/login` |
| OTP entered after expiry | 400 `Invalid OTP` (cleared on verify) |
| Rate-limit exceeded | 429 `Too many requests` (5–10 req/min on auth endpoints) |
| Multiple concurrent logins | Token re-issued; older device must re-login on next request (cookie invalidated) |
| Network failure during login | Toast "Login failed. Please try again." |

### 10.2 Quotations

| Scenario | Behaviour |
|---|---|
| Edit attempt on accepted (locked) quote | Full-screen "Quotation is Locked" notice; only View / View PO available |
| Mobile already exists on create | Yellow non-blocking warning showing existing quotation number + customer name |
| Discount > tier max | Submit blocked; field shows red error tooltip |
| No items | Submit blocked; modal shows "Products (add at least one item)" |
| Linked PO cancelled after acceptance | `po_cancelled_at` timestamp + `cancelled_po_number` stored; red banner on detail |
| Send Email with no `customer_email` | Toast "Customer email not available"; button stays enabled but blocks API call |
| Concurrent edit | `PUT /quotations/:id` uses pessimistic write lock; later writer sees DB error → toast error |
| Rejected quote re-saved | Server resets to `draft` on save (service line ~334) |
| `valid_until` in past | Quote still viewable; UI shows red text in list; status not auto-changed |
| Status race (e.g., Mark Sent then Accept simultaneously) | Last write wins; audit log captures both; transactional accept will fail if status not in `[draft, sent]` |

### 10.3 Cross-cutting

| Scenario | Behaviour |
|---|---|
| Direct URL access without permission | API returns 403; UI shows toast and stays on previous page |
| Direct URL to `/superadmin/*` as `enterprise` user | Redirected to `/login` (different layout group) |
| Stale permission cache | Client polls `GET /auth/permissions` periodically; new grants picked up without re-login |
| Duplicate form submission | Submit button disabled + spinner during `isPending` |
| Browser back after submit | Form re-rendered from initial defaults; mutation already completed server-side |
| Slow network | TanStack Query keeps last data on screen during refetch (`keepPreviousData`); skeleton states for first load |
| File upload size limit | Enforced server-side via `multer` config (out of scope here) |
| Audit log integrity | All write operations call `auditLogService.log(...)`; failures are async and do not block the user response |

---

## Appendix A — Auth API summary

| Endpoint | Method | Guard | Throttle | DTO in | Notes |
|---|---|---|---|---|---|
| `/auth/employee/login` | POST | — | 10/min | `EmployeeLoginDto` | Returns `{ token, user, permissions, type:'employee' }` |
| `/auth/enterprise/verify-email` | POST | — | — | `VerifyEnterpriseEmailDto` | Sends 6-digit OTP, returns branding |
| `/auth/enterprise/verify-otp` | POST | — | 5/min | `VerifyOtpDto` | Auto-activates pending; returns full permissions |
| `/auth/enterprise/login` | POST | — | 10/min | `EnterpriseLoginDto` | Password login fallback |
| `/auth/logout` | POST | — | — | — | Clears cookie |
| `/auth/register` | POST | — | — | `RegisterEnterpriseDto` | Generates temp password |
| `/auth/reset-password` | POST | — | 5/min | `ResetPasswordDto` | Tries enterprise first, then employee |
| `/auth/permissions` | GET | `JwtAuthGuard` | exempt | — | `{ data, dataStartDate }` |
| `/auth/me` | GET | `JwtAuthGuard` | exempt | — | Current user |
| `/auth/enterprise/status` | GET | `JwtAuthGuard` | — | — | `{ subscriptionStatus, expiryDate, planId, status }` |
| `/resellers/login` | POST | — | — | `ResellerLoginDto` | Returns reseller scope token |
| `/super-admin/login` | POST | — | — | `SuperAdminLoginDto` | Returns admin token |

## Appendix B — Quotations API summary

| Endpoint | Method | Permission | Notes |
|---|---|---|---|
| `/quotations` | GET | `sales:quotations:view` | List + filters + pagination + manager-hierarchy scoping |
| `/quotations/check-mobile` | GET | `sales:quotations:view` | `{exists, quotationNumber, customerName}` |
| `/quotations/:id` | GET | `sales:quotations:view` | Full detail incl. items + version history |
| `/quotations` | POST | `sales:quotations:create` | Auto-numbers; updates linked enquiry |
| `/quotations/:id/duplicate` | POST | `sales:quotations:create` | Copies header + items |
| `/quotations/:id` | PUT | `sales:quotations:edit` | Transactional; snapshots version |
| `/quotations/:id/eta` | PATCH | `sales:quotations:edit` | Sets `expected_delivery` |
| `/quotations/:id/status` | PUT | `sales:quotations:edit` | Generic status transition |
| `/quotations/:id/accept` | POST | `sales:quotations:edit` | Creates SalesOrder; locks quotation |
| `/quotations/:id` | DELETE | `sales:quotations:delete` | Cascade items + versions |

---

**Document version 0.1** — skeleton + Authentication + Quotations modules complete.
**Next modules to fill (suggested):** Manufacturing → Job cards & BOM, Sales Orders, Invoices, Customers, CRM Leads.
