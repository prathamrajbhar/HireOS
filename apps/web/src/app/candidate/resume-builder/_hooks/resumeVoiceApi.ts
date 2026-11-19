import { apiClient } from '@/lib/apiClient';
import { siteConfig } from '@/lib/config';

export interface ConversationTurn {
  role: 'ai' | 'candidate';
  content: string;
  timestamp: string;
}

export interface ResumeAiTurnRequest {
  sessionId: string;
  transcript: string;
  targetRole: string;
  targetCompany: string;
  experienceLevel?: string | null;
  stage: string;
  turnNumber: number;
  conversationHistory: { speaker: string; text: string }[];
  memory: Record<string, unknown>;
  existingResume?: string | null;
  careerGoals?: string | null;
  profileType?: string | null;
}

export interface ResumeAiTurnResponse {
  text: string;
  stage: string;
  turnNumber: number;
  isComplete: boolean;
  realtimeInsight?: string;
  memory?: Record<string, unknown>;
  audioUrl?: string | null;
  audioAvailable?: boolean;
}

export async function createResumeSession(
  targetRole: string,
  experienceLevel: string
): Promise<string> {
  const res = await apiClient.post<{ sessionId: string }>('/resume-builder/sessions', {
    targetRole,
    experienceLevel,
  });
  if (!res?.sessionId) {
    throw new Error('Failed to obtain session ID from backend.');
  }
  return res.sessionId;
}

export async function finalizeResumeSession(
  activeSessionId: string,
  finalHistory: ConversationTurn[],
  extras?: {
    memory?: Record<string, unknown>;
    profileType?: string | null;
    existingResume?: string | null;
    careerGoals?: string | null;
  }
): Promise<void> {
  try {
    await apiClient.post(`/resume-builder/${activeSessionId}/end`, {
      transcript: finalHistory.map((h) => ({
        speaker: h.role,
        text: h.content,
      })),
      memory: extras?.memory ?? null,
      profileType: extras?.profileType ?? null,
      existingResume: extras?.existingResume ?? null,
      careerGoals: extras?.careerGoals ?? null,
    });
  } catch {
    // Non-blocking end
  }
}

export async function fetchResumeAiTurn(
  payload: ResumeAiTurnRequest,
  signal?: AbortSignal
): Promise<ResumeAiTurnResponse> {
  let res: Response;
  try {
    res = await fetch(`${siteConfig.aiServiceUrl}/api/v1/ai/resume-builder/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal,
    });
  } catch (fetchErr: unknown) {
    if (fetchErr instanceof Error && fetchErr.name === 'AbortError') {
      throw fetchErr;
    }
    throw new Error(
      'Unable to connect to AI voice service. Please check that the AI service is running and try again.'
    );
  }

  if (!res.ok) {
    let errorDetail = '';
    try {
      const errJson = await res.json();
      errorDetail = errJson?.detail || errJson?.message || '';
    } catch {}

    throw new Error(
      errorDetail ||
      `AI Service responded with status ${res.status}${res.statusText ? ` (${res.statusText})` : ''}. Please retry.`
    );
  }

  return (await res.json()) as ResumeAiTurnResponse;
}
