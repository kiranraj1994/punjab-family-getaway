import type { SurveyAnswers } from "@shared/trip";

/** Survey progress is kept on the respondent's own device so a refresh never loses answers. */
const KEY = "pfg2026:draft:v1";

export interface Draft {
  data: SurveyAnswers;
  index: number;
  submissionId: string;
  startedAt: number;
}

export function newSubmissionId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export function loadDraft(): Draft | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as Draft;
    return d && typeof d === "object" && d.data && typeof d.submissionId === "string" ? d : null;
  } catch {
    return null;
  }
}

export function saveDraft(draft: Draft): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(draft));
  } catch {
    /* storage unavailable: the survey still works for this visit */
  }
}

export function clearDraft(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
