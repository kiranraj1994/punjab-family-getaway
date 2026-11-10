import { Hono, type Context, type Next } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { computeAnalytics } from "../shared/analytics";
import { toCsv } from "../shared/csv";
import { factsFor } from "../shared/facts";
import { isValidSubmissionId, validateAnswers } from "../shared/validate";
import { AiError, aiStatus, buildContext, getProvider, restoreNames, systemPrompt, type AiEnv, type ChatTurn } from "./ai";
import { SESSION_COOKIE, SESSION_TTL_SECONDS, createSession, hmac, isConfigured, passwordMatches, verifySession } from "./auth";
import { deleteResponse, getResponse, insertResponse, listResponses, logExport, recentAudit, responseExists, updateResponse, withinLimit } from "./db";

export interface Env extends AiEnv {
  DB: D1Database;
  ASSETS?: Fetcher;
  ADMIN_PASSWORD?: string;
  SESSION_SECRET?: string;
}

type Ctx = Context<{ Bindings: Env }>;

const MAX_BODY_BYTES = 64 * 1024;
const MIN_FILL_MS = 4000;

const app = new Hono<{ Bindings: Env }>();

/* ───────────────────────────── helpers ───────────────────────────── */

const fail = (c: Ctx, status: 400 | 401 | 403 | 404 | 409 | 413 | 415 | 429 | 500 | 503, message: string, errors?: string[]) =>
  c.json({ success: false, message, ...(errors ? { errors } : {}) }, status);

