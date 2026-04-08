# IS 414 Security Checklist — HopeHaven

Each item maps to a requirement from the assignment. Status is based on a code audit performed 2026-04-08 (post-fixes).

Legend: ✅ Complete · ⚠️ Partial · ❌ Missing

---

## Confidentiality (Encryption)

- [x] **Use HTTPS for all public connections with a valid TLS certificate.**
  - ✅ **Complete.** Railway automatically provisions and renews a TLS certificate. Both the backend (`intex2-production.up.railway.app`) and frontend are served over HTTPS with valid certificates verified by the browser.
  - No code change needed — provided automatically by the cloud provider.

- [x] **Redirect HTTP traffic to HTTPS.**
  - ✅ **Complete.**
  - `app.UseHttpsRedirection()` in `backend/HopeHaven.API/Program.cs` line 162 — runs unconditionally in all environments.
  - `app.UseForwardedHeaders()` at line 139 runs first so ASP.NET sees the real HTTPS scheme from Railway's proxy, making the redirect work correctly in production.

---

## Authentication

- [x] **Authenticate users using username/password (ASP.NET Identity).**
  - ✅ **Complete.**
  - `builder.Services.AddIdentityApiEndpoints<ApplicationUser>()` — `Program.cs` line 31
  - `app.MapGroup("/api/auth").MapIdentityApi<ApplicationUser>()` — `Program.cs` line 167
  - Login UI: `frontend/src/pages/public/LoginPage.tsx`
  - Register UI: `frontend/src/pages/public/RegisterPage.tsx`
  - API client: `frontend/src/utils/authAPI.ts` — `loginUser()` (line 59), `registerUser()` (line 52)

- [x] **Visitors (unauthenticated users) can browse the home page and other public pages.**
  - ✅ **Complete.**
  - Public routes in `frontend/src/App.tsx` lines 67–76: `/`, `/impact`, `/login`, `/register`, `/logout`, `/privacy`, `/referral` — all inside `<PublicLayout />` with no `ProtectedRoute` wrapper.
  - Backend: `PublicImpactSnapshotsController.cs` line 16 — `[AllowAnonymous]` on the public GET so the impact dashboard data loads without login.

- [x] **Authenticated users can view the IS413 pages.**
  - ✅ **Complete.**
  - `ProtectedRoute` component at `frontend/src/App.tsx` lines 48–57 gates all admin and donor routes.
  - Admin routes (lines 118–206) require `requiredRoles={['Admin']}`.
  - Donor routes (lines 79–116) require authentication only.

- [x] **Configure ASP.NET Identity to require better passwords than the default (NIST style: length over complexity).**
  - ✅ **Complete.**
  - `backend/HopeHaven.API/Program.cs` lines 64–76:
    ```csharp
    options.Password.RequireDigit           = false;
    options.Password.RequireLowercase       = false;
    options.Password.RequireNonAlphanumeric = false;
    options.Password.RequireUppercase       = false;
    options.Password.RequiredLength         = 14;
    options.Password.RequiredUniqueChars    = 1;
    ```
  - UI hint shown to users: `frontend/src/pages/public/RegisterPage.tsx` line 78 ("Minimum 14 characters — no complexity requirements.")

- [x] **All APIs have appropriate authentication/authorization (CUD endpoints protected, public-safe endpoints open).**
  - ✅ **Complete.**
  - Every data controller has `[Authorize]` at the class level, requiring a valid login for all reads.
  - Every POST, PUT, DELETE, and PATCH has `[Authorize(Policy = AuthPolicies.ManageContent)]`, requiring Admin role.
  - Public exceptions correctly use `[AllowAnonymous]`:
    - `PublicImpactSnapshotsController.cs` line 16 — public impact data
    - `ReferralsController.cs` — public referral form submission
    - `AuthController.cs` — `/me`, `/providers`, `/external-login`, `/external-callback` (no auth needed on login endpoints)
  - `/health` endpoint (Program.cs line 168) remains open for Railway health checks.

---

## Role-Based (RBAC) Authorization

