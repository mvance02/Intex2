# IS 414 Security Checklist — HopeHaven

Each item maps to a requirement from the assignment. Status is based on a code audit performed 2026-04-08.

Legend: ✅ Complete · ⚠️ Partial · ❌ Missing

---

## Confidentiality (Encryption)

- [x] **Use HTTPS for all public connections with a valid TLS certificate.**
  - ✅ **Complete.** Railway automatically provisions a TLS certificate. The deployed backend (`intex2-production.up.railway.app`) and frontend are served over HTTPS with valid certificates.
  - No code change needed — provided by the cloud provider.

- [ ] **Redirect HTTP traffic to HTTPS.**
  - ⚠️ **Partial.** `app.UseHttpsRedirection()` exists in `backend/HopeHaven.API/Program.cs` (line 151) but is wrapped in `if (app.Environment.IsDevelopment())`, so it only runs locally.
  - Railway terminates TLS at the proxy and does perform an HTTP→HTTPS redirect at the infrastructure level, but there is no explicit code-level redirect in the production pipeline.
  - **Risk:** A grader who looks at the code will see the redirect is dev-only. Mention in your video that Railway enforces the redirect at the proxy layer.

---

## Authentication

- [x] **Authenticate users using username/password (ASP.NET Identity).**
  - ✅ **Complete.**
  - `builder.Services.AddIdentityApiEndpoints<ApplicationUser>()` — `Program.cs` line 31
  - `app.MapGroup("/api/auth").MapIdentityApi<ApplicationUser>()` — `Program.cs` line 159
  - Login UI: `frontend/src/pages/public/LoginPage.tsx`
  - Register UI: `frontend/src/pages/public/RegisterPage.tsx`
  - API client: `frontend/src/utils/authAPI.ts` — `loginUser()` (line 59), `registerUser()` (line 52)

- [x] **Visitors (unauthenticated users) can browse the home page and other public pages.**
  - ✅ **Complete.**
  - Public routes in `frontend/src/App.tsx` lines 67–76: `/`, `/impact`, `/login`, `/register`, `/logout`, `/privacy`, `/referral` — all inside `<PublicLayout />` with no `ProtectedRoute` wrapper.

- [x] **Authenticated users can view the IS413 pages.**
  - ✅ **Complete.**
  - `ProtectedRoute` component at `frontend/src/App.tsx` lines 48–57 gates all admin and donor routes.
  - Admin routes (lines 118–206) require `requiredRoles={['Admin']}`.
  - Donor routes (lines 79–116) require authentication only.

- [x] **Configure ASP.NET Identity to require better passwords than the default (NIST style: length over complexity).**
  - ✅ **Complete.**
  - `backend/HopeHaven.API/Program.cs` lines 68–76:
    ```csharp
    options.Password.RequireDigit           = false;
    options.Password.RequireLowercase       = false;
    options.Password.RequireNonAlphanumeric = false;
    options.Password.RequireUppercase       = false;
    options.Password.RequiredLength         = 14;
    options.Password.RequiredUniqueChars    = 1;
    ```
  - UI hint shown to users: `frontend/src/pages/public/RegisterPage.tsx` line 78 ("Minimum 14 characters — no complexity requirements.")

- [ ] **All APIs have appropriate authentication/authorization (CUD endpoints protected, public-safe endpoints open).**
  - ❌ **Incomplete — this is your biggest gap.**
  - `MyDonationsController.cs` line 12 has `[Authorize]` — correct.
  - `AuthController.cs` — `/me`, `/providers`, `/external-login`, `/external-callback` are correctly open (no `[Authorize]` needed).
  - **However:** `ResidentsController`, `DonationsController`, `SupportersController`, `HomeVisitationsController`, `ProcessRecordingsController`, `IncidentReportsController`, `EducationRecordsController`, `HealthWellbeingRecordsController`, `InterventionPlansController`, etc. all have **no `[Authorize]` attribute at all**. Their POST, PUT, and DELETE endpoints are publicly accessible via direct API calls.
  - **Fix needed:** Add `[Authorize]` at the class level (or `[Authorize(Policy = AuthPolicies.ManageContent)]` on mutation methods) to every data controller.

---

## Role-Based (RBAC) Authorization

