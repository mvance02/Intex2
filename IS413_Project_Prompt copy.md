# IS 413 INTEX Project Prompt
## Enterprise Application Development: Lighthouse Sanctuary Case Management System

---

## PROJECT OVERVIEW

Build a production-ready, secure web application for Hope Haven, a nonprofit operating abuse/trafficking survivor safehouses. The system consolidates case management, donor relationships, and social media outreach into one unified platform, replacing manual spreadsheets and disconnected tools.

**Target Users:**
- Admin/Program Managers (internal staff)
- Counselors & Case Workers (internal staff)
- Donors (external, public-facing)

**Tech Stack (Non-negotiable):**
- **Backend:** .NET 10 with C# and Entity Framework Core
- **Frontend:** React 18 with TypeScript
- **Database:** PostgreSQL (relational)
- **Deployment:** Both app and database must be publicly deployed and accessible

**Success Criteria:**
- All Must Have features fully functional
- Polished, professional UI/UX (not just default styling)
- Responsive design (desktop and mobile)
- Production-grade security
- Zero broken features
- Code is well-structured and maintainable

---

## PAGES TO BUILD (Prioritized by MoSCoW)

### PUBLIC PAGES (No Authentication Required)

#### 1. Home / Landing Page
- **Purpose:** Attract donors and introduce Lighthouse mission
- **Must Include:**
  - Organization mission statement & impact story
  - Call-to-action buttons (Donate, Learn More, Contact)
  - Statistics on residents served, donations, outcomes
  - Featured success stories or testimonials
  - Navigation to Impact Dashboard and Privacy/Cookies
- **MoSCoW:** Must Have
- **Design Notes:** Professional, trustworthy, mobile-responsive

#### 2. Login Page
- **Purpose:** Authenticate staff and admin users
- **Must Include:**
  - Email and password input fields
  - Form validation (email format, password strength)
  - "Forgot Password" link (can be stubbed for MVP)
  - Error messaging for invalid credentials
  - Remember me checkbox (optional, security review required)
  - Session management and token handling
- **Security Requirements (IS 414 integration):**
  - ASP.NET Identity with strong password policy (min 12 chars, uppercase, lowercase, number, symbol)
  - HTTPS/TLS required
  - HTTPS redirect from HTTP
  - Rate limiting on failed login attempts
  - Do NOT store plaintext passwords
  - Secure session tokens (JWT or ASP.NET Identity)
- **MoSCoW:** Must Have

#### 3. Impact Dashboard (Donor-Facing)
- **Purpose:** Show donors real-time evidence of their impact
- **Must Include:**
  - Cumulative donation amount from logged-in donor
  - Number of residents their donations support
  - List of outcomes enabled (e.g., "6 residents in safe housing", "4 entered employment programs")
  - Donation history timeline/chart
  - "Set Up Recurring Donation" call-to-action button
  - Option to view organization-wide impact metrics
- **MoSCoW:** Must Have
- **Design Notes:** Visual, emotional, data-driven; make donors feel the impact

#### 4. Privacy & Cookies Page
- **Purpose:** Comply with privacy regulations and build trust
- **Must Include:**
  - Privacy policy (can be standard nonprofit template)
  - Cookie consent banner or page
  - GDPR/data handling disclosures
  - Contact info for privacy questions
- **MoSCoW:** Must Have

---

### AUTHENTICATED PAGES (Admin/Staff Only)

#### 5. Admin Dashboard
- **Purpose:** Give program managers real-time operational overview
- **Must Include:**
  - **KPI Cards (top of page):**
    - Active residents count
    - Year-to-date donations (₱ total)
    - At-risk residents (ML prediction count)
    - Active staff logged in today
  - **Recent Activity Feed:**
    - Latest incidents logged
    - Recent sessions/counseling notes
    - New donations
  - **At-Risk Alerts (ML Integration):**
    - List top 5-10 residents with highest risk scores from ML pipeline
    - Show risk type (churn, relapse, reintegration failure)
    - Link to resident detail page for immediate action
  - **Quick Action Buttons:**
    - Add New Resident, Log Session, Log Home Visit, Generate Report
  - **OKR Metric Display** (IS 401 requirement):
    - Display one key project success metric visually (e.g., "3 residents reintegrated this week" with progress bar, or "85% resident satisfaction score")
    - This metric should update daily and show trend