- [x] **Only Admin can add/modify/delete data. Only Donors can see donor history. Non-authenticated users see limited pages.**
  - ✅ **Complete.**
  - **Admin CUD at API level:** All POST/PUT/DELETE/PATCH endpoints across every data controller require `[Authorize(Policy = AuthPolicies.ManageContent)]` which maps to `RequireRole(AuthRoles.Admin)` — defined in `Program.cs` lines 58–59.
    - Applied in: `CrudController.cs` (lines 31, 40, 58), `ResidentsController.cs` (lines 71, 81, 96), `DonationsController.cs` (lines 52, 61, 76), `SupportersController.cs` (lines 63, 73, 88), `EducationRecordsController.cs` (lines 24, 33), `HealthWellbeingRecordsController.cs` (lines 24, 33), `PublicImpactSnapshotsController.cs` (lines 34, 43), `SocialMediaPostsController.cs` (lines 43, 53, 64).
  - **Donor history:** `MyDonationsController.cs` line 12 — `[Authorize]` gates donor-specific data.
  - **DefaultPolicy** explicitly set to use cookie scheme in `Program.cs` lines 55–57 so `[Authorize]` on controllers resolves correctly against the cookie session.
  - **Frontend:** Admin routes gated by `requiredRoles={['Admin']}` in `App.tsx` line 121. Donor routes gated by authentication. Public routes open.

---

## Integrity

- [x] **Data can only be changed/deleted by authorized users, and delete requires confirmation.**
  - ✅ **Complete.**
  - Authorization: All mutation endpoints require Admin role (see RBAC above).
  - Delete confirmation dialogs implemented in:
    - `frontend/src/pages/admin/DonorManagement.tsx` lines 594–598 (`DeleteConfirmDialog` component)
    - `frontend/src/pages/admin/HomeVisitations.tsx` lines 516–528
    - `frontend/src/pages/admin/ProcessRecordings.tsx` lines 558–570
  - Note: `CaseloadInventory.tsx` has no delete button — residents are view/navigate-only on that list page, so no confirmation needed there.

---

## Credentials

- [x] **Credentials are stored securely and not found in the public repository.**
  - ✅ **Complete.**
  - Local dev: credentials stored in .NET user secrets (not in any file in the repo).
  - Production: credentials set as Railway environment variables — never committed.
  - `frontend/.env.local` listed in `.gitignore` — `VITE_API_URL` not committed.
  - `backend/HopeHaven.API/appsettings.json` only contains localhost placeholder defaults, not real credentials.
  - No API keys or passwords appear anywhere in the committed codebase.

---

## Privacy

- [x] **GDPR-compliant privacy policy created, customized to the site, and linked from the footer.**
  - ✅ **Complete.**
  - Page: `frontend/src/pages/public/PrivacyPage.tsx` — 10 sections covering who we are, data collected, usage, cookies, sharing, retention, user rights, security, changes, and contact.
  - Footer link: `frontend/src/components/shared/PublicLayout.tsx` line 24 — `<Link to="/privacy">Privacy Policy</Link>`.
  - Route registered: `App.tsx` line 74.

- [x] **GDPR-compliant cookie consent notification enabled.**
  - ⚠️ **Functionally implemented, but limited — be honest in your video.**
  - Banner: `frontend/src/components/shared/CookieConsentBanner.tsx` — shown on every page until dismissed.
  - Context: `frontend/src/contexts/CookieConsentContext.tsx` — stores consent in `localStorage` under key `hh_cookie_consent`.
  - Rendered globally in `App.tsx` line 211.
  - **What it does:** Shows a banner with an "Accept" button and a link to the Privacy Policy. Consent is stored persistently. Banner disappears after acceptance and does not re-appear across sessions.
  - **What it doesn't do:** No "Reject" button, no granular cookie categories. The Privacy Policy page has a "Reset Cookie Preferences" button (`PrivacyPage.tsx` line 18) so users can withdraw consent.
  - **In your video:** Describe it as functionally implemented (real localStorage persistence, not just cosmetic) but acknowledge it is accept-only without granular categories.

---

## Attack Mitigations

- [x] **Content-Security-Policy (CSP) HTTP header set properly (not in a meta tag).**
  - ✅ **Complete — header is set via middleware, not a meta tag.**
  - Middleware: `backend/HopeHaven.API/Infrastructure/SecurityHeaders.cs` lines 5–17.
  - Applied via `app.UseSecurityHeaders()` in `Program.cs` line 160.
  - Policy value (`SecurityHeaders.cs` line 6):
    ```
    default-src 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'
    ```
  - Visible in Chrome DevTools → Network → any API response → Response Headers → `content-security-policy`.
  - **Verify on the deployed site:** Open DevTools console after deploying — if CSP violation errors appear (red), it means a resource is being loaded from a domain not in the policy. If so, expand the policy in `SecurityHeaders.cs` line 6 (e.g., add `img-src 'self' data:` if you use data URIs for images).

---

## Availability

- [x] **Site is publicly accessible.**
  - ✅ **Complete.** Backend and frontend both deployed on Railway at publicly accessible HTTPS URLs.

