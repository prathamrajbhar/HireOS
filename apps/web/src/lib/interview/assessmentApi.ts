import { apiClient } from '@/lib/apiClient';

/** Reports a proctoring disqualification so the backend rejects the application at the assessment stage. */
export async function disqualifyAssessment(applicationId: string): Promise<void> {
  try {
    await apiClient.post(`/applications/${applicationId}/assessment/disqualify`, {});
  } catch (err) {
    console.error('Failed to record assessment disqualification:', err);
  }
}
