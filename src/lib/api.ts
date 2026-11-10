import type { SurveyAnswers } from "@shared/trip";
import { IS_PREVIEW } from "./env";

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

const OFFLINE = "We could not reach the server, so your response has not been saved yet. Your answers are still here – please check your connection and try again.";

/**
 * Sends the survey to the server. Reports success only when the server confirms the response
 * was written to the database. Safe to retry: the submission id makes a repeat a no-op.
 */
export async function submitSurvey(payload: SubmitPayload): Promise<SubmitResult> {
  if (IS_PREVIEW) {
    await new Promise((r) => setTimeout(r, 900));
    return { success: true, message: "Preview only – response not saved", responseId: payload.submission_id };
  }
  let res: Response;
  try {
    res = await fetch("/api/survey/submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  } catch {
    return { success: false, message: OFFLINE };
  }
  const json = (await res.json().catch(() => null)) as (SubmitResult & { errors?: string[] }) | null;
  if (res.ok && json?.success === true && json.responseId) return json;
  if (res.status === 429) return { success: false, message: json?.message ?? "Too many submissions. Please try again later." };
  if (res.status === 400 && json?.errors?.length) return { success: false, message: `We could not save your response: ${json.errors[0]}.` };
  return { success: false, message: json?.message ?? "We could not save your response. Please try again in a moment." };
}