---

## Additional Security Features

- [x] **Third-party authentication (Google OAuth).**
  - ✅ **Complete.**
  - Backend: `backend/HopeHaven.API/Controllers/AuthController.cs` — `ExternalLogin()` (line 47) initiates the OAuth flow, `ExternalLoginCallback()` (line 65) handles the response. Auto-creates account and assigns Donor role for new Google users (line 93).
  - Google OAuth conditionally registered in `Program.cs` lines 38–48 (only activates when secrets are configured).
  - Frontend: Google button in `frontend/src/pages/public/LoginPage.tsx` — visible when `/api/auth/providers` returns Google.
  - **In your video:** Show the "Continue with Google" button on `/login`, click it, authenticate with Google, confirm you land on the app as a logged-in user.

- [x] **Multi-factor authentication (TOTP/Authenticator app).**
  - ✅ **Complete.**
  - UI: `frontend/src/pages/admin/ManageMFAPage.tsx` — QR code display (using the `qrcode` package), enable/disable MFA, view recovery codes, issuer label "Hope Haven".
  - API: handled by ASP.NET Identity's built-in `/api/auth/manage/2fa` endpoint (mapped by `MapIdentityApi`).
  - Client: `frontend/src/utils/authAPI.ts` lines 81–85 (`getTwoFactorStatus`, `enableTwoFactor`, `disableTwoFactor`, `resetRecoveryCodes`).
  - Login page: `frontend/src/pages/public/LoginPage.tsx` — optional MFA code and recovery code fields that appear when MFA is active.
  - **Reminder:** Keep at least one admin and one non-admin account without MFA enabled for grader access.

---

## Mock Rubric Score

| Objective | Possible | Estimated | Notes |
|-----------|----------|-----------|-------|
| Confidentiality — HTTPS/TLS | 1 | **1.0** | Railway provides valid cert, site is HTTPS |
| Confidentiality — Redirect HTTP→HTTPS | 0.5 | **0.5** | `UseHttpsRedirection()` unconditional + `UseForwardedHeaders()` makes it work in production |
| Auth — Username/password authentication | 3 | **3.0** | Fully implemented with ASP.NET Identity, register and login pages working |
| Auth — Require better passwords | 1 | **1.0** | NIST-style: 14 chars, no complexity — exactly as taught in class |
| Auth — Pages and API endpoints require auth where needed | 1 | **1.0** | All data controllers have class-level `[Authorize]`; public endpoints use `[AllowAnonymous]` |
| Auth — RBAC: Only admin can CUD (including endpoints) | 1.5 | **1.5** | All POST/PUT/DELETE/PATCH have `[Authorize(Policy = "ManageContent")]` = Admin only; `DefaultPolicy` correctly uses cookie scheme |
| Integrity — Confirmation required to delete data | 1 | **0.9** | `DeleteConfirmDialog` used in 3 pages; no delete exists on the other admin pages so no gap |
| Credentials — Stored securely, not in public repo | 1 | **1.0** | User secrets + Railway env vars + .gitignore — clean |
| Privacy — Privacy policy created and on site | 1 | **1.0** | 10-section GDPR policy, linked from footer |
| Privacy — GDPR cookie consent fully functional | 1 | **0.75** | Functional localStorage persistence; no reject option — be transparent in video |
| Attack Mitigations — CSP header set properly | 2 | **1.75** | Header present via middleware (not meta tag); verify no violations on deployed site |
| Availability — Deployed publicly | 4 | **4.0** | Deployed on Railway |
| Additional security features | 2 | **2.0** | Google OAuth (3rd-party auth) + TOTP MFA both fully implemented |
| **TOTAL** | **20** | **~19.4 / 20** | |

---

## Remaining Minor Gaps (Optional Polish)

These won't dramatically change the score but would make it cleaner:

1. **Cookie consent reject button** (0.25 pts) — Add a "Decline" button to `CookieConsentBanner.tsx` that stores a rejected state. The banner already has the infrastructure via `CookieConsentContext`.

2. **CSP header verification** — After deploying, open the live site in Chrome → DevTools → Console. If any red CSP violation errors appear, update the policy string in `SecurityHeaders.cs` line 6. Common additions needed:
   - `img-src 'self' data: blob:` (if QR codes render as data URIs)
   - `style-src 'self' 'unsafe-inline'` (if Tailwind uses inline styles)

3. **Video documentation** — Per the assignment: features not shown in the video don't get points. Make sure you demonstrate every item above, especially the CSP header in DevTools and the MFA flow.