/** Reads a JSON body with a hard size cap. Returns null for anything that is not a JSON object. */
async function readJson(c: Ctx): Promise<Record<string, unknown> | null | "too-large" | "not-json"> {
  if (!(c.req.header("content-type") ?? "").toLowerCase().includes("application/json")) return "not-json";
  const raw = await c.req.text();
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) return "too-large";
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** A salted hash of the caller's address, so rate limiting never stores an IP address. */
async function callerKey(c: Ctx, scope: string): Promise<string> {
  const ip = c.req.header("cf-connecting-ip") ?? c.req.header("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  const digest = await hmac(c.env.SESSION_SECRET || "rate-limit-fallback-salt", `${scope}:${ip}`);
  return `${scope}:${digest.slice(0, 32)}`;
}

/* ───────────────────────────── middleware ───────────────────────────── */

app.use("/api/*", async (c, next) => {
  await next();
  c.header("Cache-Control", "no-store");
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Robots-Tag", "noindex, nofollow");
});

/** Cross-site request protection for anything that changes data. */
app.use("/api/*", async (c, next) => {
  if (c.req.method !== "GET" && c.req.method !== "HEAD") {
    const origin = c.req.header("origin");
    if (origin && new URL(origin).host !== new URL(c.req.url).host) return fail(c, 403, "Cross-site requests are not allowed");
  }
  await next();
});

async function requireAdmin(c: Ctx, next: Next) {
  if (!isConfigured(c.env)) return fail(c, 503, "Administrator access is not configured on this deployment");
  if (!(await verifySession(c.env.SESSION_SECRET, getCookie(c, SESSION_COOKIE)))) return fail(c, 401, "Please sign in");
  await next();
}

app.onError((err, c) => {
  // Log the error type only: messages can contain respondent data.
  console.error("request failed", c.req.method, new URL(c.req.url).pathname, err.name);
  return fail(c, 500, "Something went wrong. Please try again.");
});

/* ───────────────────────────── public API ───────────────────────────── */

app.get("/api/health", (c) => c.json({ ok: true }));

app.post("/api/survey/submit", async (c) => {
  const body = await readJson(c);
  if (body === "not-json") return fail(c, 415, "Request must be JSON");
  if (body === "too-large") return fail(c, 413, "Your response is too large to save");
  if (!body) return fail(c, 400, "Invalid request");

  // Anti-spam: hidden field must be empty and the form must not be completed implausibly fast.
  if (typeof body.website === "string" && body.website.trim() !== "") return fail(c, 400, "Submission rejected");
  const started = Number(body.started_at);
  if (!Number.isFinite(started) || Date.now() - started < MIN_FILL_MS) return fail(c, 400, "Submission rejected. Please review your answers and submit again.");

  if (!isValidSubmissionId(body.submission_id)) return fail(c, 400, "Invalid submission id");
  if (!(await withinLimit(c.env.DB, await callerKey(c, "submit"), 40, 3600))) return fail(c, 429, "Too many submissions from this connection. Please try again in an hour.");

  const checked = validateAnswers(body);
  if (!checked.ok) return fail(c, 400, "Some answers could not be accepted", checked.errors);

  const inserted = await insertResponse(c.env.DB, body.submission_id, checked.data);
  if (!inserted) {
    // Same submission id sent again (double tap, retry after a dropped connection): the
    // response is already stored, so confirm it rather than creating a second record.
    if (await responseExists(c.env.DB, body.submission_id)) return c.json({ success: true, message: "Response already saved", responseId: body.submission_id, duplicate: true });
    return fail(c, 500, "We could not save your response. Please try again.");
  }
  return c.json({ success: true, message: "Response saved successfully", responseId: body.submission_id }, 201);
});

/* ───────────────────────────── admin: session ───────────────────────────── */

app.get("/api/admin/session", async (c) => {
  if (!isConfigured(c.env)) return c.json({ authenticated: false, configured: false });
  return c.json({ authenticated: await verifySession(c.env.SESSION_SECRET, getCookie(c, SESSION_COOKIE)), configured: true });
});

app.post("/api/admin/login", async (c) => {
  if (!isConfigured(c.env)) return fail(c, 503, "Administrator access is not configured on this deployment");
  if (!(await withinLimit(c.env.DB, await callerKey(c, "login"), 8, 900))) return fail(c, 429, "Too many sign-in attempts. Please wait 15 minutes.");
  const body = await readJson(c);
  const password = body && typeof body === "object" && typeof body.password === "string" ? body.password : "";
  if (!password || password.length > 200 || !(await passwordMatches(c.env.SESSION_SECRET, password, c.env.ADMIN_PASSWORD))) return fail(c, 401, "Incorrect password");
  setCookie(c, SESSION_COOKIE, await createSession(c.env.SESSION_SECRET), { httpOnly: true, secure: true, sameSite: "Strict", path: "/", maxAge: SESSION_TTL_SECONDS });
  return c.json({ success: true });
});

app.post("/api/admin/logout", (c) => {
  deleteCookie(c, SESSION_COOKIE, { path: "/", secure: true, httpOnly: true, sameSite: "Strict" });
  return c.json({ success: true });
});

/* ───────────────────────────── admin: data ───────────────────────────── */

app.use("/api/admin/responses/*", requireAdmin);
app.use("/api/admin/responses", requireAdmin);
app.use("/api/admin/export.csv", requireAdmin);
app.use("/api/admin/settings", requireAdmin);
app.use("/api/admin/assistant", requireAdmin);

app.get("/api/admin/responses", async (c) => {
  const responses = await listResponses(c.env.DB);
  return c.json({ responses, analytics: computeAnalytics(responses) });
});

app.put("/api/admin/responses/:id", async (c) => {
  const id = c.req.param("id");
  if (!isValidSubmissionId(id)) return fail(c, 400, "Invalid submission id");
  const body = await readJson(c);
  if (body === "not-json") return fail(c, 415, "Request must be JSON");
  if (body === "too-large") return fail(c, 413, "Request too large");
  if (!body) return fail(c, 400, "Invalid request");
  const before = await getResponse(c.env.DB, id);
  if (!before) return fail(c, 404, "Response not found");
  const checked = validateAnswers(body);
  if (!checked.ok) return fail(c, 400, "Some values could not be accepted", checked.errors);
  const changed = await updateResponse(c.env.DB, before, checked.data);
  return c.json({ success: true, changed });
});

app.delete("/api/admin/responses/:id", async (c) => {
  const id = c.req.param("id");
  if (!isValidSubmissionId(id)) return fail(c, 400, "Invalid submission id");
  return (await deleteResponse(c.env.DB, id)) ? c.json({ success: true }) : fail(c, 404, "Response not found");
});

app.get("/api/admin/export.csv", async (c) => {
  const wanted = (c.req.query("ids") ?? "").split(",").filter(isValidSubmissionId);
  const all = await listResponses(c.env.DB);
  const rows = wanted.length ? all.filter((r) => wanted.includes(r.submission_id)) : all;
  await logExport(c.env.DB, rows.length);
  return new Response(`﻿${toCsv(rows)}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="punjab-trip-responses-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
});

app.get("/api/admin/settings", async (c) => {
  const status = aiStatus(c.env);
  return c.json({ ai: status, audit: await recentAudit(c.env.DB) });
});

/* ───────────────────────────── admin: assistant ───────────────────────────── */

app.post("/api/admin/assistant", async (c) => {
  const body = await readJson(c);
  if (!body || typeof body !== "object") return fail(c, 400, "Invalid request");
  const question = typeof body.question === "string" ? body.question.trim().slice(0, 600) : "";
  if (!question) return fail(c, 400, "Please type a question");

  // 1. Query the database. 2. Compute counts and percentages in code.
  const rows = await listResponses(c.env.DB);
  const analytics = computeAnalytics(rows);
  const facts = factsFor(question, analytics);
  const status = aiStatus(c.env);
  const base = { success: true, facts, totalResponses: analytics.total, provider: status.provider };

  const provider = getProvider(c.env);
  if (!provider) return c.json({ ...base, mode: "analytics", answer: null, notice: `${status.note} Showing figures calculated directly from the survey responses.` });
  if (analytics.total === 0) return c.json({ ...base, mode: "analytics", answer: null, notice: "There are no responses yet, so the AI was not asked." });
  if (!(await withinLimit(c.env.DB, await callerKey(c, "ai"), 40, 3600))) return c.json({ ...base, mode: "analytics", answer: null, notice: "AI limit reached for this hour (40 questions). Showing calculated figures only." });

  // 3. Send only anonymised, relevant data. Earlier AI replies had names restored for display,
  //    so prior turns are not replayed to the provider; only the organiser's own questions are.
  const history: ChatTurn[] = (Array.isArray(body.history) ? body.history : [])
    .filter((t): t is { role: string; content: string } => !!t && typeof t === "object" && typeof (t as any).content === "string" && (t as any).role === "user")
    .slice(-6)
    .map((t) => ({ role: "user" as const, content: t.content.slice(0, 600) }));
  const turns: ChatTurn[] = [{ role: "user", content: [...history.map((t) => `Earlier question: ${t.content}`), `Question: ${question}`].join("\n") }];

  try {
    const reply = await provider.generate(systemPrompt(buildContext(rows, analytics)), turns);
    return c.json({ ...base, mode: "ai", model: provider.model, answer: restoreNames(reply, rows) });
  } catch (err) {
    const message = err instanceof AiError ? err.message : "The AI request failed.";
    return c.json({ ...base, mode: "analytics", answer: null, notice: `${message} Showing figures calculated directly from the survey responses.` });
  }
});

app.all("/api/*", (c) => fail(c, 404, "Not found"));

// Anything that is not /api/* is a static file or the single-page app shell.
app.all("*", async (c) => (c.env.ASSETS ? await c.env.ASSETS.fetch(c.req.raw) : new Response("Not found", { status: 404 })));

export default app;
