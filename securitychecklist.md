# HopeHaven — IS 414 Security Overview

This document summarizes every security requirement for the IS 414 portion of INTEX, where each item is implemented in the codebase, and an estimated rubric score. Updated after the most recent code audit (2026-04-08).

> **Video reminder:** Features not shown in the video don't receive points. Walk through every section below in your recording.

---

## Score Summary

| Requirement | Points | Estimated | Status |
|---|---|---|---|
| Confidentiality — HTTPS / TLS | 1.0 | **1.0** | ✅ |
| Confidentiality — HTTP → HTTPS redirect | 0.5 | **0.5** | ✅ |
| Auth — Username / password login | 3.0 | **3.0** | ✅ |
| Auth — NIST password policy | 1.0 | **1.0** | ✅ |
| Auth — Endpoints protected appropriately | 1.0 | **1.0** | ✅ |
| Auth — RBAC: Admin-only CUD at the API level | 1.5 | **1.5** | ✅ |
| Integrity — Confirmation before delete | 1.0 | **0.9** | ✅ |
| Credentials — Secrets not in the repo | 1.0 | **1.0** | ✅ |
| Privacy — GDPR privacy policy | 1.0 | **1.0** | ✅ |
| Privacy — Cookie consent (functional) | 1.0 | **0.75** | ⚠️ |
| Attack Mitigations — CSP header | 2.0 | **1.75** | ⚠️ |
| Availability — Publicly deployed | 4.0 | **4.0** | ✅ |
| Additional — Third-party auth (Google) | — | — | ✅ |
| Additional — MFA / TOTP | — | — | ✅ |
| **Additional (combined)** | **2.0** | **2.0** | ✅ |
| **TOTAL** | **20.0** | **~19.4** | |

---

## 1. Confidentiality — HTTPS / TLS ✅

**Requirement:** Use HTTPS for all public connections with a valid certificate.

**How it's done:** Railway automatically provisions and renews a TLS certificate for both the backend and frontend. No code change was required — the cloud provider handles it.

**Where to show in video:** Open the site in a browser and point to the padlock icon / `https://` in the address bar.

---

## 2. Confidentiality — HTTP → HTTPS Redirect ✅

**Requirement:** Redirect plain HTTP traffic to HTTPS.

**Where in code:**
- `backend/HopeHaven.API/Program.cs` line 160 — `app.UseHttpsRedirection()` runs unconditionally in all environments.
- `Program.cs` line 137 — `app.UseForwardedHeaders()` runs first so ASP.NET reads Railway's real `X-Forwarded-Proto: https` header, making the redirect work correctly behind the proxy.

**Where to show in video:** Mention that Railway enforces the redirect at the proxy layer and that `UseHttpsRedirection()` is enabled in code.

---

## 3. Authentication — Username / Password ✅

**Requirement:** Allow users to log in with email and password using ASP.NET Identity.

**Where in code:**

| File | What it does |
|---|---|
| `Program.cs` lines 31–33 | `AddIdentityApiEndpoints<ApplicationUser>()` wires up Identity |
| `Program.cs` line 167 | `MapIdentityApi<ApplicationUser>()` exposes `/api/auth/register`, `/api/auth/login`, etc. |
| `frontend/src/pages/public/LoginPage.tsx` | Login form UI |
| `frontend/src/pages/public/RegisterPage.tsx` | Registration form UI |
| `frontend/src/utils/authAPI.ts` lines 52–74 | `registerUser()` and `loginUser()` API calls |
| `backend/HopeHaven.API/Data/AuthIdentityDbContext.cs` | Identity database context |
| `backend/HopeHaven.API/Migrations/AuthIdentity/` | EF Core migration that created Identity tables in Supabase |

**Where to show in video:** Register a new account, log in, confirm you land on the correct page.

---

## 4. Authentication — NIST Password Policy ✅

**Requirement:** Require better passwords than ASP.NET defaults. Must follow the NIST approach taught in class (length over complexity).

**Where in code:** `backend/HopeHaven.API/Program.cs` lines 64–76:

