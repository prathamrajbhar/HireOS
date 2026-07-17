# NextRound — API Reference

REST API served by `apps/api` (Express.js). All endpoints are prefixed with `/api/v1`. All authenticated endpoints require `Authorization: Bearer <jwt>` (sent automatically via httpOnly cookie from the frontend). Org-scoped endpoints derive `org_id` from the JWT, never from the request body/params.

Response envelope for all endpoints:
```json
{ "success": true, "data": { ... }, "error": null }
{ "success": false, "data": null, "error": { "code": "STRING", "message": "..." } }
```

---

## 1. Auth

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/signup` | none | Create a `User`. Body: `{ email, password, role, companyName? }`. If `role=hr`, also creates `Organization`. |
| POST | `/auth/login` | none | Verify credentials, issue access + refresh JWT (set as httpOnly cookies). |
| POST | `/auth/refresh` | refresh token | Rotate access token. |
| POST | `/auth/logout` | any | Revoke refresh token, clear cookies. |
| POST | `/auth/forgot-password` | none | Send reset email. |
| POST | `/auth/reset-password` | reset token | Body: `{ token, newPassword }`. |
| GET | `/auth/me` | any | Return current user + role + org_id. |

## 2. Organizations (HR)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/organizations/me` | hr | Get current org profile + settings. |
| PATCH | `/organizations/me` | hr (admin role) | Update name, logo, industry. |
| GET | `/organizations/me/members` | hr | List team members. |
| POST | `/organizations/me/members/invite` | hr (admin role) | Body: `{ email, role }`. |
| PATCH | `/organizations/me/members/:userId` | hr (admin role) | Change role or remove. |
| GET | `/organizations/me/settings` | hr | Email templates, thresholds, interview availability hours, auto-offer default. |
| PATCH | `/organizations/me/settings` | hr (admin role) | Update settings above. |

## 3. Jobs

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/jobs` | public | List published jobs. Query: `search, location, company, experienceLevel, page`. |
| GET | `/jobs/:jobId` | public | Job detail (published only for public callers). |
| GET | `/jobs/org` | hr | List all jobs for the caller's org (any status). |
| POST | `/jobs` | hr | Create job (draft). Body: `{ title, descriptionRaw }`. |
| POST | `/jobs/:jobId/ai-assist` | hr | Enqueues JD Parser Agent — extracts skills/rubric. Returns job id for polling. |
| PATCH | `/jobs/:jobId` | hr, org-scoped | Update JD, rubric, thresholds, config toggles. |
| POST | `/jobs/:jobId/publish` | hr, org-scoped | Set status `active`, triggers Sourcing Agent enqueue. |
| POST | `/jobs/:jobId/pause` | hr, org-scoped | Pause pipeline (no new stage advances). |
| POST | `/jobs/:jobId/close` | hr, org-scoped | Set status `closed`. |
| DELETE | `/jobs/:jobId` | hr, org-scoped | Soft delete (draft only). |
| GET | `/jobs/:jobId/pipeline` | hr, org-scoped | Kanban data: stage counts + candidate cards + recent `AgentLog` entries. |

## 4. Applications

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/applications` | candidate | Body: `{ jobId }`. Creates `Application`, enqueues Screening Agent. |
| GET | `/applications/me` | candidate | List caller's applications with status. |
| GET | `/applications/:applicationId` | candidate (own) or hr (org-scoped via job) | Application detail + evaluation summary. |
| GET | `/jobs/:jobId/applications` | hr, org-scoped | List/filter/sort applications for a job (table view). |
| PATCH | `/applications/:applicationId/status` | hr, org-scoped | Manual stage override (if enabled). |
| POST | `/applications/:applicationId/schedule` | candidate (own) | Body: `{ slotId }` — confirms one of the proposed interview slots. |
| POST | `/applications/:applicationId/reschedule` | candidate (own) | Requests new slots; enqueues Scheduler Agent again. |

## 5. Candidate profile

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/candidates/me` | candidate | Get own profile. |
| POST | `/candidates/me/resume` | candidate | Multipart upload; triggers resume parse job. |
| PATCH | `/candidates/me` | candidate | Update skills, target roles, contact info, linkedinUrl, githubUrl. |
| DELETE | `/candidates/me` | candidate | GDPR-style deletion request — soft-deletes profile, queues data purge. |

## 6. Interviews

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/interviews/:interviewId` | candidate (own) or hr (org-scoped) | Interview metadata + status. |
| POST | `/interviews/:interviewId/consent` | candidate (own) | Body: `{ videoConsent: boolean }`. Must be called before session start. |
| POST | `/interviews/:interviewId/session-token` | candidate (own) | Issues short-lived WebRTC/voice session token for the interview room. |
| POST | `/interviews/:interviewId/complete` | internal (called by ai-service via callback) | Body: `{ transcript, audioUrl, proctorFlags, engagementSignal }`. |
| GET | `/interviews/:interviewId/transcript` | candidate (own) or hr (org-scoped) | Full transcript + audio URL for replay. |

