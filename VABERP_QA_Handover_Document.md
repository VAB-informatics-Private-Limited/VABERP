# VABERP — QA Handover Document & Test Cases
**Version:** 1.0  
**Date:** 2026-04-07  
**Prepared by:** Veeranki.Girish  
**Platform:** VAB Enterprise ERP — Manufacturing Operations Platform  

---

---

# PART 1: Developer Handover Docummnt

---

## 1. Project Overview

| Field | Details |
|---|---|
| Product Name | VABERP — VAB Enterprise ERP |
| Platform | Web-based (Next.js 14 Frontend · NestJS Backend · PostgreSQL) |
| App URL | https://vaberp.com |
| API URL | http://64.235.43.187:2261 |
| Purpose | End-to-end manufacturing operations management |
| Primary Users | Admin, Manager, Employee |
| Core Workflow | RFQ → Quotation → Approval → Purchase Order → Invoice |
| Current Status | Active / In QA Handover |

### About the Platform

VABERP is a manufacturing ERP system that manages the full business cycle:

- **Sales side:** Customer enquiries, quotation generation (with version control), sales order creation
- **Procurement side:** Vendor RFQs, purchase orders, goods receipts
- **Operations side:** Job cards, production stage tracking, dispatch management
- **Finance side:** Invoice generation, payment recording, financial ledger
- **Administration:** Role-based access control (RBAC), employee hierarchy, settings management

---

## 2. User Roles & Permissions

### Role Hierarchy

```
Admin
  └── Manager A
  │     ├── Employee X
  │     └── Employee Y
  └── Manager B
        └── Employee Z
```

### Permission Matrix

| Permission | Admin | Manager | Employee |
|---|---|---|---|
| View ALL records (all users) | ✅ | ❌ | ❌ |
| View own team's records | ✅ | ✅ (own team only) | ❌ |
| View own assigned records | ✅ | ✅ | ✅ |
| Create RFQ | ✅ | ✅ | ✅ |
| Create Quotation | ✅ | ✅ | ✅ |
| Submit Quotation for Approval | ✅ | ✅ | ✅ |
| Approve / Reject Quotation | ✅ | ✅ | ❌ |
| Create Purchase Order | ✅ | ✅ | ❌ |
| Generate Invoice | ✅ | ✅ | ❌ |
| Record Payments | ✅ | ✅ | ❌ |
| Create Sales Orders | ✅ | ✅ | ✅ |
| Manage Users / Roles | ✅ | ❌ | ❌ |
| Access System Settings | ✅ | Limited | ❌ |
| View Reports | ✅ | ✅ (team only) | ❌ |

### Role Behavior Rules

- **Admin** has unrestricted visibility and action access across all modules and all users.
- **Manager** sees their own records AND all records belonging to their direct report employees. Cannot see other managers' team data.
- **Employee** sees only records that are directly assigned to them. Cannot view other employees' data.
- **Role assignment** is performed exclusively by Admin.
- **Hierarchy changes** (e.g., reassigning an employee to a new manager) take effect immediately.

---

## 3. Module Breakdown

### 3.1 RFQ — Request for Quotation

Allows the procurement team to request pricing from vendors for specific materials or services. An RFQ can be sent to multiple vendors. Once a vendor responds, the RFQ is converted into a formal Quotation.

**Key states:** Draft → Sent → Received → Converted

### 3.2 Quotation

The core commercial document used to present pricing to customers or internally track vendor pricing. Built with line items (product, qty, unit price, discount). Supports full version control — version number increments only when the user submits a **revision**, never on rejection alone.

**Key states:** Draft → Submitted → Approved | Rejected → Revised (new version)

**Critical rule:** Rejection must NOT increment the version. Only a user-initiated revision creates a new version.

### 3.3 Purchase Order (PO)

Generated from an Approved Quotation. Represents a formal commitment to a vendor. Tracks the full procurement lifecycle from order placement to goods receipt. Visibility is strictly controlled — employees see only POs assigned to them.

**Key states:** Draft → Ordered → Received → Invoiced

### 3.4 Invoice

Generated from a completed PO or Sales Order. Tracks the payment lifecycle. Supports partial and full payment recording. Once fully paid, invoice becomes read-only.

**Key states:** Unpaid → Partially Paid → Paid

### 3.5 Sales Module

Manages customer-facing orders from initial enquiry through production to delivery. Sales orders are linked to manufacturing job cards and dispatch records for full traceability.

**Key states:** New → In Progress → Dispatched → Completed | Cancelled

### 3.6 Employee & Role Management

Admin creates and manages user accounts, assigns roles (Admin / Manager / Employee), and sets the reporting structure (which employee reports to which manager). Changes to hierarchy are reflected immediately across all modules.

---

## 4. End-to-End Workflows

### Workflow 1: Procurement Flow (RFQ → PO → Invoice)

```
Step 1:  User raises RFQ → selects vendor, adds line items, submits
Step 2:  Vendor responds → RFQ status = Received
Step 3:  User converts RFQ to Quotation → Quotation v1 created, items pre-filled
Step 4:  User submits Quotation for approval → status = Submitted
Step 5a: [Manager/Admin rejects] → Status = Rejected, VERSION STAYS SAME
Step 5b: [User revises] → New version created (v1 → v2), resubmitted
Step 6:  Manager/Admin approves → Status = Approved
Step 7:  User creates Purchase Order from Approved Quotation
Step 8:  Goods received → PO status updated to Received
Step 9:  Invoice generated from PO → status = Unpaid
Step 10: Payment recorded → Partially Paid → Paid
```

### Workflow 2: Sales Flow (Enquiry → Sales Order → Invoice)

```
Step 1:  Customer enquiry captured in system
Step 2:  Quotation created for customer (with line items)
Step 3:  Quotation approved by Manager/Admin
Step 4:  Sales Order created from Approved Quotation
Step 5:  Job Card generated for manufacturing team
Step 6:  Production stages completed (tracked in system)
Step 7:  Goods dispatched → dispatch record created
Step 8:  Invoice raised to customer
Step 9:  Payment received → Invoice marked Paid
```

### Workflow 3: Quotation Version Control Flow

