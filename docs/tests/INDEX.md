# vaberp ERP — Master Test Suite Index

> **Read this first:** [`00-test-strategy.md`](./00-test-strategy.md) defines the template, conventions, priorities, and seed data that every per-module file follows.
> **Total planned test cases:** ≈ 2,400 across 22 module files (estimate; actual counts will be filled as each phase delivers).
> **Roll-up status:** Phase 0 complete (strategy + this index). Module files are pending — see "Phase status" below.

---

## 1. Phase status

| Phase | Files | Est. TCs | Status | Owner | Delivery run |
|---|---|---|---|---|---|
| **Phase 0** — Foundation | `00-test-strategy.md`, `INDEX.md` | — | ✅ DONE | Claude | Run 1 |
| **Phase 1** — Critical path (auth + quotations) | `01-authentication.md`, `02-quotations.md` | ~280 | ⏳ PENDING | — | Run 2 |
| **Phase 2** — Sales & production | `03-sales-orders.md`, `04-manufacturing.md`, `05-invoices.md` | ~440 | ⏳ PENDING | — | Run 3 |
| **Phase 3** — Customers & people | `06-customers.md`, `07-crm.md`, `08-enquiries.md`, `11-employees-rbac.md` | ~420 | ⏳ PENDING | — | Run 4 |
| **Phase 4** — Inventory & procurement | `09-inventory.md`, `10-products.md`, `12-procurement.md` | ~340 | ⏳ PENDING | — | Run 5 |
| **Phase 5** — Niche & ops | `13-waste-mgmt.md`, `14-service-mgmt.md`, `15-machinery-maintenance.md`, `16-tasks-team-organizer.md`, `17-reports.md`, `18-settings.md` | ~440 | ⏳ PENDING | — | Run 6 |
| **Phase 6** — Admin panels & E2E | `19-superadmin.md`, `20-reseller.md`, `99-cross-module-e2e.md` | ~260 | ⏳ PENDING | — | Run 7 |

Legend: ✅ done · 🔵 in progress · ⏳ pending · 🟡 partial · 🔴 blocked

---

## 2. Module catalogue

### 2.1 Phase 1 — Critical path

| # | File | Module | Submodules | TCs (est.) | P0 | P1 | P2 | P3 |
|---|---|---|---|---|---|---|---|---|
| 01 | [`01-authentication.md`](./01-authentication.md) | Authentication | EMP login, ENT login, REG, OTP, PWD reset, RSLR, SADM, LOGOUT, PERM | ~120 | 35 | 45 | 30 | 10 |
| 02 | [`02-quotations.md`](./02-quotations.md) | Quotations | LIST, CREATE, EDIT, DETAIL, BUILDER, ACCEPT, REJECT, STATUS, VERSION, PRINT | ~160 | 40 | 60 | 45 | 15 |

### 2.2 Phase 2 — Core sales/production

| # | File | Module | Submodules | TCs (est.) | P0 | P1 | P2 | P3 |
|---|---|---|---|---|---|---|---|---|
| 03 | [`03-sales-orders.md`](./03-sales-orders.md) | Sales Orders (Purchase Orders UI alias) | LIST, DETAIL, EDIT, CANCEL, DISPATCH, STATUS | ~120 | 30 | 50 | 30 | 10 |
| 04 | [`04-manufacturing.md`](./04-manufacturing.md) | Manufacturing (Job Cards + BOM + stages) | JC-CREATE, JC-DETAIL, JC-STAGES, BOM, MR, WASTE-CAPTURE, DISPATCH | ~200 | 50 | 80 | 50 | 20 |
| 05 | [`05-invoices.md`](./05-invoices.md) | Invoices | LIST, CREATE, DETAIL, EDIT, PAYMENT, PROFORMA, EMAIL, PDF | ~120 | 35 | 45 | 30 | 10 |

### 2.3 Phase 3 — Customers & people