## 7. Evaluations & decisions

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/evaluations/:applicationId` | candidate (own, limited fields) or hr (org-scoped, full) | Composite score, dimension breakdown, bias report, reasoning. |
| GET | `/evaluations/:applicationId/bias-report` | hr, org-scoped | Full bias audit document. |
| POST | `/evaluations/:applicationId/decision/approve` | hr, org-scoped | Used when `Job.auto_offer = false` — sends the drafted email, marks `decided`. |
| POST | `/evaluations/:applicationId/decision/override` | hr, org-scoped | Body: `{ decision, reasoningNote }` — HR changes the outcome before sending. |

## 8. Mock interviews

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/mock-sessions` | candidate | Body: `{ targetCompany, targetRole, difficulty }`. Enqueues on low-priority mock queue. |
| GET | `/mock-sessions/:sessionId` | candidate (own) | Session status + join token once ready. |
| POST | `/mock-sessions/:sessionId/complete` | internal (ai-service callback) | Body: `{ transcript, score, feedback }`. |
| GET | `/mock-sessions/:sessionId/feedback` | candidate (own) | Score breakdown + coaching narrative + annotated transcript. |
| GET | `/mock-sessions/history` | candidate | List past sessions + score/weak-dimension trend data. |

## 9. Company prep content

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/prep-content` | candidate | List/search by company or role archetype. |
| GET | `/prep-content/:companyId/:roleArchetype` | candidate | Question bank + culture notes. |
| POST | `/prep-content/generate` | internal (triggered or scheduled) | Enqueues Prep Content Agent for a company/role pair not yet covered. |

## 10. Analytics

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/analytics/org` | hr, org-scoped | Query: `range`. Funnel, time-to-hire, score trends, bias trend, diversity metrics. |
| GET | `/analytics/org/report.pdf` | hr, org-scoped | Generates/downloads the weekly PDF report. |
| PATCH | `/analytics/org/digest-settings` | hr (admin role) | Enable/disable + configure email digest. |
## 11. AI service callback endpoints (internal)

Called only by `apps/ai-service`, authenticated via a service-to-service secret (not user JWT). Not exposed to the frontend.

| Method | Path | Description |
|---|---|---|
| PATCH | `/internal/applications/:applicationId/screening-result` | Screening Agent writes resume score + gap analysis. |
| PATCH | `/internal/applications/:applicationId/sourcing-result` | Sourcing Agent writes ranked pool reference. |
| POST | `/internal/interviews/:interviewId/schedule-slots` | Scheduler Agent writes 3 proposed slots. |
| PATCH | `/internal/interviews/:interviewId/complete` | Same as public complete endpoint, internal path. |
| PATCH | `/internal/evaluations/:applicationId` | Evaluator + Bias Audit Agent writes composite score + bias report. |
| PATCH | `/internal/evaluations/:applicationId/decision` | Decision Agent writes decision + drafted email (send behavior gated by `auto_offer`, see `architecture.md` Section 11). |
| POST | `/internal/analytics/:orgId/weekly-report` | Analytics Agent writes generated report data. |
| PATCH | `/internal/mock-sessions/:sessionId/complete` | Mock Interview Agent writes score + feedback. |
| POST | `/internal/prep-content` | Prep Content Agent writes generated content. |
| POST | `/internal/agent-logs` | Any agent writes a structured log entry (used for the live activity feed). |

## 12. Error codes (common)

| Code | Meaning |
|---|---|
| `AUTH_INVALID_CREDENTIALS` | Login failed |
| `AUTH_TOKEN_EXPIRED` | Access token expired, refresh required |
| `ORG_SCOPE_VIOLATION` | Request touches a resource outside the caller's org |
| `VALIDATION_ERROR` | Request body failed schema validation |
| `RESUME_PARSE_FAILED` | Resume parsing failed after fallback |
| `INTERVIEW_CONSENT_REQUIRED` | Attempted to start video before consent recorded |
| `QUEUE_JOB_FAILED` | Agent job failed after max retries |
| `RATE_LIMITED` | Org exceeded free-tier AI usage throttle |

## 14. Rate limiting & usage throttling

- Applies per-org on AI-triggering endpoints (`ai-assist`, applications creation, interview session tokens) to protect shared free-tier Gemini/Groq quota across the platform.
- Candidate-facing mock session creation is throttled per-candidate (not per-org) to prevent abuse of the free practice feature.
- Limits configurable centrally, not hardcoded — read from a config table so they can change without a redeploy.
