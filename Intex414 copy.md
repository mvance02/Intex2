# IS 414 — Security

## Matt's Key Notes

- **Do NOT spend a lot of time explaining security in the presentation** — but you MUST show it clearly in the **video** or it won't be graded. Walk through each requirement on screen.
- **Deletion confirmation is required** — whenever data is deleted, the UI must ask for confirmation first.
- Add some **new stuff beyond the listed requirements** — ideas: third-party authentication (Google, Microsoft, etc.), MFA, HSTS, dark/light mode preference cookie, data sanitization.
- If a security feature isn't documented in the video, it doesn't exist as far as graders are concerned.

---

## Security Requirements

### Confidentiality (Encryption)

- Use **HTTPS for all public connections**. Relying on automatically-provisioned certificates from the cloud provider is fine, but a valid TLS certificate is required.
- **Redirect HTTP to HTTPS** — don't just support HTTPS, actively redirect away from HTTP.

### Authentication

- Authenticate users via **username and password** (likely using ASP.NET Identity).
- **Visitors (unauthenticated)** can browse the home page and any other pages that don't require auth.
- **Authenticated users** can access the admin/staff pages described in IS 413.
- Configure ASP.NET Identity with **stronger password requirements** than the defaults. Follow what was taught in class — not what AI or external docs suggest. This will be strictly graded.
- **All APIs** should have appropriate authentication/authorization. Login and `/auth/me` endpoints cannot require auth. All CUD operations and most sensitive read operations must require authentication. When in doubt, be maximally restrictive.

### Role-Based Authorization (RBAC)

- **Admin role:** Can add, modify, and (rarely) delete data.
- **Donor role:** Can see their own donor history and the impact of their donations.
- **Unauthenticated users:** Can see the home page, privacy policy, and other public pages.
- Optionally: a staff/employee role that differs from admin.

### Integrity

- Data can only be changed or deleted by an authorized, authenticated user.
- **Confirmation required to delete data** — UI must prompt for confirmation before any delete operation goes through.

### Credentials

- Handle credentials (usernames, passwords, API keys) safely.
- Options: secrets manager, `.env` file not committed to GitHub, or OS environment variables. All three are acceptable.
- **Do not include credentials in code or public repositories.**
- Note: a functional site is worth more overall points than perfect credential protection, so prioritize wisely.

### Privacy

- Create and populate a **GDPR-compliant privacy policy** linked from the site footer (at minimum on the home page). Content should be tailored to the site — you can use templates or generators (e.g., https://gdpr.eu/privacy-notice/).
- Enable a **GDPR-compliant cookie consent notification**. Be specific in the video about whether it is cosmetic or fully functional.

### Attack Mitigations

- Enable the **Content-Security-Policy (CSP) HTTP header**. Specify only the sources needed for the site to function (default-src, style-src, img-src, script-src, etc.). This must be a header — NOT a `<meta>` tag. Graders will check the developer tools inspector.

### Availability

- The site must be **publicly accessible** — deployed to a cloud provider.

### Additional Security Features (2 pts — be creative)

Whatever you add must be clearly demonstrated in the video. Ideas include:

- **Third-party authentication** (Google, GitHub, Microsoft, etc.) — recommended
- **Two-factor or multi-factor authentication (MFA/2FA)** using TOTP or similar. Note: must also have at least one admin and one non-admin account WITHOUT 2FA for grading access.
- **HTTP Strict Transport Security (HSTS)** — can be a single line of code or complex depending on cloud provider. Don't underestimate deployment complexity.
- **Accessible cookie** (non-httponly) that saves a user setting used by React — e.g., light/dark mode, color theme, language preference.
- **Data sanitization** (incoming) or **data encoding** (rendered by frontend) to help prevent injection attacks.
- **Deploy both operational and identity databases to a real DBMS** (not SQLite).
- **Deploy using Docker containers** instead of a VM.

---

## Security Rubric

| Objective | Points |
|---|:---:|
| Confidentiality — Use HTTPS/TLS | 1 |
| Confidentiality — Redirect HTTP to HTTPS | 0.5 |
| Auth — Authentication using username/password | 3 |
| Auth — Require better passwords | 1 |
| Auth — Pages and API endpoints require auth where needed | 1 |
| Auth — RBAC: only admin can CUD (including endpoints) | 1.5 |
| Integrity — Confirmation to delete data | 1 |
| Credentials — Stored securely, not in public repo | 1 |
| Privacy — Privacy policy created and added to site | 1 |
| Privacy — GDPR cookie consent notification fully functional | 1 |
| Attack Mitigations — CSP header set properly | 2 |
| Availability — Deployed publicly | 4 |
| Additional security features | 2 |

---

# Intex Security Architecture: .NET Identity & React
## Backend Configuration (.NET Core Web API)
- **Framework:** ASP.NET Core Identity
- **Authentication Type:** Cookie-based Authentication (Secure, SameSite=Lax/Strict)
- **Database:** SQLite (Development) / PostgreSQL or SQL Server (Production)
- **Key Features:**
    - Role-based authorization (`[Authorize(Roles = "Admin")]`)
    - Account Lockout policies for brute-force protection
    - Two-Factor Authentication (MFA) using TOTP
    - Password complexity requirements
## Frontend Implementation (React + TypeScript)
- **State Management:** `AuthContext` for global access to user authentication status.
- **Route Protection:** Use of a `ProtectedRoute` component to wrap restricted pages.
- **API Communication:** Use `credentials: 'include'` in fetch/axios requests to ensure authentication cookies are sent with every request.
- **Compliance:** Persistent `CookieConsentBanner` integrated with `CookieConsentContext` to handle GDPR requirements.
## Implementation Steps
1. **Initialize Identity:** Add `AddIdentity` and `AddAuthentication` in `Program.cs`.
2. **Setup Middleware:** Ensure `app.UseAuthentication()` and `app.UseAuthorization()` are in the correct order.
3. **Identity Endpoints:** Create controllers for `Account/Login`, `Account/Register`, and `Account/MFA`.
4. **React Auth Provider:** Build a provider that checks the server for the current user's session on app load.
5. **Role-Based UI:** Conditionally render components (like Admin links) based on the user's role found in the auth context.