- [ ] **Only Admin can add/modify/delete data. Only Donors can see donor history. Non-authenticated users see limited pages.**
  - ⚠️ **Partial — frontend is correct, backend API is not enforced.**
  - Authorization policies are defined: `Program.cs` lines 59–65 (`ManageContent` requires Admin, `DonorAccess` requires Donor or Admin).
  - Frontend: Admin routes gated by `requiredRoles={['Admin']}` in `App.tsx` line 121. Donor routes gated by authentication. Public routes open.
  - **Gap:** The policies are defined but **never applied to any controller**. No `[Authorize(Policy = "ManageContent")]` on any CUD endpoint in the data controllers. A user who knows the API URL can POST/PUT/DELETE without being Admin.
  - **Fix needed:** Add `[Authorize(Policy = AuthPolicies.ManageContent)]` to all CUD endpoints (or at class level) in data controllers. Add `[Authorize(Policy = AuthPolicies.DonorAccess)]` to donor-specific endpoints.

---

## Integrity

- [ ] **Data can only be changed/deleted by authorized users, and delete requires confirmation.**
  - ⚠️ **Partial.**
  - Delete confirmation dialogs ✅ implemented in:
    - `frontend/src/pages/admin/DonorManagement.tsx` lines 594–598 (`DeleteConfirmDialog` component)
    - `frontend/src/pages/admin/HomeVisitations.tsx` lines 516–528
    - `frontend/src/pages/admin/ProcessRecordings.tsx` lines 558–570
  - **Gap 1:** `frontend/src/pages/admin/CaseloadInventory.tsx` line 151 calls `.delete()` with no confirmation dialog.
  - **Gap 2:** As noted above, the backend controllers don't enforce authorization, so the "authorized users only" part is only enforced at the UI level.

---

## Credentials

- [x] **Credentials are stored securely and not found in the public repository.**
  - ✅ **Complete.**
  - Local dev: credentials stored in .NET user secrets (not in any file in the repo).
  - Production: credentials set as Railway environment variables (`Authentication__Google__ClientId`, `Authentication__Google__ClientSecret`, `ConnectionStrings__Default`, etc.) — never committed.
  - `frontend/.env.local` is listed in `.gitignore` (line covering `.env.local`) — `VITE_API_URL` not committed.
  - `backend/HopeHaven.API/appsettings.json` only contains localhost placeholder defaults (lines 14–21), not real credentials.
  - No API keys or passwords appear anywhere in the committed codebase.

---

## Privacy

- [x] **GDPR-compliant privacy policy created, customized to the site, and linked from the footer.**
  - ✅ **Complete.**
  - Page: `frontend/src/pages/public/PrivacyPage.tsx` — 10 sections covering who we are, data collected, usage, cookies, sharing, retention, user rights, security, changes, contact.
  - Footer link: `frontend/src/components/shared/PublicLayout.tsx` line 24 — `<Link to="/privacy">Privacy Policy</Link>`.
  - Route registered: `App.tsx` line 74.

- [x] **GDPR-compliant cookie consent notification enabled.**
  - ⚠️ **Functionally implemented, but limited — be honest in your video.**
  - Banner: `frontend/src/components/shared/CookieConsentBanner.tsx` — shown on every page until dismissed.
  - Context: `frontend/src/contexts/CookieConsentContext.tsx` — stores consent in `localStorage` under key `hh_cookie_consent`.
  - Rendered in `App.tsx` line 211.
  - **What it does:** Shows a banner with an "Accept" button and a link to the Privacy Policy. Consent is stored. Banner disappears after acceptance and does not re-appear.
  - **What it doesn't do:** No "Reject" button, no granular cookie categories (functional/analytics/marketing). The Privacy Policy page has a "Reset Cookie Preferences" button (line 18–20 of PrivacyPage.tsx).
  - **In your video:** Describe it as functionally implemented (real localStorage persistence, not just cosmetic) but acknowledge it does not have a reject option or category granularity.

---

## Attack Mitigations

- [x] **Content-Security-Policy (CSP) HTTP header set properly (not in a meta tag).**
  - ✅ **Complete — header is set via middleware, not meta tag.**
  - Middleware: `backend/HopeHaven.API/Infrastructure/SecurityHeaders.cs` lines 5–17.
  - Applied via `app.UseSecurityHeaders()` in `Program.cs` line 146.
  - Policy value (line 6):
    ```
    default-src 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'
    ```
  - The header will appear in Chrome DevTools → Network → Response Headers on any API response.
  - **Note:** The policy is strict. If the frontend loads fonts, images, or styles from a CDN, those may be blocked. Verify the deployed site works correctly and that no CSP violations appear in the browser console. If violations exist, expand the policy (e.g., add `style-src 'self' 'unsafe-inline'`) in SecurityHeaders.cs line 6.

---

## Availability

- [x] **Site is publicly accessible.**
  - ✅ **Complete.** Backend and frontend both deployed on Railway at publicly accessible URLs.