- **Security:** Admin role only; shows only high-level data (no PII beyond what staff need)
- **MoSCoW:** Must Have
- **Design Notes:** Clean, scannable layout; colors to highlight urgency (red for at-risk, green for positive outcomes)

#### 6. Donor Management Page
- **Purpose:** Staff can view and manage donor relationships
- **Must Include:**
  - **Donor List View:**
    - Searchable, filterable table (by name, email, donation amount, status)
    - Columns: Name, Email, Total Given, # Donations, Last Gift Date, Status (Active/Lapsed)
    - Pagination (20 donors per page)
  - **Donor Detail View:**
    - Full donor profile (name, contact info, giving history)
    - Timeline of donations with amounts and dates
    - Notes field for staff to add personal info (e.g., "Prefers monthly gifts")
    - Button to record new donation
    - Button to send thank-you email template (optional)
  - **Donor Segmentation** (Should Have - MoSCoW):
    - Filter by giving level (Major, Mid, Entry)
    - Filter by status (Active, Lapsed, Prospect)
  - **Bulk Operations** (Could Have):
    - Bulk tag donors, bulk email campaigns
- **Security:** Staff role; can view and edit donor records
- **MoSCoW:** Must Have (core view/search), Should Have (filtering), Could Have (bulk ops)
- **Data Validation:** Email format, donation amounts must be positive

#### 7. Resident/Caseload Inventory Page
- **Purpose:** Case managers track all residents and their progress
- **Must Include:**
  - **Resident List View:**
    - Searchable, filterable table
    - Columns: Name, ID, Age, Intake Date, Status, Assigned Counselor, Risk Score
    - Pagination
    - Sorting (by name, date, risk score)
  - **Resident Detail View:**
    - Profile: Demographics, intake date, assigned counselor, current status
    - **Process Recording History** (timestamped counseling sessions)
    - **Home Visitation History** (timestamped visits)
    - **Incident Log** (linked incidents/crises)
    - **ML Predictions** (risk score, recommended next steps from pipeline)
    - **Timeline View** (visual representation of sessions, visits, incidents chronologically)
  - **Action Buttons:**
    - Add Process Recording, Log Home Visit, Log Incident, Mark for Reintegration
