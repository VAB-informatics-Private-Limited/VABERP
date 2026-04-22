# QA Audit Report — VAB Enterprise ERP

**Target:** `vaberp.com` (production, master branch)
**Date:** 2026-04-22
**Method:** Static code review (parallel specialized agents), live HTTP probing against production, PM2 runtime log analysis
**Testing stance:** Read-only. No writes made against production DB.

---

## Executive Summary

| Area | Grade | Notes |
|---|---|---|
| API status codes | **C** | Mostly correct; login 400 vs 401 bug |
| Auth (JWT) | **C-** | Works, but localStorage token + no rate limit on login |
| RBAC | **C** | Working model; ~22% of controllers ungated |
| Multi-tenancy | **B-** | Solid in major modules; leaky in waste-disposal internals |
| Error handling | **D** | Silent audit failures, leaked DB errors |
| Data integrity | **C-** | Hard deletes, race conditions, NaN propagation |
| Security hygiene | **D** | 1 critical injection, token storage, exposed Swagger |
| Deploy stability | **D** | 38k restarts, no health probe, race on file serving |
| Frontend state | **B-** | Mostly clean; cross-portal tab leak + no cache clear on logout |

**Top 3 priorities:** C-1 (SQL injection) → C-3 (audit silence) → C-4 (password serialization).

---

## 🔴 CRITICAL ISSUES

### C-1. SQL Injection in Waste Analytics
**Evidence:** `API/src/modules/waste-analytics/waste-analytics.service.ts:69-70` (also lines 57, 78, 99, 118, 137, 154, 179)

```js
const q = this.dataSource.query(`
  WHERE wi.enterprise_id = $1
    ${from ? `AND wi.created_date >= '${from}'` : ''}