```csharp
options.Password.RequireDigit           = false;
options.Password.RequireLowercase       = false;
options.Password.RequireNonAlphanumeric = false;
options.Password.RequireUppercase       = false;
options.Password.RequiredLength         = 14;   // ← length enforced
options.Password.RequiredUniqueChars    = 1;
```

The hint is also shown to users in `frontend/src/pages/public/RegisterPage.tsx` line 78: *"Minimum 14 characters — no complexity requirements."*

**Where to show in video:** Attempt to register with a short password (show it fail), then succeed with 14+ characters.

---

## 5. Authentication — Endpoint Protection ✅

**Requirement:** All API endpoints require authentication where appropriate. Login/auth endpoints must be open; CUD operations must be protected.

**How it's done:** Every data controller has `[Authorize]` or `[Authorize(Roles = "Admin")]` at the class level. Public exceptions use `[AllowAnonymous]`.

**Open endpoints (correct — must be accessible without login):**
- `GET /api/auth/me`, `/api/auth/providers`, `/api/auth/external-login`, `/api/auth/external-callback` — `AuthController.cs` (no auth needed on login flow)
- `POST /api/referrals` — `ReferralsController.cs` (public referral form)
- `GET /api/publicimpactsnapshots` — `PublicImpactSnapshotsController.cs` line 17 (`[AllowAnonymous]`, used by the public impact page)
- `GET /api/dashboard/metrics` and `GET /api/dashboard/safehouse-summary` — `DashboardController.cs` lines 14 and 85 (`[AllowAnonymous]`, used by public landing page widgets)
- `GET /health` — health check for Railway

**Protected controllers (require login at minimum):**

| Controller | Class-level auth |
|---|---|
| `ResidentsController` | `[Authorize(Roles = "Admin")]` + `[Authorize]` |
| `DonationsController` | `[Authorize(Roles = "Admin")]` + `[Authorize]` |
| `SupportersController` | `[Authorize(Roles = "Admin")]` + `[Authorize]` |
| `EducationRecordsController` | `[Authorize(Roles = "Admin")]` + `[Authorize]` |
| `HealthWellbeingRecordsController` | `[Authorize(Roles = "Admin")]` + `[Authorize]` |
| `DashboardController` | `[Authorize(Roles = "Admin")]` + `[Authorize]` (GETs listed above are `[AllowAnonymous]`) |
| `ReportsController` | `[Authorize(Roles = "Admin")]` + `[Authorize]` |
| `SocialMediaPostsController` | `[Authorize(Roles = "Admin")]` + `[Authorize]` |
| `PublicImpactSnapshotsController` | `[Authorize(Roles = "Admin")]` + `[Authorize]` (GET is `[AllowAnonymous]`) |
| `PredictController` | `[Authorize(Roles = "Admin")]` + `[Authorize]` |
| `HomeVisitationsController` | `[Authorize(Roles = "Admin")]` (team-added) |
| `IncidentReportsController` | `[Authorize(Roles = "Admin")]` |
| `InterventionPlansController` | `[Authorize(Roles = "Admin")]` |
| `ProcessRecordingsController` | `[Authorize(Roles = "Admin")]` |
| `SafehousesController` | `[Authorize(Roles = "Admin")]` |
| `PartnersController` | `[Authorize(Roles = "Admin")]` |
| `DonationAllocationsController` | `[Authorize(Roles = "Admin")]` |
| `InKindDonationItemsController` | `[Authorize(Roles = "Admin")]` |
| `UsersController` | `[Authorize(Roles = "Admin")]` |
| `MyDonationsController` | `[Authorize]` (any logged-in user = donor) |
| `CrudController` base | `[Authorize]` at class + `[Authorize(Policy = "ManageContent")]` on POST/PUT/DELETE |

**Where to show in video:** Open DevTools → Network, try hitting `/api/residents` without being logged in, show a 401 response.

---

## 6. RBAC — Admin-Only CUD at the API Level ✅

**Requirement:** Only users with the Admin role can add, modify, or delete data. This must be enforced at the API layer, not just the UI.

