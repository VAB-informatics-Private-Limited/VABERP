# vaberp ERP — Consolidated Test Cases

> **Source of truth:** `docs/build_test_cases.py` (regenerate by running it).
> **Sister formats:** `TEST_CASES.xlsx` (one sheet per module).
> **Strategy & conventions:** `docs/tests/00-test-strategy.md`.

## Summary

- **Total test cases:** 488
- **Modules covered:** 21
- **By priority:** P0=205 · P1=205 · P2=72 · P3=6
- **By type:** API contract=2 · Boundary=15 · E2E=12 · Edge=7 · Functional=247 · Integration=48 · Negative=76 · Permission=46 · UI / UX=35

## Module index

| # | Module | TCs | P0 | P1 | P2 | P3 |
|---|---|---|---|---|---|---|
| 01 | [Authentication](#authentication) | 70 | 33 | 28 | 7 | 2 |
| 02 | [Quotations](#quotations) | 70 | 28 | 29 | 11 | 2 |
| 03 | [Sales Orders](#sales-orders) | 20 | 7 | 8 | 4 | 1 |
| 04 | [Manufacturing](#manufacturing) | 27 | 14 | 12 | 1 | 0 |
| 05 | [Invoices](#invoices) | 20 | 9 | 10 | 1 | 0 |
| 06 | [Customers](#customers) | 15 | 5 | 6 | 4 | 0 |
| 07 | [CRM](#crm) | 20 | 7 | 8 | 5 | 0 |
| 08 | [Enquiries](#enquiries) | 16 | 9 | 4 | 3 | 0 |
| 09 | [Inventory](#inventory) | 20 | 10 | 8 | 2 | 0 |
| 10 | [Products](#products) | 18 | 7 | 8 | 3 | 0 |
| 11 | [Employees & RBAC](#employees-rbac) | 25 | 13 | 11 | 1 | 0 |
| 12 | [Procurement](#procurement) | 20 | 9 | 9 | 2 | 0 |
| 13 | [Waste Management](#waste-management) | 30 | 10 | 13 | 6 | 1 |
| 14 | [Service Management](#service-management) | 13 | 6 | 5 | 2 | 0 |
| 15 | [Machinery & Maintenance](#machinery-maintenance) | 14 | 5 | 7 | 2 | 0 |
| 16 | [Tasks & Team](#tasks-team) | 13 | 4 | 6 | 3 | 0 |
| 17 | [Reports](#reports) | 11 | 2 | 5 | 4 | 0 |
| 18 | [Settings](#settings) | 14 | 3 | 6 | 5 | 0 |
| 19 | [Super Admin](#super-admin) | 20 | 7 | 11 | 2 | 0 |
| 20 | [Reseller Portal](#reseller-portal) | 20 | 7 | 9 | 4 | 0 |
| 21 | [End-to-End Flows](#end-to-end-flows) | 12 | 10 | 2 | 0 | 0 |

---

## Authentication

_70 test cases_

| TC ID | Submodule | Title | Type | Priority | Preconditions | Test Data | Steps | Expected Result | API Contract | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| TC-AUTH-EMP-001 | Employee Login | Login with valid email + password | Functional | P0 | Active employee account exists; on /login Employee tab | email=qa.salesrep@vaberp-test.com password=Pass@123 | 1. Type email<br/>2. Type password<br/>3. Click Sign In | Toast 'Login successful!'<br/>Redirect to /dashboard<br/>access_token cookie set<br/>authStore.user populated<br/>authStore.permissions populated | POST /auth/employee/login → 200 { data: { token, user, permissions, type:'employee' } } | - |
| TC-AUTH-EMP-002 | Employee Login | Invalid password rejected | Negative | P0 | Active employee account exists | email=qa.salesrep@vaberp-test.com password=Wrong | 1. Type email<br/>2. Type wrong password<br/>3. Click Sign In | Toast 'Invalid email or password'<br/>No redirect; remain on /login<br/>No token issued | POST /auth/employee/login → 401 | - |
| TC-AUTH-EMP-003 | Employee Login | Unknown email rejected | Negative | P0 | On /login Employee tab | email=ghost@example.com password=Pass@123 | 1. Type unknown email<br/>2. Type any password<br/>3. Click Sign In | Toast 'Invalid email or password'<br/>No token issued | POST /auth/employee/login → 401 | - |
| TC-AUTH-EMP-004 | Employee Login | Inactive employee rejected | Negative | P0 | Employee with status='inactive' exists | email=inactive.emp@vaberp-test.com password=Pass@123 | 1. Type email<br/>2. Type password<br/>3. Click Sign In | Toast 'Your account is inactive'<br/>No token issued | POST /auth/employee/login → 401 'Your account is inactive' | - |
| TC-AUTH-EMP-005 | Employee Login | Inactive enterprise rejects employee login | Negative | P0 | Active employee whose enterprise.status='blocked' | email=acme.emp@vaberp-test.com password=Pass@123 (Acme blocked) | 1. Type email<br/>2. Type password<br/>3. Click Sign In | Toast 'Your enterprise account is inactive' | POST /auth/employee/login → 401 | - |
| TC-AUTH-EMP-006 | Employee Login | Multi-enterprise duplicate email rejected | Negative | P0 | Same email exists in 2+ enterprises (DupShare seed) | email=shared.emp@vaberp-test.com password=Shared@123 | 1. Type shared email<br/>2. Type password<br/>3. Click Sign In | Toast 'This email is registered with more than one business. Please contact your admin.'<br/>No token issued | POST /auth/employee/login → 401 | Regression: see commit f7fd18d |
| TC-AUTH-EMP-007 | Employee Login | Empty email blocked client-side | Negative | P1 | On /login Employee tab | email='' password=Pass@123 | 1. Leave email blank<br/>2. Type password<br/>3. Click Sign In | Field error 'Email is required'<br/>No API call | - | - |
| TC-AUTH-EMP-008 | Employee Login | Empty password blocked client-side | Negative | P1 | On /login Employee tab | email=qa.salesrep@vaberp-test.com password='' | 1. Type email<br/>2. Leave password blank<br/>3. Click Sign In | Field error 'Password is required'<br/>No API call | - | - |
| TC-AUTH-EMP-009 | Employee Login | Malformed email blocked client-side | Negative | P1 | On /login Employee tab | email=not-an-email password=Pass@123 | 1. Type 'not-an-email'<br/>2. Type password<br/>3. Click Sign In | Field error 'Enter a valid email address'<br/>No API call | - | - |
| TC-AUTH-EMP-010 | Employee Login | Password under min length blocked | Negative | P1 | On /login Employee tab | email=qa.salesrep@vaberp-test.com password=12345 | 1. Type email<br/>2. Type 5-char password<br/>3. Click Sign In | Field error 'Password must be at least 6 characters' | - | - |
| TC-AUTH-EMP-011 | Employee Login | Sign-In button shows spinner during request | UI / UX | P2 | Network throttled to 'Slow 3G' in dev tools | valid creds | 1. Type creds<br/>2. Click Sign In<br/>3. Observe button | Button label replaced by spinner<br/>Button disabled<br/>Form fields disabled<br/>On response: spinner removed | - | - |
| TC-AUTH-EMP-012 | Employee Login | Rate limit returns 429 after 10 req/min | Boundary | P1 | Clean rate-limit window | any creds | 1. Submit Sign In 11 times within a minute | 11th attempt returns 429 'Too many requests' | POST /auth/employee/login → 429 | - |
| TC-AUTH-EMP-013 | Employee Login | Token persisted across reload | Functional | P0 | Successful login completed | any valid login | 1. Login successfully<br/>2. Reload tab | User remains on /dashboard<br/>No redirect to /login | GET /auth/me → 200 | - |
| TC-AUTH-EMP-014 | Employee Login | Already-logged-in user visiting /login is redirected | Functional | P1 | User already authenticated | n/a | 1. Manually navigate to /login | Auto-redirect to /dashboard | - | - |
| TC-AUTH-EMP-015 | Employee Login | Audit log records successful login | Functional | P1 | DB read access on QA | valid login | 1. Login as qa.salesrep@vaberp-test.com<br/>2. Query audit_logs table | Row exists with action='employee_login_success', user_id=X, timestamp within 5s | - | - |
| TC-AUTH-ENT-001 | Enterprise Login | OTP login happy path | Functional | P0 | Active enterprise; mailbox accessible | email=acme.admin@vaberp-test.com | 1. Open /login Enterprise tab<br/>2. Type email<br/>3. Click Continue<br/>4. Read OTP from email<br/>5. Enter 6-digit OTP<br/>6. Click Sign In | Step 1: branding + step 2 form rendered<br/>Toast 'OTP sent to your email.'<br/>Toast 'Login successful!'<br/>Redirect /dashboard if subscription active else /activate<br/>Full-access permissions stored | POST /auth/enterprise/verify-email → 200<br/>POST /auth/enterprise/verify-otp → 200 | - |
| TC-AUTH-ENT-002 | Enterprise Login | Password login happy path | Functional | P0 | Active enterprise with known password | email=acme.admin@vaberp-test.com password=Acme@123 | 1. Open /login Enterprise tab<br/>2. Type email<br/>3. Continue<br/>4. Click 'Login with Password'<br/>5. Type password<br/>6. Click Sign In | Toast 'Login successful!'<br/>Redirect /dashboard<br/>Token stored | POST /auth/enterprise/verify-email → 200<br/>POST /auth/enterprise/login → 200 | - |
| TC-AUTH-ENT-003 | Enterprise Login | Unknown enterprise email rejected at step 1 | Negative | P0 | On Enterprise tab | email=ghost@example.com | 1. Type email<br/>2. Click Continue | Toast 'Enterprise not found'<br/>Form stays on step 1 | POST /auth/enterprise/verify-email → 401 | - |
| TC-AUTH-ENT-004 | Enterprise Login | Blocked enterprise rejected at step 1 | Negative | P0 | Enterprise with status='blocked' | email=gamma.admin@vaberp-test.com | 1. Type email<br/>2. Click Continue | Toast 'Your enterprise account is blocked' | POST /auth/enterprise/verify-email → 401 | - |
| TC-AUTH-ENT-005 | Enterprise Login | Invalid OTP rejected | Negative | P0 | Step 2 reached | email=acme.admin@vaberp-test.com otp=000000 | 1. Type email + Continue<br/>2. Type wrong OTP<br/>3. Click Sign In | Toast 'Invalid OTP'<br/>User remains on step 2 | POST /auth/enterprise/verify-otp → 400 | - |
| TC-AUTH-ENT-006 | Enterprise Login | OTP only accepts 6 digits | Boundary | P1 | Step 2 reached | otp=12345 (5 chars) | 1. Type 5-digit OTP<br/>2. Sign In button | Sign In button disabled until 6 digits entered | - | - |
| TC-AUTH-ENT-007 | Enterprise Login | Resend OTP triggers new email | Functional | P1 | Step 2 reached | valid email | 1. Click 'Resend OTP' | Toast 'OTP resent to your email.'<br/>New OTP delivered (different value) | POST /auth/enterprise/verify-email → 200 | - |
| TC-AUTH-ENT-008 | Enterprise Login | Switch to password and back to OTP | Functional | P2 | Step 2 OTP form visible | valid email | 1. Click 'Login with Password' → password form<br/>2. Click 'Login with OTP' | Form toggles between OTP and password without re-doing step 1<br/>OTP resent toast on switch back | - | - |
| TC-AUTH-ENT-009 | Enterprise Login | Wrong password rejected | Negative | P0 | Password mode in step 2 | email=acme.admin@vaberp-test.com password=Wrong | 1. Type email + Continue<br/>2. Switch to password<br/>3. Type wrong password<br/>4. Sign In | Toast 'Invalid email or password' | POST /auth/enterprise/login → 401 | - |
| TC-AUTH-ENT-010 | Enterprise Login | Pending enterprise auto-activates on first OTP login | Integration | P0 | Enterprise.status='pending' (just registered) | valid email + OTP | 1. Complete OTP login flow | DB: enterprise.status='active' AND emailVerified=true after login<br/>User routed to /activate (no plan yet) | - | - |
| TC-AUTH-ENT-011 | Enterprise Login | Active subscription routes to /dashboard | Functional | P1 | Enterprise has plan_id and expiry_date >= today and subscription_status='active' | Acme | 1. Complete OTP login | Final redirect: /dashboard | - | - |
| TC-AUTH-ENT-012 | Enterprise Login | Inactive subscription routes to /activate | Functional | P1 | Enterprise active but subscription expired or inactive | Beta tenant | 1. Complete OTP login | Final redirect: /activate | - | - |
| TC-AUTH-ENT-013 | Enterprise Login | Branding info preloaded with ?org=acme | UI / UX | P2 | Tenant Acme has branding row | /login?org=acme | 1. Open /login?org=acme | Logo + tagline reflect Acme branding instead of default | - | - |
| TC-AUTH-ENT-014 | Enterprise Login | Enterprise rate limit 10/min for password endpoint | Boundary | P1 | Clean rate-limit window | valid creds | 1. Submit /auth/enterprise/login 11 times in a minute | 11th call → 429 | POST /auth/enterprise/login → 429 | - |
| TC-AUTH-ENT-015 | Enterprise Login | OTP rate limit 5/min | Boundary | P1 | Clean rate-limit window | valid creds | 1. Submit /auth/enterprise/verify-otp 6 times in a minute | 6th call → 429 | POST /auth/enterprise/verify-otp → 429 | - |
| TC-AUTH-ENT-016 | Enterprise Login | Back button resets to step 1 | Functional | P2 | Step 2 reached | valid email | 1. Click Back | Form returns to step 1<br/>Verified email cleared from state | - | - |
| TC-AUTH-REG-001 | Registration | Register new enterprise happy path | Functional | P0 | Email and mobile not registered | All required fields with valid Indian state | 1. Open /register<br/>2. Fill all required fields<br/>3. Click Register Business | Server creates Enterprise (status='active')<br/>Temp password toast shown for 10s<br/>sessionStorage.pendingVerification set<br/>Redirect /verify-otp | POST /auth/register → 201 | - |
| TC-AUTH-REG-002 | Registration | Duplicate email rejected | Negative | P0 | Email already exists | businessEmail=acme.admin@vaberp-test.com | 1. Submit form with existing email | Toast 'Email already registered'<br/>No redirect | POST /auth/register → 409 | - |
| TC-AUTH-REG-003 | Registration | Mobile must be 10 digits | Negative | P1 | On /register | businessMobile=12345 | 1. Type 5-digit mobile<br/>2. Submit | Field error: 'Enter a valid 10-digit Indian mobile (must start with 6-9)'<br/>No API call | - | - |
| TC-AUTH-REG-004 | Registration | Mobile must start with 6-9 | Negative | P1 | On /register | businessMobile=5000000000 | 1. Type mobile starting with 5<br/>2. Submit | Field error displayed (server or client) | - | - |
| TC-AUTH-REG-005 | Registration | Pincode must be 6 digits | Negative | P1 | On /register | pincode=12345 | 1. Type 5-digit pincode<br/>2. Submit | Field error 'Enter a valid 6-digit pincode' | - | - |
| TC-AUTH-REG-006 | Registration | All required fields enforced | Negative | P0 | On /register | Submit empty form | 1. Click Register Business with all fields empty | Required-field errors on every required input<br/>No API call | - | - |
| TC-AUTH-REG-007 | Registration | Optional GSTIN and CIN accept blank | Functional | P1 | On /register | All required filled; gstNumber='' cinNumber='' | 1. Submit with optional fields blank | 201 created<br/>Optional fields stored as null/empty | POST /auth/register → 201 | - |
| TC-AUTH-REG-008 | Registration | GSTIN format validated when provided | Negative | P2 | On /register | gstNumber=INVALID | 1. Type invalid GSTIN<br/>2. Submit | Field error 'Enter a valid GSTIN (15 chars)' | - | - |
| TC-AUTH-REG-009 | Registration | Indian state dropdown lists 31 states | UI / UX | P3 | On /register | n/a | 1. Open Business State dropdown | 31 entries shown (28 states + 3 commonly-used UTs depending on seed) | - | - |
| TC-AUTH-REG-010 | Registration | Temp password generated correctly | Functional | P1 | Just registered | businessMobile=9876543210 businessName=Acme | 1. Register a new tenant | Generated temp password = '3210acm' (last4 + first3 lowercased) | - | - |
| TC-AUTH-REG-011 | Registration | Network failure shows error toast | Negative | P2 | Backend down | valid form | 1. Submit | Toast 'Registration failed. Please try again.'<br/>Form preserved | - | - |
| TC-AUTH-OTP-001 | OTP Verification | Email OTP verify happy path | Functional | P0 | sessionStorage.pendingVerification set | valid email + 6-digit OTP | 1. Open /verify-otp<br/>2. Enter 6-digit email OTP<br/>3. Click Verify Email | Toast 'Email verified successfully!'<br/>Step advances to Mobile | POST /auth/enterprise/verify-email → 200 | - |
| TC-AUTH-OTP-002 | OTP Verification | Mobile OTP verify happy path | Functional | P0 | Email step done | valid mobile + 4-digit OTP | 1. Enter 4-digit mobile OTP<br/>2. Click Verify Mobile | Toast 'Mobile verified successfully!'<br/>Step advances to Done<br/>sessionStorage cleared<br/>Redirect /login after 2s | POST /auth/enterprise/verify-mobile → 200 | - |
| TC-AUTH-OTP-003 | OTP Verification | Email OTP must be 6 digits | Boundary | P1 | On step 1 | otp='12345' (5) | 1. Type 5-digit OTP | Verify Email button disabled until 6 digits entered | - | - |
| TC-AUTH-OTP-004 | OTP Verification | Mobile OTP must be 4 digits | Boundary | P1 | On step 2 | otp='123' (3) | 1. Type 3-digit OTP | Verify Mobile button disabled until 4 digits entered | - | - |
| TC-AUTH-OTP-005 | OTP Verification | Wrong email OTP rejected | Negative | P0 | Step 1 | otp=000000 | 1. Type wrong OTP<br/>2. Verify Email | Toast 'Invalid OTP' | POST /auth/enterprise/verify-email → 400 | - |
| TC-AUTH-OTP-006 | OTP Verification | Wrong mobile OTP rejected | Negative | P0 | Step 2 | otp=0000 | 1. Type wrong OTP<br/>2. Verify Mobile | Toast 'Invalid OTP' | POST /auth/enterprise/verify-mobile → 400 | - |
| TC-AUTH-OTP-007 | OTP Verification | Resend OTP at step 1 | Functional | P1 | Step 1 | valid email | 1. Click Resend OTP | Toast 'OTP resent successfully!'<br/>New OTP delivered | POST /auth/enterprise/verify-email → 200 | - |
| TC-AUTH-OTP-008 | OTP Verification | Resend OTP at step 2 | Functional | P1 | Step 2 | valid mobile | 1. Click Resend OTP | Toast 'OTP resent successfully!' | POST /auth/enterprise/verify-mobile → 200 | - |
| TC-AUTH-OTP-009 | OTP Verification | No pendingVerification → redirect /register | Functional | P1 | sessionStorage.pendingVerification cleared | n/a | 1. Manually open /verify-otp | Auto-redirect to /register | - | - |
| TC-AUTH-OTP-010 | OTP Verification | Done screen redirects after 2s | Functional | P2 | Both steps verified | n/a | 1. Complete mobile verify | After ~2s redirect to /login | - | - |
| TC-AUTH-PWD-001 | Password Reset | Reset password happy path (enterprise) | Functional | P0 | Enterprise account known | email=acme.admin@vaberp-test.com oldpassword=Acme@123 confirmpassword=NewAcme@456 | 1. Open /forgot-password<br/>2. Fill 3 fields<br/>3. Click Reset Password | Success screen 'Password Updated!'<br/>Button 'Go to Login' visible<br/>DB: bcrypt hash for new password updated | POST /auth/reset-password → 200 | - |
| TC-AUTH-PWD-002 | Password Reset | Reset password happy path (employee) | Functional | P0 | Employee account known | email=qa.salesrep@vaberp-test.com oldpassword=Pass@123 confirmpassword=NewPass@456 | 1. Submit form | Success screen; old password no longer works | POST /auth/reset-password → 200 | - |
| TC-AUTH-PWD-003 | Password Reset | Unknown email rejected | Negative | P0 | On /forgot-password | email=ghost@example.com oldpassword=any confirmpassword=any | 1. Submit | Toast 'Account not found with this email' | POST /auth/reset-password → 401 | - |
| TC-AUTH-PWD-004 | Password Reset | Wrong old password rejected | Negative | P0 | Account exists | email=acme.admin@vaberp-test.com oldpassword=Wrong confirmpassword=NewPass@456 | 1. Submit | Toast 'Current password is incorrect' | POST /auth/reset-password → 401 | - |
| TC-AUTH-PWD-005 | Password Reset | New password under min length blocked client-side | Negative | P1 | Form open | confirmpassword=12345 | 1. Submit with 5-char new password | Field error 'Password must be at least 6 characters' | - | - |
| TC-AUTH-PWD-006 | Password Reset | Rate limit 5/min | Boundary | P1 | Clean window | any payload | 1. POST 6 times in a minute | 6th → 429 | POST /auth/reset-password → 429 | - |
| TC-AUTH-RSLR-001 | Reseller Login | Reseller login happy path | Functional | P0 | Reseller account exists | email=rajesh@techresell.in password=Reseller@123 | 1. Open /reseller/login<br/>2. Type creds<br/>3. Click Sign In | Reseller token stored in resellerStore<br/>Redirect /reseller/dashboard | POST /resellers/login → 200 | - |
| TC-AUTH-RSLR-002 | Reseller Login | Invalid reseller creds rejected | Negative | P0 | n/a | wrong creds | 1. Submit | Toast 'Invalid credentials' | POST /resellers/login → 401 | - |
| TC-AUTH-RSLR-003 | Reseller Login | Auto-fill button populates demo creds | UI / UX | P3 | Form blank | n/a | 1. Click Auto Fill Credentials | Email + password fields filled with demo values | - | - |
| TC-AUTH-SADM-001 | Super-Admin Login | Super-admin login happy path | Functional | P0 | Super-admin account exists | email=admin@vabinformatics.com password=admin1234 | 1. Open /superadmin/login<br/>2. Type creds<br/>3. Click Sign In | Token stored in superAdminStore<br/>Redirect /superadmin/dashboard | POST /super-admin/login → 200 | - |
| TC-AUTH-SADM-002 | Super-Admin Login | Wrong creds rejected | Negative | P0 | n/a | wrong | 1. Submit | Toast 'Invalid credentials' | POST /super-admin/login → 401 | - |
| TC-AUTH-LOGOUT-001 | Logout | Logout clears cookie + redirects | Functional | P0 | Logged-in user | n/a | 1. Click sidebar 'Logout' | POST /auth/logout invoked<br/>access_token cookie maxAge=0<br/>authStore cleared<br/>Redirect /login | POST /auth/logout → 200 'Logged out' | - |
| TC-AUTH-LOGOUT-002 | Logout | Subsequent API call returns 401 | Functional | P1 | Just logged out | n/a | 1. Manually GET /auth/me with old cookie | 401 Unauthorized | GET /auth/me → 401 | - |
| TC-AUTH-PERM-001 | Permissions | GET /auth/permissions returns matrix for employee | API contract | P0 | Logged-in employee | n/a | 1. GET /auth/permissions | 200 with { data: { permissions, dataStartDate } } | GET /auth/permissions → 200 | - |
| TC-AUTH-PERM-002 | Permissions | Enterprise user gets full-access matrix | API contract | P1 | Logged-in enterprise admin | n/a | 1. GET /auth/permissions | Every module/submodule/action = 1 | GET /auth/permissions → 200 | - |
| TC-AUTH-PERM-003 | Permissions | Permission change picked up without re-login | Integration | P1 | Employee logged in; admin grants new permission | n/a | 1. Login as qa.viewer<br/>2. Admin sets sales:quotations:create=1<br/>3. Wait for next /auth/permissions poll<br/>4. Reload UI | Create button now visible without re-login | - | - |
| TC-AUTH-PERM-004 | Permissions | JWT missing → 401 on protected endpoint | Negative | P0 | No token | n/a | 1. GET /quotations without Authorization or cookie | 401 'Invalid or expired token' | GET /quotations → 401 | - |
| TC-AUTH-PERM-005 | Permissions | JWT with expired status='inactive' → 401 on next request | Negative | P0 | User had token; admin disables account | n/a | 1. Disable user in admin<br/>2. Make API call with old token | 401 (re-validation rejects inactive) | Any protected endpoint → 401 | - |

## Quotations

_70 test cases_

| TC ID | Submodule | Title | Type | Priority | Preconditions | Test Data | Steps | Expected Result | API Contract | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| TC-QUOT-LIST-001 | List | Quotations list loads with default pagination | Functional | P0 | Logged in with sales:quotations:view; ≥1 quotation seeded | n/a | 1. Navigate /quotations | Table renders ≤20 rows<br/>Footer shows total count<br/>Columns: Quotation #, Customer, Date, Valid Until, ETA, Total, Status, Created By, Actions | GET /quotations?page=1&limit=20 → 200 | - |
| TC-QUOT-LIST-002 | List | Search by customer name returns matches | Functional | P1 | Customer 'Acme Industries' has quotations | search='Acme' | 1. Type 'Acme' in search<br/>2. Wait debounce<br/>3. Click Search | Only quotations whose customer matches Acme are shown | GET /quotations?search=Acme | - |
| TC-QUOT-LIST-003 | List | Search by quotation # returns matches | Functional | P1 | Known quotation_number=QTN-000123 | search='QTN-000123' | 1. Type number<br/>2. Search | Single matching row | GET /quotations?search=QTN-000123 | - |
| TC-QUOT-LIST-004 | List | Status filter narrows results | Functional | P1 | Mixed-status quotations | status=draft | 1. Pick Draft from Status dropdown | Only Draft rows shown | GET /quotations?status=draft | - |
| TC-QUOT-LIST-005 | List | Date range filter inclusive | Functional | P1 | Quotations across 30 days | fromDate=01-01-2026 toDate=15-01-2026 | 1. Pick range<br/>2. Search | Only quotations dated 01–15 Jan inclusive shown | GET /quotations?fromDate&toDate | - |
| TC-QUOT-LIST-006 | List | Clear button resets filters | UI / UX | P2 | Filters applied | n/a | 1. Click Clear | Search box empty<br/>Status and date filters cleared<br/>Table refreshed page=1 | - | - |
| TC-QUOT-LIST-007 | List | Pagination next page | Functional | P1 | ≥21 quotations | n/a | 1. Click page 2 | Next 20 rows; total unchanged | GET /quotations?page=2&limit=20 | - |
| TC-QUOT-LIST-008 | List | Status badge colors correct | UI / UX | P2 | Each status has ≥1 row | n/a | 1. Inspect badges | draft=default, sent=blue, accepted=green, rejected=red, expired=orange, po_cancelled=volcano | - | - |
| TC-QUOT-LIST-009 | List | Version tag shows when current_version>1 | UI / UX | P2 | Edited quotation exists | n/a | 1. Locate edited row | Purple v{N} chip rendered | - | - |
| TC-QUOT-LIST-010 | List | 'In PO' badge when sales_order_id set | UI / UX | P2 | Accepted quotation linked to SO | n/a | 1. Locate accepted row | Green 'In PO' badge | - | - |
| TC-QUOT-LIST-011 | List | Create button hidden without create permission | Permission | P0 | Logged in as qa.viewer (no create) | n/a | 1. Open /quotations | Top-right Create Quotation button NOT shown | - | - |
| TC-QUOT-LIST-012 | List | Edit row hidden when is_locked | Permission | P0 | Quotation accepted (locked) | n/a | 1. Open Actions on locked row | Edit option not visible | - | - |
| TC-QUOT-LIST-013 | List | Delete row only on draft | Permission | P0 | Logged in with delete perm; mixed statuses | n/a | 1. Open Actions on draft row<br/>2. Open Actions on sent row | Delete visible only on draft<br/>Delete absent on sent | - | - |
| TC-QUOT-LIST-014 | List | Export CSV downloads file | Functional | P2 | Rows present | n/a | 1. Open Export menu<br/>2. Click CSV | .csv downloaded with current page columns | - | - |
| TC-QUOT-LIST-015 | List | Export hidden when zero results | UI / UX | P3 | Filtered to 0 rows | n/a | 1. Apply filter that returns 0 | Export menu not rendered | - | - |
| TC-QUOT-LIST-016 | List | Empty state renders with CTA | UI / UX | P2 | Tenant with no quotations | fresh tenant | 1. Open /quotations | Empty illustration + 'Create your first quotation' CTA | - | - |
| TC-QUOT-LIST-017 | List | Manager sees direct-reports' quotations | Permission | P1 | Manager qa.salesmgr is reporting head of qa.salesrep | n/a | 1. Login as manager<br/>2. Open /quotations | Quotations created by qa.salesrep visible alongside own | GET /quotations (server merges hierarchy) | - |
| TC-QUOT-LIST-018 | List | ownDataOnly employee sees only own quotations | Permission | P0 | qa.scoped has ownDataOnly=1 | n/a | 1. Login as qa.scoped<br/>2. Open /quotations | Only quotations with created_by=qa.scoped are shown | - | - |
| TC-QUOT-LIST-019 | List | dataStartDate filter respected | Permission | P0 | qa.scoped dataStartDate=2026-01-01 | older quotation exists with date 2025-12-01 | 1. Login<br/>2. Open /quotations | 2025-12 quotation hidden<br/>New ones visible | - | - |
| TC-QUOT-LIST-020 | List | Loading state shows skeleton | UI / UX | P3 | Slow 3G | n/a | 1. Reload list | Skeleton rows shown until data arrives | - | - |
| TC-QUOT-CREATE-001 | Create | Create quotation 'Save as Draft' happy path | Functional | P0 | Logged in with sales:quotations:create; product PROD-001 exists | customer_name=Acme mobile=9000000001 + 1 product qty=2 | 1. /quotations/create<br/>2. Fill customer<br/>3. Add 1 product qty=2<br/>4. Click Save as Draft | Toast 'Quotation created'<br/>Redirect /quotations<br/>New row visible with status=draft, version=1<br/>quotation_number=QTN-XXXXXX | POST /quotations → 201 | - |
| TC-QUOT-CREATE-002 | Create | Create + send happy path | Functional | P0 | Same setup | valid form | 1. Fill form<br/>2. Click Create & Send to Customer | Status=sent in DB<br/>Linked enquiry (if any) updated to 'Quotation Sent' | POST /quotations → 201 | - |
| TC-QUOT-CREATE-003 | Create | Pre-fill from enquiry via ?enquiryId | Functional | P1 | Enquiry #123 exists | /quotations/create?enquiryId=123 | 1. Open URL | Customer fields pre-filled with enquiry data<br/>Title says 'Create & Send Quotation for Enquiry #123' | - | - |
| TC-QUOT-CREATE-004 | Create | Customer required | Negative | P0 | Form open | customer_name='' mobile=9000000001 + 1 product | 1. Submit without customer name | Field error 'Customer name is required' | - | - |
| TC-QUOT-CREATE-005 | Create | Mobile must match Indian 10-digit pattern | Negative | P0 | Form open | mobile=12345 | 1. Submit | Field error 'Enter a valid 10-digit Indian mobile (must start with 6-9)' | - | - |
| TC-QUOT-CREATE-006 | Create | At least one item required | Negative | P0 | Form open | valid customer; no items | 1. Submit | Modal lists 'Products (add at least one item)'<br/>No API call | - | - |
| TC-QUOT-CREATE-007 | Create | Mobile duplicate warning non-blocking | Functional | P1 | Existing quotation with mobile=9000000099 | mobile=9000000099 (typed) | 1. Type mobile<br/>2. Blur field | Yellow warning shows existing quotation_number + customer<br/>User can still proceed | GET /quotations/check-mobile → { exists:true, … } | - |
| TC-QUOT-CREATE-008 | Create | Tier discount auto-applies for qty=1 | Functional | P1 | Product PROD-001 has tier minQty=1 disc=5 | PROD-001 | 1. Add PROD-001 | discount_percent=5 prefilled in row | - | - |
| TC-QUOT-CREATE-009 | Create | Tier discount auto-applies for qty bump | Functional | P1 | Tiers [1→5%, 10→10%] | PROD-001 | 1. Set qty=12 | discount_percent updates to 10 | - | - |
| TC-QUOT-CREATE-010 | Create | Manual discount over tier max blocks submit | Negative | P0 | Tier max for qty=2 is 5% | PROD-001 qty=2 | 1. Set discount_percent=10<br/>2. Click Create | Submit blocked<br/>Field error: 'Discount cannot exceed tier max (5%)' | - | - |
| TC-QUOT-CREATE-011 | Create | Discount tooltip shows 'next tier' hint | UI / UX | P2 | Tiers [1→5%, 10→10%] | qty=8 | 1. Inspect qty cell helper text | 'Add 2 more → 10% off' shown | - | - |
| TC-QUOT-CREATE-012 | Create | Adding duplicate product warns to update qty | Negative | P2 | PROD-001 already in list | n/a | 1. Add PROD-001 again | Warning toast or message: 'Product already added; update quantity instead' | - | - |
| TC-QUOT-CREATE-013 | Create | Qty min=1 enforced | Boundary | P1 | PROD-001 in list | qty=0 | 1. Set qty=0 | Field error or auto-clamp to 1 | - | - |
| TC-QUOT-CREATE-014 | Create | Qty max 999999 enforced | Boundary | P2 | PROD-001 in list | qty=1000000 | 1. Try qty=1000000 | onKeyDown blocks 7+ digits; max 999999 | - | - |
| TC-QUOT-CREATE-015 | Create | Quotation date cannot be in past | Boundary | P1 | Form open | quotation_date=yesterday | 1. Open DatePicker<br/>2. Try yesterday | Past dates disabled in DatePicker | - | - |
| TC-QUOT-CREATE-016 | Create | Valid Until ≥ Quotation Date | Negative | P1 | Quotation date=today+5 | validUntil=today+2 | 1. Try invalid validUntil | Past-of-quotation-date disabled in picker | - | - |
| TC-QUOT-CREATE-017 | Create | Totals recalc on item change | Functional | P0 | PROD-001 added qty=1 unit_price=100 disc=0 tax=18 | n/a | 1. Set qty=2<br/>2. Observe totals | Subtotal=200 Tax=36 Grand Total=236 | - | - |
| TC-QUOT-CREATE-018 | Create | Header discount % applies before tax | Functional | P1 | 1 item subtotal=1000 tax=18 | discountType=percentage discountValue=10 | 1. Set header discount 10% | Discount=100<br/>Tax recalculated on 900: 162<br/>Grand Total=1062 | - | - |
| TC-QUOT-CREATE-019 | Create | Server generates quotation_number sequentially | Functional | P1 | Latest QTN-000099 exists | n/a | 1. Create new quotation | New quotation_number=QTN-000100 | POST /quotations → 201 with auto-number | - |
| TC-QUOT-CREATE-020 | Create | Audit log entry on create | Integration | P1 | DB read access | valid form | 1. Create quotation<br/>2. Query audit_logs | Row { action:'quotation_created', quotation_id:X, user_id:Y } | - | - |
| TC-QUOT-DETAIL-001 | Detail | Detail page renders all sections | Functional | P0 | Quotation exists | id=123 | 1. Open /quotations/123 | Header (Q#, status), customer panel, items table, totals, metadata sidebar, version history collapsible | GET /quotations/123 → 200 | - |
| TC-QUOT-DETAIL-002 | Detail | Mark as Sent transitions draft→sent | Functional | P0 | Draft quotation | id=123 | 1. Click Mark as Sent | Status badge changes to 'sent'<br/>Mark as Sent button disappears | PUT /quotations/123/status → 200 { status:'sent' } | - |
| TC-QUOT-DETAIL-003 | Detail | Reject prompts for reason | Functional | P0 | Sent quotation; enquiry linked | rejectionReason='Out of budget' | 1. Click Reject<br/>2. Type reason<br/>3. Confirm | Status='rejected'<br/>Linked enquiry moved to 'Follow Up'<br/>Yellow rejection alert visible | PUT /quotations/123/status → 200 | - |
| TC-QUOT-DETAIL-004 | Detail | Reject without reason still allowed | Functional | P1 | Sent quotation | rejectionReason='' | 1. Click Reject<br/>2. Confirm without reason | Status='rejected' (reason optional) | - | - |
| TC-QUOT-DETAIL-005 | Detail | Accept creates SalesOrder + locks quote | Functional | P0 | Sent quotation with valid items + customer | id=123 | 1. Click 'Close Sale & Transfer to PO'<br/>2. Confirm | SalesOrder created with order_number=PR-XXXX<br/>quotation.is_locked=true<br/>status='accepted'<br/>sales_order_id linked<br/>Success modal with Go-to-PO CTA | POST /quotations/123/accept → 201 | - |
| TC-QUOT-DETAIL-006 | Detail | Accept converts enquiry to customer | Integration | P0 | Quotation linked to enquiry; customer not in master | n/a | 1. Accept | Customer auto-created from enquiry data<br/>enquiry.convertedCustomerId set<br/>enquiry status='Sale Closed' | - | - |
| TC-QUOT-DETAIL-007 | Detail | Locked quote blocks Edit | Permission | P0 | Locked quotation | n/a | 1. Open detail | Edit button replaced by 'View Purchase Order' | - | - |
| TC-QUOT-DETAIL-008 | Detail | Print opens HTML page | Functional | P2 | Detail open | n/a | 1. Click Print | /print/quotation/{id} opens new tab<br/>Layout has no app chrome | - | - |
| TC-QUOT-DETAIL-009 | Detail | Download PDF opens with ?pdf=1 | Functional | P1 | Detail open | n/a | 1. Click Download PDF | /print/quotation/{id}?pdf=1 triggers download | - | - |
| TC-QUOT-DETAIL-010 | Detail | Send Email blocked without customer email | Negative | P1 | Customer email empty | n/a | 1. Click Send Email | Toast 'Customer email not available'<br/>No modal opens | - | - |
| TC-QUOT-DETAIL-011 | Detail | Send Email modal sends successfully | Functional | P1 | Customer email present | subject='Quote' body='Please review' | 1. Click Send Email<br/>2. Fill modal<br/>3. Send | Toast 'Email sent'<br/>Server dispatches email | POST /quotations/{id}/send-email → 200 | - |
| TC-QUOT-DETAIL-012 | Detail | Set ETA persists expectedDelivery | Functional | P1 | Detail open | expectedDelivery=2026-06-30 | 1. Click Set ETA<br/>2. Pick date<br/>3. OK | expected_delivery updated; ETA cell shows 30 Jun 2026 | PATCH /quotations/{id}/eta → 200 | - |
| TC-QUOT-DETAIL-013 | Detail | Overdue ETA banner visible | UI / UX | P2 | expected_delivery in past; status=sent | n/a | 1. Open detail | Orange overdue alert visible | - | - |
| TC-QUOT-DETAIL-014 | Detail | PO cancelled banner appears post-PO-delete | UI / UX | P1 | Linked PO deleted (cancellation logic sets po_cancelled_at) | n/a | 1. Open detail | Red banner with cancelled PO number + timestamp | - | - |
| TC-QUOT-DETAIL-015 | Detail | Version history lists all snapshots newest-first | Functional | P1 | Quotation edited 3 times | n/a | 1. Expand Version History | 3 entries, sorted by changed_at DESC, with changer name + change_notes | - | - |
| TC-QUOT-DETAIL-016 | Detail | Version snapshot captures all items | Integration | P1 | Edited quotation | n/a | 1. Query quotation_versions table<br/>2. Inspect snapshot JSON | Snapshot JSONB contains header + every line item with calculated taxAmount/lineTotal | - | - |
| TC-QUOT-EDIT-001 | Edit | Edit non-locked quotation happy path | Functional | P0 | Draft quotation id=123 | change qty of item 1 | 1. Open /quotations/123/edit<br/>2. Change qty<br/>3. Save Changes | Toast 'Updated'<br/>current_version bumps by 1<br/>New version row in history | PUT /quotations/123 → 200 | - |
| TC-QUOT-EDIT-002 | Edit | Edit locked quotation shows lock screen | Permission | P0 | Locked quotation | n/a | 1. Manually open /quotations/123/edit | Full-screen 'Quotation is Locked' notice; form blocked<br/>'View Quotation' / 'View PO' buttons | - | - |
| TC-QUOT-EDIT-003 | Edit | Editing rejected quote resets to draft | Functional | P1 | Quotation status=rejected | any change | 1. Save Changes | Status auto-reset to 'draft' | PUT /quotations/123 → 200 | - |
| TC-QUOT-EDIT-004 | Edit | Concurrent edit handled (last writer wins) | Edge | P1 | Two tabs open same quotation | n/a | 1. Tab A saves<br/>2. Tab B saves with stale data | Both writes succeed; final state matches Tab B; both versions in history | PUT /quotations/123 (twice) | - |
| TC-QUOT-STATUS-001 | Status | Generic status change writes audit | Integration | P1 | Logged in | id=123 status='expired' | 1. PUT /quotations/123/status | DB status updated; audit_logs row added | PUT /quotations/123/status → 200 | - |
| TC-QUOT-STATUS-002 | Status | Status change disallowed on locked quote | Permission | P1 | Locked | any status | 1. Try PUT status | 400 or 403 'Quotation is locked' | PUT /quotations/123/status → 400 | - |
| TC-QUOT-DELETE-001 | Delete | Delete draft happy path | Functional | P0 | Draft quotation; delete perm | n/a | 1. Click Delete in row menu<br/>2. Confirm | Quotation removed; items + versions cascaded | DELETE /quotations/123 → 200 | - |
| TC-QUOT-DELETE-002 | Delete | Delete blocked from UI on non-draft | Permission | P0 | Sent quotation | n/a | 1. Open Actions | Delete option absent | - | - |
| TC-QUOT-DUP-001 | Duplicate | Duplicate creates new quotation with new number | Functional | P1 | Source quotation exists | n/a | 1. POST /quotations/123/duplicate | New quotation_number, items copied verbatim, status=draft | POST /quotations/123/duplicate → 201 | - |
| TC-QUOT-PERM-001 | Permission | Employee without view perm gets 403 on list | Permission | P0 | qa.viewer with sales:quotations:view=0 | n/a | 1. Login<br/>2. Open /quotations | 403 returned by guard; UI shows 'You don't have permission' | GET /quotations → 403 | - |
| TC-QUOT-PERM-002 | Permission | Employee without create perm hides Create button | Permission | P0 | qa.viewer | n/a | 1. Open /quotations | Create button absent | - | - |
| TC-QUOT-PERM-003 | Permission | Direct API create returns 403 without permission | Permission | P0 | qa.viewer token | minimal payload | 1. POST /quotations as viewer | 403 | POST /quotations → 403 | - |
| TC-QUOT-PERM-004 | Permission | Edit blocked without edit perm | Permission | P0 | qa.viewer | n/a | 1. PUT /quotations/123 | 403 | - | - |
| TC-QUOT-PERM-005 | Permission | Delete blocked without delete perm | Permission | P0 | qa.salesrep without delete | n/a | 1. DELETE /quotations/123 | 403 | - | - |

## Sales Orders

_20 test cases_

| TC ID | Submodule | Title | Type | Priority | Preconditions | Test Data | Steps | Expected Result | API Contract | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| TC-SO-LIST-001 | List | Sales-orders list loads | Functional | P0 | ≥1 SO | n/a | 1. Open /sales-orders | Table renders with order_number, customer, total, status | GET /sales-orders → 200 | - |
| TC-SO-LIST-002 | List | Filter by status | Functional | P1 | Mixed statuses | status=in_production | 1. Pick status<br/>2. Search | Only matching SOs shown | GET /sales-orders?status=in_production | - |
| TC-SO-LIST-003 | List | Search by order number | Functional | P1 | PR-0042 exists | search='PR-0042' | 1. Search | Single matching row | - | - |
| TC-SO-LIST-004 | List | Empty state CTA | UI / UX | P2 | Fresh tenant | n/a | 1. Open list | Empty illustration with 'Accept a quotation to create your first PO' | - | - |
| TC-SO-DETAIL-001 | Detail | Detail loads full data | Functional | P0 | SO id=10 | n/a | 1. Open /sales-orders/10 | Customer, items, totals, dispatch status, linked quotation, job-card list | GET /sales-orders/10 → 200 | - |
| TC-SO-DETAIL-002 | Detail | Linked quotation clickable | Functional | P1 | SO has quotation_id | n/a | 1. Click linked quotation | Routes to /quotations/{id} | - | - |
| TC-SO-DETAIL-003 | Detail | Linked job cards listed | Integration | P1 | Job cards created against SO | n/a | 1. Open detail | Job-card section lists JC numbers + status | GET /manufacturing?salesOrderId=10 | - |
| TC-SO-EDIT-001 | Edit | Edit SO header (open status) | Functional | P1 | SO status='open' | notes='updated' | 1. Edit notes<br/>2. Save | Notes persisted | PATCH /sales-orders/10 → 200 | - |
| TC-SO-EDIT-002 | Edit | Edit SO blocked when dispatched | Permission | P0 | SO status='dispatched' | n/a | 1. Try edit | Edit disabled<br/>Server returns 400 | PATCH /sales-orders/10 → 400 | - |
| TC-SO-CANCEL-001 | Cancel | Cancel SO updates linked quote | Integration | P0 | SO accepted from quotation Q | n/a | 1. Cancel SO with reason | SO status='cancelled'<br/>Quotation Q po_cancelled_at + cancelled_po_number set<br/>Red banner appears on Q detail | DELETE /sales-orders/10 → 200 | - |
| TC-SO-CANCEL-002 | Cancel | Cancel blocked when JC has progressed past pending | Negative | P0 | JC status='in_process' | n/a | 1. Try Cancel SO | 400 'Cannot cancel order with active production' | - | - |
| TC-SO-DISPATCH-001 | Dispatch | Dispatch happy path | Functional | P0 | SO status='ready_for_dispatch' | vehicle='AP-09-1234' driver='Ramesh' | 1. Click Dispatch<br/>2. Fill modal<br/>3. Confirm | SO status='dispatched'<br/>Dispatch record created<br/>Linked JC status updated | POST /sales-orders/10/dispatch → 200 | - |
| TC-SO-DISPATCH-002 | Dispatch | Dispatch blocked when not ready | Negative | P1 | SO status='in_production' | n/a | 1. Try dispatch | Button disabled or 400 'Order not ready for dispatch' | - | - |
| TC-SO-STATUS-001 | Status | Status badge colors | UI / UX | P3 | Mixed statuses | n/a | 1. Inspect badges | Open=blue, in_production=gold, ready=green, dispatched=default, cancelled=red | - | - |
| TC-SO-PERM-001 | Permission | Viewer cannot dispatch | Permission | P0 | qa.viewer | n/a | 1. Open SO detail | Dispatch button hidden<br/>Direct API call → 403 | POST /sales-orders/10/dispatch → 403 | - |
| TC-SO-PAGINATION-001 | List | Pagination defaults to 20 | Functional | P1 | ≥21 SOs | n/a | 1. Reload list | Page 1 has 20 rows | GET /sales-orders?page=1&limit=20 | - |
| TC-SO-AUDIT-001 | Status | Status change writes audit log | Integration | P1 | DB read access | any transition | 1. Change status<br/>2. Inspect audit_logs | Audit row { action:'sales_order_status', from, to, user_id } | - | - |
| TC-SO-NETWORK-001 | List | Network failure preserves last good state | Edge | P2 | List loaded; backend then offline | n/a | 1. Click Search | Toast error; previous rows still visible | - | - |
| TC-SO-PRINT-001 | Detail | Print PO downloads PDF | Functional | P2 | SO open | n/a | 1. Click Print/PDF | PDF rendered with company branding | - | - |
| TC-SO-DUPLICATE-001 | Detail | Duplicate quotation reflects on SO list | Integration | P2 | Duplicated quotation accepted | n/a | 1. Accept duplicated quotation | Two distinct SOs (different order_number) listed | - | - |

## Manufacturing

_27 test cases_

| TC ID | Submodule | Title | Type | Priority | Preconditions | Test Data | Steps | Expected Result | API Contract | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| TC-MFG-JC-001 | Job Cards | Create job card from accepted SO | Functional | P0 | SO accepted with BOM | salesOrderId=10 | 1. Open /manufacturing<br/>2. Create JC against SO<br/>3. Save | JC created with status='pending'<br/>job_number auto-generated<br/>Stage tree initialized | POST /manufacturing/job-cards → 201 | - |
| TC-MFG-JC-002 | Job Cards | JC list filterable by status | Functional | P1 | Mixed JC statuses | status='in_process' | 1. Filter list | Only matching JCs shown | GET /manufacturing?status=in_process | - |
| TC-MFG-JC-003 | Job Cards | JC detail loads with stages | Functional | P0 | JC id=5 | n/a | 1. Open /manufacturing/5 | Stage tree, BOM list, material requests, waste log visible | GET /manufacturing/5 → 200 | - |
| TC-MFG-JC-004 | Job Cards | JC status transitions follow workflow | Functional | P0 | JC status='pending' | n/a | 1. Move to stock_verification → in_process → completed_production → ready_for_dispatch → dispatched | Each transition allowed only from valid prior state | PATCH /manufacturing/5/status | - |
| TC-MFG-JC-005 | Job Cards | Invalid transition rejected | Negative | P0 | JC status='pending' | target='dispatched' | 1. Try direct skip to dispatched | 400 'Invalid status transition' | PATCH /manufacturing/5/status → 400 | - |
| TC-MFG-JC-006 | Job Cards | Quantity completed cannot exceed quantity | Boundary | P0 | JC quantity=100 | quantityCompleted=101 | 1. Try update | 400 'Quantity completed cannot exceed total quantity' | PATCH /manufacturing/5 → 400 | - |
| TC-MFG-JC-007 | Job Cards | Shortage notes required when material_status='REQUESTED_RECHECK' | Negative | P1 | JC awaiting material | shortageNotes='' | 1. Set material status to recheck without note | Field error 'Shortage notes are required' | - | - |
| TC-MFG-JC-008 | Job Cards | Assigned employee receives notification | Integration | P1 | Assignee employee | assignedTo=qa.salesrep.id | 1. Create JC | Notification record created for assignee | - | - |
| TC-MFG-JC-009 | Job Cards | Manager sees direct-reports' JCs | Permission | P1 | qa.salesmgr is manager | n/a | 1. List JCs | JCs assigned to direct reports visible | - | - |
| TC-MFG-STAGES-001 | Stages | Move stage to in_process | Functional | P0 | Stage status='pending' | n/a | 1. Click Start Stage | Stage status='in_process'<br/>start_time set | PATCH /manufacturing/5/stages/{id} → 200 | - |
| TC-MFG-STAGES-002 | Stages | Complete stage with waste capture | Functional | P0 | In-progress stage; raw_material set | wasteQty=2 wasteUnit='kg' rawMaterialId=1 | 1. Click Complete Stage<br/>2. Enter waste qty<br/>3. Confirm | Stage status='completed'<br/>WasteInventory aggregated row created/updated<br/>WasteInventoryLog action='generated' reference_type='job_card' reference_id=JC.id | POST /waste-inventory/production-waste → 201 | - |
| TC-MFG-STAGES-003 | Stages | Sequential stages cannot be started out of order | Negative | P1 | Stage 2 not started | try start stage 3 | 1. Click Start on stage 3 | 400 'Previous stage not complete' | - | - |
| TC-MFG-STAGES-004 | Stages | Cancel stage reverts to pending | Functional | P2 | Stage in_process | n/a | 1. Click Cancel | Stage status reverts; start_time cleared | - | - |
| TC-MFG-BOM-001 | BOM | BOM template created from product | Functional | P0 | Product PROD-001 with material list | n/a | 1. Create BOM linking to product<br/>2. Add raw materials with qty | BOM entity persisted<br/>Lines created | POST /manufacturing/bom → 201 | - |
| TC-MFG-BOM-002 | BOM | Per-product BOM applied to JC | Integration | P1 | Product has BOM | JC against this product | 1. Create JC | Material requests auto-suggested from BOM lines | - | - |
| TC-MFG-BOM-003 | BOM | Edit BOM versioned | Functional | P1 | BOM v1 used in past JC | edit lines | 1. Edit BOM lines<br/>2. Save | New BOM version created; old JC still references original | - | - |
| TC-MFG-MR-001 | Material Requests | Issue MR against JC | Functional | P0 | JC pending | rawMaterialId=1 qty=10 | 1. Issue MR | MR row created status='pending'<br/>JC.material_status='PARTIALLY_ISSUED' on partial issue | POST /material-requests → 201 | - |
| TC-MFG-MR-002 | Material Requests | Approve MR deducts from raw_materials | Integration | P0 | Raw_material stock=100 | MR qty=10 | 1. Approve MR | Stock=90<br/>Stock ledger entry created<br/>MR status='issued' | PATCH /material-requests/{id}/approve → 200 | - |
| TC-MFG-MR-003 | Material Requests | MR over-issue blocked | Negative | P0 | Stock=5 | MR qty=10 | 1. Try approve | 400 'Insufficient stock' | - | - |
| TC-MFG-WASTE-001 | Waste Capture | Production-waste recorded against JC | Functional | P0 | JC + raw_material | qty=2 unit='kg' | 1. Complete stage with waste qty | WasteInventory aggregated; log entry created | POST /waste-inventory/production-waste → 201 | - |
| TC-MFG-WASTE-002 | Waste Capture | Aggregation by (raw_material, category) | Integration | P1 | Two JCs same raw material | n/a | 1. Both JCs record waste 5 kg each | Single WasteInventory row qty=10<br/>Two log entries each referencing different JC | - | - |
| TC-MFG-WASTE-003 | Waste Capture | Default 'Production Waste' category auto-created | Integration | P1 | Tenant has no waste categories | first JC waste | 1. Record waste | Category 'PROD_WASTE' auto-created<br/>Log references it | - | - |
| TC-MFG-WASTE-004 | Waste Capture | Quantity must be > 0 | Negative | P1 | JC stage | qty=0 | 1. Submit waste 0 | 400 'Waste quantity must be greater than 0' | POST /waste-inventory/production-waste → 400 | - |
| TC-MFG-DISPATCH-001 | Dispatch | JC marked ready_for_dispatch unlocks SO dispatch | Integration | P0 | All JC stages complete | n/a | 1. Mark JC ready_for_dispatch | SO Dispatch button enabled | - | - |
| TC-MFG-DISPATCH-002 | Dispatch | Dispatch on hold flag blocks dispatch | Permission | P1 | JC.dispatch_on_hold=true | n/a | 1. Try dispatch | Blocked with reason | - | - |
| TC-MFG-PERM-001 | Permission | Employee without orders:job_cards:edit cannot transition status | Permission | P0 | qa.viewer | any JC | 1. PATCH status | 403 | - | - |
| TC-MFG-AUDIT-001 | Audit | Stage completion writes audit | Integration | P1 | DB read | any stage complete | 1. Complete stage<br/>2. Inspect audit_logs | Row added with stage details | - | - |

## Invoices

_20 test cases_

| TC ID | Submodule | Title | Type | Priority | Preconditions | Test Data | Steps | Expected Result | API Contract | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| TC-INVO-LIST-001 | List | Invoice list loads | Functional | P0 | Logged in | n/a | 1. Open /invoices | Table with invoice_number, customer, total, status, due_date | GET /invoices → 200 | - |
| TC-INVO-LIST-002 | List | Filter by paid/unpaid | Functional | P1 | Mixed | status='paid' | 1. Pick filter | Only paid invoices shown | - | - |
| TC-INVO-LIST-003 | List | Search by invoice number | Functional | P1 | INV-0042 exists | search | 1. Search | Single match | - | - |
| TC-INVO-CREATE-001 | Create | Create invoice from SO happy path | Functional | P0 | Dispatched SO without invoice | salesOrderId=10 | 1. Open /invoices/add<br/>2. Pick SO<br/>3. Save | Invoice created with line items copied; total matches SO grand_total | POST /invoices → 201 | - |
| TC-INVO-CREATE-002 | Create | Cannot create duplicate invoice for same SO | Negative | P0 | SO already invoiced | n/a | 1. Try create | 400 'Invoice already exists for this order' | - | - |
| TC-INVO-CREATE-003 | Create | Tax breakdown displayed (CGST/SGST/IGST) | Functional | P1 | Customer GSTIN state matches enterprise → CGST+SGST | intra-state | 1. Create invoice | Tax split = CGST 9% + SGST 9% (for tax_percent=18)<br/>For inter-state: IGST 18% | - | - |
| TC-INVO-DETAIL-001 | Detail | Detail loads with line items + payments | Functional | P0 | Invoice id=5 | n/a | 1. Open /invoices/5 | Header, line items, totals, payment history | GET /invoices/5 → 200 | - |
| TC-INVO-DETAIL-002 | Detail | Mark as Paid creates payment | Functional | P0 | Unpaid invoice | amount=invoice.total method='UPI' | 1. Click Mark as Paid<br/>2. Enter amount + method<br/>3. Confirm | Status='paid'<br/>Payment row created | POST /invoices/5/payments → 201 | - |
| TC-INVO-DETAIL-003 | Detail | Partial payment flips status to partially_paid | Functional | P1 | Unpaid total=1000 | amount=400 | 1. Add payment 400 | Status='partially_paid'<br/>Balance=600 | - | - |
| TC-INVO-DETAIL-004 | Detail | Over-payment blocked | Negative | P0 | Total=1000 | amount=1500 | 1. Try add 1500 | 400 'Payment exceeds invoice balance' | - | - |
| TC-INVO-EDIT-001 | Edit | Edit blocked once paid | Permission | P0 | Paid invoice | n/a | 1. Try edit header | Edit disabled / 400 | - | - |
| TC-INVO-EMAIL-001 | Email | Send invoice email | Functional | P1 | Customer email present | n/a | 1. Click Send Email<br/>2. Confirm | Email dispatched<br/>Toast 'Email sent' | POST /invoices/5/send-email → 200 | - |
| TC-INVO-PDF-001 | PDF | Download PDF | Functional | P1 | Invoice open | n/a | 1. Click Download PDF | PDF rendered with branding + tax breakdown | - | - |
| TC-INVO-PRO-001 | Proforma | Create proforma from quotation | Functional | P1 | Sent quotation | n/a | 1. Convert to proforma | Proforma created with line items copied | POST /proforma-invoices → 201 | - |
| TC-INVO-PRO-002 | Proforma | Convert proforma to tax invoice | Integration | P0 | Proforma exists | n/a | 1. Click Convert to Invoice | Tax invoice created with new invoice_number; proforma marked converted | - | - |
| TC-INVO-PERM-001 | Permission | Viewer cannot create invoice | Permission | P0 | qa.viewer | n/a | 1. POST /invoices | 403 | - | - |
| TC-INVO-AUDIT-001 | Audit | Payment writes audit log | Integration | P1 | DB read | n/a | 1. Add payment<br/>2. Inspect audit | Row { action:'invoice_payment_recorded', amount, method } | - | - |
| TC-INVO-DUE-001 | List | Overdue indicator shown | UI / UX | P2 | Invoice due_date < today; status='unpaid' | n/a | 1. Open list | Red 'OVERDUE' chip on row | - | - |
| TC-INVO-PAGINATION-001 | List | Pagination defaults | Functional | P1 | ≥21 invoices | n/a | 1. Reload | 20 per page | - | - |
| TC-INVO-NETWORK-001 | Edge | Network failure during payment | Edge | P1 | Network down mid-submit | n/a | 1. Submit payment with offline backend | Toast error<br/>No partial state<br/>Retry succeeds | - | - |

## Customers

_15 test cases_

| TC ID | Submodule | Title | Type | Priority | Preconditions | Test Data | Steps | Expected Result | API Contract | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| TC-CUST-LIST-001 | List | Customer list loads | Functional | P0 | ≥1 customer | n/a | 1. Open /customers | Table with name, mobile, email, GSTIN, total_orders | GET /customers → 200 | - |
| TC-CUST-LIST-002 | List | Search by name or mobile | Functional | P1 | Acme exists | search='Acme' | 1. Search | Matching rows | - | - |
| TC-CUST-CREATE-001 | Create | Create customer happy path | Functional | P0 | Logged in | name='New Cust' mobile=9000000010 | 1. Open /customers/add<br/>2. Fill<br/>3. Save | Customer persisted; redirect to detail | POST /customers → 201 | - |
| TC-CUST-CREATE-002 | Create | Mobile format enforced | Negative | P0 | Form open | mobile=12345 | 1. Submit | Field error | - | - |
| TC-CUST-CREATE-003 | Create | Duplicate mobile warns | Negative | P1 | Existing mobile | mobile=9000000001 | 1. Type mobile + blur | Warning showing existing customer | - | - |
| TC-CUST-CREATE-004 | Create | GSTIN format validated when provided | Negative | P2 | Form | gstin='INVALID' | 1. Submit | Field error | - | - |
| TC-CUST-DETAIL-001 | Detail | Detail shows orders + invoices history | Functional | P0 | Customer with orders | n/a | 1. Open detail | Tabs: Profile, Orders, Invoices, Quotations, Notes | GET /customers/5 → 200 | - |
| TC-CUST-DETAIL-002 | Detail | Edit customer profile | Functional | P1 | Detail open | change address | 1. Click Edit<br/>2. Save | Address updated | PATCH /customers/5 → 200 | - |
| TC-CUST-MERGE-001 | Merge | Merge two customers preserves history | Functional | P1 | Two duplicate customers | primaryId=5 secondaryId=6 | 1. Click Merge | All orders/invoices reassigned to primary; secondary deleted | POST /customers/merge → 200 | - |
| TC-CUST-IMPORT-001 | Import | CSV import happy path | Functional | P2 | CSV with 50 rows | valid file | 1. Click Import<br/>2. Upload CSV | All rows imported<br/>Report shows 50/50 success | POST /customers/import → 200 | - |
| TC-CUST-IMPORT-002 | Import | CSV with invalid mobile rows reported | Negative | P2 | 10 rows; 2 invalid mobile | n/a | 1. Upload | 8 imported<br/>2 rejected with reasons | - | - |
| TC-CUST-PERM-001 | Permission | Viewer cannot create | Permission | P0 | qa.viewer | n/a | 1. POST /customers | 403 | - | - |
| TC-CUST-PAGINATION-001 | List | Pagination 20 default | Functional | P1 | ≥21 customers | n/a | 1. Reload | 20/page | - | - |
| TC-CUST-EMPTY-001 | List | Empty state CTA | UI / UX | P2 | Fresh tenant | n/a | 1. Open list | 'Add your first customer' CTA | - | - |
| TC-CUST-AUDIT-001 | Audit | Edit writes audit log | Integration | P1 | DB read | n/a | 1. Edit customer<br/>2. Inspect | Row added | - | - |

## CRM

_20 test cases_

| TC ID | Submodule | Title | Type | Priority | Preconditions | Test Data | Steps | Expected Result | API Contract | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| TC-CRM-LEAD-001 | Lead List | Lead list loads with pipeline view | Functional | P0 | ≥1 lead | n/a | 1. Open /crm | Kanban or list with stages: New, Contacted, Qualified, Proposal, Closed Won, Closed Lost | GET /crm/leads → 200 | - |
| TC-CRM-LEAD-002 | Lead Create | Create lead happy path | Functional | P0 | Logged in | name='Lead1' mobile=9000000020 source='Website' | 1. /crm/add<br/>2. Fill<br/>3. Save | Lead created with stage='New' | POST /crm/leads → 201 | - |
| TC-CRM-LEAD-003 | Lead Create | Mobile validation | Negative | P0 | Form | mobile invalid | 1. Submit | Field error | - | - |
| TC-CRM-LEAD-004 | Lead Detail | Detail shows activity timeline | Functional | P0 | Lead id=5 | n/a | 1. Open detail | Timeline of contacts, follow-ups, notes | GET /crm/leads/5 → 200 | - |
| TC-CRM-LEAD-005 | Lead Stage | Move stage updates timeline | Functional | P1 | Lead in stage='New' | to='Contacted' | 1. Drag to next stage or click Update | Stage updated; timeline event recorded | PATCH /crm/leads/5 → 200 | - |
| TC-CRM-LEAD-006 | Lead Convert | Convert lead to enquiry | Integration | P1 | Lead in 'Qualified' | n/a | 1. Click Convert to Enquiry | Enquiry created with lead data; lead status='Converted' | - | - |
| TC-CRM-FU-001 | Follow-up | Schedule follow-up | Functional | P0 | Lead detail open | date=2026-05-01 type='Call' notes='Discuss pricing' | 1. Click Schedule Follow-up<br/>2. Fill<br/>3. Save | Follow-up listed; notification scheduled | POST /crm/leads/5/followups → 201 | - |
| TC-CRM-FU-002 | Follow-up | Mark follow-up complete | Functional | P1 | Pending follow-up | n/a | 1. Click Done | Status='completed'; outcome captured | - | - |
| TC-CRM-FU-003 | Follow-up | Overdue follow-ups highlighted | UI / UX | P2 | FU due_date < today and not completed | n/a | 1. Open /crm/follow-ups | Red badge OVERDUE | - | - |
| TC-CRM-ASSIGN-001 | Assign | Reassign lead to another sales rep | Functional | P1 | Lead assigned to A | newAssignee=B | 1. Click Reassign<br/>2. Pick B<br/>3. Save | Lead.assigned_to=B; notification sent | PATCH /crm/leads/5/assign → 200 | - |
| TC-CRM-ASSIGN-002 | Assign | Bulk reassign multiple leads | Functional | P2 | Selected 5 leads | newAssignee | 1. Multi-select<br/>2. Bulk Reassign | All 5 reassigned | PATCH /crm/leads/bulk-assign → 200 | - |
| TC-CRM-RPT-001 | Report | Conversion report by source | Functional | P1 | Mixed sources | month=April | 1. Open /crm/reports | Bar chart by source; conversion % | GET /crm/reports → 200 | - |
| TC-CRM-TEAM-001 | Team | Team-wise lead distribution view | Functional | P1 | Manager | n/a | 1. Open /crm/team | Per-rep lead counts + stage breakdown | - | - |
| TC-CRM-PERM-001 | Permission | Without crm:leads:view get 403 | Permission | P0 | qa.viewer with crm=0 | n/a | 1. Open /crm | 403 | - | - |
| TC-CRM-SCOPE-001 | Permission | ownDataOnly limits leads to assignee | Permission | P0 | qa.scoped ownDataOnly | n/a | 1. Open list | Only leads assigned to qa.scoped visible | - | - |
| TC-CRM-IMPORT-001 | Import | Bulk-import leads from CSV | Functional | P2 | CSV 100 rows | valid | 1. Upload | All imported with default stage 'New' | POST /crm/leads/import → 200 | - |
| TC-CRM-EXPORT-001 | Export | Export filtered leads | Functional | P2 | Filter by source | n/a | 1. Click Export | CSV downloaded with filtered rows | - | - |
| TC-CRM-NOTES-001 | Detail | Add note to lead | Functional | P1 | Lead detail | note='Sent brochure' | 1. Add note | Note appears in timeline | POST /crm/leads/5/notes → 201 | - |
| TC-CRM-AUDIT-001 | Audit | Stage move writes audit | Integration | P1 | DB read | n/a | 1. Move stage<br/>2. Inspect | Audit row | - | - |
| TC-CRM-EMPTY-001 | List | Empty state shows CTA | UI / UX | P2 | Fresh tenant | n/a | 1. Open /crm | Empty illustration + 'Capture your first lead' | - | - |

## Enquiries

_16 test cases_

| TC ID | Submodule | Title | Type | Priority | Preconditions | Test Data | Steps | Expected Result | API Contract | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| TC-ENQ-LIST-001 | List | Enquiry list loads | Functional | P0 | ≥1 enquiry | n/a | 1. Open /enquiries | Table renders | GET /enquiries → 200 | - |
| TC-ENQ-CREATE-001 | Create | Create enquiry happy path | Functional | P0 | Logged in | name='Cust' mobile=9000000030 source='Phone' | 1. /enquiries/add<br/>2. Fill<br/>3. Save | Enquiry status='New' | POST /enquiries → 201 | - |
| TC-ENQ-CREATE-002 | Create | Mobile validation | Negative | P0 | Form | invalid mobile | 1. Submit | Error | - | - |
| TC-ENQ-CREATE-003 | Create | Email format validated | Negative | P1 | Form | email='bad' | 1. Submit | Error | - | - |
| TC-ENQ-DETAIL-001 | Detail | Detail shows status + linked quotations | Functional | P0 | Enquiry id=5 with quotations | n/a | 1. Open detail | Quotations section lists linked Q numbers | GET /enquiries/5 → 200 | - |
| TC-ENQ-CONVERT-001 | Convert | Create Quotation from enquiry | Integration | P0 | Enquiry detail | n/a | 1. Click Create Quotation | Routes /quotations/create?enquiryId=5; pre-filled customer | - | - |
| TC-ENQ-CONVERT-002 | Convert | Auto-update enquiry status when quote sent | Integration | P0 | Enquiry linked | n/a | 1. Send quote linked to enquiry | Enquiry status='Quotation Sent' | - | - |
| TC-ENQ-CONVERT-003 | Convert | Auto-move to Follow Up on quote rejection | Integration | P0 | Quote linked rejected | n/a | 1. Reject linked quote | Enquiry status='Follow Up' | - | - |
| TC-ENQ-CONVERT-004 | Convert | Sale Closed status on quote acceptance | Integration | P0 | Linked quote | n/a | 1. Accept quote | Enquiry status='Sale Closed'<br/>convertedCustomerId set | - | - |
| TC-ENQ-FU-001 | Follow-up | Add follow-up to enquiry | Functional | P1 | Enquiry open | date+notes | 1. Add follow-up | Follow-up listed | POST /enquiries/5/followups → 201 | - |
| TC-ENQ-ATTACH-001 | Attachments | Attach file to enquiry | Functional | P2 | Enquiry open | PDF 1MB | 1. Upload | File listed; download link works | POST /enquiries/5/attachments → 201 | - |
| TC-ENQ-ATTACH-002 | Attachments | File over size limit rejected | Boundary | P2 | Limit=5MB | 10MB file | 1. Upload | 413 'File too large' | - | - |
| TC-ENQ-PERM-001 | Permission | Viewer cannot create | Permission | P0 | qa.viewer | n/a | 1. POST /enquiries | 403 | - | - |
| TC-ENQ-FILTER-001 | List | Filter by status | Functional | P1 | Mixed | status='Follow Up' | 1. Filter | Matches only | - | - |
| TC-ENQ-PRINT-001 | Detail | Print enquiry summary | Functional | P2 | Detail | n/a | 1. Click Print | /print/enquiry/5 opens | - | - |
| TC-ENQ-AUDIT-001 | Audit | Status change audited | Integration | P1 | DB read | n/a | 1. Change status<br/>2. Inspect | Row added | - | - |

## Inventory

_20 test cases_

| TC ID | Submodule | Title | Type | Priority | Preconditions | Test Data | Steps | Expected Result | API Contract | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| TC-INV-LIST-001 | Stock List | Stock list loads | Functional | P0 | ≥1 raw_material | n/a | 1. Open /inventory | Table with material, current_qty, unit, reorder_level | GET /inventory → 200 | - |
| TC-INV-LIST-002 | Stock List | Below-reorder rows highlighted | UI / UX | P1 | Item with current<reorder | n/a | 1. Open list | Red highlight on row | - | - |
| TC-INV-ADD-001 | Add Stock | Add stock manually | Functional | P0 | Logged in | rawMaterialId=1 qty=50 | 1. /inventory/add<br/>2. Fill<br/>3. Save | Stock increased; ledger entry created | POST /inventory → 201 | - |
| TC-INV-ADD-002 | Add Stock | Negative qty blocked | Negative | P0 | Form | qty=-10 | 1. Submit | Field error | - | - |
| TC-INV-LEDGER-001 | Ledger | Stock ledger shows in/out movements | Functional | P0 | Multiple movements | rawMaterialId=1 | 1. Open ledger for item | Chronological list of in/out with reference (GRN/MR/adjustment) | GET /inventory/ledger?rawMaterialId=1 → 200 | - |
| TC-INV-LEDGER-002 | Ledger | Running balance correct | Functional | P0 | Movements: +100, -30, +20 | n/a | 1. Inspect ledger | Running balance: 100, 70, 90 | - | - |
| TC-INV-GRN-001 | GRN | Create GRN from PO | Functional | P0 | Open PO with items | purchaseOrderId=5 | 1. /inventory/goods-receipts → New<br/>2. Pick PO<br/>3. Receive items<br/>4. Save | GRN created; stock increased; ledger updated | POST /goods-receipts → 201 | - |
| TC-INV-GRN-002 | GRN | Partial GRN updates PO progress | Functional | P1 | PO qty 100 | received=60 | 1. Submit GRN with 60 | PO.received_qty=60; status='partially_received' | - | - |
| TC-INV-GRN-003 | GRN | Over-receipt warning | Negative | P1 | PO qty 100 | received=120 | 1. Submit | Warning or 400 'Receipt exceeds order qty' | - | - |
| TC-INV-MR-001 | Material Request | Issue MR happy path | Functional | P0 | Stock 100; JC pending | qty=10 | 1. Issue MR | MR created status='pending' | POST /material-requests → 201 | - |
| TC-INV-MR-002 | Material Request | Approve MR deducts stock | Integration | P0 | Stock 100 | MR qty 10 | 1. Approve | Stock=90; MR='issued' | PATCH /material-requests/{id}/approve → 200 | - |
| TC-INV-MR-003 | Material Request | Insufficient stock blocks approval | Negative | P0 | Stock 5 | MR qty 10 | 1. Approve | 400 'Insufficient stock' | - | - |
| TC-INV-ADJ-001 | Adjustment | Stock adjustment with reason | Functional | P1 | Item exists | delta=-3 reason='Damaged' | 1. Adjust | Stock updated; adjustment row in ledger | POST /inventory/adjust → 201 | - |
| TC-INV-ADJ-002 | Adjustment | Adjustment requires reason | Negative | P1 | Form | reason='' | 1. Submit | Error 'Reason required' | - | - |
| TC-INV-PERM-001 | Permission | Viewer cannot adjust | Permission | P0 | qa.viewer | n/a | 1. POST adjust | 403 | - | - |
| TC-INV-AUDIT-001 | Audit | Adjustment audited | Integration | P1 | DB read | n/a | 1. Adjust<br/>2. Inspect | Row added | - | - |
| TC-INV-PAGINATION-001 | List | Pagination | Functional | P1 | ≥21 items | n/a | 1. Reload | 20/page | - | - |
| TC-INV-FILTER-001 | List | Filter by category | Functional | P1 | Mixed cats | category='Metal' | 1. Filter | Matches only | - | - |
| TC-INV-EMPTY-001 | List | Empty state | UI / UX | P2 | Fresh tenant | n/a | 1. Open list | Illustration + 'Add raw material' | - | - |
| TC-INV-NETWORK-001 | Edge | Network failure on adjust | Edge | P2 | Backend offline | n/a | 1. Submit | Toast error; no partial state | - | - |

## Products

_18 test cases_

| TC ID | Submodule | Title | Type | Priority | Preconditions | Test Data | Steps | Expected Result | API Contract | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| TC-PROD-LIST-001 | List | Products list loads | Functional | P0 | ≥1 product | n/a | 1. Open /products | Table with code, name, category, price, stock | GET /products → 200 | - |
| TC-PROD-CREATE-001 | Create | Create product happy path | Functional | P0 | Logged in | code='P-001' name='Test' price=100 unit='PCS' tax=18 | 1. /products/add<br/>2. Fill<br/>3. Save | Product created | POST /products → 201 | - |
| TC-PROD-CREATE-002 | Create | Duplicate code rejected | Negative | P0 | P-001 exists | code=P-001 | 1. Submit | 409 'Product code exists' | - | - |
| TC-PROD-CREATE-003 | Create | Required fields enforced | Negative | P0 | Form | all blank | 1. Submit | Multiple field errors | - | - |
| TC-PROD-DETAIL-001 | Detail | Detail loads | Functional | P0 | P-001 exists | n/a | 1. Open detail | All fields displayed | GET /products/1 → 200 | - |
| TC-PROD-EDIT-001 | Detail | Edit product price | Functional | P0 | Detail open | price=150 | 1. Edit price<br/>2. Save | Price updated | PATCH /products/1 → 200 | - |
| TC-PROD-TIERS-001 | Tiers | Add discount tier | Functional | P1 | Product detail | minQty=10 disc=10 | 1. Add tier | Tier persisted | PATCH /products/1 → 200 | - |
| TC-PROD-TIERS-002 | Tiers | Tiers must be ascending by minQty | Negative | P1 | Existing tier minQty=10 | new minQty=5 | 1. Try add | Validation error | - | - |
| TC-PROD-TIERS-003 | Tiers | Discount % 0-99 | Boundary | P1 | Form | disc=100 | 1. Try set 100 | Field error | - | - |
| TC-PROD-CAT-001 | Category | Create category | Functional | P1 | Logged in | name='Metals' | 1. /products/categories<br/>2. New | Category created | POST /product-categories → 201 | - |
| TC-PROD-CAT-002 | Category | Duplicate category name rejected | Negative | P1 | Existing 'Metals' | name='Metals' | 1. Try add | 409 | - | - |
| TC-PROD-SUB-001 | Subcategory | Create subcategory | Functional | P1 | Category 'Metals' | name='Steel' | 1. Create | Subcat under Metals | POST /product-subcategories → 201 | - |
| TC-PROD-PERM-001 | Permission | Viewer cannot create | Permission | P0 | qa.viewer | n/a | 1. POST /products | 403 | - | - |
| TC-PROD-IMG-001 | Detail | Upload product image | Functional | P2 | Product detail | JPG 500KB | 1. Upload | Thumbnail displayed | - | - |
| TC-PROD-IMG-002 | Detail | Reject non-image upload | Negative | P2 | Form | PDF | 1. Upload | Error 'Only images allowed' | - | - |
| TC-PROD-EMPTY-001 | List | Empty state | UI / UX | P2 | Fresh tenant | n/a | 1. Open list | CTA 'Add your first product' | - | - |
| TC-PROD-FILTER-001 | List | Filter by category | Functional | P1 | Mixed | n/a | 1. Filter | Matches only | - | - |
| TC-PROD-AUDIT-001 | Audit | Edit audited | Integration | P1 | DB read | n/a | 1. Edit<br/>2. Inspect | Row added | - | - |

## Employees & RBAC

_25 test cases_

| TC ID | Submodule | Title | Type | Priority | Preconditions | Test Data | Steps | Expected Result | API Contract | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| TC-EMP-LIST-001 | Employees | Employees list loads | Functional | P0 | Logged as enterprise | n/a | 1. /employees | Table with name, email, role, department, status | GET /employees → 200 | - |
| TC-EMP-CREATE-001 | Employees | Create employee happy path | Functional | P0 | Logged in | name='New Emp' email='new.emp@vaberp-test.com' password='Pass@123' role='salesrep' | 1. /employees/add<br/>2. Fill<br/>3. Save | Employee created with default permissions | POST /employees → 201 | - |
| TC-EMP-CREATE-002 | Employees | Duplicate email within tenant rejected | Negative | P0 | Existing email in this enterprise | same email | 1. Submit | 409 'Email already exists' | - | - |
| TC-EMP-CREATE-003 | Employees | Same email allowed across enterprises | Functional | P1 | Email used in tenant B; logged into tenant A | n/a | 1. Create with same email | Created (different enterprise)<br/>Login will trigger multi-match flow | - | - |
| TC-EMP-PERM-001 | Permissions Matrix | Open permission matrix for employee | Functional | P0 | Employee detail | n/a | 1. Click Permissions tab | Matrix renders all 17 modules with checkboxes | GET /employees/5/permissions → 200 | - |
| TC-EMP-PERM-002 | Permissions Matrix | Toggle permission and save | Functional | P0 | Matrix open | set sales:quotations:create=1 | 1. Toggle<br/>2. Save | Permission saved<br/>Employee picks it up on next /auth/permissions poll | PATCH /employees/5/permissions → 200 | - |
| TC-EMP-PERM-003 | Permissions Matrix | Cannot edit own permissions | Permission | P0 | Employee viewing own permission page | n/a | 1. Try toggle | Disabled or 403 | - | - |
| TC-EMP-PERM-004 | Permissions Matrix | Bulk role apply (e.g., 'Sales Rep' template) | Functional | P1 | Templates exist | template='Sales Rep' | 1. Apply | All sales:* set to 1 | - | - |
| TC-EMP-DEPT-001 | Departments | Create department | Functional | P1 | Logged in | name='Production' | 1. /employees/departments<br/>2. New | Department created | POST /departments → 201 | - |
| TC-EMP-DEPT-002 | Departments | Cannot delete dept with employees | Negative | P1 | Dept has 3 employees | n/a | 1. Try delete | 400 'Department has assigned employees' | - | - |
| TC-EMP-DESIG-001 | Designations | Create designation | Functional | P2 | Logged in | name='Engineer' | 1. /employees/designations<br/>2. New | Designation created | POST /designations → 201 | - |
| TC-EMP-HIER-001 | Reporting Hierarchy | Set reporting head | Functional | P1 | Employee A; manager B | reportingTo=B | 1. Edit A<br/>2. Set reportingTo=B | A.reportingTo=B; B.isReportingHead=true | PATCH /employees/{id} → 200 | - |
| TC-EMP-HIER-002 | Reporting Hierarchy | Manager sees reports' data | Permission | P0 | Manager B; report A's quotations | n/a | 1. Login as B<br/>2. Open /quotations | A's quotations included in B's list | - | - |
| TC-EMP-HIER-003 | Reporting Hierarchy | Cyclic reporting blocked | Negative | P1 | A→B→C | set C→A | 1. Try save | 400 'Reporting cycle detected' | - | - |
| TC-EMP-SCOPE-001 | Data Scope | dataStartDate hides earlier records | Permission | P0 | Employee dataStartDate=2026-01-01 | Quotation dated 2025-12-15 exists | 1. List quotations | Old quotation hidden | - | - |
| TC-EMP-SCOPE-002 | Data Scope | ownDataOnly limits to created_by | Permission | P0 | ownDataOnly=true | mixed records | 1. List | Only own records visible | - | - |
| TC-EMP-DEACTIVATE-001 | Employees | Deactivate employee | Functional | P0 | Active employee | n/a | 1. Click Deactivate | status='inactive'<br/>Employee can't login<br/>Existing tokens invalidated on next request | PATCH /employees/{id}/status → 200 | - |
| TC-EMP-DEACTIVATE-002 | Employees | Cannot deactivate yourself | Negative | P1 | Self detail page | n/a | 1. Try deactivate | 400 'Cannot deactivate yourself' | - | - |
| TC-EMP-RESET-001 | Employees | Admin reset employee password | Functional | P1 | Employee detail | newPassword='Reset@456' | 1. Click Reset Password | Password updated; employee notified | POST /employees/{id}/reset-password → 200 | - |
| TC-EMP-PERM-005 | Permissions Matrix | Permission denied 403 with detailed message | Permission | P0 | qa.viewer | n/a | 1. Try delete employee | 403 with reason | DELETE /employees/{id} → 403 | - |
| TC-EMP-AUDIT-001 | Audit | Permission change audited | Integration | P0 | DB read | n/a | 1. Toggle permission<br/>2. Inspect | Audit row { action:'permission_changed', employee_id, before, after } | - | - |
| TC-EMP-FILTER-001 | List | Filter by department | Functional | P1 | Mixed depts | dept='Sales' | 1. Filter | Matches only | - | - |
| TC-EMP-PERMISSION-006 | Permissions Polling | Permission cache invalidates within polling interval | Integration | P1 | Employee logged in | admin grants new perm | 1. Admin grants perm<br/>2. Wait poll interval | Frontend hasPermission() returns true on next poll | GET /auth/permissions → 200 | - |
| TC-EMP-WRONG-ROLE-001 | Cross-Role | Reseller cannot access /employees | Permission | P0 | Reseller token | n/a | 1. GET /employees | 403 | - | - |
| TC-EMP-WRONG-ROLE-002 | Cross-Role | Super-admin cannot access tenant /employees endpoint | Permission | P1 | Super-admin token | n/a | 1. GET /employees (tenant scope) | 403 (SA uses /super-admin/* endpoints) | - | - |

## Procurement

_20 test cases_

| TC ID | Submodule | Title | Type | Priority | Preconditions | Test Data | Steps | Expected Result | API Contract | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| TC-PROC-SUP-001 | Suppliers | Create supplier | Functional | P0 | Logged in | name='Sup1' mobile=9000000040 gstin valid | 1. /procurement/suppliers → New<br/>2. Save | Supplier persisted | POST /suppliers → 201 | - |
| TC-PROC-SUP-002 | Suppliers | GSTIN validated | Negative | P1 | Form | gstin='INVALID' | 1. Submit | Field error | - | - |
| TC-PROC-SUP-003 | Suppliers | List shows status | Functional | P1 | ≥1 sup | n/a | 1. List | Status badges | - | - |
| TC-PROC-IND-001 | Indents | Create indent | Functional | P0 | Logged in | rawMaterial qty | 1. /procurement/indents → New<br/>2. Save | Indent status='pending' | POST /indents → 201 | - |
| TC-PROC-IND-002 | Indents | Approve indent | Functional | P0 | Pending indent | n/a | 1. Approve | Status='approved' | PATCH /indents/{id}/approve → 200 | - |
| TC-PROC-IND-003 | Indents | Convert to RFQ | Integration | P1 | Approved indent | supplierIds=[1,2,3] | 1. Click 'Send to RFQ' | RFQ rows created for each supplier | POST /rfqs → 201 | - |
| TC-PROC-RFQ-001 | RFQ | Send RFQ email | Functional | P1 | RFQ exists | n/a | 1. Send | Email dispatched | POST /rfqs/{id}/send → 200 | - |
| TC-PROC-RFQ-002 | RFQ | Capture supplier quote against RFQ | Functional | P0 | RFQ open | supplierId price | 1. Add quote | Quote stored; comparable in matrix | POST /rfqs/{id}/quotes → 201 | - |
| TC-PROC-RFQ-003 | RFQ | Award supplier from quote | Integration | P0 | Multiple quotes | winnerId | 1. Click Award | RFQ status='awarded'<br/>PO draft created | POST /rfqs/{id}/award → 201 | - |
| TC-PROC-PO-001 | Purchase Orders | Create PO from awarded RFQ | Functional | P0 | RFQ awarded | n/a | 1. Submit PO | PO created status='open' | POST /purchase-orders → 201 | - |
| TC-PROC-PO-002 | Purchase Orders | Cancel open PO | Functional | P1 | Open PO | reason='Vendor unable' | 1. Cancel | Status='cancelled' | PATCH /purchase-orders/{id} → 200 | - |
| TC-PROC-PO-003 | Purchase Orders | Receive partial via GRN updates PO | Integration | P0 | Open PO qty 100 | GRN qty 60 | 1. Submit GRN | PO.received_qty=60; status='partially_received' | - | - |
| TC-PROC-PO-004 | Purchase Orders | PO close-out on full receipt | Integration | P0 | Partially received | remaining 40 received | 1. Submit GRN 40 | PO status='received' | - | - |
| TC-PROC-PERM-001 | Permission | Viewer cannot create supplier | Permission | P0 | qa.viewer | n/a | 1. POST /suppliers | 403 | - | - |
| TC-PROC-AUDIT-001 | Audit | PO approve audited | Integration | P1 | DB read | n/a | 1. Approve<br/>2. Inspect | Row added | - | - |
| TC-PROC-LIST-001 | List | PO list pagination | Functional | P1 | ≥21 POs | n/a | 1. Reload | 20/page | - | - |
| TC-PROC-FILTER-001 | List | Filter by supplier | Functional | P1 | Multiple sups | supplierId=2 | 1. Filter | Matches only | - | - |
| TC-PROC-EMPTY-001 | List | Empty state | UI / UX | P2 | Fresh tenant | n/a | 1. Open | CTA 'Add your first supplier' | - | - |
| TC-PROC-NETWORK-001 | Edge | Network failure on PO create | Edge | P2 | Backend offline | n/a | 1. Submit | Toast error; no partial | - | - |
| TC-PROC-DUP-001 | Suppliers | Duplicate supplier code rejected | Negative | P1 | Existing | code=SUP-001 | 1. Try create | 409 | - | - |

## Waste Management

_30 test cases_

| TC ID | Submodule | Title | Type | Priority | Preconditions | Test Data | Steps | Expected Result | API Contract | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| TC-WST-INV-001 | Inventory | Production-waste appears in waste-inventory list | Integration | P0 | JC stage completed with waste qty | n/a | 1. Open /waste-inventory | Aggregated row visible with raw material name + total qty | GET /waste-inventory → 200 | - |
| TC-WST-INV-002 | Inventory | View Logs button opens audit-trail modal | Functional | P0 | Row exists | n/a | 1. Click View logs | Modal lists every contributing log: Date, Action, Source (JC# / PO# / Customer), Qty change, Running total, User, Notes | - | - |
| TC-WST-INV-003 | Inventory | Source link routes to PO | Functional | P1 | Log row with purchaseOrderId | n/a | 1. Click JC link | Routes /manufacturing/po/{purchaseOrderId} | - | - |
| TC-WST-INV-004 | Inventory | Aggregation by raw_material+category | Integration | P0 | Two JCs same RM same cat | n/a | 1. Each adds 5 kg | Single inventory row qty=10<br/>Two log entries | - | - |
| TC-WST-INV-005 | Inventory | Quarantine batch | Functional | P0 | Available row | notes='Smell off' | 1. Click Quarantine<br/>2. Enter reason<br/>3. Confirm | Status='quarantined'<br/>Log action='quarantined' qty_delta=0 | POST /waste-inventory/{id}/quarantine → 200 | - |
| TC-WST-INV-006 | Inventory | Quarantine blocked when fully_disposed | Negative | P0 | Status='fully_disposed' | n/a | 1. Try quarantine | 400 'Cannot quarantine item with status: fully_disposed' | - | - |
| TC-WST-INV-007 | Inventory | Write-off zeroes qty | Functional | P0 | Available qty=10 | notes='Manual' | 1. Click Write Off<br/>2. Confirm | Status='fully_disposed'<br/>Qty=0<br/>Log action='written_off' qty_delta=-10 | POST /waste-inventory/{id}/write-off → 200 | - |
| TC-WST-INV-008 | Inventory | Write-off blocked when qty=0 | Negative | P1 | Qty=0 | n/a | 1. Click Write Off | 400 'No available quantity to write off' | - | - |
| TC-WST-INV-009 | Inventory | + Source button removed | UI / UX | P3 | Open /waste-inventory | n/a | 1. Inspect toolbar | + Source button absent (only Manage categories shown) | Recent change | - |
| TC-WST-INV-010 | Inventory | + Log Waste Entry button removed | UI / UX | P2 | Open /waste-inventory | n/a | 1. Inspect toolbar | + Log Waste Entry button absent (page is read-only) | Recent change | - |
| TC-WST-INV-011 | Inventory | Dashboard stats render | UI / UX | P1 | ≥1 row | n/a | 1. Open list | Cards: Total batches, Available, Reserved, Quarantined, Disposed, Expiring ≤7d | GET /waste-inventory/dashboard → 200 | - |
| TC-WST-INV-012 | Inventory | Manage categories opens modal | Functional | P2 | Toolbar | n/a | 1. Click Manage categories | Modal with category form | - | - |
| TC-WST-INV-013 | Inventory | Filter by status | Functional | P1 | Mixed statuses | status='quarantined' | 1. Filter | Matches only | - | - |
| TC-WST-INV-014 | Inventory | Filter by classification | Functional | P1 | Categories with classifications | classification='hazardous' | 1. Filter | Matches only | - | - |
| TC-WST-INV-015 | Inventory | Auto-expire job marks expired status | Integration | P1 | Row with expiry_alert_date<today | n/a | 1. Wait for daily 6 AM cron OR trigger manually | Status='expired'<br/>Log action='expired' | Cron job | - |
| TC-WST-DISP-001 | Disposal | Create disposal transaction | Functional | P0 | Available batch + waste party | partyId=1 batchIds=[1,2] | 1. /waste-disposal → New<br/>2. Pick party<br/>3. Add lines<br/>4. Save | Transaction status='draft' | POST /waste-disposal → 201 | - |
| TC-WST-DISP-002 | Disposal | Confirm disposal moves to in_transit | Functional | P1 | Draft | n/a | 1. Confirm | Status='confirmed' or 'in_transit'<br/>Reserved qty on inventory | POST /waste-disposal/{id}/confirm → 200 | - |
| TC-WST-DISP-003 | Disposal | Complete disposal updates inventory | Integration | P0 | Confirmed transaction qty=10 | actual=10 | 1. Complete | Inventory qty deducted by 10<br/>Log action='disposed' | POST /waste-disposal/{id}/complete → 200 | - |
| TC-WST-DISP-004 | Disposal | Cancel disposal releases reserved qty | Functional | P1 | Confirmed | n/a | 1. Cancel | Reserved released back to available | POST /waste-disposal/{id}/cancel → 200 | - |
| TC-WST-DISP-005 | Disposal | Hazardous waste requires manifest | Negative | P1 | Hazardous category | manifest_number='' | 1. Submit | 400 'Manifest number required' | - | - |
| TC-WST-PARTY-001 | Parties | Create waste party | Functional | P0 | Logged in | all required | 1. /waste-parties → New | Party persisted | POST /waste-parties → 201 | - |
| TC-WST-PARTY-002 | Parties | Pollution-board cert expiry alert | UI / UX | P1 | Cert expiring in 3 days | n/a | 1. Open list | Red badge 'Cert expires in 3 days' | GET /waste-parties/expiring-certs?days=30 → 200 | - |
| TC-WST-PARTY-003 | Parties | Set buy/disposal rate | Functional | P1 | Party detail | categoryId rate=10 | 1. Add rate | Rate persisted | POST /waste-parties/{id}/rates → 201 | - |
| TC-WST-PARTY-004 | Parties | Rating 0-5 boundary | Boundary | P2 | Form | rating=6 | 1. Submit | Field error | - | - |
| TC-WST-ANL-001 | Analytics | Summary loads | Functional | P1 | Some data | n/a | 1. /waste-analytics | KPIs: total generated, disposed, revenue, cost | GET /waste-analytics/summary → 200 | - |
| TC-WST-ANL-002 | Analytics | Trends chart by month | Functional | P2 | ≥3 months data | n/a | 1. Open trends | Chart renders | GET /waste-analytics/trends → 200 | - |
| TC-WST-PERM-001 | Permission | Viewer cannot quarantine | Permission | P0 | qa.viewer | n/a | 1. POST quarantine | 403 | - | - |
| TC-WST-AUDIT-001 | Audit | Quarantine audited | Integration | P1 | DB read | n/a | 1. Quarantine<br/>2. Inspect | Row added | - | - |
| TC-WST-EMPTY-001 | Inventory | Empty state when no production waste yet | UI / UX | P2 | Fresh tenant | n/a | 1. Open list | Empty illustration with explanation | - | - |
| TC-WST-NETWORK-001 | Edge | Network failure on quarantine | Edge | P2 | Offline | n/a | 1. Submit | Toast error | - | - |

## Service Management

_13 test cases_

| TC ID | Submodule | Title | Type | Priority | Preconditions | Test Data | Steps | Expected Result | API Contract | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| TC-SVC-PROD-001 | Service Products | List loads | Functional | P0 | ≥1 svc product | n/a | 1. /service-products | Table | GET /service-products → 200 | - |
| TC-SVC-PROD-002 | Service Products | Create service product | Functional | P0 | Logged in | name='AC Service' duration=2h price=500 | 1. /service-products/add | Persisted | POST /service-products → 201 | - |
| TC-SVC-BOOK-001 | Bookings | Create booking | Functional | P0 | Customer + service | scheduled=2026-05-10 | 1. /service-bookings → New | Booking status='scheduled' | POST /service-bookings → 201 | - |
| TC-SVC-BOOK-002 | Bookings | Cannot book past date | Negative | P1 | Form | scheduled=yesterday | 1. Submit | Field error | - | - |
| TC-SVC-BOOK-003 | Bookings | Reschedule booking | Functional | P1 | Scheduled | newDate | 1. Reschedule | Booking updated; notification | PATCH /service-bookings/{id} → 200 | - |
| TC-SVC-EVENT-001 | Events | Start service event | Functional | P0 | Booking confirmed | n/a | 1. Click Start | Event status='in_progress' start_time set | POST /service-events → 201 | - |
| TC-SVC-EVENT-002 | Events | Complete event with notes | Functional | P0 | In-progress event | notes='Done' | 1. Click Complete | Status='completed' end_time set | PATCH /service-events/{id} → 200 | - |
| TC-SVC-REV-001 | Revenue | Revenue summary | Functional | P1 | Completed events | n/a | 1. /service-revenue | Revenue by month/service | - | - |
| TC-SVC-PERM-001 | Permission | Viewer cannot create booking | Permission | P0 | qa.viewer | n/a | 1. POST | 403 | - | - |
| TC-SVC-FILTER-001 | Bookings | Filter by status | Functional | P1 | Mixed | status='scheduled' | 1. Filter | Matches | - | - |
| TC-SVC-AUDIT-001 | Audit | Event complete audited | Integration | P1 | DB read | n/a | 1. Complete<br/>2. Inspect | Row added | - | - |
| TC-SVC-EMPTY-001 | Bookings | Empty state | UI / UX | P2 | Fresh | n/a | 1. Open | CTA | - | - |
| TC-SVC-PRICING-001 | Service Products | Tiered pricing applied | Functional | P2 | Tiered svc product | qty=10 | 1. Add to booking | Tier price applied | - | - |

## Machinery & Maintenance

_14 test cases_

| TC ID | Submodule | Title | Type | Priority | Preconditions | Test Data | Steps | Expected Result | API Contract | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| TC-MACH-ASSET-001 | Machine Registry | Add machine | Functional | P0 | Logged in | name='Lathe-1' code='M-001' | 1. /machinery → New | Machine persisted | POST /machines → 201 | - |
| TC-MACH-ASSET-002 | Machine Registry | Duplicate code rejected | Negative | P1 | M-001 exists | code=M-001 | 1. Submit | 409 | - | - |
| TC-MACH-DETAIL-001 | Detail | Detail loads with downtime + maintenance | Functional | P1 | Machine M-001 | n/a | 1. Open detail | Sections: profile, downtime log, maintenance history, spare parts | GET /machines/1 → 200 | - |
| TC-MACH-SPARE-001 | Spare Parts | Add spare part | Functional | P1 | Logged in | name='Bearing' | 1. /machinery/spare-parts → New | Persisted | POST /spare-parts → 201 | - |
| TC-MACH-SPAREMAP-001 | Spare Parts | Map spare to machine | Functional | P1 | Machine + spare | n/a | 1. /machinery/spare-map | Mapping created | - | - |
| TC-MACH-WO-001 | Work Orders | Create work order | Functional | P0 | Machine + spare | type='preventive' | 1. /maintenance-work-orders → New | WO status='open' | POST /maintenance-work-orders → 201 | - |
| TC-MACH-WO-002 | Work Orders | Complete work order | Functional | P0 | WO open | n/a | 1. Complete | Status='completed'<br/>Downtime log updated | PATCH /maintenance-work-orders/{id} → 200 | - |
| TC-MACH-REM-001 | Reminders | Schedule preventive reminder | Functional | P1 | Machine | frequency='monthly' | 1. /maintenance-reminders → New | Reminder created; cron will fire | POST /maintenance-reminders → 201 | - |
| TC-MACH-DOWN-001 | Downtime | Log downtime | Functional | P0 | Machine in operation | duration=2h reason='Power' | 1. Log downtime | Downtime row created | POST /maintenance-downtime → 201 | - |
| TC-MACH-DOWN-002 | Downtime | Negative duration blocked | Negative | P1 | Form | duration=-1 | 1. Submit | Error | - | - |
| TC-MACH-VENDOR-001 | Vendors | Add maintenance vendor (AMC) | Functional | P2 | Logged in | valid form | 1. /maintenance-vendors → New | Vendor persisted | POST /maintenance-vendors → 201 | - |
| TC-MACH-PERM-001 | Permission | Viewer cannot create WO | Permission | P0 | qa.viewer | n/a | 1. POST | 403 | - | - |
| TC-MACH-AUDIT-001 | Audit | WO complete audited | Integration | P1 | DB read | n/a | 1. Complete<br/>2. Inspect | Row added | - | - |
| TC-MACH-EMPTY-001 | Registry | Empty state | UI / UX | P2 | Fresh | n/a | 1. Open | CTA | - | - |

## Tasks & Team

_13 test cases_

| TC ID | Submodule | Title | Type | Priority | Preconditions | Test Data | Steps | Expected Result | API Contract | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| TC-TASK-CREATE-001 | Tasks | Create task | Functional | P0 | Logged in | title due=tomorrow assignee=B | 1. /tasks/add | Task persisted; assignee notified | POST /tasks → 201 | - |
| TC-TASK-LIST-001 | Tasks | Tasks list (mine vs all) | Functional | P1 | Mixed | filter='mine' | 1. Filter | Only assigned-to-me visible | GET /tasks?assignee=me | - |
| TC-TASK-DETAIL-001 | Tasks | Detail with comments | Functional | P1 | Task open | comment='Working on it' | 1. Add comment | Comment listed | POST /tasks/{id}/comments → 201 | - |
| TC-TASK-DONE-001 | Tasks | Mark task done | Functional | P0 | Open task | n/a | 1. Click Done | Status='completed' | PATCH /tasks/{id} → 200 | - |
| TC-TASK-OVERDUE-001 | Tasks | Overdue badge | UI / UX | P2 | Task due_date<today open | n/a | 1. Open list | Red OVERDUE chip | - | - |
| TC-TEAM-UPD-001 | Team Updates | Manager posts update | Functional | P1 | Manager | text='Q2 plan' | 1. /team-updates → Post | Update visible to team | POST /team-updates → 201 | - |
| TC-TEAM-UPD-002 | Team Updates | Like/comment on update | Functional | P2 | Posted | n/a | 1. React | Reaction tracked | - | - |
| TC-ORG-001 | Organizer | Add personal item | Functional | P1 | Logged in | title due | 1. /organizer → Add | Item persisted | POST /organizer → 201 | - |
| TC-ORG-002 | Organizer | Privacy: own items only | Permission | P0 | Two users | n/a | 1. User A creates<br/>2. User B opens organizer | B does not see A's items | - | - |
| TC-TASK-PERM-001 | Permission | Cannot edit others' tasks | Permission | P0 | Other's task | n/a | 1. PATCH | 403 | - | - |
| TC-TASK-FILTER-001 | Tasks | Filter by status | Functional | P1 | Mixed | status='completed' | 1. Filter | Matches | - | - |
| TC-TASK-AUDIT-001 | Audit | Task done audited | Integration | P1 | DB | n/a | 1. Complete<br/>2. Inspect | Row | - | - |
| TC-TASK-EMPTY-001 | Tasks | Empty state | UI / UX | P2 | Fresh | n/a | 1. Open | CTA | - | - |

## Reports

_11 test cases_

| TC ID | Submodule | Title | Type | Priority | Preconditions | Test Data | Steps | Expected Result | API Contract | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| TC-RPT-CUST-001 | Customer Report | Loads with filters | Functional | P0 | Data exists | n/a | 1. /reports/customers | Filters: date range, status; data renders | GET /reports/customers → 200 | - |
| TC-RPT-CUST-002 | Customer Report | Export CSV | Functional | P1 | Data | n/a | 1. Click Export | CSV downloaded | - | - |
| TC-RPT-EMP-001 | Employee Report | KPIs per employee | Functional | P1 | Multi employees | n/a | 1. /reports/employees | Per-employee counts (quotes, sales, leads) | - | - |
| TC-RPT-ENQ-001 | Enquiry Report | Conversion funnel | Functional | P1 | Data | n/a | 1. /reports/enquiries | Funnel: New→Contacted→Quoted→Closed | - | - |
| TC-RPT-FU-001 | Follow-up Report | Overdue follow-ups list | Functional | P1 | Data | n/a | 1. /reports/follow-ups | Overdue rows highlighted | - | - |
| TC-RPT-PROS-001 | Prospects Report | Active prospects view | Functional | P2 | Data | n/a | 1. /reports/prospects | Pipeline view by stage | - | - |
| TC-RPT-EMPTY-001 | Reports | Empty data state | UI / UX | P2 | Fresh | n/a | 1. Open | Empty illustration | - | - |
| TC-RPT-PERM-001 | Permission | Without reports:view 403 | Permission | P0 | qa.viewer | n/a | 1. Open | 403 | - | - |
| TC-RPT-DATE-001 | Reports | Date range filter | Functional | P1 | Data spread | from-to | 1. Pick range | Data filtered | - | - |
| TC-RPT-PRINT-001 | Reports | Print summary | Functional | P2 | Data | n/a | 1. Click Print | Print preview | - | - |
| TC-RPT-DRILL-001 | Reports | Drill-down to detail | Functional | P2 | Click row | n/a | 1. Click | Routes to relevant detail page | - | - |

## Settings

_14 test cases_

| TC ID | Submodule | Title | Type | Priority | Preconditions | Test Data | Steps | Expected Result | API Contract | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| TC-SET-BRAND-001 | Branding | Update tenant branding | Functional | P0 | Enterprise admin | logo + colors | 1. /settings/branding<br/>2. Upload<br/>3. Save | Branding applied tenant-wide | PATCH /branding → 200 | - |
| TC-SET-BRAND-002 | Branding | Reject oversize logo | Boundary | P2 | Form | logo 5MB | 1. Upload | Error 'Max 2MB' | - | - |
| TC-SET-PRINT-001 | Print Templates | Customize print template | Functional | P1 | Logged in | edit footer text | 1. /settings/print-template | Template saved | PATCH /print-templates → 200 | - |
| TC-SET-STAGE-001 | Stage Master | Add pipeline stage | Functional | P1 | Logged in | name='Pre-Production' | 1. /settings/stage-master → New | Persisted | POST /stage-masters → 201 | - |
| TC-SET-STAGE-002 | Stage Master | Reorder stages | Functional | P2 | Multiple stages | drag | 1. Drag-drop reorder | Order persisted | - | - |
| TC-SET-UNIT-001 | Unit Master | Add UOM | Functional | P1 | Logged in | code='LTR' | 1. /settings/unit-master → New | Persisted | POST /unit-masters → 201 | - |
| TC-SET-SOURCE-001 | Sources | Add lead source | Functional | P1 | Logged in | name='LinkedIn' | 1. /settings/sources → New | Persisted | POST /sources → 201 | - |
| TC-SET-STATUS-001 | Status Config | Add custom status | Functional | P2 | Logged in | name='On Hold' | 1. /settings/status | Persisted | - | - |
| TC-SET-AUDIT-001 | Audit Logs | View audit log filterable | Functional | P0 | Audit data | n/a | 1. /settings/audit-logs | Table with filters by user, action, date | GET /audit-logs → 200 | - |
| TC-SET-EMTPL-001 | Email Templates | Edit template body | Functional | P1 | Existing template | body change | 1. /settings/templates → Edit | Saved | PATCH /email-templates/{id} → 200 | - |
| TC-SET-EMTPL-002 | Email Templates | Preview template | Functional | P2 | Template | n/a | 1. Click Preview | Rendered HTML | - | - |
| TC-SET-PERM-001 | Permission | Employee without configurations:edit blocked | Permission | P0 | qa.viewer | n/a | 1. PATCH /branding | 403 | - | - |
| TC-SET-AUDIT-RBAC-001 | Audit Logs | Audit log filter by user | Functional | P1 | Audit data | userId=5 | 1. Filter | Matches only | - | - |
| TC-SET-AUDIT-EXPORT-001 | Audit Logs | Export audit CSV | Functional | P2 | Data | n/a | 1. Export | CSV downloaded | - | - |

## Super Admin

_20 test cases_

| TC ID | Submodule | Title | Type | Priority | Preconditions | Test Data | Steps | Expected Result | API Contract | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| TC-SADM-DASH-001 | Dashboard | Platform KPIs render | Functional | P0 | SA logged in | n/a | 1. /superadmin/dashboard | Cards: Tenants, Resellers, MRR, Tickets | GET /super-admin/dashboard → 200 | - |
| TC-SADM-ENT-001 | Enterprises | List tenants | Functional | P0 | ≥1 tenant | n/a | 1. /superadmin/enterprises | Table with status, plan, expiry | GET /super-admin/enterprises → 200 | - |
| TC-SADM-ENT-002 | Enterprises | Block tenant | Functional | P0 | Active tenant | n/a | 1. Click Block<br/>2. Confirm | status='blocked'<br/>Next login fails | PATCH /super-admin/enterprises/{id} → 200 | - |
| TC-SADM-ENT-003 | Enterprises | Activate pending tenant directly | Functional | P1 | Pending tenant | n/a | 1. Click Activate<br/>2. Provide plan | status='active'<br/>plan_id set | - | - |
| TC-SADM-ENT-004 | Enterprises | Edit tenant profile | Functional | P1 | Tenant detail | name change | 1. Edit<br/>2. Save | Persisted | PATCH /super-admin/enterprises/{id} → 200 | - |
| TC-SADM-RSLR-001 | Resellers | Create reseller | Functional | P0 | SA logged in | valid form | 1. /superadmin/resellers → New | Reseller persisted; activation email sent | POST /super-admin/resellers → 201 | - |
| TC-SADM-RSLR-002 | Resellers | Reseller wallet adjust | Functional | P1 | Reseller exists | amount=1000 reason='Top-up' | 1. Open detail<br/>2. Adjust wallet | Wallet balance increased<br/>Ledger entry | POST /super-admin/resellers/{id}/wallet → 200 | - |
| TC-SADM-RSLR-003 | Resellers | Negative wallet blocked | Negative | P1 | Wallet 100 | delta=-200 | 1. Try adjust | 400 'Insufficient balance' | - | - |
| TC-SADM-SUB-001 | Subscriptions | Create plan | Functional | P0 | SA | name='Pro' price=10000 | 1. /superadmin/subscriptions → New | Plan persisted | POST /super-admin/plans → 201 | - |
| TC-SADM-SUB-002 | Subscriptions | Assign plan to tenant | Integration | P0 | Plan + tenant | n/a | 1. Tenant detail → Assign plan | Tenant.subscription set<br/>Expiry calculated | - | - |
| TC-SADM-COUPON-001 | Coupons | Create coupon | Functional | P1 | SA | code='OFF10' disc=10 | 1. /superadmin/coupons → New | Coupon persisted | POST /super-admin/coupons → 201 | - |
| TC-SADM-COUPON-002 | Coupons | Expiry-date past blocked | Negative | P1 | Form | expiry=yesterday | 1. Submit | Error | - | - |
| TC-SADM-SVC-001 | Services Master | Create service master | Functional | P1 | SA | name='Migration' | 1. /superadmin/services → New | Persisted | POST /super-admin/services → 201 | - |
| TC-SADM-SUPPORT-001 | Support | List support tickets | Functional | P1 | Tickets exist | n/a | 1. /superadmin/support | Table | GET /super-admin/support → 200 | - |
| TC-SADM-SUPPORT-002 | Support | Reply to ticket | Functional | P1 | Open ticket | reply text | 1. Reply | Reply listed; customer notified | POST /super-admin/support/{id}/reply → 201 | - |
| TC-SADM-PERM-001 | Permission | Non-SA cannot access /super-admin/* | Permission | P0 | Enterprise token | n/a | 1. GET /super-admin/dashboard | 403 | - | - |
| TC-SADM-EMPLOYEES-001 | Platform Employees | Add platform employee | Functional | P2 | SA | valid form | 1. /superadmin/employees → New | Persisted | - | - |
| TC-SADM-EMP-001 | Audit | Block tenant audited | Integration | P1 | DB | n/a | 1. Block<br/>2. Inspect | Audit row | - | - |
| TC-SADM-FILTER-001 | Enterprises | Filter by plan | Functional | P1 | Mixed plans | plan='Pro' | 1. Filter | Matches | - | - |
| TC-SADM-EXPORT-001 | Enterprises | Export tenants CSV | Functional | P2 | Data | n/a | 1. Export | CSV | - | - |

## Reseller Portal

_20 test cases_

| TC ID | Submodule | Title | Type | Priority | Preconditions | Test Data | Steps | Expected Result | API Contract | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| TC-RSLR-DASH-001 | Dashboard | Reseller KPI render | Functional | P0 | Reseller logged | n/a | 1. /reseller/dashboard | Cards: tenants, MRR, commission, wallet | GET /resellers/me/dashboard → 200 | - |
| TC-RSLR-PROFILE-001 | Profile | Update profile | Functional | P1 | Reseller | phone change | 1. /reseller/profile<br/>2. Save | Saved | PATCH /resellers/me → 200 | - |
| TC-RSLR-WALLET-001 | Wallet | View wallet balance | Functional | P0 | Reseller | n/a | 1. /reseller/wallet | Balance + ledger | GET /resellers/me/wallet → 200 | - |
| TC-RSLR-WALLET-002 | Wallet | Top-up flow (payment gateway) | Functional | P1 | Wallet open | amount=1000 | 1. Click Top-up<br/>2. Pay via gateway<br/>3. Return | Balance increased after webhook | POST /resellers/me/wallet/topup → 200 | - |
| TC-RSLR-BILL-001 | Billing | View invoices | Functional | P1 | Reseller | n/a | 1. /reseller/billing | Invoice list | - | - |
| TC-RSLR-SUB-001 | Subscriptions | List own subscriptions | Functional | P1 | Reseller | n/a | 1. /reseller/subscriptions | Table | - | - |
| TC-RSLR-MYSUB-001 | My Subscription | View current plan | Functional | P1 | Plan assigned | n/a | 1. /reseller/my-subscription | Plan details | - | - |
| TC-RSLR-PLAN-001 | Plans | View available plans | Functional | P2 | Reseller | n/a | 1. /reseller/plans | Plans listed | - | - |
| TC-RSLR-TENANT-001 | Tenants | List own tenants | Functional | P0 | Reseller has tenants | n/a | 1. /reseller/tenants | Table with assigned tenants only | GET /resellers/me/tenants → 200 | - |
| TC-RSLR-TENANT-002 | Tenants | Reseller cannot see other reseller's tenants | Permission | P0 | Two resellers | n/a | 1. Open list | Only own tenants visible | Cross-reseller scope test | - |
| TC-RSLR-TENANT-003 | Tenants | Provision new tenant for customer | Functional | P0 | Reseller wallet positive | valid form | 1. Click New Tenant<br/>2. Fill<br/>3. Pay from wallet | Tenant created<br/>Reseller wallet decremented | POST /resellers/me/tenants → 201 | - |
| TC-RSLR-TENANT-004 | Tenants | Insufficient wallet blocks provisioning | Negative | P0 | Wallet 0 | n/a | 1. Try provision | 400 'Insufficient wallet balance' | - | - |
| TC-RSLR-USAGE-001 | Usage | Usage metrics render | Functional | P1 | Tenants active | n/a | 1. /reseller/usage | Per-tenant active users, storage | - | - |
| TC-RSLR-COMM-001 | Commissions | Commission tracking visible | Functional | P1 | Reseller | n/a | 1. /reseller/commissions | Period-wise commission rows | - | - |
| TC-RSLR-RPT-001 | Reports | Reseller report renders | Functional | P2 | Data | n/a | 1. /reseller/reports | Charts | - | - |
| TC-RSLR-PERM-001 | Permission | Non-reseller token rejected | Permission | P0 | Enterprise token | n/a | 1. GET /resellers/me/wallet | 403 | - | - |
| TC-RSLR-AUDIT-001 | Audit | Tenant provisioning audited | Integration | P1 | DB | n/a | 1. Provision<br/>2. Inspect | Row | - | - |
| TC-RSLR-NETWORK-001 | Edge | Wallet topup on flaky network | Edge | P2 | Mid-payment loss | n/a | 1. Disconnect mid-flow | Idempotent: webhook eventually reconciles; no double-credit | - | - |
| TC-RSLR-LOGOUT-001 | Logout | Reseller logout | Functional | P1 | Logged in | n/a | 1. Logout | resellerStore cleared; routes /reseller/login | - | - |
| TC-RSLR-EMPTY-001 | Tenants | Empty tenants state | UI / UX | P2 | Fresh reseller | n/a | 1. Open list | CTA | - | - |

## End-to-End Flows

_12 test cases_

| TC ID | Submodule | Title | Type | Priority | Preconditions | Test Data | Steps | Expected Result | API Contract | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| TC-E2E-Q2P-001 | Quote-to-PO | CRM Lead → Enquiry → Quote → SO → JC → Invoice | E2E | P0 | Clean tenant; product+stages seeded | see steps | 1. Capture lead<br/>2. Convert to enquiry<br/>3. Create quotation linked to enquiry (Send)<br/>4. Accept quote → SO created<br/>5. Create JC against SO<br/>6. Complete JC stages<br/>7. Dispatch SO<br/>8. Create invoice from SO<br/>9. Mark invoice paid | Each step persists correctly<br/>Enquiry status auto-flows: Quotation Sent → Sale Closed<br/>Waste captured at JC stage completion<br/>Final: invoice paid; audit trail complete across modules | Multiple endpoints | - |
| TC-E2E-Q2P-002 | Quote-to-PO | Reject quote → enquiry to Follow Up | E2E | P0 | Quote linked to enquiry | rejection reason | 1. Reject quote | Enquiry status='Follow Up'<br/>Link preserved<br/>Rejection alert visible | - | - |
| TC-E2E-Q2P-003 | Quote-to-PO | Cancel SO → quote shows po_cancelled | E2E | P0 | Accepted quote; SO open | cancel reason | 1. Cancel SO | Quote.po_cancelled_at set<br/>Red banner on quote<br/>cancelled_po_number stored | - | - |
| TC-E2E-MFG-001 | Manufacturing | JC + waste capture + dispatch | E2E | P0 | JC pending | n/a | 1. Issue MR + approve<br/>2. Start stage<br/>3. Complete stage with waste<br/>4. Mark JC ready_for_dispatch<br/>5. Dispatch SO | Stock decremented<br/>Waste captured to inventory<br/>JC + SO statuses progress correctly | - | - |
| TC-E2E-WASTE-001 | Waste capture | Multiple JC contributions aggregate correctly | E2E | P0 | Two JCs same RM same cat | n/a | 1. JC1 records 5kg<br/>2. JC2 records 7kg | Single waste-inventory row qty=12<br/>Two log entries each linked to its JC + PO + customer | - | - |
| TC-E2E-RSLR-001 | Reseller onboarding | SA creates reseller → reseller provisions tenant | E2E | P0 | Clean platform | n/a | 1. SA creates reseller<br/>2. Reseller activates account<br/>3. Tops up wallet<br/>4. Provisions new tenant<br/>5. Tenant admin completes registration | Wallet decremented<br/>Tenant created with reseller_id<br/>Audit log captures full trail | - | - |
| TC-E2E-SADM-001 | Tenant lifecycle | Active → Block → Reactivate | E2E | P0 | Tenant active | n/a | 1. SA blocks tenant<br/>2. Tenant tries login → fail<br/>3. SA reactivates<br/>4. Tenant logs in | Login fails when blocked<br/>Reactivation restores access | - | - |
| TC-E2E-PERM-001 | Permission flow | Admin grants permission → employee picks up without re-login | E2E | P0 | Employee logged in | n/a | 1. Employee on /quotations (no Create btn)<br/>2. Admin grants sales:quotations:create<br/>3. Wait poll interval<br/>4. Employee reloads | Create button now visible without re-login | - | - |
| TC-E2E-PROC-001 | Procurement | Indent → RFQ → PO → GRN → Stock | E2E | P0 | Logged in admin | n/a | 1. Create indent<br/>2. Approve<br/>3. Convert to RFQ → 2 suppliers<br/>4. Capture quotes<br/>5. Award<br/>6. Issue PO<br/>7. GRN partial then full | Stock incremented matching GRN<br/>PO progresses to received | - | - |
| TC-E2E-NETWORK-001 | Resilience | Network drop mid-flow | E2E | P1 | Quote create form filled | drop network | 1. Submit<br/>2. Drop network<br/>3. Reconnect<br/>4. Retry submit | First call timed-out toast<br/>No partial state<br/>Retry creates exactly one quotation | - | - |
| TC-E2E-CONCURRENT-001 | Concurrency | Two users edit same quote | E2E | P1 | Both users on edit page | n/a | 1. A saves<br/>2. B saves shortly after | Both succeed; latest wins<br/>Version history shows both | - | - |
| TC-E2E-AUDIT-001 | Audit | Audit log captures every flow above | E2E | P0 | After all E2E flows | n/a | 1. Query audit_logs | Rows for: lead create, enquiry create, quote create/send/accept, SO create/dispatch, JC stages, MR approve, GRN, invoice create/payment, waste generated, etc. | - | - |

