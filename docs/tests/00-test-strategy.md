# vaberp ERP — Test Strategy & Conventions

> **Document role:** master template for every per-module test file under `docs/tests/`.
> **Audience:** internal QA + dev team.
> **Last revised:** Phase 0.

---

## 1. Scope & Coverage Goals

### 1.1 What is in scope

| Area | Coverage |
|---|---|
| Frontend (`Frontend/src/app/`) | Every route, every screen, every interactive element (button, dropdown, link, form field) |
| Backend (`API/src/modules/`) | Every public route × every guard × every DTO × every documented status code |
| RBAC | Every role (`enterprise`, `employee`, `super_admin`, `reseller`) × every restricted action |
| Cross-module flows | E2E happy paths (Enquiry→Quote→PO→JC→Invoice, Production-waste capture, Reseller→Tenant onboarding) |
| Regression | Recorded production bugs (link issues from `audit-logs` and recent commits) |

### 1.2 What is out of scope (handled separately)

- Performance / load testing — tracked in `docs/perf/`
- Security pen-test — tracked in `docs/security/`
- Cross-browser visual regression — Playwright snapshot job (CI)
- Mobile-app UI — different repo
- Email/SMS template rendering — covered by integration tests inside `email-templates` module

---

## 2. Test-case ID convention

### 2.1 Format

```
TC-<MODULE>-<SUBMODULE>-<###>
```

| Token | Length | Rule |
|---|---|---|
| `TC` | fixed | literal "TC" prefix |
| `<MODULE>` | 3–5 | uppercase short code (see 2.2) |
| `<SUBMODULE>` | 3–8 | uppercase short code; omit if module has no submodules |
| `<###>` | 3 digits | sequential within (module, submodule), zero-padded |

Examples:

| TC-ID | Meaning |
|---|---|
| `TC-AUTH-EMP-001` | Auth · Employee Login · case 1 |
| `TC-AUTH-OTP-014` | Auth · OTP Verification · case 14 |
| `TC-QUOT-LIST-007` | Quotations · List page · case 7 |
| `TC-MFG-JC-042` | Manufacturing · Job Card · case 42 |
| `TC-WST-INV-018` | Waste · Inventory · case 18 |
| `TC-E2E-Q2P-001` | Cross-module · Quote-to-PO · case 1 |

### 2.2 Module short codes

| Code | Module | Code | Module |
|---|---|---|---|
| `AUTH` | Authentication | `INV` | Inventory |
| `QUOT` | Quotations | `PROD` | Products |
| `SO` | Sales Orders | `EMP` | Employees / RBAC |
| `MFG` | Manufacturing | `PROC` | Procurement |
| `INVO` | Invoices | `WST` | Waste management |
| `CUST` | Customers | `SVC` | Service management |
| `CRM` | CRM Leads | `MACH` | Machinery / Maintenance |
| `ENQ` | Enquiries | `TASK` | Tasks / Team / Organizer |
| `RPT` | Reports | `SET` | Settings |
| `SADM` | Super-admin | `RSLR` | Reseller |
| `E2E` | End-to-end flows | | |

### 2.3 Submodule short codes (per module)

Submodule codes are defined at the top of each per-module file. Example for `AUTH`:

| Code | Submodule |
|---|---|
| `EMP` | Employee login |
| `ENT` | Enterprise login (email + OTP/password) |
| `REG` | Registration |
| `OTP` | OTP verification |
| `PWD` | Password reset |
| `RSLR` | Reseller login |
| `SADM` | Super-admin login |
| `LOGOUT` | Logout flow |
| `PERM` | Permission propagation |

---

## 3. Priorities

| Priority | Definition | Examples | Run frequency |
|---|---|---|---|
| **P0 — Critical** | Blocks core money path or security; failure causes data loss or revenue loss | Login fails, can't create quotation, accept-to-PO breaks, payment edit corrupts amount, RBAC bypass | Every PR + every release |
| **P1 — High** | Significant feature degradation; common user flow broken | Status change fails, list filter wrong, email send 500, audit-trail empty | Every PR + nightly |
| **P2 — Medium** | Minor feature break or rare flow; workaround exists | Dropdown reorder, tooltip wording, sidebar item hidden incorrectly | Nightly + weekly |
| **P3 — Low** | Cosmetic / edge / negligible business impact | Empty-state illustration, color contrast, browser console warning | Weekly + release-candidate |

