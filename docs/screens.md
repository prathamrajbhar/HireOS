# HireOS — Screens

Full screen inventory for the platform, grouped by surface: Public, Auth, HR Portal, Candidate Portal, and Interview (shared). Each screen lists purpose, route, and the components it needs.

---

## A. Public Surface (no login required)

### A1. Landing Page
**Route:** `/`
**Purpose:** Explain the platform to both audiences (companies + candidates), drive signup for either side.

Components:
- Nav bar (logo, "For Companies" / "For Candidates" toggle links, Login, Sign Up CTA)
- Hero section (headline, subtext, two CTA buttons: "Post a Job" / "Find a Job")
- How-it-works strip (3–4 step visual: Apply → AI Interview → Get Decision, or Post Job → AI Screens → Get Shortlist, depending on audience toggle)
- Trust/stats bar (e.g. avg. time-to-hire, bias-audit badge, number of companies)
- Feature highlight cards (zero human steps, bias audit, mock interviews)
- Footer (links: About, Pricing, Privacy, Terms, Contact)

### A2. Public Job Listing Page
**Route:** `/jobs`
**Purpose:** Browse all open jobs across every company on the platform (also the main SEO/growth surface).

Components:
- Search bar (role/keyword)
- Filter sidebar (location, experience level, company, salary band, remote/on-site)
- Job card grid/list (title, company name + logo, location, salary band, posted date, "Apply" button)
- Pagination or infinite scroll
- Empty state (no jobs match filters)

### A3. Job Detail Page
**Route:** `/jobs/:jobId`
**Purpose:** Full job description, entry point to apply.