**How it's done:** Two layers of protection on every mutating endpoint:
1. Class-level `[Authorize(Roles = "Admin")]` on most controllers (team-added).
2. Method-level `[Authorize(Policy = AuthPolicies.ManageContent)]` on every POST, PUT, DELETE, and PATCH — defined in `Program.cs` lines 58–59 as `RequireRole(AuthRoles.Admin)`.

**The `ManageContent` policy is applied to every mutation in:**
- `CrudController.cs` (base, lines 31 / 40 / 58) — covers HomeVisitations, ProcessRecordings, IncidentReports, InterventionPlans
- `ResidentsController.cs` (lines 72, 82, 97)
- `DonationsController.cs` (lines 53, 62, 77)
- `SupportersController.cs` (lines 64, 74, 89)
- `EducationRecordsController.cs` (lines 25, 34)
- `HealthWellbeingRecordsController.cs` (lines 25, 34)
- `PublicImpactSnapshotsController.cs` (lines 35, 44)
- `SocialMediaPostsController.cs` (lines 44, 54, 65)

**Frontend also enforces this:** Admin routes in `App.tsx` line 121 require `requiredRoles={['Admin']}`.

**DefaultPolicy** is set in `Program.cs` lines 55–57 to use the cookie authentication scheme so `[Authorize]` resolves correctly against the session cookie.

**Where to show in video:** Log in as a non-admin user and try to create/edit/delete something — show a 403 response. Then log in as Admin and show it works.

---

## 7. Integrity — Delete Confirmation ✅

**Requirement:** Deletes must require confirmation from the user.

**Where in code:** A shared `DeleteConfirmDialog` component is used throughout the admin UI:

| Page | Lines |
|---|---|
| `frontend/src/pages/admin/DonorManagement.tsx` | 594–598 |
| `frontend/src/pages/admin/HomeVisitations.tsx` | 516–528 |
| `frontend/src/pages/admin/ProcessRecordings.tsx` | 558–570 |

Note: `CaseloadInventory.tsx` is a read-only list — it has no delete button, so no confirmation is needed there.

**Where to show in video:** Click delete on a record and show the confirmation dialog appear before anything is deleted.

---

## 8. Credentials — Secrets Not in the Repo ✅

**Requirement:** Passwords, API keys, and connection strings must not be committed to the public repository.

**How it's done:**

| Secret | Where it lives |
|---|---|
| Supabase connection string | .NET user secrets (local) / Railway env vars (production) |
| Google OAuth Client ID + Secret | .NET user secrets (local) / Railway env vars (production) |
| Admin seed password | .NET user secrets / Railway env vars |
| `VITE_API_URL` | `frontend/.env.local` (gitignored) / Vercel/Railway env vars |

`appsettings.json` only contains localhost placeholder defaults — no real credentials.  
`.gitignore` covers `.env`, `.env.local`, and `.env.*.local`.

**Where to show in video:** Show the `.gitignore`, show that `appsettings.json` has no real passwords, and briefly show Railway's Variables tab (blur the values if needed).

---

## 9. Privacy — GDPR Privacy Policy ✅

**Requirement:** Create a GDPR-compliant privacy policy tailored to the site, linked from the footer.

**Where in code:**
- Page: `frontend/src/pages/public/PrivacyPage.tsx` — 10 sections: Who We Are, Data Collected, How We Use It, Cookies, Data Sharing, Data Retention, Your Rights, Security, Policy Changes, Contact.
- Footer link: `frontend/src/components/shared/PublicLayout.tsx` line 24 — `<Link to="/privacy">Privacy Policy</Link>`
- Route: `App.tsx` line 74

**Where to show in video:** Navigate to `/privacy` from the footer. Briefly scroll through the sections.

---

## 10. Privacy — Cookie Consent ⚠️

**Requirement:** Enable a GDPR-compliant cookie consent notification. Be specific in your video about whether it is cosmetic or fully functional.

**Where in code:**
- Banner: `frontend/src/components/shared/CookieConsentBanner.tsx`
- Context / state: `frontend/src/contexts/CookieConsentContext.tsx` — stores in `localStorage` under key `hh_cookie_consent`
- Rendered globally: `App.tsx` line 211