| # | File | Module | Submodules | TCs (est.) | P0 | P1 | P2 | P3 |
|---|---|---|---|---|---|---|---|---|
| 06 | [`06-customers.md`](./06-customers.md) | Customers | LIST, CREATE, DETAIL, MERGE, IMPORT | ~80 | 20 | 30 | 20 | 10 |
| 07 | [`07-crm.md`](./07-crm.md) | CRM | LEAD-LIST, LEAD-DETAIL, FOLLOWUP, ASSIGN, REPORT, TEAM | ~120 | 30 | 45 | 30 | 15 |
| 08 | [`08-enquiries.md`](./08-enquiries.md) | Enquiries | LIST, CREATE, DETAIL, CONVERT, ATTACH, FOLLOWUP | ~80 | 20 | 30 | 20 | 10 |
| 11 | [`11-employees-rbac.md`](./11-employees-rbac.md) | Employees + RBAC | EMP-LIST, EMP-CREATE, PERM-MATRIX, DEPT, DESIG, REPORT-HIER, DATA-SCOPE | ~140 | 45 | 55 | 30 | 10 |

### 2.4 Phase 4 — Inventory & procurement

| # | File | Module | Submodules | TCs (est.) | P0 | P1 | P2 | P3 |
|---|---|---|---|---|---|---|---|---|
| 09 | [`09-inventory.md`](./09-inventory.md) | Inventory + GRN + Material Requests | INV-LIST, INV-LEDGER, GRN, MR, ADJUSTMENT | ~120 | 30 | 45 | 30 | 15 |
| 10 | [`10-products.md`](./10-products.md) | Products | LIST, CREATE, DETAIL, CATEGORY, SUBCATEGORY, TIERS | ~100 | 25 | 40 | 25 | 10 |
| 12 | [`12-procurement.md`](./12-procurement.md) | Procurement (Suppliers, RFQ, Indents, PO) | SUP, IND, RFQ, PO | ~120 | 30 | 45 | 30 | 15 |

### 2.5 Phase 5 — Niche & ops

| # | File | Module | Submodules | TCs (est.) | P0 | P1 | P2 | P3 |
|---|---|---|---|---|---|---|---|---|
| 13 | [`13-waste-mgmt.md`](./13-waste-mgmt.md) | Waste management | WST-INV, WST-DISP, WST-PARTY, WST-ANL | ~100 | 25 | 35 | 25 | 15 |
| 14 | [`14-service-mgmt.md`](./14-service-mgmt.md) | Service management | SVC-PROD, SVC-BOOK, SVC-EVENT, SVC-REV | ~80 | 20 | 30 | 20 | 10 |
| 15 | [`15-machinery-maintenance.md`](./15-machinery-maintenance.md) | Machinery + Maintenance | MACH, SPARES, WO, REM, DOWN, VENDOR | ~100 | 25 | 35 | 25 | 15 |
| 16 | [`16-tasks-team-organizer.md`](./16-tasks-team-organizer.md) | Tasks + Team + Organizer | TASK, TEAM-UPD, ORG | ~60 | 15 | 25 | 15 | 5 |
| 17 | [`17-reports.md`](./17-reports.md) | Reports | RPT-CUST, RPT-EMP, RPT-ENQ, RPT-FU, RPT-PROS | ~40 | 10 | 15 | 10 | 5 |
| 18 | [`18-settings.md`](./18-settings.md) | Settings | BRAND, PRINT-TPL, STAGE-MASTER, UNIT-MASTER, SOURCE, STATUS, AUDIT-LOGS, EMAIL-TPL | ~60 | 15 | 25 | 15 | 5 |

### 2.6 Phase 6 — Admin & E2E