---

## Additional Security Features

- [x] **Third-party authentication (Google OAuth).**
  - ✅ **Complete.**
  - Backend: `backend/HopeHaven.API/Controllers/AuthController.cs` — `ExternalLogin()` (line 47), `ExternalLoginCallback()` (line 65). Auto-creates account + assigns Donor role for new Google users (line 93).
  - Google OAuth registered in `Program.cs` lines 44–56 (conditional on secrets being configured).
  - Frontend: Google button in `frontend/src/pages/public/LoginPage.tsx` — visible when `/api/auth/providers` returns Google.
  - In your video: Show the "Continue with Google" button on `/login`, complete the flow, confirm you land on the app authenticated.

- [x] **Multi-factor authentication (TOTP/Authenticator app).**
  - ✅ **Complete.**
  - UI: `frontend/src/pages/admin/ManageMFAPage.tsx` — QR code display, enable/disable MFA, recovery codes, issuer "Hope Haven".
  - API: handled by ASP.NET Identity's built-in `/api/auth/manage/2fa` endpoint (mapped by `MapIdentityApi`).
  - Client: `frontend/src/utils/authAPI.ts` lines 81–85 (`getTwoFactorStatus`, `enableTwoFactor`, `disableTwoFactor`, `resetRecoveryCodes`).
  - Login page: `frontend/src/pages/public/LoginPage.tsx` — optional MFA code and recovery code fields shown when needed.
  - **Reminder from assignment:** Keep at least one admin and one non-admin account without MFA enabled for grader access.

---

## Mock Rubric Score

> Based on the current state of the code. Scores are estimates of what a grader would likely award.

| Objective | Possible | Estimated | Notes |
|-----------|----------|-----------|-------|
| Confidentiality — HTTPS/TLS | 1 | **1.0** | Railway provides valid cert, site is HTTPS |
| Confidentiality — Redirect HTTP→HTTPS | 0.5 | **0.25** | Railway proxy redirects but no explicit code-level redirect in production; dev-only in code |
| Auth — Username/password authentication | 3 | **3.0** | Fully implemented with ASP.NET Identity, register and login pages working |
| Auth — Require better passwords | 1 | **1.0** | NIST-style: 14 chars, no complexity — exactly as taught in class |
| Auth — Pages and API endpoints require auth where needed | 1 | **0.3** | Frontend routes protected; most backend API controllers have no `[Authorize]` — CUD endpoints are open |
| Auth — RBAC: Only admin can CUD (including endpoints) | 1.5 | **0.5** | Policies defined and frontend enforces roles; backend controllers don't apply the policies |
| Integrity — Confirmation required to delete data | 1 | **0.6** | DeleteConfirmDialog used in 3 pages; CaseloadInventory deletes without confirmation |
| Credentials — Stored securely, not in public repo | 1 | **1.0** | User secrets + Railway env vars + .gitignore — clean |
| Privacy — Privacy policy created and on site | 1 | **1.0** | 10-section GDPR policy, linked from footer |
| Privacy — GDPR cookie consent fully functional | 1 | **0.7** | Functional persistence via localStorage; no reject option or granular categories |
| Attack Mitigations — CSP header set properly | 2 | **1.5** | Header present via middleware (not meta tag); policy may need expansion if CDN assets are blocked |
| Availability — Deployed publicly | 4 | **4.0** | Deployed on Railway |
| Additional security features | 2 | **2.0** | Google OAuth (3rd-party auth) + TOTP MFA both fully implemented |
| **TOTAL** | **20** | **~16.85** | |

---

## Priority Fixes (Before Submitting)

These would most improve your score:

1. **Add `[Authorize]` to backend controllers** — biggest point gap (affects two rubric rows worth 2.5 pts combined).
   - At minimum, add `[Authorize]` at the class level of: `ResidentsController`, `DonationsController`, `SupportersController`, `HomeVisitationsController`, `ProcessRecordingsController`.
   - Better: use `[Authorize(Policy = AuthPolicies.ManageContent)]` on POST/PUT/DELETE methods.

2. **Add delete confirmation to CaseloadInventory** — import `DeleteConfirmDialog` and wrap the delete call.

3. **Verify CSP doesn't break the deployed frontend** — open DevTools console on the live site and check for CSP violation errors. If present, expand the policy in `SecurityHeaders.cs` line 6.

4. **Mention HTTP→HTTPS redirect in your video** — explain that Railway enforces it at the proxy layer (show the redirect happening if you hit the HTTP URL directly).
