# HireOS — Product Requirements Document

AI-native recruitment marketplace. Companies post jobs on the platform. Candidates create one profile and apply across any company on the platform. AI agents run the entire hiring pipeline — sourcing, screening, interviewing, evaluating, deciding, offering — with zero human steps required. HR only ever sees the final shortlist and decision.

## 1. Problem

- Recruiters spend most of their time on repetitive tasks: screening resumes, scheduling calls, chasing follow-ups
- Average time-to-hire is far too long (30+ days industry norm)
- Human bias affects hiring decisions — gender, age, name, school
- Small companies can't afford a recruiting team or expensive ATS tools
- Candidates wait weeks for a response and get no feedback
- Candidates have no easy way to practice before a real interview

## 2. Solution

HireOS is a two-sided marketplace:

- **Companies** post jobs, configure thresholds, and receive a pre-vetted shortlist — no manual screening or interviewing needed.
- **Candidates** create one profile, browse jobs across every company on the platform, apply, and go through a fully automated pipeline: sourcing/screening → AI voice interview → evaluation + bias audit → decision → offer or rejection email.

Candidates also get self-serve prep tools: mock interviews and company-specific prep content, built on the same AI agents used in real interviews.

Core idea: replace recruiter judgment with structured AI judgment and bias auditing, so decisions are faster and more explainable than human ones — for every company on the platform.

## 3. Goals

| Goal | Target |
|------|--------|
| Zero human steps in hiring pipeline | Application → offer, no manual action required |
| Fast hiring | < 72 hrs from application to decision |
| Bias transparency | Every decision has a bias audit report |
| Marketplace liquidity | One candidate profile works across every company on the platform |
| Candidate readiness | Candidates can self-practice via mock interviews before real ones |
| Data isolation | Strict multi-tenant, org-level security |

## 4. Users

### HR Manager / Company Admin (primary)
- Signs up their organization, posts jobs
- Configures scoring thresholds, auto-offer toggle
- Watches live pipeline dashboard, sees shortlisted candidates only
- Reviews score, bias audit report, transcript/replay per candidate
- Never manually screens or interviews

### Candidate (primary)
- Creates one platform-wide profile (resume, skills, target roles)
- Browses and applies to jobs across all companies on the platform
- Goes through an AI voice interview per application
- Receives an offer or rejection email automatically, with reasoning
- Uses Mock Interview Agent and Company Prep content, independent of any live application
- Tracks own score history and progress over time

## 5. Why this is different

| Normal ATS / recruiter workflow | HireOS |
|---|---|
| Recruiter screens resumes manually | AI agent screens, scores, and explains every result |
| Human schedules interview calls | Agent auto-books based on platform availability settings, no back-and-forth |
| Human conducts interview | AI voice agent interviews live, adapts follow-up questions |
| Human decides hire/reject | Agent decides with bias audit and full reasoning log |
| Manual offer letter | Agent drafts and sends automatically |
| Candidate applies cold, once, to one company | Candidate has one reusable profile, applies anywhere, can practice first |

## 6. Tech stack (latest versions)

**Frontend:** Next.js 16.2 (App Router), TypeScript 6.0, React 19.2, Tailwind CSS v4.3, Lucide React 1.23 (icons), WebRTC (interview audio/video)

**Backend (REST API):** Express.js 5.2, TypeScript 6.0, Zod 4.4 (validation), Prisma ORM 7.8, PostgreSQL 16 + pgvector — handles auth, CRUD (jobs, applications, candidates, orgs), routes long-running work to the AI service

**Auth:** Custom JWT (Express + bcryptjs for password hashing + jsonwebtoken for tokens). Roles: hr, candidate. HR access is org-scoped.

**Database:** PostgreSQL 16 + Prisma ORM 7.8 — single source of truth, written to only through the Express API

**AI / Agents:** Python 3.13 + FastAPI 0.139 + Uvicorn 0.50 (ASGI server), Gemini API via `google-genai` SDK v2.10 (reasoning, scoring, generation), Groq API v1.5 via `groq` SDK — Whisper-large-v3 (STT) + Piper/Coqui TTS (voice), Geminitext-embedding-004 or sentence-transformers (resume vectors), MediaPipe (computer vision — face detection, multi-person detection, engagement signal — runs client-side)

**Queue:** BullMQ 5.26 + Redis 8 — async processing for long-running agent tasks so the API never blocks

**Vector DB:** pgvector (PostgreSQL 16 extension)

**Email:** Nodemailer 8 (SMTP)

**Storage:** S3 or self-hosted MinIO — resumes and audio recordings, encrypted at rest

**Infra:** Turborepo 2.10 monorepo, Vercel (frontend), Railway/Render/VPS (Express + Python + Redis)

## 7. Data model (core tables)

