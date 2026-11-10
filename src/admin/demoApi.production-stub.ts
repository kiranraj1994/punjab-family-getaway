/**
 * Replaces demoApi.ts in every build except `vite build --mode preview` (see the
 * "@demo-api" alias in vite.config.ts). This keeps the invented demo rows (demo.ts) out of
 * the production module graph entirely, rather than relying on dead-code elimination of an
 * unreachable dynamic import — Rollup still emits a chunk for a conditionally-dynamic-imported
 * module even when the guarding condition is always false at runtime, so without this stub the
 * real demoApi.ts (and its demo names) would still end up as a fetchable file next to the app.
 */
import type { AdminApi } from "./api";

export const demoApi: AdminApi = {
  demo: true,
  session: async () => ({ authenticated: false, configured: true }),
  login: async () => ({ ok: false, message: "Demo mode is not available in this build." }),
  logout: async () => undefined,
  load: async () => {
    throw new Error("Demo mode is not available in this build.");
  },
  update: async () => undefined,
  remove: async () => undefined,
  exportCsv: async () => undefined,
  settings: async () => ({ ai: { provider: "none", configured: false, model: "", note: "" }, audit: [] }),
  ask: async () => ({ mode: "analytics", facts: [], answer: null, provider: "none", totalResponses: 0 }),
};