```

`from` and `to` query params are string-interpolated directly into SQL. Attacker can pass `from=2024-01-01' OR '1'='1` to exfiltrate rows or mutate the query.
**Affected methods:** `getBySource`, `getByCategory`, `getDisposalMethods`, `getMonthlyByPartner`, `getMonthlyByCategory`.

### C-2. JWT Tokens Stored Unencrypted in `localStorage`
**Evidence:**
- `Frontend/src/stores/authStore.ts:127`
- `Frontend/src/stores/superAdminStore.ts:40`
- `Frontend/src/stores/resellerStore.ts:66`

JWT persisted by Zustand `persist` middleware in plaintext. Any XSS lifts the token for the JWT lifetime. Not `httpOnly`.

### C-3. Audit Trail Silently Dropped for Financial Operations
**Evidence:** `.catch(() => {})` pattern on `auditLogsService.log(...)` in:
- `quotations.service.ts:232, 344, 446, 531, 578, 596`
- `invoices.service.ts:205, 319, 347, 428, 485`
- `indents.service.ts:107, 168, 435, 461, 480, 552, 647, 727, 813, 911`
- `notifications.service.ts:34`
- `team-updates.service.ts:53`

Every revenue-affecting action swallows audit failures. Compliance risk.

### C-4. Password Columns Not Protected from Serialization
**Evidence:**
- `API/src/modules/employees/entities/employee.entity.ts:50` — no `@Exclude()` / `select: false`
- `API/src/modules/enterprises/entities/enterprise.entity.ts:25` — same

Any `repository.find()` without explicit select returns the bcrypt hash.

### C-5. NestJS 38,546 Restart Count on `vab-api`
Historical instability; deploy pipeline tolerates unrunnable builds going live. No pre-deploy smoke check.

### C-6. Frontend Deploy Race Produces "Cannot find module" 500s
`.next/server/*.js` missing during ~30s rebuild; users see blank pages / 500s during deploys.

---

## 🟠 MAJOR BUGS

### M-1. Login with Wrong Credentials Returns 400 Instead of 401
**Repro:** `POST /api/auth/employee/login {"email":"x@y.com","password":"wrong"}` → HTTP 400.

### M-2. No Rate Limiting on Authentication Endpoints
Global throttler set to 100/60s, but no tight limit on `/auth/*`. Brute-force possible.

### M-3. Controllers Missing `@RequirePermission` Decorator (22% of controllers)
- `enterprises.controller.ts`, `email.controller.ts`, `enterprise-branding.controller.ts`
- `notifications.controller.ts`, `interest-statuses.controller.ts`
- `super-admin.controller.ts` — guard-only, no granular permission
- `resellers.controller.ts` — guard-only

### M-4. ResellerGuard Validates Type Only, Not Tenant Scope
Endpoints accepting `:resellerId` do not verify `req.user.id === resellerId`.

### M-5. Multi-Tenancy Breach in Waste Disposal Internal Calls
`waste-disposal.service.ts:314, 338` — `findOne(WasteInventory, { where: { id } })` missing enterpriseId filter.

### M-6. Financial Totals Can Become `NaN`
- `quotations.service.ts:172` — `(subTotal * discountValue) / 100` with null `discountValue`
- `invoices.service.ts:153` — same pattern
- `waste-disposal.service.ts:149-150, 155-157`

### M-7. Race Conditions — Read-Modify-Write Without Transactions
- `inventory.service.ts:137-149`
- `sales-orders.service.ts:96-100`
- `quotations.service.ts:259-312`

### M-8. Pagination Accepts Invalid Pages
- `page=0` → `skip = -limit` (undefined behavior)
- `page=999999999` accepted, returns empty
- Responses lack `totalPages`

### M-9. 20+ Endpoints Accept Untyped `@Body() body: any`
Samples: `employees.controller.ts`, `waste-parties.controller.ts`, `waste-inventory.controller.ts`, `customers.controller.ts`. Bypasses ValidationPipe.

### M-10. No Health-Check Endpoints
Probed `/api`, `/api/health`, `/api/ping`, `/api/status`, `/api/v1` — all 404.

### M-11. Swagger API Documentation Publicly Exposed
`main.ts:88` → `SwaggerModule.setup('docs', …)` with no auth.

### M-12. Error Handler Leaks Internal Error Messages
`http-exception.filter.ts:31-32` — returns raw `exception.message` for non-HTTP errors.

---

## 🟡 MINOR ISSUES

- **N-1.** Nginx version leaked in `Server` header.
- **N-2.** Seed script logs default credentials `admin@vab.com` / `admin123`.
- **N-3.** Two valid tokens can coexist in same origin's localStorage (cross-portal).
- **N-4.** React Query cache not cleared on logout.
- **N-5.** Nullable response chains without `?.` (invoices/[id], manufacturing/po/[id]).
- **N-6.** Loading/empty-state flicker on `/crm/follow-ups`, `/analytics`.
- **N-7.** JWT algorithm not explicitly constrained.
- **N-8.** CORS accepts misconfigured values.
- **N-9.** `createPincode` endpoint unguarded.
- **N-10.** Hard delete cascades not consistent across modules.
- **N-11.** `vab-frontend` restart count 7,059.

---

## 🧪 EDGE CASE FAILURES

| # | Scenario | Actual | Expected |
|---|---|---|---|
| E-1 | Login with `email='' password=''` | 400 | 400 (✓) but no detail |
| E-2 | Login with valid email, wrong password | **400** | **401** |
| E-3 | Valid token, deleted user | Unverified | 401 |
| E-4 | Token near expiry | Logs redirect to `/login` on 401 | ✓ |
| E-5 | HTTP → HTTPS redirect | 301 | ✓ |
| E-6 | Preflight from `evil.com` | Blocked | ✓ |
| E-7 | 1 MB+ JSON body | size limit set to 10 MB | Up to 10 MB |
| E-8 | Quotation with subTotal=0, discount=100 | Likely 0 | 0 OK |
| E-9 | Delete Customer with linked Invoice | Raw 500 + FK message | Friendly message |
| E-10 | Concurrent payment against same invoice | Race | Serialize / opt lock |
| E-11 | Concurrent quotation edit same version | Race | Transaction + lock |
| E-12 | ETA set to NaN date | Silently saved? Untested | 400 |
| E-13 | Rate-limit brute force on login | 20 in 2s → all accepted | 429 after ~5 |
| E-14 | `ownDataOnly=true` direct URL access | Guard only in list | 403/404 |
| E-15 | Inactive employee with valid JWT | Blocked | ✓ |
| E-16 | `is_locked=true` enterprise — employees? | Unverified | Block all |
| E-17 | Subscription expired — API still serves? | Unverified | 403 |
| E-18 | Permission change mid-request | Next call honors | ✓ |
| E-19 | Malformed pincode (not 6 digits) | No validator | 400 |
| E-20 | Large CSV export (10k+ rows) | Streams? Buffers? | Stream |

---

## 💡 SUGGESTIONS (Fixes, not redesigns)

1. SQL injection — use parameterized `$N` placeholders.
2. JWT → `httpOnly; Secure; SameSite=Strict` cookie.
3. Audit trail — log failures, don't silently swallow.
4. Password column — `select: false` on entities; explicit `addSelect` in auth.
5. Deploy hardening — pre-start smoke request.
6. Login 401 — AuthService throws UnauthorizedException instead of BadRequest.
7. Auth rate limit — `@Throttle({ default: { limit: 5, ttl: 60000 } })`.
8. Missing `@RequirePermission` — CI lint rule; fill in decorators.
9. ResellerGuard — verify `req.user.id === params.resellerId`.
10. Multi-tenancy — add enterpriseId to every `findOne`.
11. NaN totals — default-zero every `parseFloat(x)`; DB check constraints.
12. Transactions — wrap writes in `dataSource.transaction()`.
13. Pagination — clamp `page = Math.max(1, page)`; return `totalPages`.
14. Untyped DTOs — class-validator on every endpoint.
15. Health endpoint — `@Public() GET /api/health`.
16. Swagger — behind basic auth or off in prod.
17. Error sanitization — generic message + traceId in prod.
18. Nginx — `server_tokens off;`.
19. Seed creds — env var, random default.
20. `queryClient.clear()` on logout.
21. JWT alg allowlist — `algorithms: ['HS256']`.
22. Pincode mutation permission.
23. Delete precheck pattern — apply to Customer/Employee/Product/Invoice deletes.

---

## Fixes Applied in This Session

See `QA_FIX_LOG.md` for the detailed log of applied fixes, with before/after line references.

---

*End of report.*