Components:
- Job header (title, company logo/name, location, salary band, posted date)
- Full JD body (rich text)
- Rubric-derived "what we look for" summary (skills/experience tags, non-numeric — don't expose raw scoring weights)
- Company mini-profile card (name, about blurb, link to other open jobs at this company)
- Sticky "Apply Now" button (prompts login/signup if not authenticated)
- Similar jobs section (bottom)

### A4. About / Company Info Page
**Route:** `/about`
**Purpose:** Trust-building, standard marketing page.

Components:
- Mission/story section
- Bias-audit explainer (how the platform ensures fairness — important trust signal given AI hiring)
- Contact/footer links

### A5. Pricing Page
**Route:** `/pricing`
**Purpose:** Even with no billing enforced yet, a placeholder page setting expectations.

Components:
- Plan cards (Free tier active, "Pro"/"Enterprise" marked "Coming soon")
- FAQ accordion

---

## B. Authentication

### B1. Sign Up
**Route:** `/signup`
**Purpose:** Single entry, role selection branches into candidate or HR/company signup.

Components:
- Role selector (tab or toggle: "I'm hiring" / "I'm looking for a job")
- Form: name, email, password, confirm password
- If "I'm hiring": additional field for company name (creates `Organization` on submit)
- Terms/privacy checkbox
- Submit button, loading state, inline validation errors
- Link to Login

### B2. Login
**Route:** `/login`
**Purpose:** Single login form for all roles; role/org context resolved server-side from JWT after auth.

Components:
- Email + password fields
- "Forgot password" link
- Submit button, error state (invalid credentials)
- Link to Sign Up

### B3. Forgot / Reset Password
**Route:** `/forgot-password`, `/reset-password/:token`
**Purpose:** Standard credential recovery flow.

Components:
- Email input (request reset) → confirmation message screen
- New password + confirm fields (reset form, token-validated)
- Success state → redirect to Login

### B4. Onboarding — Candidate
**Route:** `/onboarding/candidate`
**Purpose:** First-login flow to build the `CandidateProfile`.

Components:
- Step indicator (Step 1: Resume & Links, Step 2: Core Preferences & Stack, Step 3: Fit & Culture Questions)
- **Step 1 Components:** Resume upload zone (PDF/DOCX), LinkedIn URL, and GitHub URL input fields.
- **Step 2 Components:** Target roles multiselect autocomplete, Core tech stack tag input, Years of experience selector, Work mode toggle (Remote/Hybrid/On-site), Target location selection.
- **Step 3 Components:** Minimum expected annual salary input, Notice period dropdown (Immediate, 1-2 weeks, 30 days, 60+ days), Work authorization selection, "Proud Project" textarea, Work value priority ranking.
- "Skip for now" option (profile completion nudge shown later on dashboard)

### B5. Onboarding — Company / HR
**Route:** `/onboarding/company`
**Purpose:** First-login flow to configure the new `Organization`.

Components:
- Company details form (name, logo upload, industry, size)
- Invite team members (email input list, role dropdown per invite: admin/viewer)
- Interview availability settings prompt (configure working timezone and available slots for Scheduler Agent)
- "Post your first job" CTA at the end

---

## C. HR Portal

### C1. HR Dashboard (Home)
**Route:** `/hr/dashboard`
**Purpose:** Landing screen after login — overview across all of the org's jobs.

Components:
- Top nav (org switcher if user belongs to multiple orgs, notifications bell, profile menu)
- Side nav (Dashboard, Jobs, Candidates, Analytics, Settings)
- Summary stat cards (active jobs, candidates in pipeline, interviews this week, offers sent)
- Recent activity feed (live agent log snippets across jobs — "Screening Agent shortlisted 4 candidates for Backend Engineer")
- Quick "Post a Job" CTA button

### C2. Job List
**Route:** `/hr/jobs`
**Purpose:** All jobs posted by the org.

Components:
- Table/list (title, status badge [draft/active/closed], candidates in pipeline count, posted date, actions menu)
- "New Job" button
- Status filter tabs (All / Active / Draft / Closed)
- Search/sort controls

### C3. Job Creation / Edit
**Route:** `/hr/jobs/new`, `/hr/jobs/:jobId/edit`
**Purpose:** JD input and AI-assisted rubric generation, plus pipeline config.

Components:
- Rich text JD editor
- "AI Assist" button (triggers suggestion panel for missing details — skills, salary band, etc.)
- Auto-extracted fields panel (required skills, experience level, soft skills, salary band, culture keywords — editable chips/tags)
- Rubric weight editor (sliders or number inputs per dimension, must sum to 100%)
- Config toggle group: enable sourcing (on/off), min score to shortlist (slider), auto-offer (on/off), interview question count (stepper)
- Save as Draft / Publish buttons

### C4. Job Pipeline (Kanban)
**Route:** `/hr/jobs/:jobId/pipeline`
**Purpose:** Real-time visual view of one job's pipeline — the core "watch the AI work" screen.

Components:
- Kanban board, columns: Sourced → Screened → Interview → Decision
- Candidate cards per column (name/avatar, score badge, dimension mini-bars, stage timestamp)
- Live agent activity log panel (streaming, collapsible sidebar — "Interviewer Agent: interview with Jane Doe in progress")
- Column count badges
- Click card → opens Candidate Evaluation Detail (C6)
- Job-level controls (pause pipeline, edit thresholds, close job)

### C5. Candidate List (per job or org-wide)
**Route:** `/hr/jobs/:jobId/candidates` or `/hr/candidates`
**Purpose:** Table view alternative to kanban, better for scanning/sorting/filtering at scale.

Components:
- Filterable/sortable table (name, score, stage, bias flag indicator, applied date)
- Bulk actions (export, bulk stage move — if manual override enabled)
- Search bar
- Column customization (show/hide dimension scores)

### C6. Candidate Evaluation Detail
**Route:** `/hr/candidates/:applicationId`
**Purpose:** Full breakdown of one candidate's evaluation — the "trust the AI" screen.

Components:
- Candidate header (name, resume link, LinkedIn & GitHub profile links, source, applied date)
- Composite score + confidence level (large, prominent)
- Dimension score breakdown (bar chart or radial, per rubric category)
- Gap analysis panel (what's missing vs requirement, from Screening Agent)
- Bias audit report panel (written explanation, any flags highlighted)
- Interview replay embed (link to C7)
- Decision panel (outcome: Hire/Reject/Hold, reasoning log, "Override" button if manual review enabled)
- Proctor/engagement flags panel, clearly labeled "supplementary signal, not used in scoring"

### C7. Interview Replay
**Route:** `/hr/candidates/:applicationId/interview`
**Purpose:** Review the actual interview.

Components:
- Audio player with waveform/scrubber
- Synced transcript panel (auto-scroll with playback, speaker labels)
- Timestamp markers for flagged moments (evasive answer detected, proctor flag triggered)
- Score-per-question annotation inline with transcript
- Download transcript / audio buttons

### C8. Analytics Dashboard
**Route:** `/hr/analytics`
**Purpose:** Weekly reporting, funnel visibility.

Components:
- Date range selector
- Funnel chart (sourced → screened → interviewed → decided → hired, with drop-off %)
- Time-to-hire chart (per role, trend over time)
- Average score per stage chart
- Bias score trend chart (over time, with anomaly markers)
- Diversity metrics panel (aggregate, anonymized)
- Engagement/CV signal trend chart (labeled as reporting-only)
- "Export PDF" button
- Email digest toggle/settings

### C9. Org Settings
**Route:** `/hr/settings`
**Purpose:** Organization-level configuration.

Components:
- Tabs: General / Team / Integrations / Email Templates / Billing
- **General:** org name, logo, industry
- **Team:** member list table (name, role, status), invite form, role change/remove actions
- **Integrations:** Gmail/SMTP status, reconnect buttons
- **Email Templates:** editable templates for outreach/confirmation/offer/rejection emails, with variable placeholders
- **Billing:** current plan display (Free), "Upgrade" button disabled/labeled "Coming soon"

### C10. Notifications
**Route:** `/hr/notifications` (or dropdown panel, not full page)
**Purpose:** Surface pipeline events needing attention.

Components:
- List of events (new shortlist ready, decision held for review, interview completed, agent failure)
- Mark-as-read, filter by type
- Click-through to relevant candidate/job

---

## D. Candidate Portal

### D1. Candidate Dashboard (Home)
**Route:** `/candidate/dashboard`
**Purpose:** Landing screen after login — status of applications + prep activity.

Components:
- Top nav (notifications, profile menu)
- Side nav (Dashboard, Browse Jobs, My Applications, Mock Interviews, Company Prep, Profile)
- Application status summary cards (in progress, interview scheduled, decided)
- Recommended jobs strip (based on profile skills/target roles)
- "Continue your prep" prompt (if incomplete mock sessions or low scores in a weak dimension)

### D2. Browse Jobs
Same as A2 (`/jobs`), but authenticated version adds:
- "Applied" badge on already-applied jobs
- Personalized ranking/highlighting based on profile match

### D3. My Applications
**Route:** `/candidate/applications`
**Purpose:** Track every application across every company.

Components:
- List/table (job title, company, status badge [applied/screening/interview scheduled/interviewed/decided], applied date)
- Status detail expand (what stage means, next expected action)
- Click-through to application detail (D4)

### D4. Application Detail
**Route:** `/candidate/applications/:applicationId`
**Purpose:** Candidate-facing status + outcome for one application.

Components:
- Status timeline (Applied → Screened → Interview → Decision, current stage highlighted)
- If interview scheduled: date/time, join link, prep reminder CTA
- If decided: outcome message (offer details or rejection with feedback summary — reasoning shared in a candidate-appropriate tone, not raw bias-audit internals)
- "Practice for this type of interview" CTA linking to Mock Interview Agent pre-filled with this company/role

### D5. Interview Scheduling (candidate-facing)
**Route:** `/candidate/applications/:applicationId/schedule`
**Purpose:** Pick a proposed interview slot.

Components:
- 3 proposed time-slot cards (from Scheduler Agent)
- "None of these work" → request reschedule flow
- Calendar export button (ICS download) after confirmation

### D6. My Profile
**Route:** `/candidate/profile`
**Purpose:** Manage the reusable candidate profile.

Components:
- Resume upload/replace (with re-parse trigger)
- Skills editor (tag input)
- LinkedIn and GitHub URL inputs
- Target roles editor
- Contact info fields
- Profile completeness indicator
- Data deletion request button (GDPR-style)

### D7. Mock Interview — Setup
**Route:** `/candidate/mock/new`
**Purpose:** Configure a practice session.

Components:
- Target company input (autocomplete against companies on platform, or free text for others)
- Target role selector
- Difficulty/length selector
- "Start Mock Interview" button

### D8. Mock Interview — Session
**Route:** `/candidate/mock/:sessionId`
**Purpose:** Run the practice interview itself. Shares the interview UI shell with the real interview screen (E1) but visually marked as practice mode.

Components: (see E1 for full interview component list)
- "Practice Mode" banner/badge distinguishing it from a real interview
- Same voice interface, timer, consent flow (optional CV in practice mode too)

### D9. Mock Interview — Feedback
**Route:** `/candidate/mock/:sessionId/feedback`
**Purpose:** Instant feedback after a mock session — this is the core value of the mock feature.

Components:
- Overall score + per-dimension breakdown (bar chart)
- Feedback narrative (LLM-generated, coaching tone — "what went well / what to improve")
- Transcript with inline annotations at weak points
- "Try again" / "Practice a different company" buttons
- Link to relevant Company Prep content

### D10. Mock Session History
**Route:** `/candidate/mock/history`
**Purpose:** Progress tracking across all practice attempts.

Components:
- List of past sessions (company/role, date, score)
- Score trend chart over time
- Weak-dimension trend chart (which rubric areas are improving/lagging)

### D11. Company Prep Library
**Route:** `/candidate/prep`
**Purpose:** Browse prep content by company/role.

Components:
- Search/filter (by company, role archetype)
- Prep content cards (company name/logo, role archetype, "View" button)

### D12. Company Prep Detail
**Route:** `/candidate/prep/:companyId/:roleArchetype`
**Purpose:** Actual prep content for one company/role pairing.

Components:
- Likely-question bank (list, expandable answers/tips)
- Culture notes section
- "Practice this now" CTA → pre-fills Mock Interview Setup (D7)

---

## E. Interview Experience (shared — real + mock)

### E1. Live Interview Room
**Route:** `/interview/:interviewId` (real) or `/candidate/mock/:sessionId` (practice)
**Purpose:** The core voice-interview UI, used for both real and practice sessions.

Components:
- Pre-join screen: mic/camera check, consent toggle for video/CV analysis (with plain-language explanation of what's captured), "Join Interview" button
- In-session layout: Split-screen layout. Right side displays candidate video tile (if enabled) with MediaPipe proctoring indicators. Left side displays the AI interviewer waveform/avatar and prints the AI interviewer's questions in real-time.
- No candidate transcript: The candidate's spoken responses are captured and sent to the backend but are never displayed on the UI during the interview.
- Timer/progress indicator (time box remaining)
- Mute/camera toggle controls
- Connection status indicator (handles latency fallback to text-only mode)
- End-of-interview wrap-up screen ("Thanks, here's what happens next")

### E2. Text-Only Interview Fallback
**Route:** same as E1, alternate render mode
**Purpose:** Fallback when voice latency/connection fails.

Components:
- Chat-style Q&A interface (AI question bubble, candidate text input)
- Same timer/progress indicator
- Notice banner explaining the fallback occurred

---

## F. Shared / Cross-cutting Components

These aren't standalone screens but reusable components referenced across multiple screens above:

- **Score Badge** — colored badge showing composite or dimension score (used in kanban cards, tables, evaluation detail)
- **Bias Flag Indicator** — small icon/tooltip shown wherever a bias anomaly exists
- **Agent Status Pill** — "sourcing / screening / interviewing / evaluating / decided" stage indicator
- **Live Activity Toast/Feed Item** — streaming agent log line, reused in dashboard and pipeline views
- **Consent Modal** — video/CV consent explanation, reused pre-interview (real and mock)
- **Empty States** — no jobs, no candidates, no mock sessions yet, etc., consistent illustration + CTA pattern
- **Toast Notifications** — success/error feedback across all forms and actions

---

## G. Screen-to-role matrix

| Screen group | HR | Candidate | Public |
|---|---|---|---|
| A. Public | ✓ (unauthenticated) | ✓ | ✓ |
| B. Auth | ✓ | ✓ | ✓ |
| C. HR Portal | ✓ | ✗ | ✗ |
| D. Candidate Portal | ✗ | ✓ | ✗ |
| E. Interview | ✗ (view via C7 replay only) | ✓ (live) | ✗ |
