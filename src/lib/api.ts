import type { SurveyAnswers } from "@shared/trip";

export interface SubmitPayload extends SurveyAnswers {
  submission_id: string;
  /** Honeypot field: must be empty. */
  website: string;
  started_at: number;
}

export interface SubmitResult {
  success: boolean;
  message: string;
  responseId?: string;
}

/**
 * PHASE 1 (UI preview): submission is simulated in the browser and nothing is stored.
 * Phase 2 replaces the body of this function with a POST to /api/survey/submit and only
 * reports success after the database write is confirmed.
 */
export async function submitSurvey(payload: SubmitPayload): Promise<SubmitResult> {
  await new Promise((r) => setTimeout(r, 900));
  return { success: true, message: "Preview only – response not saved", responseId: payload.submission_id };
}