| # | File | Module | Submodules | TCs (est.) | P0 | P1 | P2 | P3 |
|---|---|---|---|---|---|---|---|---|
| 19 | [`19-superadmin.md`](./19-superadmin.md) | Super-admin panel | DASH, ENT-MGMT, RSLR-MGMT, SUB, COUPON, SVC-MASTER, SUPPORT | ~120 | 30 | 45 | 30 | 15 |
| 20 | [`20-reseller.md`](./20-reseller.md) | Reseller portal | DASH, PROFILE, WALLET, BILLING, SUB, PLAN, TENANT, USAGE, COMM, RPT | ~100 | 25 | 35 | 25 | 15 |
| 99 | [`99-cross-module-e2e.md`](./99-cross-module-e2e.md) | E2E cross-module flows | Q2P (Quote-to-PO), L2I (Lead-to-Invoice), MFG-PIPE, WASTE-CAPTURE, RSLR-ONBOARD, SADM-PROVISION | ~40 | 20 | 15 | 5 | 0 |

---

## 3. Coverage by feature area

| Feature area | Module files | TC total |
|---|---|---|
| Authentication & RBAC | 01, 11 | ~260 |
| Sales pipeline | 02, 03, 06, 07, 08 | ~560 |
| Production | 04, 09, 10, 12 | ~540 |
| Finance | 05 | ~120 |
| Operations | 13, 14, 15, 16 | ~340 |
| Configuration | 17, 18 | ~100 |
| Platform admin | 19, 20 | ~220 |
| End-to-end | 99 | ~40 |

---

## 4. Coverage by test type (target distribution)

For each module file, aim for the following mix (adjust per module — e.g. RBAC modules will have more permission tests):

| Type | Target % | Rationale |
|---|---|---|
| Functional | 35% | Happy paths must be exhaustive |
| Negative | 20% | Each input field has at least one invalid case |
| Boundary | 10% | Min/max/length/date edges |
| Permission | 15% | Every restricted action × wrong role |
| UI / UX state | 8% | Loading / empty / error / disabled |
| API contract | 7% | Direct API tests bypassing UI |
| Integration | 3% | Adjacent module wiring |
| Edge / regression | 2% | Concurrency, locked state, known bugs |

---

## 5. Cross-cutting test inventory (must appear in every module)

Per `00-test-strategy.md` §10, these obligations appear in every module file. Tracking here:

| Obligation | 01 | 02 | 03 | 04 | 05 | 06 | 07 | 08 | 09 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Auth required (401) | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| Wrong-role (403) | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| Data-scope filter | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | NA | NA | NA | NA |
| Audit-log emission | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | NA | ⏳ | ⏳ | ⏳ |
| Pagination defaults | NA | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | NA | ⏳ | ⏳ | ⏳ |
| Search & filter | NA | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | NA | ⏳ | ⏳ | ⏳ |
| Concurrent edit | NA | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | NA | ⏳ | ⏳ | ⏳ |
| Locked/immutable | NA | ⏳ | ⏳ | ⏳ | ⏳ | NA | NA | NA | ⏳ | NA | NA | ⏳ | ⏳ | NA | ⏳ | NA | NA | NA | NA | NA |
| Empty list state | NA | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| Network failure | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| 401 mid-session | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |

---

## 6. ID-prefix registry

Each module file owns its `TC-<MODULE>-` ID prefix; sub-prefix per submodule. Recorded here to prevent collisions:

| File | Module prefix | Submodule prefixes |
|---|---|---|
| 01 | `TC-AUTH-` | `EMP`, `ENT`, `REG`, `OTP`, `PWD`, `RSLR`, `SADM`, `LOGOUT`, `PERM` |
| 02 | `TC-QUOT-` | `LIST`, `CREATE`, `EDIT`, `DETAIL`, `BUILDER`, `ACCEPT`, `REJECT`, `STATUS`, `VERSION`, `PRINT` |
| 03 | `TC-SO-` | `LIST`, `DETAIL`, `EDIT`, `CANCEL`, `DISPATCH`, `STATUS` |
| 04 | `TC-MFG-` | `JC`, `STAGES`, `BOM`, `MR`, `WASTE`, `DISPATCH` |
| 05 | `TC-INVO-` | `LIST`, `CREATE`, `DETAIL`, `EDIT`, `PAY`, `PRO`, `EMAIL`, `PDF` |
| 06 | `TC-CUST-` | `LIST`, `CREATE`, `DETAIL`, `MERGE`, `IMPORT` |
| 07 | `TC-CRM-` | `LEAD`, `FU`, `ASSIGN`, `RPT`, `TEAM` |
| 08 | `TC-ENQ-` | `LIST`, `CREATE`, `DETAIL`, `CONVERT`, `ATTACH`, `FU` |
| 09 | `TC-INV-` | `LIST`, `LEDGER`, `GRN`, `MR`, `ADJ` |
| 10 | `TC-PROD-` | `LIST`, `CREATE`, `DETAIL`, `CAT`, `SUB`, `TIERS` |
| 11 | `TC-EMP-` | `LIST`, `CREATE`, `PERM`, `DEPT`, `DESIG`, `HIER`, `SCOPE` |
| 12 | `TC-PROC-` | `SUP`, `IND`, `RFQ`, `PO` |
| 13 | `TC-WST-` | `INV`, `DISP`, `PARTY`, `ANL` |
| 14 | `TC-SVC-` | `PROD`, `BOOK`, `EVENT`, `REV` |
| 15 | `TC-MACH-` | `ASSET`, `SPARE`, `WO`, `REM`, `DOWN`, `VENDOR` |
| 16 | `TC-TASK-` | `TASK`, `TEAM`, `ORG` |
| 17 | `TC-RPT-` | `CUST`, `EMP`, `ENQ`, `FU`, `PROS` |
| 18 | `TC-SET-` | `BRAND`, `PRINT`, `STAGE`, `UNIT`, `SOURCE`, `STATUS`, `AUDIT`, `EMTPL` |
| 19 | `TC-SADM-` | `DASH`, `ENT`, `RSLR`, `SUB`, `COUPON`, `SVC`, `SUPPORT` |
| 20 | `TC-RSLR-` | `DASH`, `PROFILE`, `WALLET`, `BILL`, `SUB`, `PLAN`, `TENANT`, `USAGE`, `COMM`, `RPT` |
| 99 | `TC-E2E-` | `Q2P`, `L2I`, `MFG`, `WASTE`, `RSLR`, `SADM` |

---

## 7. Smoke-test subset

Pulled from across modules — should run in < 10 minutes per environment:

| TC-ID | Title | Source file |
|---|---|---|
| TC-AUTH-EMP-001 | Login with valid credentials | 01 |
| TC-AUTH-ENT-001 | Enterprise OTP login happy path | 01 |
| TC-QUOT-LIST-001 | Quotations list loads with pagination | 02 |
| TC-QUOT-CREATE-001 | Create quotation with one item happy path | 02 |
| TC-QUOT-ACCEPT-001 | Accept quote → SO created → quote locked | 02 |
| TC-SO-LIST-001 | Sales-orders list loads | 03 |
| TC-MFG-JC-001 | Job-card creation from accepted SO | 04 |
| TC-INVO-CREATE-001 | Invoice from completed SO | 05 |
| TC-WST-INV-001 | Production-waste capture appears in waste-inventory | 13 |
| TC-PERM-001 | Employee without permission cannot see button | 11 |
| TC-LOGOUT-001 | Logout clears cookie + redirects | 01 |

---

## 8. Quick links

- 📋 Strategy: [`00-test-strategy.md`](./00-test-strategy.md)
- 📐 Per-module template: see strategy §6
- 🏷️ ID convention: see strategy §2
- 👥 Test accounts: see strategy §8.1
- 🐞 Bug-report template: see strategy §9.3
- 📚 FSD reference: [`../FSD.md`](../FSD.md)

---

## 9. Change log

| Date | Phase | Author | Change |
|---|---|---|---|
| Run 1 | 0 | Claude | Initial strategy + index created |