```
Create Quotation → v1 (Draft)
  └── Submit → v1 (Submitted)
        ├── Approved → v1 (Approved) [version stays 1]
        └── Rejected → v1 (Rejected) [version STAYS 1 — not incremented]
              └── User Revises → v2 (Draft)
                    └── Submit → v2 (Submitted)
                          ├── Approved → v2 (Approved)
                          └── Rejected → v2 (Rejected)
                                └── User Revises → v3 (Draft)
```

### Workflow 4: Manager Hierarchy Visibility

```
Admin logs in:
  → Sees ALL records from ALL users across ALL modules

Manager A logs in:
  → Sees own records + Employee X records + Employee Y records
  → Cannot see Employee Z records (under Manager B)

Manager B logs in:
  → Sees own records + Employee Z records
  → Cannot see Employee X or Employee Y records

Employee X logs in:
  → Sees only records assigned to Employee X
```

---

## 5. Feature Expectations

| Feature | Expected System Behavior |
|---|---|
| Quotation Version Control | Version increments ONLY when a user submits a revision. Rejection by approver must NEVER increment the version. |
| RFQ to Quotation Conversion | Converting an RFQ creates a Quotation at v1 with all line items, quantities, and vendor details pre-filled from the RFQ. |
| PO Creation Gate | A PO can only be created from a Quotation with status = Approved. Draft, Submitted, and Rejected quotations must not allow PO creation. |
| PO Visibility (Employee) | An employee sees ONLY the POs where they are explicitly set as the assigned owner. |
| PO Visibility (Manager) | A manager sees all POs belonging to themselves and all their direct report employees. |
| Invoice Auto-Population | When generating an invoice from a PO, the invoice amount must be pre-populated from the PO total — no manual entry required. |
| Invoice Status Flow | New invoice always starts as Unpaid. Partial payment → Partially Paid. Full payment → Paid. No reverse transitions. |
| Paid Invoice Lock | Once an invoice reaches Paid status, all fields become read-only. No further payment edits allowed. |
| Duplicate PO Prevention | Only one PO should be created per approved Quotation. System must block or warn on duplicate PO creation. |
| Duplicate Invoice Prevention | Only one Invoice per PO. Attempting to create a second invoice for the same PO must be blocked. |
| RBAC Enforcement | Employees accessing restricted pages/API endpoints must receive a clear access denied response (403 or redirect). Data must never be exposed regardless of URL manipulation. |
| Manager Cross-Visibility Block | A manager must never see records from another manager's team, even if they know the record ID and access via direct URL. |
| Discount Validation | Line item discount cannot be less than 0% or greater than 100%. |
| Quantity Validation | All quantity fields must be positive integers. Zero and negative values must be rejected. |
| Approved Quotation Edit Lock | An approved quotation cannot be directly edited. The user must initiate a "Revise" action which creates a new version. |

---

## 6. Known Issues / Current Bugs