- **Security:** Admin/Counselor roles; filter by assigned counselor
- **MoSCoW:** Must Have
- **Data Sensitivity:** This is sensitive survivor data. Implement field-level access control (don't show names to public users, PII protection)

#### 8. Process Recording Page
- **Purpose:** Counselors log session notes and track emotional/behavioral progress
- **Must Include:**
  - **Form to create new process recording:**
    - Resident dropdown (linked to specific resident)
    - Date/time of session
    - Counselor name (auto-populated from logged-in user)
    - **Emotional State Before** (dropdown: Anxious, Depressed, Hopeful, Neutral, Angry, etc.)
    - **Emotional State After** (same dropdown)
    - Session notes (rich text or plain text, min 50 chars, max 2000 chars)
    - Outcomes checkbox (e.g., "Job search progress", "Family contact scheduled")
  - **View past recordings:**
    - List all recordings for a resident with filters
    - Ability to edit/delete own recordings (with delete confirmation)
    - Read-only access to others' recordings
- **ML Integration** (Should Have):
  - Show predicted emotional trajectory based on before/after states
  - Highlight if session outcomes align with reintegration plan
- **Security:** Counselor role; can only see residents assigned to them
- **MoSCoW:** Must Have
- **Data Validation:** Required fields enforced, session notes length validation

#### 9. Home Visitation & Case Conferences Page
- **Purpose:** Log in-home visits and case planning meetings
- **Must Include:**
  - **Form to log home visit:**
    - Resident select
    - Visit date/time
    - Visitor name(s)
    - Location (safehouse, community location, court, employer, etc.)
    - Purpose (wellness check, family contact, reintegration planning, etc.)
    - Observations (free text)
    - Outcomes/action items
    - Delete with confirmation
  - **Form to log case conference:**
    - Residents involved
    - Date/time
    - Attendees (staff, external partners, resident optional)
    - Agenda/topics discussed
    - Decisions made
    - Action items assigned
  - **View historical visits/conferences:**
    - Timeline per resident
    - Filtering by date range, type
- **Security:** Admin/Case Manager role
- **MoSCoW:** Must Have

#### 10. Donors & Contributions Page
- **Purpose:** Track all donations and giving trends
- **Must Include:**
  - **Donation List:**
    - Table with: Donor Name, Amount, Date, Method (check, card, bank transfer), Notes
    - Searchable and filterable
    - Able to record new donation inline
  - **Donation Analytics:**
    - Year-to-date total
    - Average gift size
    - # of donors
    - Repeat vs. new donors
    - Trend chart (monthly donations over past 12 months)
  - **Donor Lifetime Value** (Should Have - MoSCoW):
    - Show LTV ranking and score for each donor
    - Use to prioritize stewardship
- **Security:** Admin/Development role
- **MoSCoW:** Must Have (core), Should Have (LTV)

#### 11. Social Media Management Page (Should Have)
- **Purpose:** Plan, schedule, and track social media posts
- **Must Include:**
  - **Content calendar view:**
    - Monthly/weekly view of scheduled posts
    - Ability to add new posts with: Platform, Text, Image, Scheduled Date/Time
    - Draft and publish states
  - **Post Optimizer Tool** (Should Have - MoSCoW):
    - Before publishing, show predicted engagement score (from ML pipeline)
    - "This post is predicted to get 85 engagements based on similar posts"
  - **Analytics dashboard:**
    - Posts published (count)
    - Engagement metrics (likes, shares, comments, reach)
    - Donation conversion rate (% of posts with referral links that led to donations)
  - **Link to Donation Posts:**
    - When creating a post, mark if it has donation call-to-action
    - Track which posts drive donations (via referral_post_id in data)
- **MoSCoW:** Should Have
- **Data Source:** Posts table (812 rows) with engagement_rate and donation_referrals fields

#### 12. Reports & Analytics Page
- **Purpose:** Generate insights and export reports for grants/stakeholders
- **Must Include:**
  - **Pre-built Reports:**
    - Impact Report (residents served, sessions conducted, reintegrations, incidents, donations)
    - Donor Report (# donors, total raised, retention rate, average gift)
    - Outcome Report (emotional state improvements, employment/education status, family reunification)
  - **Report Filters:**
    - Date range (month, quarter, year, custom)
    - Resident status (active, reintegrated, lapsed contact)
  - **Export Options:**
    - PDF (with organization branding/logo)
    - CSV (for staff analysis)
  - **Visual Charts:**
    - Donation trends over time
    - Resident outcomes pie chart
    - Session frequency trends
- **MoSCoW:** Must Have

---

## FEATURE REQUIREMENTS (From MoSCoW Table)

### MUST HAVE FEATURES

**Authentication & Access Control:**
- [ ] Login with email/password using ASP.NET Identity
- [ ] Role-based access control (Admin, Counselor, Donor, Viewer roles)
- [ ] Session management with auto-logout after 30 min inactivity (configurable)
- [ ] Password policy: min 12 chars, requires uppercase, lowercase, number, symbol
- [ ] HTTPS/TLS encryption on all pages
- [ ] HTTP redirects to HTTPS
- [ ] Secure password reset (email link, not security questions)

**Data & Database:**
- [ ] PostgreSQL relational database with proper schema
- [ ] Good database design: normalization, foreign keys, indexes on frequently queried columns
- [ ] Data validation on all inputs (length, format, type, business logic)
- [ ] Entity Framework Core migrations for schema management
- [ ] Deployed database (not just local)

**API & Backend:**
- [ ] RESTful API endpoints for all CRUD operations
- [ ] Proper HTTP status codes (200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 404 Not Found, 500 Error)
- [ ] Input validation on all endpoints (required fields, data types, length limits)
- [ ] Error handling with user-friendly error messages (no stack traces to frontend)
- [ ] Logging for all important actions (user login, data changes, errors)

**Frontend & UI:**
- [ ] Responsive design (works on mobile, tablet, desktop)
- [ ] Professional styling (use Tailwind CSS or similar; don't use default browser styles)
- [ ] Consistent navigation and layout across all pages
- [ ] Loading indicators for async operations
- [ ] Error messages and success confirmations visible to user
- [ ] Form validation feedback (inline errors, not just server-side)

**ML Integration (from IS 455):**
- [ ] ML pipeline outputs (churn score, outcome prediction, etc.) displayed in the app
- [ ] Risk scores shown on dashboard and resident cards
- [ ] ML predictions inform recommended next steps for case managers

**Deployment:**
- [ ] App deployed to public URL (Vercel, Azure, AWS, etc.)
- [ ] Database deployed to public (but secure) host
- [ ] Both app and DB connection strings configured for production
- [ ] CI/CD pipeline or manual deployment process documented

**Security (IS 414 Integration):**
- [ ] No plaintext passwords stored
- [ ] No credentials in code or config files (use environment variables)
- [ ] CORS configured (only allow frontend domain)
- [ ] Delete confirmation dialogs for all delete actions (frontend + backend confirm)
- [ ] SQL injection prevention (parameterized queries, ORM)
- [ ] Cross-site scripting (XSS) prevention (sanitize user input)
- [ ] Cross-site request forgery (CSRF) tokens on forms
- [ ] Content Security Policy (CSP) header configured

---

### SHOULD HAVE FEATURES

- [ ] Stronger password policy enforcement (symbols, complexity)
- [ ] Content Security Policy (CSP) header properly configured
- [ ] HTTP Strict-Transport-Security (HSTS) header
- [ ] Delete confirmation dialogs on all delete actions
- [ ] Responsive design on every page (desktop + mobile working flawlessly)
- [ ] OKR metric prominently displayed in app (visual representation of project success)
- [ ] Social Media Management page with engagement prediction
- [ ] Post Optimizer tool showing predicted engagement before publishing
- [ ] At-risk resident alerts on admin dashboard (ML-driven)
- [ ] User feedback/rating system for sessions or support
- [ ] Donation history visible to logged-in donors
- [ ] Email notification templates (donation thank-you, session confirmation)

---

### COULD HAVE FEATURES (Time Permitting)

- [ ] Third-party authentication (Google OAuth, GitHub login)
- [ ] MFA/2FA support (authenticator app or SMS)
- [ ] Dark mode / light mode preference (saved in cookie)
- [ ] AI Social Media Agent page (Claude AI generates post suggestions, staff approves before publishing)
- [ ] Optimal posting schedule heat map (when to post for max engagement by platform)
- [ ] SHAP feature importance explanations (why did ML model predict this resident as at-risk?)
- [ ] Donor lifetime value (LTV) scoring with tiered badge system
- [ ] Safehouse capacity/occupancy visualization (beds available, trends)
- [ ] Cost-per-outcome metrics (dollars spent per successful reintegration)
- [ ] Resident milestone/birthday tracking with automated staff reminders
- [ ] Batch operations (bulk tag, bulk email, bulk reassign)
- [ ] Saved filter presets ("Active donors this quarter")
- [ ] Audit log (who changed what and when)
- [ ] PDF export of reports with organization branding

---

### WON'T HAVE FEATURES (Explicitly Out of Scope)

- [ ] Public resident profiles (privacy violation; survivors at risk)
- [ ] Any resident data visible to unauthenticated users
- [ ] Bulk CSV export of resident case data (too sensitive; no mass export of PII)
- [ ] Self-service account registration (admins create accounts only)
- [ ] Shared service credentials in a public account
- [ ] Group admin passwords (one password per user)

---

## TECHNICAL REQUIREMENTS

### Database Schema (High-Level)

**Core Tables:**
- `Users` (id, email, password_hash, role, created_at, updated_at)
- `Residents` (id, name, age, intake_date, status, assigned_counselor_id, created_at)
- `ProcessRecordings` (id, resident_id, counselor_id, date, emotional_state_before, emotional_state_after, notes, created_at)
- `HomeVisitations` (id, resident_id, date, location, observations, outcomes, created_at)
- `Incidents` (id, resident_id, date, description, severity, created_at)
- `Supporters` / `Donors` (id, name, email, total_given, status, created_at)
- `Donations` (id, donor_id, amount, date, method, created_at)
- `SocialMediaPosts` (id, platform, text, image_url, scheduled_date, published_date, engagement_rate, donation_referrals, created_at)
- `MLPredictions` (id, resident_id, model_type, risk_score, prediction, created_at)

**Relationships:**
- Users.role references Roles
- Residents.assigned_counselor_id references Users
- ProcessRecordings.resident_id references Residents
- ProcessRecordings.counselor_id references Users
- Donations.donor_id references Supporters
- MLPredictions.resident_id references Residents

---

### API Endpoints (Minimum Required)

**Authentication:**
- POST /api/auth/login (email, password) → token
- POST /api/auth/logout
- POST /api/auth/change-password (old, new)

**Dashboard:**
- GET /api/dashboard/metrics → { residentCount, totalDonations, atRiskCount, activeStaff }
- GET /api/dashboard/at-risk-residents → [{ id, name, riskScore, riskType }]

**Residents:**
- GET /api/residents (pagination, search, filter)
- GET /api/residents/{id}
- POST /api/residents (create new resident)
- PUT /api/residents/{id} (update resident)
- DELETE /api/residents/{id} (with confirmation)

**Process Recordings:**
- GET /api/residents/{id}/process-recordings
- POST /api/residents/{id}/process-recordings (create new session)
- DELETE /api/process-recordings/{id}

**Donors:**
- GET /api/donors (pagination)
- GET /api/donors/{id}
- POST /api/donors/{id}/donations (record new donation)

**Reports:**
- GET /api/reports/impact (date range filters)
- GET /api/reports/donors

---

### Code Quality Standards

- [ ] TypeScript strict mode enabled
- [ ] No `any` types unless absolutely necessary
- [ ] Components are small, focused, reusable
- [ ] CSS classes follow naming convention (Tailwind utilities or BEM)
- [ ] Backend controllers are thin; business logic in services
- [ ] Error handling consistent across app
- [ ] Code comments for complex logic
- [ ] No console.log() statements in production code
- [ ] No hardcoded secrets, API keys, or connection strings

---

## SUCCESS CRITERIA & GRADING

**The app will be graded on:**

1. **Functionality (30%)**: Does it work? Are all Must Have features present and functioning without bugs?
2. **Design & UX (25%)**: Does it look professional? Is it usable? Is navigation clear?
3. **Data Integrity (20%)**: Does the database have proper relationships? Is data validated? Can staff rely on it?
4. **Security (15%)**: Are common web vulnerabilities mitigated? Are passwords secure? Is data protected?
5. **Deployment (10%)**: Is the app actually running on a public URL? Is the database accessible?

**Grading Rubric:**
- [ ] All Must Have features work
- [ ] App deployed to public URL
- [ ] Database deployed and connected
- [ ] No obvious UI/UX issues (professional appearance)
- [ ] Login system works
- [ ] Admin dashboard displays metrics from database
- [ ] At least one core page (Residents or Donors) fully functional with CRUD
- [ ] Security implemented (HTTPS, auth, password policy)
- [ ] No console errors or unhandled exceptions

---

## BONUS OPPORTUNITIES (Differentiation)

To stand out from other teams:

- **Polish:** Micro-interactions, smooth animations, attention to detail in spacing/typography
- **Extra Features:** Implement a "Could Have" feature (dark mode, LTV scoring, batch operations)
- **Data Visualization:** Add charts or visual trends beyond basic tables
- **ML Integration:** Display ML predictions prominently and explain why a resident is at-risk
- **Performance:** App loads fast, database queries optimized
- **Documentation:** README with setup instructions, API docs, deployment steps
- **Testing:** Unit tests or integration tests for critical paths

---

## RESOURCES & REFERENCES

- **Entity Framework Core Docs:** https://docs.microsoft.com/en-us/ef/core/
- **ASP.NET Identity:** https://docs.microsoft.com/en-us/aspnet/core/security/authentication/identity
- **React Best Practices:** https://react.dev/learn
- **Tailwind CSS:** https://tailwindcss.com/docs
- **PostgreSQL:** https://www.postgresql.org/docs/
- **OWASP Security:** https://owasp.org/www-project-web-security-testing-guide/