**Rule of thumb:** if the test failing would page on-call, it's P0. If the customer would notice within a day, P1. If a careful tester would notice, P2. Otherwise P3.

---

## 4. Test types

| Type | What it verifies | Example |
|---|---|---|
| **Functional** | Happy-path behaviour matches spec | "Login with valid creds → /dashboard" |
| **Negative** | Invalid input / missing data / forbidden state is rejected with correct message | "Login with wrong password → 401, toast 'Invalid email or password'" |
| **Boundary** | Min/max/empty/length-limit/date-edge cases | "Quantity = 999999 accepted; 1000000 rejected" |
| **Permission** | RBAC matrix enforced; data-scope filters applied | "Employee without `quotations:edit` cannot see Edit button; direct API call returns 403" |
| **UI / UX** | Visual states correct: loading, empty, error, disabled, modal, toast | "Submit button shows spinner during mutation" |
| **API contract** | Endpoint × method × DTO × status × response shape | "POST /quotations returns 201 + `{data: Quotation}`" |
| **Integration** | Two adjacent modules wired correctly | "Quotation accept creates SalesOrder + updates Enquiry" |
| **E2E** | Full multi-screen multi-module business flow | "CRM lead → enquiry → quote → PO → job card → invoice" |
| **Regression** | Reproduces a fixed bug to prevent reintroduction | Linked to commit hash + bug ticket |
| **Smoke** | Quick subset that catches show-stoppers in 5 min | Login + dashboard loads + create-quotation |

---

## 5. Test-case template (canonical)

Every test case is one row in a markdown table. Long-form fields use `<br/>` for line breaks.

```markdown
| TC-ID | Title | Type | Priority | Preconditions | Test data | Steps | Expected result | API contract | Notes |
|---|---|---|---|---|---|---|---|---|---|
| TC-AUTH-EMP-001 | Login with valid credentials | Functional | P0 | Active employee account; on `/login` Employee tab | `email=qa.emp1@vaberp-test.com`<br/>`password=Pass@123` | 1. Type email<br/>2. Type password<br/>3. Click **Sign In** | Toast "Login successful!"<br/>Redirect `/dashboard`<br/>`authStore.user` populated<br/>`access_token` cookie set | `POST /auth/employee/login` →<br/>`200 { data: { token, user, permissions, type:'employee' } }` | First login of session |
```

### 5.1 Field rules

| Field | Required | Format / rule |
|---|---|---|
| **TC-ID** | Yes | Format §2.1; unique across whole repo |
| **Title** | Yes | Imperative, ≤80 chars: "Login with…", "Reject creates audit log…" |
| **Type** | Yes | One of §4 |
| **Priority** | Yes | P0 / P1 / P2 / P3 |
| **Preconditions** | Yes | State the system must be in. One per line via `<br/>`. Reference seed data. |
| **Test data** | Yes if data-driven | Specific values; mark sensitive with `[REDACTED]` placeholders |
| **Steps** | Yes | Numbered. Buttons in **bold**. Field labels in *italics*. |
| **Expected result** | Yes | Observable outcomes (UI + state + side-effects). Each on its own line. |
| **API contract** | Optional | `<METHOD> <path>` → `<status> <body shape>`. Include for API-level tests. |
| **Notes** | Optional | Bug links, related TCs, gotchas. Empty cell = `—`. |

### 5.2 Steps style guide

- Imperative verb-first. ✅ "Click **Sign In**." ❌ "User clicks the sign in button."
- One action per step.
- Reference labels exactly as they appear: **bold** for button labels, *italics* for field labels, `code` for status badges or API paths.
- Don't bake assertions into steps — assertions live in *Expected result*.

### 5.3 Expected-result style guide

- One observable thing per line.
- Order: UI feedback → state change → navigation → side-effects → API.
- Be specific: ✅ "Toast text: 'Login successful!'" ❌ "Success message shown."

---

## 6. Per-module file structure

Every `docs/tests/<NN>-<module>.md` follows this layout:

```markdown
# <Module> — Test Cases

## 1. Coverage matrix
| Screen / API | TCs | P0 | P1 | P2 | P3 |
| ... | ... | ... | ... | ... | ... |

## 2. Submodule short-codes
| Code | Submodule |

## 3. Functional tests
(table of TCs)

## 4. Negative tests
(table of TCs)

## 5. Boundary tests
(table of TCs)

## 6. Permission / RBAC tests
(table of TCs)

## 7. UI / UX state tests
(table of TCs)

## 8. API contract tests
(table of TCs)

## 9. Integration tests (adjacent modules)
(table of TCs)

## 10. Edge cases & failure scenarios
(table of TCs)

## 11. Regression tests (linked to fixed bugs)
(table of TCs)
```

---

## 7. Test environment

### 7.1 Environments

| Env | URL | Purpose | Reset cadence |
|---|---|---|---|
| **Local** | `http://localhost:2262` (FE), `http://localhost:2261` (API) | Developer workstation | On demand |
| **QA** | `http://64.235.43.187:<qa-port>` (PM2 procs `vab-frontend-qa`, `vab-api-qa`) | Manual + automated regression | Nightly DB snapshot restore |
| **Production** | `https://vaberp.com` (PM2 procs `vab-frontend`, `vab-api`) | Smoke + critical-path read-only | Never reset; only smoke tests |

### 7.2 Browsers in scope (priority order)

1. Chrome (latest two stable channels) — P0 + P1 must pass
2. Edge (latest) — P0 must pass
3. Safari 16+ — P0 must pass
4. Firefox (latest) — P1 must pass
5. Mobile Safari iOS 16+ — P0 must pass
6. Mobile Chrome Android — P0 must pass

### 7.3 Screen sizes

| Breakpoint | Range | Coverage |
|---|---|---|
| Desktop | ≥ 1280 | All TCs |
| Laptop | 1024–1279 | All TCs |
| Tablet | 768–1023 | P0 + P1 |
| Mobile | < 768 | P0 only (responsive-tagged TCs) |

### 7.4 Required tooling

- Postman / Bruno collection — `docs/tests/postman/` (TBD)
- Browser dev-tools (Network + Application > Cookies) for API + token inspection
- DB read access (read-only) for verifying side-effects on QA only
- PM2 access on server for `pm2 logs vab-api-qa --lines 200`

---

## 8. Test data — seed conventions

### 8.1 Tenant accounts

| Tenant | URL slug | Email | Password | Subscription | Use for |
|---|---|---|---|---|---|
| **Acme Industries** | `acme` | `acme.admin@vaberp-test.com` | `Acme@123` | Active, plan `pro` | Standard happy-path tests |
| **Beta Mfg** | `beta` | `beta.admin@vaberp-test.com` | `Beta@123` | Expiring in 3 days | Subscription / activation tests |
| **Gamma Corp** | `gamma` | `gamma.admin@vaberp-test.com` | `Gamma@123` | Inactive (blocked) | Negative / blocked tests |
| **DupShare Co.** | `dup1` / `dup2` | `shared.emp@vaberp-test.com` | `Shared@123` | Both active | Multi-enterprise email duplicate test |

### 8.2 Employees per tenant (for Acme)

| Login | Role description | Permissions snapshot | Use for |
|---|---|---|---|
| `qa.viewer@vaberp-test.com / Pass@123` | View-only across modules | All `view=1`, others `=0` | Permission-deny tests |
| `qa.salesrep@vaberp-test.com / Pass@123` | Sales rep | `sales:*:view/create/edit=1`, no delete | Quotation create + edit |
| `qa.salesmgr@vaberp-test.com / Pass@123` | Sales manager (reporting head) | Full sales + reports | Manager-data-scoping tests |
| `qa.invadmin@vaberp-test.com / Pass@123` | Inventory admin | `inventory:*=1`, `procurement:*:view=1` | GRN / stock tests |
| `qa.opsmgr@vaberp-test.com / Pass@123` | Operations manager | All non-admin modules | Cross-module flow |
| `qa.scoped@vaberp-test.com / Pass@123` | Scoped employee | `dataStartDate=2026-01-01`, `ownDataOnly=1` | Data-scope filter tests |

### 8.3 Reseller / super-admin

| Login | Password | Use for |
|---|---|---|
| `rajesh@techresell.in` | `Reseller@123` | Reseller portal tests |
| `admin@vabinformatics.com` | `admin1234` | Super-admin tests |

### 8.4 Reference data (must exist on QA before run)

