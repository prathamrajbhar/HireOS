# HireOS — Architecture

## 1. System overview

HireOS is split into four independent layers so the AI workload (slow, expensive, long-running) never blocks the user-facing API (fast, request/response). A queue sits between them.

```
┌─────────────────────────────┐
│  Next.js Frontend            │
│  HR Portal + Candidate Portal│
└──────────────┬───────────────┘
               │ REST (JWT auth)
               ▼
┌─────────────────────────────┐
│  Express.js API              │
│  auth, CRUD, org isolation   │
└──────┬───────────────┬───────┘
       │ sync reads/writes      │ enqueue long-running jobs
       ▼                        ▼
┌─────────────┐        ┌─────────────────────┐
│ PostgreSQL   │        │ BullMQ + Redis        │
│ (Prisma)     │        │ job queue              │
└──────┬───────┘        └──────────┬────────────┘
       ▲                            │ pulls jobs
       │ writes results back        ▼
       │ via Express API   ┌─────────────────────────┐
       └───────────────────┤ Python AI Service          │
                            │ FastAPI + LangGraph        │
                            │ 8 agents + mock/prep agents│
                            └──────────┬──────────────────┘
                                       │ calls out to
                     ┌─────────────────┼───────────────────┐
                     ▼                 ▼                   ▼
              Gemini API        Groq API (Whisper STT)   pgvector
              (reasoning,       + Piper/Coqui TTS         (vectors,
              scoring)          (voice)                   in Postgres)
```

Client-side, in the candidate's browser during interviews: **MediaPipe** runs face/multi-person/engagement detection directly on the webcam feed — this data never needs a round trip to a server to be computed, only the resulting flags are sent up.

## 2. Why this split

- **Express never runs AI logic directly.** It only accepts requests, checks auth/org scope, reads/writes Postgres, and either responds immediately (CRUD) or enqueues a job (anything AI-related) and returns a "processing" response.
- **Python owns all agent orchestration.** LangGraph coordinates the 8-stage pipeline plus the mock-interview and prep-content flows. This keeps the AI logic in one place, in the language with the best AI tooling, decoupled from the web-facing API.
- **Postgres is the single source of truth.** The Python service does not write to the database directly with its own ORM. It calls back into the Express API to persist results through Prisma. This avoids two services independently mutating the same tables and drifting out of sync.
- **Redis/BullMQ decouples timing.** Resume screening, interviews, and evaluation can take seconds to minutes. Candidates and HR get an immediate response from Express while the real work happens asynchronously; the frontend polls or subscribes for status updates.

## 3. Request flow examples

### Candidate applies to a job
1. Frontend → Express: `POST /applications` (candidate + job id)
2. Express writes `Application` row (status: `applied`), enqueues a "screen candidate" job in BullMQ
3. Python service picks up the job, runs Screening Agent (resume parse → embed → compare to rubric via pgvector → score)
4. Python calls back to Express `PATCH /applications/:id` with score + reasoning
5. Express writes result via Prisma, updates `Evaluation` row
6. If above threshold, Express enqueues the next stage (Scheduler Agent) automatically

### Live interview
1. Candidate opens interview link → Next.js page establishes WebRTC session
2. Audio streams to Groq API (Whisper-large-v3) for STT and Piper/Coqui for TTS, driving real-time conversation
3. MediaPipe runs client-side on the video track, producing periodic proctor/engagement flags
4. On interview completion, transcript + audio file + CV flags are sent to Express, stored (audio/transcript in S3/MinIO, structured flags in Postgres)
5. Express enqueues the Evaluator + Bias Audit Agent job

### HR views dashboard
1. Frontend → Express: `GET /jobs/:id/pipeline` (JWT identifies HR user + org)
2. Express enforces org_id match before returning any data — hard boundary for multi-tenant isolation
3. Response includes kanban-stage counts, shortlist, and live `AgentLog` entries for the "what's happening now" view

## 4. Data isolation (multi-tenancy)

- Every HR-facing query in Express is scoped by `org_id`, derived from the JWT, never from a client-supplied parameter
- `CandidateProfile` and `Application` are platform-wide, not org-scoped — a candidate's profile is shared across every company, but each `Application` row only exposes that candidate's data to the specific org they applied to
- Postgres row-level constraints plus Express-level query scoping give two layers of protection against cross-org data leaks

## 5. Auth flow

- Signup/login → Express verifies credentials with bcrypt → issues a short-lived JWT access token + longer-lived refresh token
- JWT payload: `user_id`, `role` (hr | candidate), `org_id` (null for candidates)
- Frontend stores tokens in httpOnly cookies
- Express middleware verifies the JWT on every protected route and rejects requests where `org_id` doesn't match the requested resource
- Refresh token rotation on expiry, standard revoke-on-logout

## 6. Async pipeline (BullMQ)

Each pipeline stage is its own queue/job type so failures are isolated and retryable independently:

```
sourcing-queue → screening-queue → scheduling-queue →
interview-queue → evaluation-queue → decision-queue → analytics-queue
```

- Each queue has retry with backoff for transient failures (e.g. LLM API timeout)
- Failed jobs after max retries are logged to `AgentLog` with status `failed` and surfaced on the HR dashboard rather than silently dropped
- Mock interviews and prep content generation run on a separate low-priority queue so they never compete with real candidate pipelines for throughput

## 7. Computer vision data flow

- Detection models (face, multi-person) run **entirely client-side** via MediaPipe in the browser — raw video never leaves the candidate's device unless they've explicitly consented to recording for playback
- Only derived flags (`no_face_detected`, `multiple_faces_detected`, engagement score per time window) are sent to the backend
- Consent is captured and stored as `video_consent` on the `Interview` record before any CV processing begins; if declined, the interview proceeds audio-only and CV fields stay null
- CV-derived signals are written to `Interview.proctor_flags` and `Interview.engagement_signal` but are explicitly excluded from any query the Decision Agent uses to compute thresholds — enforced at the Python service level by keeping decision-scoring functions and CV-signal functions in separate modules with no shared input path

## 8. Storage layout

- **Postgres:** structured data — users, orgs, jobs, applications, evaluations, agent logs, mock sessions, prep content
- **S3 / MinIO:** unstructured/large files — resumes, interview audio recordings; URLs referenced from Postgres rows, encrypted at rest
- **pgvector (in Postgres):** resume and job-rubric embeddings for semantic matching, keyed by candidate/job id for lookup

## 9. Deployment topology

| Component | Host |
|---|---|
| Next.js frontend | Vercel |
| Express API | Railway / Render / VPS |
| Python AI service | Railway / Render / VPS (separate service from Express) |
| Redis | Railway / Render / VPS or managed Redis add-on |
| PostgreSQL | Managed Postgres (e.g. Neon) or self-hosted on VPS |
| MinIO (if self-hosted storage) | Same VPS or separate storage node |

Express and the Python service are deployed independently so the AI service can be scaled (more workers, GPU if ever needed for local models) without redeploying the web-facing API, and vice versa.

## 10. Failure handling

- Resume parsing failure → fallback to raw text extraction; if that also fails, application flagged for manual upload
- Voice interview latency spike → automatic fallback to text-based interview mode mid-session
- LLM decision uncertainty → confidence threshold gate routes to "Hold for review" instead of forcing a hire/reject
- Queue job failure after retries → logged to `AgentLog`, visible on HR dashboard, does not silently disappear
