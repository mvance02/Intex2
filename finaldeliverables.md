# Final Deliverables Checklist

**Due: Friday April 10 at 10:00 AM**
**Submission form:** https://byu.az1.qualtrics.com/jfe/form/SV_bsjPxSQyEdIQRhA
**Peer eval (due 11:59 PM Friday):** https://byu.az1.qualtrics.com/jfe/form/SV_7VXtQGm7rT4cvoa

---

## Estimated Score by Class

| Class | Points | Estimated | Status |
|---|---|---|---|
| IS 401 — Project Management | 20 | **~14–18** | Depends on FigJam completion |
| IS 413 — Enterprise App Dev | 20 | **~19** | Very strong — minor polish items |
| IS 414 — Security | 20 | **~19.4** | Strong — CSP verification needed |
| IS 455 — Machine Learning | 20 | **~16–19** | Social media pipeline now deployed; education dropout + 2 others still notebook-only |
| Presentation | 20 | ❓ | Up to judges |
| **TOTAL** | **100** | **~88–96** | |

---

## Submission Checklist

### Group Information
- [ ] Group number confirmed
- [ ] All group member names listed correctly

### URLs (typos here hurt your grade badly)
- [ ] Website URL — deployed on Railway, HTTPS, publicly accessible
- [ ] GitHub repository URL — linked to correct branch, **set to Public**
- [ ] Notebook URLs (one per pipeline):
  - [ ] `ml-pipelines/reintegration-readiness.ipynb`
  - [ ] `ml-pipelines/donor_retention_risk.ipynb`
  - [ ] `ml-pipelines/education_dropout_risk_package/ml_pipeline/Education_Dropout_Risk_Pipeline.ipynb`
  - [ ] `ml-pipelines/health_deterioration_prediction.ipynb`
  - [ ] `ml-pipelines/social_donation_ml/Social_Media_Donation_Driven_Pipeline.ipynb`
- [ ] IS 413 video URL — public/unlisted, accessible to anyone with the link
- [ ] IS 414 video URL — public/unlisted, accessible to anyone with the link
- [ ] IS 455 video URL — public/unlisted, accessible to anyone with the link