```
User: id, email, password_hash, role(hr|candidate), org_id(nullable), created_at

Organization: id, name, created_at

Job: id, org_id, title, description, rubric(json), thresholds(json), status

CandidateProfile: id, user_id, resume_url, linkedin_url, github_url, skills(json), target_roles(json), expected_salary, notice_period, work_authorization, proud_project, work_values(json), created_at

Application: id, candidate_id, job_id, status, applied_at

Evaluation: id, application_id, stage, resume_score, interview_score,
            composite_score, bias_flag, bias_report(json), decision, reasoning

Interview: id, application_id, scheduled_at, transcript(json), audio_url,
           proctor_flags(json), engagement_signal(json), video_consent(bool), status

AgentLog: id, job_id, agent_name, action, input(json), output(json), status

MockSession: id, candidate_id, target_company, target_role, rubric(json),
             transcript(json), score, feedback(json), created_at

PrepContent: id, company_name, role_archetype, questions(json), culture_notes,
             source(generated|curated), updated_at
```

## 8. Pricing / monetization

Free to use for both HR and candidates at launch. No subscription or billing system built in this phase.

Future monetization paths to evaluate later: per-job-post fee, per-successful-hire fee, or premium candidate features. Not part of current scope.

## 9. Non-functional requirements

| Requirement | Target |
|---|---|
| Interview AI response delay | < 1 sec |
| Resume processing time | < 30 sec |
| Email delivery time | < 2 min from trigger |
| Uptime | 99.5% |
| Data isolation | Strict org-level access control enforced in the Express API and DB queries |
| Candidate data deletion | On request (GDPR-style) |
| Resume/audio storage | Encrypted at rest |
| CV/engagement data | Opt-in consent required; never used alone in Decision Agent logic |

## 10. Build timeline (5 months)

**Month 1 — Foundation**
Postgres schema + Prisma, custom JWT auth (multi-role), multi-tenant org model, job creation UI, JD Parser Agent, HR dashboard shell

**Month 2 — Core agents + candidate foundation**
Sourcing Agent, resume upload + Screening Agent (RAG pipeline via pgvector), candidate profile creation, public job listing page, Application entity linking candidates to jobs across orgs

**Month 3 — Interview system + computer vision**
Scheduler Agent (platform availability + email), candidate-facing interview page, Interviewer Agent (Groq Whisper STT + Piper/Coqui TTS + WebRTC), MediaPipe integration (face/multi-person detection, engagement signal), transcript and audio storage/playback, consent flow

**Month 4 — Intelligence layer + candidate prep**
Evaluator Agent (rubric scoring), bias audit module, Decision Agent (auto offer/reject + email via Nodemailer), full LangGraph pipeline orchestration, live agent activity log UI, Mock Interview Agent, Company Prep content generation

**Month 5 — Polish and ship**
Analytics Agent + reporting dashboard, PDF export (reports and offer letters), candidate progress tracking UI, error handling/retry logic, deployment, docs, demo video

## 11. Risks and mitigation

| Risk | Mitigation |
|---|---|
| LinkedIn scraping against TOS | Use a proxy API (RapidAPI) or a demo dataset for presentation |
| Voice interview latency spikes | Fallback to text-only interview mode |
| LLM makes a wrong hiring decision | Confidence threshold gate, structured JSON output, no free-text decisions |
| Resume parsing fails on a bad format | Fallback to raw text extraction, manual upload option |
| CV-based engagement scoring is legally and scientifically contested | Treat as a soft signal only, feed into Analytics only — never into Decision Agent scoring; require explicit consent and opt-out |
| False positives in face/multi-person detection (lighting, glasses) | Flag for HR visibility only, never auto-reject on proctor flags alone |
| Two-sided marketplace cold start (no jobs, no candidates) | Seed with demo companies and a sample dataset before public launch |

## 12. Out of scope (v1)

Mobile app, background verification, ATS import/export, full video interview review (audio + lightweight CV signal only), multi-language support, on-premise deployment, subscription billing

## 13. Success criteria

Project passes when:
- All agents run end-to-end on a test job post with zero manual steps, across at least two different companies
- Candidates can browse and apply to jobs from multiple companies using one profile
- AI voice interview completes with a real transcript and audio saved, plus CV proctor/engagement signals captured with consent
- Bias audit report generates for every evaluation
- Org A data is fully invisible to Org B (tested)
- A candidate can run a mock interview session independent of any live job application and see feedback
- Live demo: candidate applies → offer email sent, no human touch, on at least one company's job

## 14. References

- LangGraph: https://langchain-ai.github.io/langgraphjs
- Gemini API: https://ai.google.dev/gemini-api/docs
- Groq API: https://console.groq.com/docs
- MediaPipe: https://developers.google.com/mediapipe
- Prisma: https://www.prisma.io/docs
