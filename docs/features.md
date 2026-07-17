# NextRound — Features

Two-sided AI recruitment marketplace. Multiple companies post jobs; one central candidate pool applies across all of them. Full pipeline: 8 core hiring agents plus a candidate-facing prep layer, each stage handing off automatically.

## 1. Job Creation (HR side)

**What it does:** HR types a rough job description, AI turns it into a structured hiring spec.

- Rich text JD editor with AI-assist (suggest missing details)
- Auto-extract: required skills, experience level, soft skills, salary band, culture keywords
- Auto-generate weighted scoring rubric (e.g. technical skill 40%, experience 30%, communication 30%)
- Config toggles per job: enable sourcing, min score to shortlist, auto-offer on/off, interview question count
- Job published to a public listing page, visible to all candidates on the platform

**Output:** structured Job record + rubric JSON used by every later agent.

## 2. Sourcing Agent

**What it does:** Finds candidates without anyone posting the job publicly, and pulls from the platform's own candidate pool.

- Scrapes LinkedIn public profiles, GitHub (for dev roles), AngelList
- Checks existing platform candidate profiles for matches before external sourcing
- Filters by location, years experience, listed skills
- Builds a pool of 50–200 candidates per job
- Deduplicates across every job and company on the platform (no duplicate outreach to the same candidate)
- Ranks pool by initial signal match before resume even uploaded

**Output:** ranked candidate list with source link, ready for screening.

## 3. Screening Agent

**What it does:** Reads every resume and scores it against the job rubric — replaces manual resume review.

- Parses resume PDF/DOCX into structured data
- Converts resume + rubric into vector embeddings, semantic match (not just keyword match)
- Scores 0–100 per candidate, broken into dimension scores
- Generates gap analysis: what the candidate is missing vs the requirement
- Auto-shortlists top N candidates above threshold
- Rejected candidates get an instant rejection email, zero human step

**Output:** shortlist of candidates with score and reasoning, linked to the job via an Application record.

## 4. Scheduler Agent

**What it does:** Books interviews without back-and-forth emails.

- Sends a personalized outreach email containing a scheduling magic link, while simultaneously surfacing an active scheduling task card on the candidate's platform dashboard
- Generates open slots based on the company's configured platform availability hours
- Proposes 3 time options to the candidate
- Auto-books the slot the moment the candidate selects one (either via email link or platform dashboard)
- Sends confirmation and reminder emails (24hr before, 1hr before)
- If the candidate requests a reschedule, the agent re-proposes new slots automatically (synced across email and platform)

**Output:** confirmed interview slot, event created on the platform.

## 5. Interviewer Agent

**What it does:** Conducts the actual interview in a premium, full-screen immersive video assessment console that simulates a live human-like conversational experience.

- **Immersive Video Console:** Full-screen viewport centering the candidate's webcam feed and featuring a pulsing voice status orb representing the AI Interviewer.
- **Dynamic Voice Status Orb:** Real-time animated indicator displaying states such as `Speaking`, `Listening`, `Analyzing`, and `Idle`.
- **Cinematic Subtitles Overlay:** Caption stream at the bottom displaying real-time transcribed questions from the AI and candidate responses.
- **Conversational Engine:** Generates dynamic, contextual follow-up questions tailored to candidate answers instead of static question lists. 
- **Timeline Progress Tracker:** Displays stages of the interview (e.g., `Introduction` ➔ `Core Vetting` ➔ `Deep-Dive` ➔ `Wrap-up`) dynamically based on conversation depth.
- **Interactive Teleprompter Panel:** Slide-out side drawer for reviewing transcripts, entering text-mode replies, or reading assessment guidelines.
- **Proctoring HUD Telemetry Overlay:** Real-time HUD on the camera container showing gaze tracking percentage, person count, and voice clarity levels.
- **Output:** Live dynamic transcript, granular score breakdowns, and proctoring flags synchronized to `localStorage` and linked to candidate applications.


## 6. Evaluator + Bias Audit Agent

**What it does:** Turns the interview transcript into a score, and checks if the scoring itself is fair.

- Scores transcript against each rubric dimension using LLM-as-judge
- Combines resume score and interview score into a composite score
- Bias audit pass: checks if the scoring pattern correlates with gender, age signals, name origin, or school name
- Flags any anomaly — e.g. "candidates with female-coded names averaged 8 points lower with no skill gap evidence"
- Produces a written bias report attached to every evaluation, not just a flag
- Engagement/CV signal is reported separately and excluded from the composite score

**Output:** composite score, confidence level, and bias audit report.

## 7. Decision Agent

**What it does:** Makes the final call and tells the candidate — no human sign-off needed by default.

- Aggregates resume score, interview score, and bias audit result
- Applies threshold rules configured at the job level (e.g. composite > 75 = hire)
- Decision outcome: Hire / Reject / Hold for review (Hold only if confidence is low, still logged, not blocking)
- Drafts a personalized offer letter (role, salary, start date) or rejection email matching company tone
- Sends the email automatically
- Logs the full reasoning chain for the audit trail
- HR can optionally review before send, per org config (auto-offer toggle)

**Output:** final decision, email sent, and reasoning log.

## 8. Analytics Agent

**What it does:** Tells each company how their hiring is actually going, automatically.

- Generates a weekly report per company: candidates sourced/screened/interviewed/hired
- Time-to-hire per role
- Funnel drop-off rate at each stage
- Average score per stage
- Bias score trend over time
- Engagement/CV signal trend — reporting only, never a decision input
- Diversity metrics (anonymized, aggregate only)
- PDF export of report
- Delivered to dashboard plus optional email digest

**Output:** weekly PDF report and dashboard charts.

## 9. Candidate Portal

**What it does:** Gives candidates a real product surface, not just an inbox for interview invites.

- One profile per candidate, containing resume, LinkedIn, and GitHub links, reused across every application on the platform
- Public job listing page — browse and filter jobs across all companies
- Application history — track the status of every job applied to, in one place
- **Mock Interview Agent** — Practice mode built on the immersive conversational console technology; candidate selects a target company/role, goes through dynamic multi-turn vetting with live proctoring HUD, and receives instant coaching feedback.
- **Company Prep content** — AI-generated question banks and culture notes per company or role archetype, generated rather than scraped to avoid data-source risk
- **Progress tracker** — score history across mock sessions and weak-dimension trends over time, so candidates can see improvement

**Output:** candidate-facing dashboard with applications, mock session history, and prep content.

---

## Platform-level features

### Real-time dashboard (HR side)
- Kanban view of pipeline per job (sourced → screened → interview → decision)
- Live streaming log of what each agent is doing right now
- Candidate cards with score badges, click to see full evaluation breakdown
- Shortlist view only by default — raw applicant volume hidden from HR

### Interview replay
- Full transcript view with timestamps
- Audio playback synced to transcript
- Score breakdown shown alongside the relevant transcript section
- Proctor/engagement flags shown alongside the transcript, clearly labeled as supplementary

### Multi-tenancy
- Each company is an isolated organization
- Org admin can invite team members (admin / viewer roles)
- Org-level settings: email templates, score thresholds, interview availability hours, auto-offer toggle
- Candidate accounts are platform-wide, not tied to any single company

### Authentication
- Custom JWT-based auth
- Roles: hr, candidate
- Org-scoped access enforced server-side for HR data isolation

### Billing
- Not implemented at launch — platform is free to use
- Data model reserves a plan field on Organization for future use, with no enforcement yet