### User Credentials (provide in submission form)
- [ ] **Admin user WITHOUT MFA** — username + password
- [ ] **Donor user WITHOUT MFA** (must have existing donation history) — username + password
- [ ] **One account WITH MFA enabled** — username only (graders won't log in, just verify it prompts for MFA)

### GitHub Repository
- [ ] Repository is set to **Public**
- [ ] `main` branch is up to date with all deployed code
- [ ] `ml-pipelines/` folder contains all `.ipynb` files
- [ ] No secrets/credentials committed anywhere in the repo
- [ ] `.gitignore` covers `.env`, `.env.local`, user secrets

---

## Video Checklist

### IS 413 Video
Each item must be demonstrated on screen at sufficient resolution.

- [ ] Landing page — live stats, CTAs visible
- [ ] Login — show validation error on bad password, then successful login
- [ ] Register — show password policy (14 chars)
- [ ] Donor dashboard — donate (fake), show donation history
- [ ] Admin dashboard — KPI cards, recent activity feed
- [ ] Caseload Inventory — search, filter, ML readiness badges
- [ ] Resident Detail — click through all 7 tabs
- [ ] Process Recording — create a new session entry
- [ ] Home Visitation — create a new visit entry
- [ ] Reports & Analytics — show donation trends chart, resident outcomes chart
- [ ] Delete confirmation dialog shown (on any page)
- [ ] Mobile responsiveness — resize browser or use DevTools device emulation
- [ ] Social Media page
- [ ] Privacy Policy page (footer link)
- [ ] Error handling — show an error state or validation message

### IS 414 Video
- [ ] HTTPS padlock visible in browser address bar
- [ ] HTTP → HTTPS redirect (mention Railway proxy level + `UseHttpsRedirection()` in code)
- [ ] Username/password login working
- [ ] Password policy — attempt short password (fails), 14+ char password (succeeds)
- [ ] Public pages accessible without login (`/`, `/impact`, `/login`, `/privacy`)
- [ ] Protected pages redirect to login when not authenticated
- [ ] Admin-only CUD — show a 403 when Donor tries to edit data
- [ ] RBAC — show Admin can create/edit/delete
- [ ] Delete confirmation dialog
- [ ] Credentials — show `.gitignore`, `appsettings.json` placeholders, mention Railway env vars
- [ ] Privacy policy page — scroll through it
- [ ] Cookie consent banner — show it on first visit, accept it, show it disappears
- [ ] CSP header — DevTools → Network → Response Headers → show `content-security-policy`
- [ ] Site publicly accessible (no VPN needed)
- [ ] Google OAuth — show "Continue with Google" button, complete the flow
- [ ] MFA — show setup page with QR code, show that login prompts for code when enabled

### IS 455 Video
- [ ] Reintegration Readiness — show readiness badges in CaseloadInventory
- [ ] Reintegration Readiness — click a resident, show score + top factors
- [ ] Show `api.py` FastAPI running (or demonstrate live API call)
- [ ] Walk through `reintegration-readiness.ipynb` — show each required section
- [ ] Walk through `Education_Dropout_Risk_Pipeline.ipynb` — show each required section + deployed endpoint
- [ ] Walk through `donor_retention_risk.ipynb` — show each required section
- [ ] Walk through `health_deterioration_prediction.ipynb` — show each required section
- [ ] Walk through `Social_Media_Donation_Driven_Pipeline.ipynb` — show each required section
- [ ] Show Social Donation Predictor page (`/admin/social-donation`) — enter post details, show predicted donation amount and best hour recommendations
- [ ] For each notebook, explicitly point out: Problem Framing, EDA, Modeling, Evaluation, Causal Analysis, Deployment Notes
- [ ] Run at least one notebook top-to-bottom to show it's executable

---

## Pre-Submission Technical Checklist

### Code & Deployment
- [ ] All changes merged to `main` branch on GitHub
- [ ] Railway redeployed from `main` — verify the live site is current
- [ ] Railway env vars set: `ConnectionStrings__Default`, `ConnectionStrings__IdentityConnection`, `Authentication__Google__ClientId`, `Authentication__Google__ClientSecret`, `FrontendUrl`, `AllowedOrigins`
- [ ] Site loads at production URL without errors
- [ ] Google OAuth button visible on `/login` on production
- [ ] All API endpoints responding (no 500 errors on load)

### Security Spot Checks
- [ ] Open production site → DevTools → Console → no red CSP violation errors
- [ ] DevTools → Network → API response → `content-security-policy` header present
- [ ] Try hitting `/api/residents` without being logged in → should get 401

### ML Pipelines
- [ ] All 5 notebooks run top-to-bottom without errors
- [ ] Data paths in notebooks are correct relative to repo root
- [ ] Model artifacts exist: `ml-pipelines/models/reintegration_pipeline.pkl`
- [ ] FastAPI sidecar for reintegration is deployed and responding on Railway
- [ ] Education dropout FastAPI is deployed and responding

### IS 401 / FigJam
- [ ] FigJam board link submitted through IS 401 Learning Suite
- [ ] All 4 days' sections completed in FigJam
- [ ] Burndown chart updated through end of week
- [ ] Retrospective completed by all team members

### Peer Evaluation
- [ ] **Every team member** completes peer eval by Friday 11:59 PM
- [ ] Link: https://byu.az1.qualtrics.com/jfe/form/SV_7VXtQGm7rT4cvoa
- [ ] Complete immediately after the presentation

---

## Presentation Day

**Your assigned room and time is in the presentation schedule. Verify it before Friday.**

Format:
- 20 min — Presentation + Tech Demo
- 5 min — Q&A
- 5 min — Judge deliberation (wait in hall)
- 5–10 min — Feedback

Tips:
- Lead with the tech demo — it's the most important part
- Frame everything around the business problem (protecting girls, retaining donors, smarter social media)
- Don't spend more than 2–3 minutes on case background
- Do NOT bring handouts
- Have the site open and ready to demo before you enter the room
- Have login credentials ready so you don't fumble during the demo

---

## What Each Class's Graders Watch

| Video | Who watches it | What they care about |
|---|---|---|
| IS 413 | IS 413 TAs | All pages functional, data persisted, quality code |
| IS 414 | IS 414 TAs | Security features demonstrated in DevTools, code shown |
| IS 455 | IS 455 TAs | Notebooks executable, pipelines complete, web integration |
| IS 401 | IS 401 TAs | FigJam board, not a video — submitted separately |

> Each video covers only its own class. Don't rely on "we showed that in the IS413 video" for IS414 credit. Everything must be in its own video.
