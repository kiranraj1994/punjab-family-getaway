/**
 * DESIGN PREVIEW ONLY (vite --mode preview). An in-browser stand-in for the backend that serves
 * the invented rows in demo.ts. The production build never imports this file, so demo rows
 * cannot appear next to real submissions.
 */
import { computeAnalytics } from "@shared/analytics";
import { toCsv } from "@shared/csv";
import { factsFor } from "@shared/facts";
import type { AdminApi } from "./api";
import { DEMO_RESPONSES } from "./demo";

let rows = [...DEMO_RESPONSES];
const wait = (ms = 250) => new Promise((r) => setTimeout(r, ms));

export const demoApi: AdminApi = {
  demo: true,
  session: async () => ({ authenticated: false, configured: true }),
  login: async () => ({ ok: true }),
  logout: async () => undefined,
  async load() {
    await wait();
    return { responses: rows, analytics: computeAnalytics(rows) };
  },
  async update(r) {
    rows = rows.map((x) => (x.submission_id === r.submission_id ? { ...r, updated_at: new Date().toISOString() } : x));
  },
  async remove(id) {
    rows = rows.filter((x) => x.submission_id !== id);
  },
  exportCsv: async (ids) => toCsv(ids?.length ? rows.filter((r) => ids.includes(r.submission_id)) : rows),
  settings: async () => ({ ai: { provider: "none", configured: false, model: "", note: "No AI provider is configured." }, audit: [] }),
  async ask(question) {
    await wait(700);
    const analytics = computeAnalytics(rows);
    return { mode: "analytics", facts: factsFor(question, analytics), answer: null, provider: "none", totalResponses: analytics.total, notice: "Design preview: no AI model is connected, so only calculated figures are shown." };
  },
};