| # | Module | Issue Description | Severity | Status |
|---|---|---|---|---|
| BUG-001 | Quotation | [PLACEHOLDER — e.g., Version increments on rejection instead of staying same] | High | Open |
| BUG-002 | Purchase Order | [PLACEHOLDER — e.g., Employee can view POs not assigned to them] | High | Open |
| BUG-003 | Invoice | [PLACEHOLDER — e.g., Invoice amount not auto-populated from PO total] | Medium | Open |
| BUG-004 | RBAC | [PLACEHOLDER — e.g., Manager can see data from other manager's team] | High | Open |
| BUG-005 | UI | [PLACEHOLDER — e.g., Double-click on submit creates duplicate records] | Medium | Open |
| BUG-006 | RFQ | [PLACEHOLDER — fill in during testing] | — | Open |
| BUG-007 | Quotation | [PLACEHOLDER — fill in during testing] | — | Open |
| BUG-008 | General | [PLACEHOLDER — fill in during testing] | — | Open |

> **QA Analyst Note:** Replace placeholders with actual defects found during testing. Log each defect with: module, steps to reproduce, expected vs actual result, severity, screenshot.

---

## 7. Test Environment Setup

| Parameter | Value |
|---|---|
| Application URL | http://64.235.43.187:2262 |
| API Base URL | http://64.235.43.187:2261 |
| Admin Credentials | Email: `[ADMIN_EMAIL]` · Password: `[ADMIN_PASSWORD]` |
| Manager A Credentials | Email: `[MANAGER_A_EMAIL]` · Password: `[PASSWORD]` |
| Manager B Credentials | Email: `[MANAGER_B_EMAIL]` · Password: `[PASSWORD]` |
| Employee X (under Mgr A) | Email: `[EMP_X_EMAIL]` · Password: `[PASSWORD]` |
| Employee Y (under Mgr A) | Email: `[EMP_Y_EMAIL]` · Password: `[PASSWORD]` |
| Employee Z (under Mgr B) | Email: `[EMP_Z_EMAIL]` · Password: `[PASSWORD]` |
| Recommended Browser | Google Chrome (latest) |
| Secondary Browsers | Firefox, Microsoft Edge |
| Postman Collection | Import API endpoints from `[POSTMAN_COLLECTION_LINK]` |
| Environment Variables | `BASE_URL = http://64.235.43.187:2261` |

### Pre-Test Checklist

- [ ] All 6 user accounts created and accessible
- [ ] Manager A has Employee X and Employee Y assigned
- [ ] Manager B has Employee Z assigned
- [ ] At least 3 vendors created in the system
- [ ] At least 3 customers created in the system
- [ ] At least 5 product/item records created
- [ ] Postman installed with environment configured
- [ ] Browser dev tools available for console error monitoring

---

## 8. Test Data Requirements

| Data Category | Minimum Required | Notes |
|---|---|---|
| User Accounts | 1 Admin, 2 Managers, 3 Employees | Employees split across 2 managers (2+1) |
| Vendors | 3 vendors | With name, contact, and address |
| Customers | 3 customers | With name and billing address |
| Products / Line Items | 5–10 products | With unit prices defined |
| RFQs | 5 RFQs | Mix of Draft, Sent, Received, Converted states |
| Quotations | 8 quotations | Mix of v1, v2, Draft, Submitted, Approved, Rejected |
| Purchase Orders | 4 POs | Assigned: 2 to Employee X, 1 to Employee Y, 1 to Employee Z |
| Invoices | 3 invoices | Mix of Unpaid, Partially Paid, Paid statuses |
| Sales Orders | 3 sales orders | Assigned to different employees |

### Data Setup Priority

1. Create users and assign hierarchy (Admin → do this first)
2. Create vendors and customers
3. Create product/item master data
4. Create base RFQs and Quotations in various states
5. Create POs and Invoices from existing approved quotations

---

## 9. API Testing (Postman)

### Setup

- Base URL: `http://64.235.43.187:2261`
- All endpoints require: `Authorization: Bearer <token>` header
- Obtain token via: `POST /auth/login` with `{ email, password }`
- Create 3 separate Postman environments: Admin, Manager, Employee (each with their own token)

### Key Endpoints to Test

| Method | Endpoint | What to Verify |
|---|---|---|
| POST | /auth/login | Role is returned in response. Token issued. |
| GET | /quotations | Admin = all, Manager = team, Employee = own only |
| POST | /quotations | Creates at v1. Returns quotation ID |
| PATCH | /quotations/:id/submit | Status → Submitted |
| PATCH | /quotations/:id/approve | Status → Approved. Version unchanged |
| PATCH | /quotations/:id/reject | Status → Rejected. **Version must NOT change** |
| PATCH | /quotations/:id/revise | Status → Draft. **Version must increment** |
| POST | /purchase-orders | Only Manager/Admin token should succeed |
| GET | /purchase-orders | Employee sees only assigned. Manager sees team |
| POST | /invoices | Blocked if PO not in Received state |
| PATCH | /invoices/:id/payment | Records payment, updates status correctly |
| GET | /rfq | Scoped by role correctly |
| POST | /rfq/:id/convert | Creates quotation with pre-filled items |

### API Test Scenarios

1. Call every endpoint with **no token** → expect 401
2. Call every Manager-only endpoint with **Employee token** → expect 403
3. Call every Admin-only endpoint with **Manager token** → expect 403
4. Call GET /quotations with Employee token → response must ONLY contain that employee's records
5. Reject a quotation via API → GET the same quotation → confirm version field unchanged
6. Revise a quotation via API → GET the same quotation → confirm version incremented

---

## 10. QA Scope

### In Scope

- ✅ Functional testing of all 6 modules (RFQ, Quotation, PO, Invoice, Sales, Employee Mgmt)
- ✅ Role-based access control — all 3 roles tested independently
- ✅ Manager hierarchy visibility — cross-team data isolation verified
- ✅ Quotation version control logic (rejection vs revision behavior)
- ✅ End-to-end workflow: RFQ → Quotation → PO → Invoice
- ✅ End-to-end workflow: Enquiry → Sales Order → Invoice
- ✅ Negative testing (invalid inputs, unauthorized access attempts, duplicate creation)
- ✅ Boundary testing (0%, 100%, 101% discount; zero/negative quantities)
- ✅ UI behavior (form validation, button states, double-click prevention, navigation)
- ✅ API endpoint testing via Postman (auth, scoping, status transitions)
- ✅ Cross-browser testing (Chrome primary, Firefox and Edge secondary)

### Focus Areas (High Priority)

1. Quotation version control — specifically that rejection does NOT bump version
2. PO visibility scoping by role and assignment
3. RBAC enforcement — both UI and API layer
4. Manager hierarchy isolation — no cross-team data leakage
5. Invoice creation gates — only from Received PO
6. Duplicate record prevention (PO from same Quotation, Invoice from same PO)

---

## 11. Out of Scope

- ❌ Performance / load testing
- ❌ Stress testing or concurrent user simulation
- ❌ Mobile native app (web-responsive only in scope)
- ❌ Email notification content/delivery testing
- ❌ Third-party integrations (if any)
- ❌ Database backup and recovery testing
- ❌ Infrastructure / server configuration testing
- ❌ Accessibility (WCAG) compliance testing

---

---

# PART 2: TEST CASES

**Total Test Cases: 145**  
**Columns:** TC ID | Module | Test Scenario | Test Steps | Expected Result | Actual Result | Status | Priority

---

## Section A — Authentication (TC-001 to TC-013)

| TC ID | Module | Test Scenario | Test Steps | Expected Result | Actual Result | Status | Priority |
|---|---|---|---|---|---|---|---|
| TC-001 | Auth | Admin login with valid credentials | 1. Go to /login 2. Enter admin email & password 3. Click Login | Admin dashboard loads with full navigation menu visible | | | High |
| TC-002 | Auth | Manager login with valid credentials | 1. Go to /login 2. Enter manager credentials 3. Click Login | Manager dashboard loads; team-scoped menu items visible | | | High |
| TC-003 | Auth | Employee login with valid credentials | 1. Go to /login 2. Enter employee credentials 3. Click Login | Employee dashboard loads; restricted menu (no PO create, no approvals) | | | High |
| TC-004 | Auth | Login with invalid password | 1. Enter valid email + wrong password 2. Click Login | Error: "Invalid credentials". No redirect. Token not issued | | | High |
| TC-005 | Auth | Login with unregistered email | 1. Enter email not in system 2. Enter any password 3. Click Login | Error: "User not found" or "Invalid credentials" | | | High |
| TC-006 | Auth | Login with blank email field | 1. Leave email blank 2. Fill password 3. Click Login | Frontend validation error: "Email is required" | | | Medium |
| TC-007 | Auth | Login with blank password field | 1. Fill email 2. Leave password blank 3. Click Login | Frontend validation error: "Password is required" | | | Medium |
| TC-008 | Auth | Login with both fields blank | 1. Leave both fields blank 2. Click Login | Both field validation errors shown. No API call made | | | Medium |
| TC-009 | Auth | Session persistence after page refresh | 1. Login as any user 2. Refresh browser | User remains logged in. Dashboard reloads without re-authentication | | | High |
| TC-010 | Auth | Logout clears session | 1. Login as any user 2. Click Logout | Session cleared. Redirected to /login. Browser back button does not return to dashboard | | | High |
| TC-011 | Auth | Expired session redirects to login | 1. Login 2. Manually clear the auth token from browser storage 3. Try to navigate | Redirected to /login. Session expired or unauthorized message shown | | | High |
| TC-012 | Auth | Brute force — repeated wrong password | 1. Enter wrong password 5 times consecutively | Account locked or rate-limit error message shown | | | Medium |
| TC-013 | Auth | SQL injection in login email field | 1. Enter `' OR 1=1 --` in email field 2. Click Login | Login rejected. No data exposed. Standard error message shown | | | High |

---

## Section B — Role-Based Access Control (TC-014 to TC-022)

| TC ID | Module | Test Scenario | Test Steps | Expected Result | Actual Result | Status | Priority |
|---|---|---|---|---|---|---|---|
| TC-014 | RBAC | Employee cannot access PO creation | 1. Login as Employee 2. Navigate to /purchase-orders/new or click Create PO | Access denied or button not visible. No PO form rendered | | | High |
| TC-015 | RBAC | Employee cannot generate invoices | 1. Login as Employee 2. Open a Received PO 3. Check for Generate Invoice action | Generate Invoice button not visible to Employee | | | High |
| TC-016 | RBAC | Employee cannot access User Management | 1. Login as Employee 2. Navigate to /settings/users via URL | Redirect to dashboard or 403 error. No user list shown | | | High |
| TC-017 | RBAC | Manager cannot access User Management | 1. Login as Manager 2. Navigate to /settings/users | Access denied. Create/Edit user actions unavailable | | | High |
| TC-018 | RBAC | Manager can approve quotations | 1. Login as Manager 2. Open a Submitted quotation 3. Click Approve | Approval action succeeds. Status → Approved | | | High |
| TC-019 | RBAC | Employee cannot approve quotations | 1. Login as Employee 2. Open a Submitted quotation | Approve button not visible. Cannot trigger approval action | | | High |
| TC-020 | RBAC | Admin can access all modules | 1. Login as Admin 2. Navigate through every menu item | All modules accessible without restriction | | | High |
| TC-021 | RBAC | Direct URL access by unauthorized role | 1. Login as Employee 2. Manually type /purchase-orders/new in URL bar | Redirected away or 403 error shown. No form rendered | | | High |
| TC-022 | RBAC | API call with Employee token to Manager-only endpoint | 1. Login as Employee via Postman 2. Call POST /purchase-orders with employee JWT | 403 Forbidden response returned | | | High |

---

## Section C — Manager Hierarchy & Visibility (TC-023 to TC-028)

| TC ID | Module | Test Scenario | Test Steps | Expected Result | Actual Result | Status | Priority |
|---|---|---|---|---|---|---|---|
| TC-023 | Hierarchy | Manager A sees both Employee X and Y records | 1. Employee X and Y (both under Manager A) each create a quotation 2. Login as Manager A 3. Open Quotations list | Records of both Employee X and Employee Y visible to Manager A | | | High |
| TC-024 | Hierarchy | Manager A cannot see Employee Z records (under Manager B) | 1. Employee Z (under Manager B) creates a quotation 2. Login as Manager A 3. Open Quotations list | Employee Z's quotation NOT in Manager A's list | | | High |
| TC-025 | Hierarchy | Manager B cannot see Manager A's team records | 1. Employee X (under Manager A) creates a record 2. Login as Manager B | Employee X's record not visible to Manager B | | | High |
| TC-026 | Hierarchy | Admin sees all records from all users | 1. Employees under Manager A and B each create records 2. Login as Admin | All records from all users visible | | | High |
| TC-027 | Hierarchy | Employee reassigned — visibility updates immediately | 1. Employee X is under Manager A 2. Admin reassigns Employee X to Manager B 3. Login as Manager B | Employee X's records now visible to Manager B. No longer visible to Manager A | | | High |
| TC-028 | Hierarchy | Manager's own created records visible to themselves | 1. Manager A creates a quotation directly 2. Login as Manager A | Manager A's own quotation visible in their list | | | Medium |

---

## Section D — RFQ Module (TC-029 to TC-041)

| TC ID | Module | Test Scenario | Test Steps | Expected Result | Actual Result | Status | Priority |
|---|---|---|---|---|---|---|---|
| TC-029 | RFQ | Create RFQ with valid data | 1. Login 2. Navigate to RFQ 3. Fill vendor, items, quantities 4. Submit | RFQ created with status Draft/Sent and unique reference number | | | High |
| TC-030 | RFQ | Create RFQ with missing vendor | 1. Fill RFQ items 2. Leave vendor blank 3. Submit | Validation error: "Vendor is required" | | | High |
| TC-031 | RFQ | Create RFQ with zero quantity | 1. Create RFQ 2. Set item qty = 0 3. Submit | Validation error: "Quantity must be greater than 0" | | | Medium |
| TC-032 | RFQ | Create RFQ with negative quantity | 1. Create RFQ 2. Enter qty = -5 3. Submit | Validation error: negative values not allowed | | | Medium |
| TC-033 | RFQ | Create RFQ with no line items | 1. Fill vendor 2. Add no items 3. Submit | Validation error: "At least one line item is required" | | | High |
| TC-034 | RFQ | Convert RFQ to Quotation | 1. Open a submitted/received RFQ 2. Click "Convert to Quotation" | Quotation created at v1 with all items pre-filled from RFQ | | | High |
| TC-035 | RFQ | Quotation from RFQ conversion pre-fills all line items | 1. Create RFQ with 3 items 2. Convert to Quotation 3. Open the quotation | All 3 items present in quotation with matching quantity and description | | | High |
| TC-036 | RFQ | Employee sees only their own RFQs | 1. Employee X creates an RFQ 2. Login as Employee Y | Employee Y cannot see Employee X's RFQ | | | High |
| TC-037 | RFQ | Manager sees all team RFQs | 1. Employee X (under Manager A) creates an RFQ 2. Login as Manager A | RFQ appears in Manager A's list | | | High |
| TC-038 | RFQ | Duplicate RFQ — same vendor, same reference | 1. Create RFQ for Vendor A ref #001 2. Create another with same vendor and reference | System warns or blocks exact duplicate | | | Medium |
| TC-039 | RFQ | RFQ list displays correct status badges | 1. Create RFQs in different states 2. Open RFQ list | Status badges correctly show Draft, Sent, Received per record | | | Low |
| TC-040 | RFQ | Delete a Draft RFQ | 1. Create an RFQ 2. Keep it in Draft 3. Delete it | RFQ removed from list. No linked records affected | | | Medium |
| TC-041 | RFQ | Cannot delete a converted RFQ | 1. Convert RFQ to Quotation 2. Try to delete the original RFQ | Deletion blocked: "RFQ has a linked Quotation" | | | Medium |

---

## Section E — Quotation Module (TC-042 to TC-065)

| TC ID | Module | Test Scenario | Test Steps | Expected Result | Actual Result | Status | Priority |
|---|---|---|---|---|---|---|---|
| TC-042 | Quotation | Create quotation with valid line items | 1. Navigate to Create Quotation 2. Add items with qty, unit price, discount 3. Save | Quotation saved at v1, status = Draft, total calculated correctly | | | High |
| TC-043 | Quotation | Total calculation — single item with discount | 1. Add Item: qty=2, price=1000, discount=10% | Total = (2×1000) − 10% = ₹1800 | | | High |
| TC-044 | Quotation | Total calculation — multiple items with discounts | 1. Item A: qty=1, price=500, 0% discount 2. Item B: qty=2, price=300, 5% discount | Total = 500 + (600−5%) = 500 + 570 = ₹1070 | | | High |
| TC-045 | Quotation | Discount exactly 100% | 1. Create quotation 2. Enter discount = 100% on a line item | Accepted — line item cost = 0. Total reflects correctly | | | Medium |
| TC-046 | Quotation | Discount over 100% | 1. Create quotation 2. Enter discount = 101% on a line item 3. Save | Validation error: "Discount cannot exceed 100%" | | | High |
| TC-047 | Quotation | Discount = 0% (no discount) | 1. Leave discount blank or enter 0 on a line item | No discount applied. Full price used in total | | | Low |
| TC-048 | Quotation | Create quotation with no line items | 1. Open Create Quotation 2. Add no line items 3. Submit | Validation error: "At least one line item is required" | | | High |
| TC-049 | Quotation | Submit quotation for approval | 1. Open a Draft quotation 2. Click Submit | Status → Submitted. Approve/Reject options now available to approvers | | | High |
| TC-050 | Quotation | Approve a submitted quotation | 1. Login as Manager or Admin 2. Open Submitted quotation 3. Click Approve | Status → Approved. Version number unchanged. Edit fields locked | | | High |
| TC-051 | Quotation | Reject a submitted quotation | 1. Login as Manager or Admin 2. Open Submitted quotation 3. Click Reject 4. Enter rejection reason | Status → Rejected. Version number must stay the same (e.g., v1 remains v1) | | | High |
| TC-052 | Quotation | ⭐ CRITICAL: Version does NOT increment on rejection | 1. Create Quotation → version = 1 2. Submit 3. Manager rejects 4. Check version field | Version field = 1 (unchanged). Rejection must never auto-increment version | | | High |
| TC-053 | Quotation | Revise a rejected quotation | 1. Open Rejected quotation 2. Click Revise 3. Modify at least one line item 4. Resubmit | New version created: v1 → v2. Original v1 preserved in version history | | | High |
| TC-054 | Quotation | ⭐ CRITICAL: Version increments on user revision | 1. Reject a v1 quotation 2. User clicks Revise 3. Check version after save | Version = 2. Re-submission shows v2 to approver | | | High |
| TC-055 | Quotation | Multiple revision cycles maintain correct versioning | 1. v1 → Reject → Revise → v2 → Reject → Revise → v3 | Versions: v1, v2, v3 in correct sequence. All listed in history | | | High |
| TC-056 | Quotation | Version history shows all revisions with metadata | 1. Create quotation with 3 revision cycles 2. Open Version History tab | v1, v2, v3 listed with timestamp, status, and who approved or rejected | | | Medium |
| TC-057 | Quotation | Approved quotation fields are read-only | 1. Open an Approved quotation 2. Try to click and edit any field | All fields read-only. Only "Revise" action button available | | | High |
| TC-058 | Quotation | Revise an approved quotation creates new version | 1. Open Approved quotation 2. Click Revise 3. Edit and resubmit | New version (e.g., v2) created in Draft. Previous approved version preserved | | | High |
| TC-059 | Quotation | Cannot re-submit an already Submitted quotation | 1. Submit a quotation (status = Submitted) 2. Click Submit again | Submit button disabled or already-submitted message shown. No duplicate submission | | | Medium |
| TC-060 | Quotation | Employee cannot approve their own submitted quotation | 1. Login as Employee 2. Create and submit a quotation 3. Check for Approve button | Approve button NOT visible to the Employee who submitted it | | | High |
| TC-061 | Quotation | Quotation linked to correct customer | 1. Create quotation for Customer A 2. Open quotation detail | Customer A shown in customer field. No data leakage from other customers | | | High |
| TC-062 | Quotation | Search quotation by customer name | 1. Open Quotation list 2. Search by customer name "Customer A" | Only quotations linked to Customer A are shown | | | Medium |
| TC-063 | Quotation | Filter quotations by status | 1. Open Quotation list 2. Apply filter "Approved" | Only Approved quotations displayed in list | | | Medium |
| TC-064 | Quotation | Quotation PDF/print generation | 1. Open an Approved quotation 2. Click Download or Print | PDF generated with correct line items, totals, customer details, and version | | | Medium |
| TC-065 | Quotation | Duplicate quotation reference prevention | 1. Create Quotation ref #Q-001 for Customer A 2. Attempt to create another with same ref/customer | System warns or prevents exact duplicate quotation creation | | | Medium |

---

## Section F — Purchase Order Module (TC-066 to TC-080)

| TC ID | Module | Test Scenario | Test Steps | Expected Result | Actual Result | Status | Priority |
|---|---|---|---|---|---|---|---|
| TC-066 | Purchase Order | Create PO from approved quotation | 1. Open Approved quotation 2. Click Create PO 3. Assign to Employee 4. Save | PO created with correct amounts and assigned to selected employee | | | High |
| TC-067 | Purchase Order | PO amount matches approved quotation total | 1. Approved quotation total = ₹25,000 2. Create PO from it | PO total = ₹25,000. No discrepancy between quotation and PO | | | High |
| TC-068 | Purchase Order | Cannot create PO from Draft quotation | 1. Open a Draft quotation 2. Check for Create PO option | Create PO button not visible or disabled | | | High |
| TC-069 | Purchase Order | Cannot create PO from Rejected quotation | 1. Open a Rejected quotation 2. Check for Create PO option | Create PO button not available for rejected quotations | | | High |
| TC-070 | Purchase Order | Cannot create PO from Submitted quotation | 1. Open a Submitted (pending approval) quotation 2. Check Create PO | Create PO disabled — must wait for approval | | | High |
| TC-071 | Purchase Order | Duplicate PO prevention for same quotation | 1. Create PO from Approved quotation 2. Try to create another PO from the same quotation | System blocks or warns: "A PO already exists for this quotation" | | | High |
| TC-072 | Purchase Order | Employee sees only their assigned POs | 1. Create PO assigned to Employee X 2. Login as Employee X 3. Open PO list | PO assigned to Employee X is visible | | | High |
| TC-073 | Purchase Order | Employee cannot see PO assigned to another employee | 1. Create PO assigned to Employee Y 2. Login as Employee X 3. Open PO list | Employee Y's PO is NOT in Employee X's list | | | High |
| TC-074 | Purchase Order | Manager sees all team POs | 1. Create POs for Employee X and Y (both under Manager A) 2. Login as Manager A | Both POs from Employee X and Y visible to Manager A | | | High |
| TC-075 | Purchase Order | Update PO status to Received | 1. Open an active PO 2. Update status to "Received" | Status updates to Received. Invoice generation now enabled | | | High |
| TC-076 | Purchase Order | PO cannot be deleted if linked invoice exists | 1. Generate an invoice from PO 2. Try to delete the PO | Deletion blocked: "Cannot delete a PO with an associated invoice" | | | High |
| TC-077 | Purchase Order | PO list sorted by date (newest first) | 1. Create 3 POs on different dates 2. Open PO list | Most recently created PO appears first | | | Low |
| TC-078 | Purchase Order | Search PO by vendor name | 1. Open PO list 2. Search "Vendor A" | Only POs linked to Vendor A shown | | | Medium |
| TC-079 | Purchase Order | PO reference number is unique | 1. Create multiple POs | Each PO has a unique system-generated reference number. No two POs share same ref | | | High |
| TC-080 | Purchase Order | Reassign PO to different employee updates visibility | 1. PO assigned to Employee X 2. Edit PO and reassign to Employee Y | PO now visible to Employee Y. No longer visible to Employee X | | | Medium |

---

## Section G — Invoice Module (TC-081 to TC-094)

| TC ID | Module | Test Scenario | Test Steps | Expected Result | Actual Result | Status | Priority |
|---|---|---|---|---|---|---|---|
| TC-081 | Invoice | Generate invoice from Received PO | 1. Open PO with status = Received 2. Click Generate Invoice | Invoice created with amount pre-filled from PO. Status = Unpaid | | | High |
| TC-082 | Invoice | Invoice amount auto-populated from PO | 1. PO total = ₹40,000 2. Generate invoice | Invoice amount = ₹40,000. No manual entry required | | | High |
| TC-083 | Invoice | Invoice default status is Unpaid | 1. Generate any new invoice | Invoice status = Unpaid on creation | | | High |
| TC-084 | Invoice | Record partial payment | 1. Invoice total = ₹50,000 2. Record payment of ₹20,000 | Status → Partially Paid. Remaining balance = ₹30,000 shown | | | High |
| TC-085 | Invoice | Record full payment | 1. Invoice total = ₹50,000 2. Record payment of ₹50,000 | Status → Paid. Balance = ₹0. Invoice marked complete | | | High |
| TC-086 | Invoice | Payment amount exceeds invoice total | 1. Invoice = ₹50,000 2. Attempt to record ₹60,000 payment | Validation error: "Payment cannot exceed invoice total" | | | High |
| TC-087 | Invoice | Multiple partial payments until fully paid | 1. Invoice = ₹50,000 2. Record ₹20,000 then ₹20,000 then ₹10,000 | Each payment recorded. Final payment triggers status → Paid. All records listed | | | High |
| TC-088 | Invoice | Employee cannot generate invoice | 1. Login as Employee 2. Open a Received PO | Generate Invoice button not visible to Employee role | | | High |
| TC-089 | Invoice | Invoice linked to correct PO with clickable reference | 1. Generate invoice from PO #P-001 2. Open invoice detail | Invoice shows reference to PO #P-001 with a working link | | | Medium |
| TC-090 | Invoice | Navigate from invoice back to source PO | 1. Open an invoice 2. Click PO reference link | Correctly navigates to the originating PO record | | | Medium |
| TC-091 | Invoice | Filter invoice list by payment status | 1. Open Invoices list 2. Filter by "Paid" | Only Paid invoices shown in list | | | Medium |
| TC-092 | Invoice | Invoice PDF/print generation | 1. Open an invoice 2. Click Download or Print | PDF generated with correct amounts, payment status, and customer details | | | Medium |
| TC-093 | Invoice | Paid invoice is read-only | 1. Open an invoice with status = Paid 2. Try to modify any field or add a payment | All fields and actions locked. No modification possible | | | High |
| TC-094 | Invoice | Duplicate invoice prevention for same PO | 1. Generate invoice from PO #P-001 2. Try to generate another invoice from same PO | Blocked: "An invoice already exists for this Purchase Order" | | | High |

---

## Section H — Sales Module (TC-095 to TC-102)

| TC ID | Module | Test Scenario | Test Steps | Expected Result | Actual Result | Status | Priority |
|---|---|---|---|---|---|---|---|
| TC-095 | Sales | Create customer sales order with valid data | 1. Navigate to Sales 2. Create order for Customer A 3. Add line items 4. Save | Sales order saved with unique reference and correct status | | | High |
| TC-096 | Sales | Sales order linked to approved quotation | 1. Approve a customer quotation 2. Convert to Sales Order | Sales order references the originating quotation. Line items match | | | High |
| TC-097 | Sales | Sales order triggers job card creation | 1. Create a Sales Order 2. Click "Create Job Card" | Job card created with reference back to the sales order | | | High |
| TC-098 | Sales | Employee sees only assigned sales orders | 1. Create 2 sales orders (1 assigned to X, 1 to Y) 2. Login as Employee X | Only Employee X's sales order visible in their list | | | High |
| TC-099 | Sales | Manager sees all team sales orders | 1. Sales orders assigned to Employee X and Y (both under Manager A) 2. Login as Manager A | Both sales orders visible to Manager A | | | High |
| TC-100 | Sales | Update sales order status | 1. Open a sales order 2. Change status from In Progress to Dispatched | Status updates correctly. History log reflects the change with timestamp | | | Medium |
| TC-101 | Sales | Sales order total calculation | 1. Add 2 line items with qty, price, and discount 2. Check total | Total reflects correct arithmetic with all discounts applied | | | High |
| TC-102 | Sales | Cancel a sales order | 1. Open an In Progress sales order 2. Click Cancel | Status → Cancelled. Associated job card status also updated to Cancelled | | | Medium |

---

## Section I — Employee & Role Management (TC-103 to TC-112)

| TC ID | Module | Test Scenario | Test Steps | Expected Result | Actual Result | Status | Priority |
|---|---|---|---|---|---|---|---|
| TC-103 | Employee Mgmt | Admin creates new employee user | 1. Login as Admin 2. Navigate to Users 3. Create user role = Employee 4. Assign to Manager A | User created. Appears in Manager A's team immediately | | | High |
| TC-104 | Employee Mgmt | Admin creates new manager user | 1. Login as Admin 2. Create user with role = Manager | Manager account created. Can see team records once employees assigned | | | High |
| TC-105 | Employee Mgmt | Admin assigns employee to a manager | 1. Login as Admin 2. Edit Employee X 3. Set reporting manager = Manager A | Employee X appears under Manager A's team | | | High |
| TC-106 | Employee Mgmt | Admin reassigns employee to new manager | 1. Employee X under Manager A 2. Admin reassigns to Manager B | Manager B now sees Employee X's records. Manager A no longer sees them | | | High |
| TC-107 | Employee Mgmt | Manager cannot create user accounts | 1. Login as Manager 2. Navigate to User Management | Create/Edit user actions not available to Manager role | | | High |
| TC-108 | Employee Mgmt | Admin upgrades employee role to Manager | 1. Login as Admin 2. Edit Employee X 3. Change role to Manager | Employee X gets Manager-level access on next login | | | Medium |
| TC-109 | Employee Mgmt | Admin deactivates a user account | 1. Login as Admin 2. Deactivate Employee X | Employee X cannot login. Their existing records remain visible to Manager/Admin | | | Medium |
| TC-110 | Employee Mgmt | Deactivated user cannot login | 1. Admin deactivates Employee X 2. Employee X attempts to login with correct credentials | Login rejected: "Account deactivated" or "Invalid credentials" | | | High |
| TC-111 | Employee Mgmt | Admin edits user profile details | 1. Login as Admin 2. Edit name/email of a user 3. Save | Changes saved. Updated information reflects across the system | | | Medium |
| TC-112 | Employee Mgmt | Duplicate email on user creation | 1. Login as Admin 2. Create user with email already registered in system | Validation error: "Email already registered" | | | High |

---

## Section J — UI, Navigation & Forms (TC-113 to TC-124)

| TC ID | Module | Test Scenario | Test Steps | Expected Result | Actual Result | Status | Priority |
|---|---|---|---|---|---|---|---|
| TC-113 | UI / Nav | Sidebar navigation — all links work | 1. Login as Admin 2. Click each sidebar menu item | Correct page loads for each. No 404 errors encountered | | | High |
| TC-114 | UI / Nav | Breadcrumb navigation accuracy | 1. Navigate to a nested page (e.g., Quotation detail) 2. Check breadcrumb | Breadcrumb shows correct path: Home > Quotations > #Q-001 | | | Low |
| TC-115 | UI / Nav | Back button preserves list filter state | 1. Apply a filter on quotation list 2. Open a record 3. Press browser back | Returns to list with same filter still applied | | | Low |
| TC-116 | UI / Forms | Double-click submit prevention | 1. Fill a quotation form completely 2. Rapidly double-click Submit button | Only one record created. No duplicate quotation in the list | | | High |
| TC-117 | UI / Forms | Required field highlighting on submit | 1. Open any create form 2. Leave required fields blank 3. Click Submit | All blank required fields highlighted in red with descriptive error text | | | High |
| TC-118 | UI / Forms | Form data persists on browser tab switch | 1. Start filling a form 2. Switch to another browser tab 3. Return | Form data still intact. No data lost | | | Medium |
| TC-119 | UI / Forms | Long text input in description field | 1. Enter 1000+ characters in any description field 2. Save | Content accepted and saved. Displayed correctly on detail view | | | Low |
| TC-120 | UI / Forms | XSS injection in text fields | 1. Enter `<script>alert(1)</script>` in a name or description field 2. Save and reload | Input sanitized. Script does not execute. Stored and displayed as literal text | | | High |
| TC-121 | UI / Tables | Pagination on large dataset | 1. Login as Admin 2. Open list with 50+ records | Data loads in pages. Pagination controls (prev/next/page numbers) work correctly | | | Medium |
| TC-122 | UI / Tables | Column sorting works correctly | 1. Open any list table 2. Click a column header (e.g., Date) | List re-orders ascending then descending on repeated clicks | | | Medium |
| TC-123 | UI / Tables | Export to Excel or CSV | 1. Open any list 2. Click Export button | File downloaded with correct column headers and all visible data | | | Medium |
| TC-124 | UI / Tables | Empty state shown for new user | 1. Login as a brand new employee with no assigned records | List shows "No records found" message — not a blank white page | | | Medium |

---

## Section K — API Testing (TC-125 to TC-135)

| TC ID | Module | Test Scenario | Test Steps | Expected Result | Actual Result | Status | Priority |
|---|---|---|---|---|---|---|---|
| TC-125 | API | GET /quotations with Admin token | 1. Get Admin JWT via POST /auth/login 2. Call GET /quotations | 200 OK. Returns all quotations across all users | | | High |
| TC-126 | API | GET /quotations with Employee token | 1. Get Employee X JWT 2. Call GET /quotations | 200 OK. Returns ONLY Employee X's quotations. No other user data | | | High |
| TC-127 | API | GET /quotations with Manager token | 1. Get Manager A JWT 2. Call GET /quotations | 200 OK. Returns Manager A's + all team members' quotations | | | High |
| TC-128 | API | POST /quotations with missing required field | 1. Call POST /quotations without customer_id in body | 400 Bad Request with descriptive validation message | | | High |
| TC-129 | API | Reject quotation — version does not change | 1. Get quotation at v1 2. Call PATCH /quotations/:id/reject 3. GET same quotation | Response shows version = 1 (unchanged after rejection) | | | High |
| TC-130 | API | Revise quotation — version increments | 1. Get rejected quotation at v1 2. Call PATCH /quotations/:id/revise 3. GET same quotation | Response shows version = 2 after revision | | | High |
| TC-131 | API | POST /purchase-orders with Employee token | 1. Get Employee JWT 2. Call POST /purchase-orders | 403 Forbidden returned | | | High |
| TC-132 | API | GET /purchase-orders scoped by employee | 1. Get Employee X JWT 2. Call GET /purchase-orders | Returns only POs where Employee X is the assigned owner | | | High |
| TC-133 | API | POST /invoices — duplicate for same PO | 1. Generate invoice for PO #P-001 2. Call POST /invoices again for same PO ID | 409 Conflict or 400 validation error returned | | | High |
| TC-134 | API | All endpoints — missing Authorization header | 1. Call any protected endpoint without Bearer token | 401 Unauthorized response | | | High |
| TC-135 | API | All endpoints — invalid/malformed JWT token | 1. Call endpoint with `Authorization: Bearer invalidtokenxyz` | 401 Unauthorized response | | | High |

---

## Section L — Negative & Edge Cases (TC-136 to TC-145)

| TC ID | Module | Test Scenario | Test Steps | Expected Result | Actual Result | Status | Priority |
|---|---|---|---|---|---|---|---|
| TC-136 | Negative | Quotation with negative unit price | 1. Create quotation 2. Enter price = -500 on a line item 3. Submit | Validation error: "Price must be a positive value" | | | Medium |
| TC-137 | Negative | PO created without selecting vendor | 1. Start PO creation 2. Leave vendor field blank 3. Save | Validation error: "Vendor is required" | | | High |
| TC-138 | Negative | Invoice payment of ₹0 | 1. Open an invoice 2. Record payment amount = ₹0 | Validation error: "Payment amount must be greater than 0" | | | Medium |
| TC-139 | Negative | Navigate to URL of deleted record | 1. Delete a quotation 2. Navigate to its direct URL | 404 Not Found or "Record not found" message shown | | | Medium |
| TC-140 | Negative | Edit approved quotation via direct API call | 1. Get an Approved quotation ID 2. Call PATCH /quotations/:id directly with field modifications | 400 or 403 error — must use /revise endpoint to modify | | | High |
| TC-141 | Negative | Generate invoice from PO not yet Received | 1. Open a PO with status = Ordered (not Received) 2. Attempt to generate invoice | Invoice generation blocked. Error: "PO must be in Received status to generate invoice" | | | High |
| TC-142 | Negative | Delete employee who has open active records | 1. Employee X has open quotations and POs 2. Admin tries to delete Employee X | Deletion blocked or prompt to reassign records shown | | | High |
| TC-143 | Negative | Assign PO to non-existent employee (API) | 1. Call POST /purchase-orders with employee_id = 99999 | 400 or 404 — employee not found error | | | Medium |
| TC-144 | Negative | XSS in quotation description via API | 1. Call POST /quotations with description = `<img src=x onerror=alert(1)>` 2. GET the record | Script not executed on retrieval. Stored and returned as sanitized plain string | | | High |
| TC-145 | Negative | Concurrent approval of same quotation by two managers | 1. Manager A and Manager B both open same Submitted quotation 2. Both click Approve simultaneously | Only one approval registered. No duplicate status or conflicting state | | | Medium |

---

---

# APPENDIX

## A. Test Priority Legend

| Priority | Meaning |
|---|---|
| High | Business-critical. Must pass before release. Blocks sign-off if failed |
| Medium | Important but not a blocker. Should pass before release |
| Low | Nice-to-have. Can be deferred if resources are limited |

## B. Test Status Definitions

| Status | Meaning |
|---|---|
| Pass | Actual result matches expected result exactly |
| Fail | Actual result does not match expected result |
| Blocked | Cannot be tested due to a dependency or environment issue |
| Not Tested | Test case not yet executed |
| Deferred | Intentionally skipped for this test cycle |

## C. Bug Severity Guide

| Severity | Definition |
|---|---|
| Critical | System crash, data loss, security breach, complete feature failure |
| High | Core feature broken, significant wrong behavior, data corruption |
| Medium | Feature partially broken, incorrect UI behavior, wrong calculations |
| Low | Cosmetic issues, minor UI inconsistencies, text errors |

## D. Test Coverage Summary

| Module | Total TCs | High | Medium | Low |
|---|---|---|---|---|
| Authentication | 13 | 9 | 3 | 1 |
| RBAC | 9 | 9 | 0 | 0 |
| Manager Hierarchy | 6 | 5 | 1 | 0 |
| RFQ | 13 | 7 | 4 | 2 |
| Quotation | 24 | 17 | 6 | 1 |
| Purchase Order | 15 | 11 | 3 | 1 |
| Invoice | 14 | 10 | 4 | 0 |
| Sales | 8 | 6 | 2 | 0 |
| Employee Management | 10 | 7 | 3 | 0 |
| UI / Navigation / Forms | 12 | 4 | 5 | 3 |
| API | 11 | 11 | 0 | 0 |
| Negative / Edge Cases | 10 | 6 | 4 | 0 |
| **TOTAL** | **145** | **102** | **35** | **8** |

---

*Document prepared for internal QA handover. Replace all [PLACEHOLDER] fields with actual credentials and known defect details before distributing to QA team.*

*© 2026 VAB Informatics Private Limited — Confidential*
