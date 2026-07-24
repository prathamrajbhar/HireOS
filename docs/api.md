# NextRound — REST API Specification

REST API served by `apps/api` (Express.js 5.2.1). All endpoints are prefixed with `/api/v1`. Authenticated requests require a valid JWT passed via httpOnly cookie or `Authorization: Bearer <token>` header. All HR routes derive `org_id` strictly from the server-side verified JWT payload.

---

## Standard JSON Response Envelope

```json
// Success Response
{
  "success": true,
  "data": { ... },
  "error": null
}

// Error Response
{
  "success": false,
  "data": null,
  "error": {
    "code": "STRING_ERROR_CODE",
    "message": "Human readable message",
    "details": null
  }
}
```

---

## 1. Authentication (`/auth`)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/signup` | Public | Register user account. Body: `{ email, password, role, companyName? }`. Creates `Organization` if `role=hr`. |
| POST | `/auth/login` | Public | Authenticate credentials. Returns user payload and sets httpOnly JWT cookies. |
| POST | `/auth/refresh` | Refresh Cookie | Rotates short-lived access JWT token. |
| POST | `/auth/logout` | Authenticated | Revokes refresh token session and clears auth cookies. |
| POST | `/auth/forgot-password` | Public | Dispatches password reset email token. |
| POST | `/auth/reset-password` | Token Payload | Body: `{ token, newPassword }`. Resets user password hash. |
| GET | `/auth/me` | Authenticated | Returns current authenticated user record, role, and org scope. |

---

## 2. Organization Management (`/organizations`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/organizations/me` | HR | Fetch caller's organization details, logo, and active settings. |
| PATCH | `/organizations/me` | HR (Admin) | Update organization name, industry, and logo URL. |
| GET | `/organizations/me/members` | HR | List workspace team members and assigned roles. |
| POST | `/organizations/me/members/invite` | HR (Admin) | Send email invitation to team member. Body: `{ email, role }`. |
| PATCH | `/organizations/me/members/:userId` | HR (Admin) | Modify team member role (`admin` or `viewer`) or revoke access. |
| GET | `/organizations/me/settings` | HR | Fetch availability hours, email templates, auto-offer defaults, and threshold defaults. |
| PATCH | `/organizations/me/settings` | HR (Admin) | Update workspace settings. |

---

## 3. Job Management (`/jobs`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/jobs` | Public | Browse published jobs. Query params: `search`, `location`, `company`, `salaryMin`, `page`. |
| GET | `/jobs/:jobId` | Public | Fetch job detail by ID. |
| GET | `/jobs/org` | HR | List all organization jobs across `draft`, `active`, and `closed` statuses. |
| POST | `/jobs` | HR | Create draft job. Body: `{ title, description }`. |
| POST | `/jobs/:jobId/ai-assist` | HR | Enqueues JD Parser Agent in BullMQ to extract skills and generate rubric. |
| PATCH | `/jobs/:jobId` | HR (Org Scoped) | Update job title, description, rubric weights, thresholds, and pipeline toggles. |
| POST | `/jobs/:jobId/publish` | HR (Org Scoped) | Transitions status to `active` and enqueues Sourcing Agent. |
| POST | `/jobs/:jobId/pause` | HR (Org Scoped) | Temporarily pauses pipeline advancement. |
| POST | `/jobs/:jobId/close` | HR (Org Scoped) | Marks job status as `closed`. |
| GET | `/jobs/:jobId/pipeline` | HR (Org Scoped) | Kanban pipeline payload: column counts, candidate cards, and recent `AgentLog` stream. |

---

## 4. Candidate Applications (`/applications`)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/applications` | Candidate | Apply to job. Body: `{ jobId }`. Creates `Application` and enqueues Screening Agent. |
| GET | `/applications/me` | Candidate | List caller's submitted job applications and stage status. |
| GET | `/applications/:applicationId` | Candidate (Own) / HR | Fetch application detail and evaluation score breakdown. |
| GET | `/jobs/:jobId/applications` | HR (Org Scoped) | Tabular candidate application list for a specific job. |
| PATCH | `/applications/:applicationId/status` | HR (Org Scoped) | Manual stage override (e.g. advance or reject candidate). |
| POST | `/applications/:applicationId/schedule` | Candidate (Own) | Confirms selected interview slot. Body: `{ slotId }`. |
| POST | `/applications/:applicationId/reschedule` | Candidate (Own) | Requests new interview slots; enqueues Scheduler Agent. |

---

## 5. Candidate Profile (`/candidates`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/candidates/me` | Candidate | Fetch candidate profile. |
| POST | `/candidates/me/resume` | Candidate | Multipart PDF/DOCX resume upload. Triggers background parse job. |
| PATCH | `/candidates/me` | Candidate | Update skills, portfolio links (GitHub, LinkedIn), target compensation, work authorization. |
| DELETE | `/candidates/me` | Candidate | GDPR deletion request. Soft-deletes profile and queues data purge. |

---

## 6. Voice & WebRTC Interviews (`/interviews`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/interviews/:interviewId` | Candidate / HR | Fetch interview status and configuration. |
| POST | `/interviews/:interviewId/consent` | Candidate (Own) | Record video/CV analysis consent before session launch. Body: `{ videoConsent: boolean }`. |
| POST | `/interviews/:interviewId/session-token` | Candidate (Own) | Issues short-lived WebRTC and voice session credentials for room entry. |
| GET | `/interviews/:interviewId/transcript` | Candidate / HR | Returns full interview transcript with timestamp annotations and audio recording URL. |

