# NextRound — Technical Architecture

NextRound (HireOS) uses a decoupled, 4-tier microservices architecture designed to isolate long-running, resource-intensive AI agent workloads from fast, user-facing web API endpoints.

---

## 1. High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│  Next.js 16.2.11 App Router Frontend                    │
│  Public Portal · Candidate Portal · HR Portal Console   │
└────────────────────────────┬────────────────────────────┘
                             │ HTTPS / REST (JWT Auth)
                             ▼
┌─────────────────────────────────────────────────────────┐
│  Express.js 5.2.1 Core REST API Engine (`apps/api`)     │
│  Auth · Org Isolation · CRUD · BullMQ Job Enqueuer      │
└──────────────┬───────────────────────────┬──────────────┘
               │ Prisma 7.9 ORM            │ Enqueue Job
               ▼                           ▼
┌────────────────────────────┐    ┌───────────────────────┐
│ PostgreSQL 16 + pgvector   │    │ BullMQ 5.80 + Redis 8 │
│ (Single Source of Truth)   │    │ Async Job Queue       │
└──────────────▲─────────────┘    └───────────┬───────────┘
               │ Internal Callbacks           │ Pulls Jobs
               │ (`/api/v1/internal/*`)       ▼
               └──────────────────┬───────────────────────┐
                                  │ Python 3.13 AI Engine │
                                  │ FastAPI 0.139         │
                                  │ LangGraph 8 Agents    │
                                  └───────────┬───────────┘
                                              │ External APIs
                       ┌──────────────────────┼──────────────────────┐
                       ▼                      ▼                      ▼
               Gemini API v2.10        Groq Whisper STT        pgvector Cosine
               (Reasoning/Scoring)     + Piper/Coqui TTS       Vector Search