**What it does:** Shows a banner on every page until the user accepts. Consent is stored persistently across sessions. The banner does not reappear once accepted. The Privacy Policy page has a "Reset Cookie Preferences" button (`PrivacyPage.tsx` line 18) allowing users to withdraw consent.

**What it doesn't do:** No "Decline" button; no granular category controls.

**In your video:** Be upfront — call it *functionally implemented* (real persistence, not just cosmetic), but acknowledge it is accept-only without a reject option.

---

## 11. Attack Mitigations — CSP Header ⚠️

**Requirement:** Set the `Content-Security-Policy` HTTP header. It must appear in the browser DevTools Network inspector, not in a `<meta>` tag.

**Where in code:**
- Middleware: `backend/HopeHaven.API/Infrastructure/SecurityHeaders.cs` lines 5–17
- Registered: `Program.cs` line 158 — `app.UseSecurityHeaders()`

**Current policy:**
```
default-src 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'
```

**Where to show in video:** Chrome DevTools → Network tab → click any API request → Response Headers → show `content-security-policy` is present.

**⚠️ Action before video:** After deploying, open the live site and check the browser Console for any red CSP violation errors. If you see them (common causes: QR code renders as a `data:` URI on the MFA page, or Tailwind uses inline styles), update the policy in `SecurityHeaders.cs` line 6. Common additions:
- `img-src 'self' data: blob:` — for QR code data URIs
- `style-src 'self' 'unsafe-inline'` — for inline styles

---

## 12. Availability — Publicly Deployed ✅

**Requirement:** The site must be publicly accessible.

**Status:** Both the backend and frontend are deployed on Railway at public HTTPS URLs. No VPN or credentials needed to reach the site.

---

## 13 & 14. Additional Security Features ✅

**Both features are fully implemented — worth 2 points combined.**

### Google OAuth (Third-Party Authentication)

| File | What it does |
|---|---|
| `Program.cs` lines 38–48 | Registers Google OAuth (activates when secrets are configured) |
| `Controllers/AuthController.cs` line 47 | `ExternalLogin()` — initiates the OAuth redirect |
| `Controllers/AuthController.cs` line 65 | `ExternalLoginCallback()` — handles the response; auto-creates account + assigns Donor role for new users |
| `frontend/src/pages/public/LoginPage.tsx` | "Continue with Google" button (shown when providers endpoint returns Google) |

### TOTP / Authenticator App MFA

| File | What it does |
|---|---|
| `frontend/src/pages/admin/ManageMFAPage.tsx` | Full MFA management UI: QR code, enable/disable, recovery codes |
| `frontend/src/utils/authAPI.ts` lines 81–85 | `getTwoFactorStatus`, `enableTwoFactor`, `disableTwoFactor`, `resetRecoveryCodes` |
| `frontend/src/pages/public/LoginPage.tsx` | Optional MFA code + recovery code fields shown during login |
| ASP.NET Identity built-in | `/api/auth/manage/2fa` endpoint handles all TOTP operations |

> **Important:** Keep at least one Admin account and one non-Admin account that do **not** have MFA enabled so graders can log in without your phone.

---

## Pre-Video Checklist

Before recording, verify these:

- [ ] Deploy the latest `main` branch to Railway so all code changes are live
- [ ] Set all required Railway env vars: `ConnectionStrings__IdentityConnection`, `ConnectionStrings__Default`, `Authentication__Google__ClientId`, `Authentication__Google__ClientSecret`, `FrontendUrl`, `AllowedOrigins`
- [ ] Open the live site in Chrome → DevTools → Console → confirm no red CSP violation errors
- [ ] Open the live site → DevTools → Network → any API call → Response Headers → confirm `content-security-policy` header is present
- [ ] Confirm the "Continue with Google" button appears on `/login` on the deployed site
- [ ] Confirm you have an Admin account without MFA for the grader
- [ ] Confirm you have a Donor account without MFA for the grader