---

## 7. Multi-Modal Assessments (`/applications/:id/*`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/applications/:id/assessment` | Candidate (Own) | Fetch aptitude test questions and timer status. |
| POST | `/applications/:id/assessment` | Candidate (Own) | Submit aptitude test category answers. Enqueues assessment worker. |
| GET | `/applications/:id/take-home` | Candidate (Own) | Fetch coding assessment problem specs, starters, and test cases. |
| POST | `/applications/:id/take-home` | Candidate (Own) | Submit code solution. Body: `{ language, code }`. Enqueues coding execution worker. |
| GET | `/applications/:id/video-screening` | Candidate (Own) | Fetch video screening prompts and recording rules. |
| POST | `/applications/:id/video-screening` | Candidate (Own) | Upload recorded video prompt response. |

---

## 8. Offers & Onboarding (`/applications/:id/*`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/applications/:id/offer` | Candidate (Own) / HR | Fetch digital offer letter details (salary, equity, start date, status). |
| POST | `/applications/:id/offer/accept` | Candidate (Own) | Accept offer letter. Body: `{ signatureSvg }`. Updates status to `offered_accepted`. |
| POST | `/applications/:id/offer/decline` | Candidate (Own) | Decline offer letter with optional feedback note. |
| GET | `/applications/:id/onboarding` | Candidate (Own) / HR | Fetch onboarding task checklist and submission requirements. |
| POST | `/applications/:id/onboarding/tasks/:taskId` | Candidate (Own) | Upload document or submit task response. |

---

## 9. HR Talent Pool (`/organizations/me/talent-pool`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/organizations/me/talent-pool` | HR (Org Scoped) | Query passive candidate pool. Query params: `q`, `skills`, `minExp`. |
| POST | `/organizations/me/talent-pool/bookmark` | HR (Org Scoped) | Bookmark candidate profile to org talent pool. Body: `{ candidateId }`. |
| POST | `/organizations/me/talent-pool/outreach` | HR (Org Scoped) | Trigger automated email outreach sequence to candidate. Body: `{ candidateId, jobId }`. |

---

## 10. Evaluations & Decisions (`/evaluations`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/evaluations/:applicationId` | Candidate / HR | Composite evaluation score breakdown, dimension scores, and decision rationale. |
| GET | `/evaluations/:applicationId/bias-report` | HR (Org Scoped) | Detailed demographic bias audit report payload. |
| POST | `/evaluations/:applicationId/decision/approve` | HR (Org Scoped) | Manually approve held decision and trigger offer dispatch. |
| POST | `/evaluations/:applicationId/decision/override` | HR (Org Scoped) | Override AI decision outcome. Body: `{ decision, reasoningNote }`. |

---

## 11. Analytics (`/analytics`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/analytics/org` | HR (Org Scoped) | Query funnel stats, time-to-hire, score distribution, and bias score trends. Query: `range`. |
| GET | `/analytics/org/report.pdf` | HR (Org Scoped) | Generates and downloads weekly executive PDF report. |

---

## 12. Internal Callback APIs (`/api/v1/internal/*`)

Secured endpoints callable exclusively by Python AI service workers via `X-Internal-Service-Secret`.

| Method | Path | Description |
|---|---|---|
| PATCH | `/internal/applications/:id/screening-result` | Write resume score, gap analysis, and pgvector match score. |
| PATCH | `/internal/applications/:id/sourcing-result` | Write ranked candidate sourcing pool reference. |
| POST | `/internal/interviews/:id/schedule-slots` | Save 3 proposed interview slots generated by Scheduler Agent. |
| PATCH | `/internal/interviews/:id/complete` | Save final transcript, audio URL, proctor flags, and engagement telemetry. |
| PATCH | `/internal/applications/:id/assessment-result` | Save aptitude test category score breakdown. |
| PATCH | `/internal/applications/:id/coding-result` | Save code test pass rate, execution timing, and complexity score. |
| PATCH | `/internal/evaluations/:id` | Save composite evaluation score, confidence level, and bias report JSON. |
| PATCH | `/internal/evaluations/:id/decision` | Write final decision outcome and drafted offer/rejection email body. |
| POST | `/internal/analytics/:orgId/weekly-report` | Save aggregated weekly hiring metrics. |
| PATCH | `/internal/mock-sessions/:sessionId/complete` | Save practice session transcript, score, and coaching feedback narrative. |
| POST | `/internal/prep-content` | Save AI-generated company prep question bank. |
| POST | `/internal/agent-logs` | Persist structured streaming agent execution log entry. |

---

## 13. Error Code Reference

| Error Code | HTTP Status | Description |
|---|---|---|
| `AUTH_INVALID_CREDENTIALS` | 401 | Email or password incorrect. |
| `AUTH_TOKEN_EXPIRED` | 401 | JWT access token expired; refresh required. |
| `ORG_SCOPE_VIOLATION` | 403 | Attempted to access a resource outside the caller's organization. |
| `VALIDATION_ERROR` | 400 | Request payload failed Zod schema validation. |
| `RESUME_PARSE_FAILED` | 422 | Resume file parsing failed after raw text extraction fallbacks. |
| `INTERVIEW_CONSENT_REQUIRED` | 403 | Attempted session entry prior to video/CV consent submission. |
| `QUEUE_JOB_FAILED` | 500 | Background AI worker job failed max retries. |
| `RATE_LIMITED` | 429 | Rate limit or quota throttle exceeded. |
