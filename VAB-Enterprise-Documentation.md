# VAB Enterprise — User Manual & System Documentation

**Version:** 1.0
**Platform:** vaberp.com
**Stack:** Next.js 14 · NestJS · PostgreSQL · TypeORM
**Document Date:** March 2026

---

## Table of Contents

1. [Platform Overview](#1-platform-overview)
2. [User Roles & Permissions](#2-user-roles--permissions)
3. [Module-wise Breakdown](#3-module-wise-breakdown)
4. [Workflow Explanations](#4-workflow-explanations)
5. [Access Control Logic](#5-access-control-logic)
6. [Edge Cases & Rules](#6-edge-cases--rules)
7. [UI Behavior Per Screen](#7-ui-behavior-per-screen)
8. [Summary](#8-summary)

---

## 1. Platform Overview

### Purpose
VAB Enterprise is a multi-tenant B2B ERP SaaS platform that connects Sales, Procurement, Inventory, and Manufacturing into a single operational system. It eliminates siloed spreadsheets and disconnected teams by enforcing structured workflows — every action is traceable, every department sees only what it owns.

### Target Users
- Manufacturing companies that receive customer orders, procure raw materials, and produce finished goods
- Procurement teams managing vendors, purchase orders, and material intake
- Inventory teams confirming goods receipts and issuing materials to manufacturing
- Manufacturing floor supervisors managing production jobs and dispatch

### Core Functionality
- Customer sales orders trigger material requests to inventory
- Inventory raises indents to procurement when stock is insufficient
- Procurement creates purchase orders, receives goods, and releases to inventory via GRNs
- Inventory confirms GRNs, updates stock, and issues materials to manufacturing
- Manufacturing tracks production through Bill of Materials (BOM), Job Cards, and Stage completion
- All partial deliveries, rejections, and shortages are handled automatically with follow-up workflows

---

## 2. User Roles & Permissions

### 2.1 Super Admin
Operates at the platform level — above any single enterprise.

**Can access:**
- All enterprises registered on the platform
- Subscription plans (create, edit, delete)
- Assign subscriptions to enterprises
- View all enterprise employee lists
- Support ticket dashboard

**Can create/edit/delete:**
- Enterprises (onboard new clients)
- Subscription tiers and pricing
- Platform-wide announcements or support responses

**Cannot do:**
- Operate within a specific enterprise's transactional data (sales orders, GRNs, etc.)
- Approve or reject enterprise-level documents

---

### 2.2 Admin (Enterprise Level)
Each enterprise has one or more Admins who configure and manage the enterprise.

**Can access:** All modules within their enterprise

**Can create/edit/delete:**
- Employees and their roles/permissions
- Suppliers / Vendor Master
- Raw materials catalog
- Products catalog
- Unit master, document templates, company settings
- All transactional documents (orders, indents, GRNs, job cards)

**Cannot do:**
- Access other enterprises' data
- Modify subscription or billing (Super Admin only)

---

### 2.3 Department Roles (Permission-Based)
Permissions are granular and assigned per employee. Each module has its own permission key.

| Permission Key | Description | Typical Role |
|---|---|---|
| `view_sales_orders` | View sales order list and details | Sales, Admin |
| `create_sales_orders` | Create and edit sales orders | Sales |
| `view_material_requests` | View material requests | Inventory, Manufacturing, Admin |
| `approve_material_requests` | Approve and issue MR items | Inventory Manager |
| `view_indents` | View indent list and details | Procurement |
| `create_purchase_orders` | Raise purchase orders to suppliers | Procurement |
| `confirm_goods_receipts` | Accept or reject items in GRN | Inventory Warehouse |
| `view_manufacturing` | View manufacturing orders and job cards | Production Manager |
| `manage_job_cards` | Update job card progress and status | Floor Supervisor |

> **Rule:** A user with no permission for a module sees that module's sidebar item hidden and receives a 403 Forbidden error if they attempt to access the URL directly.

---

## 3. Module-wise Breakdown

---

### Module 1: Sales Orders

**Purpose:** Capture customer purchase orders. This is the entry point of the entire production workflow.

**Who can access:** Sales team, Admin

**Key features:**
- Create sales orders with line items (products, quantities, pricing)
- Track order status: `Draft → Confirmed → In Production → Dispatched`
- Each confirmed order triggers a Material Request to inventory automatically
- Link orders to customers from the customer master

**Business logic:**
- A sales order cannot move to production until all required materials are issued by inventory
- Dispatched orders are locked and cannot be edited
- Grand total is calculated from line items including tax

#### Sub-module 1.1: Sales Order Line Items

| Field | Description |
|---|---|
| Product | Selected from product catalog |
| Quantity | Number of units ordered |
| Unit Price | Price per unit |
| Unit of Measure | e.g., pcs, kg, m |
| Line Total | Auto-calculated: qty × unit price |
| Tax | Applied based on product category |

**Real-world example:** Customer orders 500 units of "Steel Cabinet Model A" at ₹2,000 each → order total = ₹10,00,000 → system creates a Material Request for steel sheets, paint, and screws.

---

### Module 2: Material Requests (MR)

**Purpose:** Manufacturing raises a request to Inventory for raw materials needed to fulfill a sales order.

**Who can access:** Manufacturing (create), Inventory (approve + fulfill), Admin

**Status flow:** `Pending → Partially Fulfilled → Fulfilled`

**Key features:**
- Auto-created when a sales order is confirmed
- Line items map to raw materials required for each product in the order
- Each MR item tracks: `quantity_requested`, `quantity_approved`, `quantity_issued`
- An MR is `fulfilled` only when every line item has `status = issued` or `status = rejected`

**Business logic:**
- If inventory has sufficient stock → MR items are approved and issued directly
- If stock is insufficient → Inventory raises an Indent to procurement for the shortfall
- A `rejected` MR item means the goods were damaged/unusable; procurement re-orders replacements
- MR items are marked `rejected` (not `issued`) when accepted GRN quantity is 0

#### Sub-module 2.1: MR Item Fulfillment

- **Inputs:** Raw material, quantity requested
- **Output:** Quantity issued (from existing stock), status updated to `issued`
- **Real-world example:** MR requests 200kg Steel Rod → inventory has 150kg → issues 150kg directly, raises an indent for the 50kg shortfall

---

### Module 3: Indents

**Purpose:** Procurement document created when inventory stock is insufficient to fulfill a Material Request. Drives the entire purchase process.

**Who can access:** Inventory (create), Procurement (manage + release), Admin

**Status flow:** `Pending → Partially Ordered → Fully Ordered → Closed`

**Key features:**
- Auto-created from MR shortfalls or manually by inventory team
- Each indent item tracks: `shortage_quantity` (required), `ordered_quantity`, `received_quantity`
- When all items are received in full: indent auto-closes
- Linked to the originating Material Request for traceability

**Business logic:**
- Procurement receives the indent, creates a Purchase Order from it
- When goods arrive and the GRN is confirmed, `received_quantity` updates on indent items
- Partial deliveries auto-reset the shortfall so procurement can re-order the remainder
- If all items are rejected (returned to vendor), indent items reset to `pending` for a fresh order

#### Sub-module 3.1: Reorder Rejected Items

- **Trigger:** After a GRN is confirmed with rejected quantities (damage, defects)
- **Action performed automatically:**
  - Indent items where `received_quantity < shortage_quantity` → reset to `status = pending`
  - `shortage_quantity` reduced to only the remaining needed amount
  - Linked MR items reset from `issued/rejected` back to `pending`
  - MR overall status recalculated
- **Real-world example:** 100 units ordered, 0 accepted (all damaged) → indent item resets with `shortage_quantity = 100`, `received_quantity = 0` → procurement raises a fresh PO

---

### Module 4: Quotations / RFQ (Request for Quotation)

**Purpose:** Before creating a Purchase Order, procurement requests price quotes from multiple suppliers to ensure best pricing.

**Who can access:** Procurement, Admin

**Key features:**
- Create RFQ with line items sent to one or more suppliers
- Suppliers submit quotes with unit prices and lead times
- Compare quotations side by side in a table view
- Select the winning quote → auto-generates a Purchase Order

**Business logic:**
- An RFQ can have multiple quotes per line item (one per supplier)
- The lowest price option is visually highlighted, but procurement can override
- Once a quote is selected and PO is generated, the RFQ is locked from editing

---

### Module 5: Purchase Orders (Procurement PO)

**Purpose:** Formal, legally binding order raised to a supplier for raw materials.

**Who can access:** Procurement, Admin

**Status flow:** `Draft → Sent → Partially Received → Received`

**Key features:**
- Linked to an Indent (maintains full traceability from shortage to purchase)
- Supplier details auto-filled from Vendor Master
- When goods arrive: procurement runs "Receive Stock" to trigger GRN creation
- Draft POs are auto-created by the system when short deliveries are detected

**Business logic:**
- A PO cannot be sent without a supplier assigned
- Each PO links to the originating indent so inventory knows what delivery to expect
- Auto-created draft follow-up POs are created for partial deliveries (procurement reviews and sends)

#### Sub-module 5.1: Auto Draft Follow-up PO

- **Trigger:** GRN confirmed with `partial` status items (received less than ordered)
- **Action:** System automatically creates a Draft PO with the original supplier for the remaining quantity
- **Procurement sees:** Draft PO pre-filled with item, shortfall quantity, and supplier details
- **Real-world example:** Ordered 1,000 units, received 600 → system auto-creates draft PO for 400 units with the same supplier

---

### Module 6: Goods Receipts (GRN)

**Purpose:** Physical receipt verification. When a supplier delivers goods to the warehouse, the inventory team confirms what actually arrived versus what was ordered.

**Who can access:** Procurement (release/create GRN), Inventory (confirm GRN), Admin

**Status flow:** `Pending → Confirmed`

**Key features:**
- Auto-created by procurement when they run "Release to Inventory" on an indent
- Each GRN item shows: Sent Qty, Received Qty, Accepted Qty, Rejected Qty, Rejection Reason
- Inventory team enters actual quantities; sets rejection reasons for damaged items
- Stock updates only for accepted quantities
- Materials issued to MR only for accepted quantities

**Business logic:**

| Field | Description |
|---|---|
| `expected_qty` | What procurement dispatched — set at GRN creation, never changes |
| `confirmed_qty` | Total physically received at warehouse |
| `accepted_qty` | Accepted into stock (good condition) |
| `rejected_qty` | Damaged or defective — do NOT enter stock |

**GRN item terminal statuses:**

| Status | Condition |
|---|---|
| `confirmed` | accepted_qty ≥ sent_qty, no rejections |
| `partial` | accepted_qty > 0 but < sent_qty (short delivery) |
| `rejected` | accepted_qty = 0 (entire delivery damaged) |

**GRN overall status:**
- Moves to `confirmed` when ALL items reach a terminal status (confirmed / partial / rejected)

#### Sub-module 6.1: GRN Confirmation

**Required inputs:**
- Employee who verified the goods (Confirmed By) — mandatory
- Per-item: received quantity, accepted quantity, rejection reason (mandatory when rejected qty > 0)
- Optional: overall notes (delivery remarks, damage observations)

**Outputs triggered automatically:**
- Raw material stock ledger updated (+accepted_qty per item)
- MR items updated: `status = issued` if accepted_qty > 0; `status = rejected` if accepted_qty = 0
- Indent items: `received_quantity` set to `accepted_qty`
- Partial indent items auto-reset + draft follow-up PO auto-created
- `rtv_status = pending` set on GRN items where `rejected_qty > 0`

**Real-world example:** 500 units delivered, 450 accepted (good), 50 damaged → stock +450, 50 units flagged for Return to Vendor, draft replacement PO queued for procurement review.

---

#### Sub-module 6.2: Return to Vendor (RTV)

**Purpose:** Track the physical return of damaged/defective goods back to the supplier.

**Trigger:** Any GRN item where `rejected_qty > 0`

**RTV Status flow:**

| Status | Meaning |
|---|---|
| `null` | No rejected items — RTV not applicable |
| `pending` | Items need to be physically returned to vendor |
| `returned` | Items have been physically returned |

**Process:**
1. GRN confirmed with rejected qty → `rtv_status = pending` auto-set
2. GRN detail page shows orange "Return to Vendor" card listing each item
3. Warehouse team physically returns goods to supplier/delivery driver
4. Clicks "Mark as Returned" per item → `rtv_status = returned`
5. System auto-resets linked indent item to `pending` for replacement order

**Real-world example:** 50 units of MCCB 200A found defective → RTV card shows on GRN page → warehouse returns to driver next day → clicks "Mark as Returned" → procurement notified to raise replacement PO for 50 units.

---

#### Sub-module 6.3: Short Delivery Alert

**Trigger:** Any GRN item with `status = partial` (received less than ordered)

**Display on GRN page:** Blue info alert listing short-delivered items with accepted quantities

**Auto-actions on confirmation:**
- Draft follow-up PO created with original supplier for the remaining quantity
- Indent item `shortage_quantity` reduced to the remaining needed
- Indent item `status` reset to `pending`

**Real-world example:** "3 items had short delivery. A draft Purchase Order has been created with ElectroSupply Co. Go to the Indent to review and send it."

---

### Module 7: Inventory / Raw Materials

**Purpose:** Master catalog of all raw materials with live, real-time stock levels.

**Who can access:** Inventory, Admin (full); Manufacturing, Procurement (read-only)

**Key features:**
- Raw material records: name, code, category, unit of measure, current stock
- Stock ledger: every stock movement logged with reference (GRN number, MR number, date, user)
- Available stock = total received − total issued

**Business logic:**
- Stock increases only when a GRN is confirmed (accepted_qty)
- Stock decreases only when materials are issued to manufacturing
- Stock cannot go below 0 — blocked at the API level

---

### Module 8: Suppliers (Vendor Master)

**Purpose:** Master list of all suppliers with contact information, categories, and transaction history.

**Who can access:** Procurement, Admin

**Key features:**
- Supplier profile: name, contact person, email, phone, address, category
- Linked to Purchase Orders and GRNs for full traceability
- Searchable and filterable by category and active/inactive status
- Supplier performance visible through linked order history

---

### Module 9: Manufacturing

**Purpose:** Manage the full production lifecycle from confirmed sales order to finished goods dispatch.

**Who can access:** Manufacturing Manager (full), Floor Supervisor (job cards), Admin

**Overall status flow:** `Sales Order Confirmed → BOM Created → Materials Approved → In Production → Completed → Dispatched`

---

#### Sub-module 9.1: Manufacturing Production Orders

These are confirmed sales orders viewed from the manufacturing perspective.

**Manufacturing status per line item:**

| Status | Meaning |
|---|---|
| `PENDING` | Order confirmed, production not started |
| `MATERIAL_HOLD` | Waiting for inventory to issue materials |
| `PARTIALLY_ISSUED` | Some materials issued, others still pending |
| `FULLY_ISSUED` | All materials received from inventory — ready to produce |
| `IN_PRODUCTION` | Job cards created, production actively running |
| `COMPLETED` | All job cards completed |
| `DISPATCHED` | Shipped to customer, order closed |

**Force Release for Manufacturing:**
- If materials are not fully issued but the manager needs to start production urgently, the "Release for Mfg" button bypasses the material hold
- Passes `force: true` to the API — no priority restrictions apply
- Intended for urgent situations; manager accepts responsibility for incomplete material issuance

---

#### Sub-module 9.2: Bill of Materials (BOM)

**Purpose:** Define exactly what raw materials are needed to manufacture each product in a production order.

**Who creates it:** Manufacturing Manager

**Inputs:**
- Raw materials selected from inventory dropdown (shows live stock levels per item)
- OR custom material names typed manually (for items not in the inventory catalog)
- Required quantity per material
- Unit of measure (auto-filled for inventory items, manual entry for custom)

**Output:**
- BOM document attached to the production order
- Sent to Inventory as a Material Request for approval and issuance
- Once approved, BOM items are locked (shown with lock icon)

**Custom materials:** Items not in the inventory catalog can be added manually. Shown with a blue "Custom" tag. These also generate MR line items that inventory must source.

**Real-world example:** BOM for "Steel Cabinet × 100 units" lists:
- Steel Sheet: 200 kg (from inventory — stock: 350 kg available)
- Paint Black 1L: 5 L (from inventory — stock: 2 L available → triggers indent)
- M6 Screws: 400 pcs (custom material — not in catalog)

---

#### Sub-module 9.3: Job Cards

**Purpose:** Each BOM generates Job Cards — one per production stage (e.g., Cutting → Welding → Painting → Assembly → QC).

**Status flow:** `pending → in_process → completed_production → ready_for_approval → approved_for_dispatch → dispatched`

**Inputs when creating:**
- Production stage (from Stage Master)
- Assigned employee
- Quantity to produce
- Start date and expected completion date
- Priority level
- Notes

**Blocking rule:** Production cannot start on a job card until materials are marked as `FULLY_ISSUED` by inventory — unless a force-release is applied by the manager.

**Progress tracking:** Each job card allows logging progress entries (notes + percentage complete) as work progresses.

---

#### Sub-module 9.4: Production Stages

**Purpose:** Subdivide production into named, trackable phases.

**Stage Master:** Configurable list of stages per enterprise (Admin sets these up in Settings).

**Example stages:** Raw Material Prep → Cutting → Welding → Surface Treatment → Assembly → Quality Check → Packaging → Ready for Dispatch

---

### Module 10: Analytics / Dashboard

**Purpose:** Real-time operational summary giving each department a snapshot of pending actions.

**Displayed metrics:**
- Pending sales orders awaiting confirmation
- Open indents awaiting procurement action
- GRNs pending inventory confirmation
- Manufacturing orders currently in production
- Material requests pending approval
- Low stock alerts for raw materials

---

### Module 11: Settings

**Purpose:** Configure enterprise-level master data used across all modules.

#### Sub-modules:

| Sub-module | Purpose |
|---|---|
| Unit Master | Define units of measure: kg, pcs, m, L, etc. |
| Document Templates | Customize PO, GRN, invoice templates with enterprise branding |
| Company Profile | Name, address, logo, GST/tax details |
| Stage Master | Configure production stages for job cards |
| Product Catalog | Define finished goods (sold to customers) |
| Raw Material Catalog | Define raw materials (procured from suppliers) |

---

## 4. Workflow Explanations

---

### Workflow A: Standard Production Cycle (No Stock Issues)

```
Step 1:  Sales confirms order
         → Sales Order created (status: Confirmed)
         → Material Request auto-created for all required raw materials

Step 2:  Inventory reviews MR
         → Sufficient stock available
         → MR items approved and issued directly from stock
         → MR status: Fulfilled

Step 3:  Manufacturing sees "FULLY_ISSUED"
         → Manager creates BOM for each product in the order
         → BOM lists all raw materials with required quantities

Step 4:  BOM sent back to Inventory
         → Inventory confirms materials are physically issued to production floor
         → Job Cards created per production stage

Step 5:  Floor team works through each stage
         → Job Card status progresses: pending → in_process → completed_production

Step 6:  All job cards reach "completed_production"
         → Manager approves for dispatch
         → Sales Order marked "Dispatched"
         → Order closed
```

---

### Workflow B: Procurement Cycle (Stock Shortage)

```
Step 1:  Inventory reviews MR
         → Insufficient stock for one or more items
         → Creates Indent for shortfall quantity

Step 2:  Procurement receives Indent
         → Creates RFQ, sends to 2–3 suppliers
         → Suppliers respond with quotes

Step 3:  Procurement compares quotes
         → Selects winning supplier
         → Purchase Order raised and sent to supplier

Step 4:  Supplier delivers goods to warehouse
         → Procurement runs "Receive Stock"
         → GRN auto-created (status: Pending)

Step 5:  Inventory confirms GRN
         → Enters actual quantities received for each item

         Case A — All accepted:
           → GRN: Confirmed
           → Stock updated
           → MR items: issued
           → Indent: closed (if all items received)

         Case B — Partial delivery:
           → GRN: Confirmed
           → Stock updated for accepted qty
           → Draft follow-up PO auto-created for shortfall
           → Indent item reset for remainder

         Case C — All rejected:
           → GRN: Confirmed
           → No stock update
           → MR items: rejected
           → RTV flow triggered
           → Indent reset for fresh order

Step 6:  Once MR is fully fulfilled
         → Manufacturing proceeds with BOM creation
```

---

### Workflow C: Short Delivery (Partial GRN)

```
Scenario: Ordered 1,000 units. Supplier delivers only 600.

Step 1:  Inventory confirms GRN
         → accepted_qty = 600, rejected_qty = 0 per item
         → GRN item status = "partial"

Step 2:  System auto-actions (immediate, no manual step required):
         a. Raw material stock updated: +600 units
         b. MR item updated: quantity_issued = 600, status = issued
         c. Indent item: shortage_quantity = 400 (remaining), status = pending
         d. Draft follow-up PO created with original supplier for 400 units

Step 3:  GRN page shows:
         "Short Delivery — Follow-up PO created.
          Go to Indent to review and send it."

Step 4:  Procurement opens indent
         → Reviews the auto-created draft PO (400 units, same supplier)
         → Adjusts price if needed → Sends PO to supplier

Step 5:  Supplier delivers remaining 400 units
         → New GRN created → Confirmed by inventory
         → Stock +400

Step 6:  Indent item: received_quantity = 1,000 (total)
         → Indent auto-closes
         → MR fully fulfilled
         → Manufacturing can proceed
```

---

### Workflow D: Damaged Goods / Return to Vendor

```
Scenario: Ordered 500 units. Supplier delivers 500, but 50 are visibly damaged.

Step 1:  Inventory confirms GRN
         → accepted_qty = 450, rejected_qty = 50
         → Rejection reason: "Damaged"
         → GRN item status = "partial"
         → rtvStatus auto-set to "pending" on that item

Step 2:  System auto-actions:
         a. Stock updated: +450 units
         b. MR item: quantity_issued = 450, status = issued
         c. rtvStatus = "pending" on rejected GRN item

Step 3:  GRN page shows orange "Return to Vendor" card:
         "Steel Rod × 50 — Damaged | [Mark as Returned]"

Step 4:  Warehouse physically returns 50 units to supplier
         → Clicks "Mark as Returned" button
         → rtvStatus = "returned"

Step 5:  System auto-actions on Mark as Returned:
         a. Indent item reset: shortage_quantity = 50, status = pending
         b. Linked MR item reset to pending
         c. Procurement notified to raise replacement PO

Step 6:  Procurement raises replacement PO for 50 units
         → Supplier delivers replacements
         → New GRN → Confirmed → Stock +50
         → Indent closes
```

---

## 5. Access Control Logic

### Role-Based Restrictions

- Permissions are enforced at both the **API level** (NestJS guards reject unauthorized requests) and the **UI level** (sidebar items hidden, buttons disabled or hidden)
- A user missing a specific permission cannot access the endpoint even by navigating directly to the URL — they receive a 403 Forbidden response
- Each enterprise's data is isolated by `enterpriseId` in every database query — no cross-enterprise data access is possible

### Approval Hierarchy

| Action | Who Can Perform It |
|---|---|
| Create Sales Order | Sales (with permission) |
| Approve / Issue Material Request | Inventory Manager |
| Create Indent | Inventory |
| Create and Send Purchase Order | Procurement |
| Release items to Inventory (create GRN) | Procurement |
| Confirm GRN (accept/reject goods) | Inventory Warehouse Staff |
| Create BOM | Manufacturing Manager |
| Update Job Card Progress | Floor Supervisor |
| Approve Job Card for Dispatch | Manufacturing Manager |
| Force-release production (bypass material hold) | Manufacturing Manager |
| Mark items as Returned to Vendor | Inventory |

---

## 6. Edge Cases & Rules

### Partial Actions

| Scenario | System Behavior |
|---|---|
| GRN confirmed with mix of confirmed + partial + rejected items | GRN status = `confirmed`; each item independently has its own terminal status |
| MR item where accepted_qty = 0 (all rejected) | MR item status = `rejected` (NOT `issued`); MR not marked fulfilled |
| Reorder clicked when all items already received | API returns error: "All items have been fully received — nothing to re-order" |
| GRN re-confirmation attempted on confirmed GRN | API blocks: "GRN is already confirmed" |
| Indent closure | Auto-closes only when every item's `received_quantity ≥ shortage_quantity` |
| Multiple short deliveries on same indent | Each triggers its own draft follow-up PO; procurement reviews and sends each independently |
| MR item issued partially then remainder rejected | `quantity_issued` reflects what was actually accepted; MR shows as `partially_fulfilled` |

---

### Validation Rules

| Rule | Where Enforced |
|---|---|
| Rejection reason is required when rejected_qty > 0 | Client-side (form) + Server-side (API) |
| BOM must have at least one material with qty > 0 | Client-side validation before API call |
| Purchase Order cannot be sent without a supplier | API validation |
| Job card cannot start without FULLY_ISSUED materials (unless force = true) | API check on start-production endpoint |
| MR quantity_issued cannot exceed quantity_requested | API enforced |
| Stock cannot go negative | API blocks stock deduction that would result in negative balance |
| Confirmed By (employee) is required when confirming GRN | Client-side required field |
| GRN Received Qty must be ≥ Accepted Qty | Client-side auto-sync (rejected = received − accepted) |

---

### Error Scenarios

| Error Message | Cause | Resolution |
|---|---|---|
| "Materials not fully issued" on job card start | MR items not all in `issued` status | Use "Release for Mfg" button to force-start, or wait for inventory to issue |
| "Nothing to re-order" on Reorder button | Indent items show received_quantity = shortage_quantity (data inconsistency) | Contact Admin to correct indent item quantities |
| GRN stuck in `partially_confirmed` | Edge case from older version where `partial` items weren't counted as terminal | Fixed in current version; existing records can be corrected by Admin |
| "GRN is already confirmed" | Attempting to re-confirm a completed GRN | No action needed — GRN is complete |
| "No items have been received yet" | Procurement tries to release before receiving stock | Procurement must first run "Receive Stock" on the indent |
| "Add at least one material to the BOM" | BOM creation submitted with empty material list | Add at least one raw material or custom material before submitting |

---

## 7. UI Behavior Per Screen

---

### GRN Detail Page — Pending State

**What the user sees:**
- Blue info banner: "Awaiting Confirmation — Quantities below are pre-filled from procurement. Update if different."
- Items table with editable inputs:
  - Sent Qty (read-only — what procurement dispatched)
  - Received Qty (editable InputNumber — what physically arrived)
  - Accepted Qty (editable — auto-syncs: rejected = received − accepted)
  - Rejected Qty (auto-calculated, read-only display)
  - Rejection Reason dropdown (appears only when rejected qty > 0, required)
  - Notes (optional free text)
- "Confirmed By" employee dropdown — required before submission
- Notes field for overall delivery remarks
- Info box: "What happens after confirmation?" (stock update, RTV, MR issuance)
- Bottom buttons: **Confirm Receipt** (green, large) | **Reject GRN** (red, large)

---

### GRN Detail Page — Confirmed State

**What the user sees:**

1. **Green confirmation card** (top):
   - "GRN Fully Confirmed" or "GRN Partially Confirmed"
   - Confirmed by [Employee Name] on [Date]
   - Stats: Items Accepted / Qty Accepted / Qty Rejected / Acceptance Rate %
   - Tags: "Stock updated in inventory" | "Materials issued to manufacturing" | "View Indent [IND-XXXXXX]"

2. **Short Delivery alert** (if partial items exist — blue):
   - Lists items with short delivery and accepted quantities
   - Button: "Go to Indent — Review Follow-up PO"

3. **Re-order Rejected Items alert** (if rejected qty > 0 — orange/warning):
   - Lists items with rejection details
   - Button: "Re-order Rejected Items" | "View Indent"

4. **Return to Vendor card** (if rtvStatus = pending — orange):
   - Per-item rows with item name, rejected qty, rejection reason
   - Per-item button: "Mark as Returned"

5. **Returned to Vendor success alert** (if all rtv items returned — green):
   - "X items returned to vendor. Replacement POs have been created."

6. **Receipt Details card**:
   - GRN Number | Status | Supplier | Purchase Order | Linked Indent | GRN Date
   - Released By (Procurement) | Confirmed By (Inventory) | Confirmed Date

7. **Items table** (color-coded rows):
   - Green background: confirmed items
   - Yellow background: partial / short delivery items
   - Red background: rejected items
   - Columns: Material, Sent Qty, Received Qty, Accepted Qty, Rejected Qty, Rejection Reason, Notes, Status

---

### BOM Creation Modal

**What the user sees:**
- Modal header: "Create Bill of Materials — [Order Number] — [Customer Name]"
- **Products summary strip** at top: chips showing each product in the order with quantities
- **Raw Materials section** with "Add Material" button

**Per material row:**
- Row header: Material number + Delete button
- **Select dropdown** (searchable): All active inventory raw materials
  - Each option shows: Material name, material code, stock level badge (green if available, red if zero)
  - Type to filter by name or code
  - Clear button to deselect
- **Custom name input** (shown below when no inventory item selected):
  - Text field: "Or enter custom material name"
  - Blue "Custom Material" tag appears when name is entered
- **Required Quantity**: Full-width large InputNumber field with label
- **Unit of Measure**: Auto-filled and disabled for inventory items; editable input for custom materials
- If inventory item selected: "Inventory Item — Stock available: X units" badge shown

**Summary bar** (appears when at least one valid item added):
- "X inventory items, Y custom materials — Ready to create BOM"

**Footer buttons:**
- "Create BOM" (green, large) — disabled until at least one valid item exists
- "Cancel" (large)

---

### Manufacturing PO Detail Page

**What the user sees:**
- Back button + Page header with PO number and customer name
- Progress stepper: BOM → Send for Approval → Materials → In Production → Completed → Dispatch
- Per-product item cards showing:
  - Product name and quantity
  - Manufacturing status badge (color-coded)
  - Material issuance progress
  - "Release for Mfg" button (shown when materials not fully issued)
  - "Start Production" button (shown when FULLY_ISSUED)
  - Current job card status (if exists)

**BOM section:**
- Table listing all BOM materials
- Lock icon on approved/locked items
- Blue "Custom" tag on custom materials
- Available stock shown next to each item

**Job Card section:**
- List of job cards with status badges
- Progress bars per stage
- "View Job Card" button to open detail

---

## 8. Summary

### Module Ownership & Trigger Map

| Module | Owned By | Creates | Automatically Triggers |
|---|---|---|---|
| Sales Orders | Sales | Order + line items | Material Request |
| Material Requests | Manufacturing → Inventory | MR items | Indent (if stock insufficient) |
| Indents | Inventory | Indent items | Purchase Order (by procurement) |
| Quotations / RFQ | Procurement | Price quotes | Purchase Order (on selection) |
| Purchase Orders | Procurement | PO to supplier | GRN (on stock receipt) |
| Goods Receipts | Inventory | Stock updates | MR issuance, RTV, follow-up PO |
| Manufacturing | Production | BOM → Job Cards | Stage completion → Dispatch |
| Inventory | Inventory | Stock ledger entries | Block production if 0 stock |

---

### Key Business Rules — Quick Reference

| Rule | Detail |
|---|---|
| Stock updates only on accepted qty | Rejected goods never enter inventory |
| MR is fulfilled only when all items issued/rejected | Partial issuance = partially_fulfilled status |
| Short delivery auto-creates follow-up PO | No manual intervention needed |
| Damaged goods trigger RTV flow | Procurement notified only after physical return |
| Production blocked without materials | Override available via "Release for Mfg" button |
| Indent auto-closes when all items received | No manual close required |
| All rejections reset indent for fresh order | System handles the full reset automatically |
| Enterprise data is fully isolated | No cross-enterprise data visibility ever |

---

### Core Principle

**Every module feeds the next.** A rejected item at any stage automatically resets the upstream documents for re-processing — no manual cleanup, no missed steps, no lost traceability. Every action is logged, every document is linked, and every department sees exactly what they need to act on.

---

*This document covers VAB Enterprise platform version as of March 2026.*
*For support: contact your system administrator or raise a ticket via the platform's support module.*