```

---

## 2. Tier Responsibilities & Service Split

1. **Next.js 16.2.11 Frontend (`apps/web`)**: Implements client-side rendering and SSR, WebRTC voice connections, interactive coding sandboxes, aptitude assessment consoles, and real-time proctoring HUD telemetry via MediaPipe.
2. **Express.js 5.2.1 Core API (`apps/api`)**: Handles all synchronous request/response cycles, JWT authentication, server-side RBAC enforcement, Prisma 7.9 database operations, and enqueuing long-running tasks into BullMQ. Express **never** executes LLM calls directly.
3. **BullMQ 5.80 + Redis 8 Queue**: Decouples API responsiveness from AI processing latency. Manages 8 distinct queue channels with exponential backoff retries.
4. **Python 3.13 AI Service (`apps/ai-service`)**: Executes LangGraph agent state graphs, Gemini 2.10 reasoning, resume embedding generation, code execution analysis, and bias audit calculations. All DB persistence is performed by calling back into Express via secured internal webhooks (`/api/v1/internal/*`).

---

## 3. End-to-End Execution Workflows

### Workflow 1: Application Submission & RAG Resume Screening
```
Candidate -> Next.js: POST /api/v1/applications { jobId }
Next.js -> Express: Creates Application (status: "applied")
Express -> BullMQ: Enqueues job to "screening-queue"
BullMQ -> Python AI: Worker picks up screening job
Python AI: Parses resume -> generates vector via pgvector -> evaluates against Job Rubric
Python AI -> Express: PATCH /api/v1/internal/applications/:id/screening-result
Express -> Prisma: Updates Application status -> "screening_completed" -> creates Evaluation row
```

### Workflow 2: WebRTC Voice Interview & Real-Time Proctoring (Dynamic Conversational Loop)
```
Candidate -> Next.js: Opens /interview/:interviewId
Next.js: Captures mic/webcam stream with consent -> initializes MediaPipe client-side CV
Candidate Spoken Audio -> WebRTC -> Groq Whisper-large-v3: Real-time STT transcript stream
LangGraph Agent (Dynamic Conversational Loop):
  1. Analyzes live transcript buffer against Candidate Resume & Job Rubric
  2. Evaluates answer completeness, technical depth, and vague/evasive claims
  3. Generates unscripted, organic follow-up question or organic stage transition via Gemini 2.10
Gemini Text -> Piper/Coqui TTS -> WebRTC Audio Stream -> Candidate Earphones (<1.0s turn latency)
MediaPipe (Browser): Computes gaze/face flags -> sends periodic telemetry JSON to Express
Interview End -> Express: Enqueues "evaluation-queue" job in BullMQ
```

### Workflow 3: Coding Sandbox & Aptitude Assessment
```
Candidate -> Next.js: Enters /candidate/applications/:id/take-home or /assessment
Candidate -> Monaco/Code Editor: Submits code solution in TS/Python/JS
Next.js -> Express: POST /api/v1/applications/:id/take-home
Express -> BullMQ: Enqueues job to "coding-queue"
Python AI Worker: Executes code against test suite inside isolated sandbox -> measures runtime/complexity
Python AI -> Express: PATCH /api/v1/internal/applications/:id/coding-result
```

### Workflow 4: Bias Auditing, Decision & Automated Offer Extension
```
BullMQ -> Python AI Worker: Picks up "evaluation-queue" job
Python AI: Aggregates Resume Score + Interview Score + Coding/Aptitude Score
Python AI: Runs LLM-as-judge Bias Audit pass (checks demographic code correlations)
Python AI -> Express: PATCH /api/v1/internal/evaluations/:id
Express: Checks Job.thresholds & Job.auto_offer toggle
If Auto-Offer Enabled & Score > Threshold:
  Express -> Nodemailer: Drafts & emails digital Offer Letter with signature magic link
  Express -> Prisma: Application status updated to "offered"
```

---

## 4. Security, Multi-Tenancy & RBAC Isolation

- **Server-Derived `org_id`**: Every HR query in Express extracts `org_id` directly from the validated JWT token payload. Request bodies or route params supplying `org_id` are ignored to prevent parameter tampering attacks.
- **Candidate Data Ownership**: `CandidateProfile` records are platform-wide and candidate-owned. Applying to a job creates a discrete `Application` record granting the specific Organization scoped access to that application's evaluations.
- **Internal Callback Authentication**: Endpoints under `/api/v1/internal/*` reject requests lacking a valid `X-Internal-Service-Secret` header shared between Express and Python services.

---

## 5. Async Queue Architecture (BullMQ Channels)

| Queue Name | Responsibilities | Priority Level |
|---|---|---|
| `sourcing-queue` | Automated LinkedIn/GitHub talent search & deduplication | Low |
| `screening-queue` | Resume PDF parsing, pgvector embedding generation, scoring | High |
| `scheduling-queue` | Slot generation, email outreach, calendar auto-booking | Medium |
| `assessment-queue` | Aptitude test evaluation & category score computation | High |
| `coding-queue` | Code execution sandbox, unit test execution, complexity analysis | High |
| `interview-queue` | Post-interview transcript assembly & audio storage processing | High |
| `evaluation-queue` | Composite scoring, bias audit anomaly report generation | Critical |
| `decision-queue` | Threshold matching, auto-offer letter drafting, email delivery | Critical |
| `analytics-queue` | Weekly HR funnel metric aggregation & PDF generation | Low |
| `mock-queue` | Practice interview feedback processing | Low |

---

## 6. Computer Vision & Proctoring Data Isolation

- **Browser Execution**: MediaPipe models execute exclusively within the browser runtime using WebAssembly. Raw video frames never leave the client device.
- **Telemetry Payload**: Transmitted payload consists solely of structured numerical indicators (e.g., `{ face_count: 1, gaze_centered: true, engagement_index: 88 }`).
- **Scoring Isolation Boundary**: CV signals are persisted in `Interview.proctor_flags` for post-hoc HR review, but are **programmatically excluded** from Decision Agent scoring logic to enforce fairness regulations.

---

## 7. Storage Topology

- **PostgreSQL 16**: Relational data, user accounts, application state, structured rubrics, and evaluation logs.
- **pgvector Extension**: Cosine similarity vector search on 768-dimensional embeddings for candidate resumes and job rubrics.
- **AWS S3 / MinIO**: Encrypted object storage for uploaded resume PDFs and recorded interview audio files.

---

## 8. Resilience & Failover Protocols

- **Voice Latency Fallback**: If STT/TTS round-trip latency exceeds 3.0 seconds, the frontend automatically transitions to chat-style text-only interview mode.
- **LLM Confidence Gate**: Evaluation decisions with a composite confidence score below 0.70 are automatically tagged as `hold_for_review` for HR manual approval.
- **Queue Retry Backoff**: Failed job attempts trigger exponential backoff retries (3 attempts max) before logging an alert to `AgentLog`.
