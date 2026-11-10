import type { Analytics } from "@shared/analytics";
import type { SurveyResponse } from "@shared/trip";

export interface AssistantReply {
  mode: "ai" | "analytics";
  facts: string[];
  answer: string | null;
  notice?: string;
  provider: string;
  model?: string;
  totalResponses: number;
}
export interface AiStatus { provider: string; configured: boolean; model: string; note: string }
export interface AuditEntry { action: string; submission_id: string; changed_fields: string[]; created_at: string }
export interface AdminSettings { ai: AiStatus; audit: AuditEntry[] }
export interface AdminData { responses: SurveyResponse[]; analytics: Analytics }

/** Everything the dashboard needs from a backend. The live app and the design preview each provide one. */
export interface AdminApi {
  demo: boolean;
  session(): Promise<{ authenticated: boolean; configured: boolean }>;
  login(password: string): Promise<{ ok: boolean; message?: string }>;
  logout(): Promise<void>;
  load(): Promise<AdminData>;
  update(response: SurveyResponse): Promise<void>;
  remove(submissionId: string): Promise<void>;
  /** Live app: downloads a .csv file. Preview: returns the CSV text to display. */
  exportCsv(ids?: string[]): Promise<string | void>;
  settings(): Promise<AdminSettings>;
  ask(question: string, earlierQuestions: string[]): Promise<AssistantReply>;
}

export class AuthError extends Error {}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, { credentials: "same-origin", ...init, headers: init?.body ? { "Content-Type": "application/json" } : undefined });
  } catch {
    throw new Error("Could not reach the server. Check your connection and try again.");
  }
  if (res.status === 401) throw new AuthError("Your session has ended. Please sign in again.");
  const json = (await res.json().catch(() => null)) as (T & { message?: string; errors?: string[] }) | null;
  if (!res.ok || !json) throw new Error(json?.errors?.[0] ?? json?.message ?? `Request failed (${res.status})`);
  return json;
}

export const liveApi: AdminApi = {
  demo: false,
  session: () => request("/api/admin/session"),
  async login(password) {
    try {
      await request("/api/admin/login", { method: "POST", body: JSON.stringify({ password }) });
      return { ok: true };
    } catch (e) {
      return { ok: false, message: e instanceof AuthError ? "Incorrect password." : (e as Error).message };
    }
  },
  async logout() {
    await request("/api/admin/logout", { method: "POST", body: "{}" }).catch(() => undefined);
  },
  load: () => request("/api/admin/responses"),
  async update(r) {
    await request(`/api/admin/responses/${encodeURIComponent(r.submission_id)}`, { method: "PUT", body: JSON.stringify(r) });
  },
  async remove(id) {
    await request(`/api/admin/responses/${encodeURIComponent(id)}`, { method: "DELETE" });
  },
  async exportCsv(ids) {
    const res = await fetch(`/api/admin/export.csv${ids?.length ? `?ids=${ids.map(encodeURIComponent).join(",")}` : ""}`, { credentials: "same-origin" });
    if (res.status === 401) throw new AuthError("Your session has ended. Please sign in again.");
    if (!res.ok) throw new Error("The export could not be created. Please try again.");
    const url = URL.createObjectURL(await res.blob());
    const name = /filename="([^"]+)"/.exec(res.headers.get("Content-Disposition") ?? "")?.[1] ?? "punjab-trip-responses.csv";
    const link = Object.assign(document.createElement("a"), { href: url, download: name });
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  },
  settings: () => request("/api/admin/settings"),
  ask: (question, earlierQuestions) =>
    request("/api/admin/assistant", { method: "POST", body: JSON.stringify({ question, history: earlierQuestions.map((content) => ({ role: "user", content })) }) }),
};