- ≥ 5 customers (with mobiles `9000000001`–`9000000005`)
- ≥ 5 products with discount tiers (`PROD-001`..`PROD-005`)
- ≥ 3 raw materials (`RM-001`..`RM-003`)
- ≥ 3 stage-master entries (`Cutting`, `Assembly`, `QC`)
- ≥ 2 BOM templates linked to product `PROD-001`
- ≥ 1 quotation in each status: draft, sent, accepted, rejected, expired, po_cancelled
- ≥ 2 waste categories (`Production Waste`, `Scrap Metal`)

If any seed item is missing, mark the affected TC `BLOCKED — seed missing`.

### 8.5 Synthetic-data conventions

- Emails: `<role>.<n>@vaberp-test.com` (no real domains)
- Mobiles: `90000000<NN>` (10 digits, prefix `9`)
- GSTIN: `27ABCDE1234F1Z5` (synthetic but format-valid)
- Pincode: `560001` (synthetic, format-valid)
- Money: `₹` symbol; integers with two decimals (`12345.00`)

---

## 9. Recording results

### 9.1 Result columns appended to each TC during a run

| Status | Meaning |
|---|---|
| **PASS** | All expected results observed |
| **FAIL** | Any expected result missing or wrong |
| **BLOCKED** | Cannot execute (seed missing, env down, dependency broken) |
| **SKIPPED** | Intentionally not run this cycle (with reason) |
| **NA** | Test not applicable in this environment / role |

### 9.2 Run log file

Per cycle, copy the module file to `docs/tests/runs/YYYY-MM-DD-<env>-<module>.md` and fill **Status**, **Actual result**, **Tester**, **Bug ID** columns at the right of each row.

### 9.3 Bug-report template (one per FAIL)

```markdown
## Bug — <one-line summary>

- **Found by:** <name>
- **Date:** YYYY-MM-DD
- **Env:** QA / Local / Prod
- **TC-ID:** TC-XXX-XXX-NNN
- **Priority:** P0/P1/P2/P3
- **Reproduction:**
  1. …
- **Expected:** …
- **Actual:** …
- **Logs / screenshots:** <links>
- **Suspect commit / file:** <file:line or commit hash>
```

---

## 10. Cross-cutting test obligations

Every per-module file MUST include at least one TC for each of the following, even when the module is small:

| Obligation | Why |
|---|---|
| **Auth required for every protected endpoint** | Calling without token returns 401 |
| **Wrong-role rejection** | Calling endpoint as wrong role returns 403 |
| **Data-scope filter** | Employee with `ownDataOnly=1` sees only own records |
| **Audit log emission** | Every create/update/delete writes an `AuditLog` row |
| **Pagination defaults** | List endpoint returns max 20 records and correct `totalRecords` |
| **Search & filter** | Each list filter returns expected subset |
| **Concurrent-edit safety** | Two users editing same record produce sane state (last-write-wins or pessimistic lock per module) |
| **Locked / immutable state** | Edit blocked when entity has `is_locked=true` (where applicable) |
| **Empty list state** | UI illustration + helpful CTA when zero records |
| **Network failure** | UI shows error toast and keeps last good state |
| **401 mid-session** | Token expiry mid-flow redirects to `/login` and clears store |
| **Toast wording** | Exact strings match those in code (audit them, don't guess) |

---

## 11. Pre-flight checklist

Before each test run:

- [ ] QA environment URL reachable (`curl -I http://64.235.43.187:<qa>/health`)
- [ ] PM2 procs online: `vab-frontend-qa`, `vab-api-qa`
- [ ] Test tenants reachable (login test passes for `acme.admin@vaberp-test.com`)
- [ ] DB seed verified (counts of customers, products, raw materials match §8.4)
- [ ] Browser cache cleared, no stale tokens in cookies
- [ ] Run log file branched from current module file
- [ ] Bug-tracker active and you have create permission

---

## 12. Conventions for *automation-friendly* tests

When a TC is intended to be runnable in Playwright/Jest, additionally include:

- **Selector strategy:** `data-testid="…"` preferred; if not present, document the CSS selector and flag it for adding `data-testid` later.
- **Idempotency:** test must succeed when re-run on the same DB (use unique suffixes like `__date.now()__`).
- **Cleanup:** if test creates data, document the cleanup endpoint or DB query needed.
- **Tags:** add `[smoke]`, `[regression]`, `[critical]`, `[mobile]` tags in the Notes column for filtering.

---

## 13. Audit trail

| Date | Author | Change |
|---|---|---|
| Phase 0 | Claude (audit) | Initial strategy + template |
