import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { computeAnalytics } from "../shared/analytics";
import { client, createTestDb, submission } from "./worker-helpers";

let db: D1Database;

beforeAll(() => { db = createTestDb(); });
beforeEach(async () => {
  await db.batch([db.prepare("DELETE FROM survey_responses"), db.prepare("DELETE FROM audit_log"), db.prepare("DELETE FROM rate_limits")]);
});
afterEach(() => vi.unstubAllGlobals());

const count = async () => (await db.prepare("SELECT COUNT(*) AS n FROM survey_responses").first<{ n: number }>())!.n;

describe("POST /api/survey/submit", () => {
  it("stores a valid response and returns its id", async () => {
    const body = submission();
    const res = await client(db).post("/api/survey/submit", body);
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ success: true, message: "Response saved successfully", responseId: body.submission_id });
    const row = await db.prepare("SELECT * FROM survey_responses WHERE submission_id = ?").bind(body.submission_id).first<Record<string, string>>();
    expect(row!.respondent_name).toBe(body.respondent_name);
    expect(JSON.parse(row!.top_three_priorities)).toEqual(body.top_three_priorities);
    expect(row!.trip_id).toBe("punjab-2026");
  });

  it("does not create a second record for the same submission id", async () => {
    const body = submission();
    const c = client(db);
    expect((await c.post("/api/survey/submit", body)).status).toBe(201);
    const again = await c.post("/api/survey/submit", body);
    expect(again.status).toBe(200);
    expect(await again.json()).toMatchObject({ success: true, duplicate: true, responseId: body.submission_id });
    expect(await count()).toBe(1);
  });

  it("lets several respondents submit independently", async () => {
    const c = client(db);
    for (let i = 0; i < 4; i++) expect((await c.post("/api/survey/submit", submission())).status).toBe(201);
    expect(await count()).toBe(4);
  });

  it.each([
    ["missing name", { respondent_name: "  " }, /respondent_name is required/],
    ["two priorities", { top_three_priorities: ["wagah-border", "tractor-ride"] }, /exactly 3/],
    ["repeated priorities", { top_three_priorities: ["wagah-border", "wagah-border", "tractor-ride"] }, /exactly 3/],
    ["unknown activity", { amritsar_activities: ["moon-landing"] }, /unknown value/],
    ["activity in the wrong section", { chandigarh_activities: ["wagah-border"] }, /unknown value/],
    ["unknown date option", { date_confirmation: "maybe" }, /unknown value/],
    ["missing date", { date_confirmation: "" }, /date_confirmation is required/],
    ["over-long text", { additional_suggestions: "x".repeat(1501) }, /too long/],
    ["wrong type", { accommodation_facilities: "parking" }, /must be a list/],
    ["bad property link", { property_suggestions: [{ name: "Villa", link: "javascript:alert(1)" }] }, /link must start with/],
    ["four properties", { property_suggestions: [1, 2, 3, 4].map((i) => ({ name: `P${i}` })) }, /At most 3/],
  ])("rejects %s and stores nothing", async (_label, patch, message) => {
    const res = await client(db).post("/api/survey/submit", submission(patch));
    expect(res.status).toBe(400);
    const json = (await res.json()) as { success: boolean; errors: string[] };
    expect(json.success).toBe(false);
    expect(json.errors.join(" | ")).toMatch(message);
    expect(await count()).toBe(0);
  });

  it("rejects spam: filled honeypot, instant submissions, bad ids, non-JSON and oversized bodies", async () => {
    const c = client(db);
    expect((await c.post("/api/survey/submit", submission({ website: "http://spam.example" }))).status).toBe(400);
    expect((await c.post("/api/survey/submit", submission({ started_at: Date.now() }))).status).toBe(400);
    expect((await c.post("/api/survey/submit", submission({ submission_id: "x' OR 1=1 --" }))).status).toBe(400);
    expect((await c.call("POST", "/api/survey/submit", "name=a", { "content-type": "text/plain" })).status).toBe(415);
    expect((await c.post("/api/survey/submit", submission({ additional_suggestions: "x".repeat(70_000) }))).status).toBe(413);
    expect((await c.post("/api/survey/submit", "{not json")).status).toBe(400);
    expect(await count()).toBe(0);
  });

  it("stores SQL metacharacters as plain text", async () => {
    const name = `Robert'); DROP TABLE survey_responses;--`;
    expect((await client(db).post("/api/survey/submit", submission({ respondent_name: name }))).status).toBe(201);
    expect((await db.prepare("SELECT respondent_name FROM survey_responses").first<{ respondent_name: string }>())!.respondent_name).toBe(name);
  });

  it("rate-limits one connection and blocks cross-site posts", async () => {
    const c = client(db);
    let last = 0;
    for (let i = 0; i < 41; i++) last = (await c.post("/api/survey/submit", submission())).status;
    expect(last).toBe(429);
    expect(await count()).toBe(40);
    expect((await c.post("/api/survey/submit", submission(), { "cf-connecting-ip": "198.51.100.9" })).status).toBe(201);
    expect((await c.post("/api/survey/submit", submission(), { "cf-connecting-ip": "198.51.100.10", origin: "https://evil.example" })).status).toBe(403);
  });

  it("never exposes database details in errors", async () => {
    const broken = { prepare: () => { throw new Error("D1_ERROR: no such table: survey_responses"); } } as unknown as D1Database;
    const res = await client(broken).post("/api/survey/submit", submission());
    expect(res.status).toBe(500);
    const text = await res.text();
    expect(text).not.toMatch(/D1|table|sql/i);
    expect(JSON.parse(text).success).toBe(false);
  });
});

describe("admin authentication", () => {
  const protectedCalls: [string, string][] = [
    ["GET", "/api/admin/responses"], ["PUT", "/api/admin/responses/11111111-2222-4333-8444-000000000001"],
    ["DELETE", "/api/admin/responses/11111111-2222-4333-8444-000000000001"], ["GET", "/api/admin/export.csv"],
    ["GET", "/api/admin/settings"], ["POST", "/api/admin/assistant"],
  ];

  it.each(protectedCalls)("rejects unauthenticated %s %s", async (method, path) => {
    const res = await client(db).call(method, path, method === "GET" || method === "DELETE" ? undefined : {});
    expect(res.status).toBe(401);
  });

  it("logs in with the right password, sets a hardened cookie, and logs out", async () => {
    const c = client(db);
    expect((await c.login("wrong password")).status).toBe(401);
    expect(await (await c.get("/api/admin/session")).json()).toEqual({ authenticated: false, configured: true });

    const res = await c.login();
    expect(res.status).toBe(200);
    const cookie = res.headers.get("set-cookie")!;
    expect(cookie).toMatch(/^pfg_admin=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/Secure/i);
    expect(cookie).toMatch(/SameSite=Strict/i);
    expect(cookie).not.toContain("correct horse");
    expect(await (await c.get("/api/admin/session")).json()).toEqual({ authenticated: true, configured: true });
    expect((await c.get("/api/admin/responses")).status).toBe(200);

    expect((await c.post("/api/admin/logout")).status).toBe(200);
    expect((await c.get("/api/admin/responses")).status).toBe(401);
  });

  it("rejects forged, tampered and expired session cookies", async () => {
    const c = client(db);
    const good = (await c.login()).headers.get("set-cookie")!.split(";")[0];
    const [exp, nonce, sig] = good.replace("pfg_admin=", "").split(".");
    for (const bad of [`pfg_admin=${Number(exp) + 9999}.${nonce}.${sig}`, `pfg_admin=${exp}.${nonce}.${sig.slice(0, -2)}AA`, "pfg_admin=1.2.3", "pfg_admin=admin"]) {
      c.setCookie(bad);
      expect((await c.get("/api/admin/responses")).status).toBe(401);
    }
    const { createSession } = await import("../worker/auth");
    c.setCookie(`pfg_admin=${await createSession("test-session-secret-0123456789-abcdefghij", Date.now() - 13 * 3600 * 1000)}`);
    expect((await c.get("/api/admin/responses")).status).toBe(401);
    c.setCookie(`pfg_admin=${await createSession("a-different-secret-0123456789-abcdefghijkl")}`);
    expect((await c.get("/api/admin/responses")).status).toBe(401);
  });

  it("fails closed when secrets are missing, and limits sign-in attempts", async () => {
    const open = client(db, { ADMIN_PASSWORD: undefined });
    expect((await open.login("anything")).status).toBe(503);
    expect((await open.get("/api/admin/responses")).status).toBe(503);

    const c = client(db);
    let last = 0;
    for (let i = 0; i < 9; i++) last = (await c.login("guess")).status;
    expect(last).toBe(429);
    expect((await c.login()).status).toBe(429);
  });
});

describe("admin data", () => {
  const seed = async () => {
    const pub = client(db);
    const a = submission({ respondent_name: "Asha", trip_pace: "relaxed" });
    const b = submission({ respondent_name: "Rohit", date_confirmation: "prefer-4-6", amritsar_activities: ["wagah-border"], top_three_priorities: ["wagah-border", "food-experience", "rock-garden"] });
    const c2 = submission({ respondent_name: "=cmd|' /C calc'!A0", chandigarh_preference: "no-amritsar" });
    for (const s of [a, b, c2]) expect((await pub.post("/api/survey/submit", s)).status).toBe(201);
    const admin = client(db);
    await admin.login();
    return { admin, a, b, c2 };
  };

  it("lists every stored response with analytics that match the rows", async () => {
    const { admin } = await seed();
    const { responses, analytics } = (await (await admin.get("/api/admin/responses")).json()) as any;
    expect(responses).toHaveLength(3);
    expect(analytics).toEqual(JSON.parse(JSON.stringify(computeAnalytics(responses))));
    expect(analytics.total).toBe(3);
    expect(analytics.fullTrip).toBe(2);
    const wagah = analytics.allActivities.find((t: any) => t.id === "wagah-border");
    expect(wagah).toMatchObject({ count: 3, pct: 100 });
    const temple = analytics.allActivities.find((t: any) => t.id === "golden-temple-evening");
    expect(temple).toMatchObject({ count: 2, pct: 67 });
    expect(analytics.chandigarhInterested).toBe(2);
  });

  it("returns empty analytics, not sample figures, when there are no responses", async () => {
    const admin = client(db);
    await admin.login();
    const { responses, analytics } = (await (await admin.get("/api/admin/responses")).json()) as any;
    expect(responses).toEqual([]);
    expect(analytics.total).toBe(0);
    expect(analytics.mostPopularActivity).toBeNull();
  });

  it("updates a response, validates the edit, and audits field names only", async () => {
    const { admin, a } = await seed();
    const path = `/api/admin/responses/${a.submission_id}`;
    expect((await admin.call("PUT", path, { ...a, top_three_priorities: ["wagah-border"] })).status).toBe(400);
    const res = await admin.call("PUT", path, { ...a, trip_pace: "packed", respondent_name: "Asha Mehra" });
    expect(await res.json()).toEqual({ success: true, changed: ["respondent_name", "trip_pace"] });
    const row = await db.prepare("SELECT respondent_name, trip_pace, created_at, updated_at FROM survey_responses WHERE submission_id = ?").bind(a.submission_id).first<Record<string, string>>();
    expect(row).toMatchObject({ respondent_name: "Asha Mehra", trip_pace: "packed" });
    const { audit } = (await (await admin.get("/api/admin/settings")).json()) as any;
    expect(audit[0]).toMatchObject({ action: "update", submission_id: a.submission_id, changed_fields: ["respondent_name", "trip_pace"] });
    expect(JSON.stringify(audit)).not.toContain("Asha");
    expect((await admin.call("PUT", "/api/admin/responses/11111111-2222-4333-8444-999999999999", a)).status).toBe(404);
  });

  it("deletes a response and recalculates", async () => {
    const { admin, b } = await seed();
    expect((await admin.call("DELETE", `/api/admin/responses/${b.submission_id}`)).status).toBe(200);
    expect((await admin.call("DELETE", `/api/admin/responses/${b.submission_id}`)).status).toBe(404);
    const { analytics } = (await (await admin.get("/api/admin/responses")).json()) as any;
    expect(analytics.total).toBe(2);
    expect(await count()).toBe(2);
  });

  it("exports CSV for all or selected responses, with formula cells neutralised", async () => {
    const { admin, a } = await seed();
    const res = await admin.get("/api/admin/export.csv");
    expect(res.headers.get("content-type")).toContain("text/csv");
    expect(res.headers.get("content-disposition")).toMatch(/attachment; filename="punjab-trip-responses-\d{4}-\d\d-\d\d\.csv"/);
    const lines = (await res.text()).split("\r\n");
    expect(lines).toHaveLength(4);
    expect(lines[0]).toContain('"Name"');
    expect(lines.join("\n")).toContain(`"'=cmd|' /C calc'!A0"`);
    const one = (await (await admin.get(`/api/admin/export.csv?ids=${a.submission_id}`)).text()).split("\r\n");
    expect(one).toHaveLength(2);
    expect(one[1]).toContain("Asha");
  });

  it("keeps data when the application is redeployed (new Worker instance, same D1)", async () => {
    const { a } = await seed();
    vi.resetModules();
    const fresh = (await import("../worker/index")).default;
    const env = { DB: db, ADMIN_PASSWORD: "correct horse battery staple", SESSION_SECRET: "test-session-secret-0123456789-abcdefghij" };
    const login = await fresh.fetch(new Request("https://trip.example/api/admin/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: env.ADMIN_PASSWORD }) }), env);
    const res = await fresh.fetch(new Request("https://trip.example/api/admin/responses", { headers: { cookie: login.headers.get("set-cookie")!.split(";")[0] } }), env);
    const { responses } = (await res.json()) as any;
    expect(responses.map((r: any) => r.submission_id)).toContain(a.submission_id);
  });
});

describe("AI assistant", () => {
  const seeded = async (extra = {}) => {
    const pub = client(db);
    await pub.post("/api/survey/submit", submission({ respondent_name: "Asha Mehra" }));
    await pub.post("/api/survey/submit", submission({ respondent_name: "Rohit Mehra", chandigarh_preference: "no-amritsar" }));
    const admin = client(db, extra);
    await admin.login();
    return admin;
  };
  const ask = async (admin: ReturnType<typeof client>, question: string) => (await (await admin.post("/api/admin/assistant", { question })).json()) as any;

  it("works without any API key and says clearly that no AI was used", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const admin = await seeded();
    const out = await ask(admin, "How many people want Chandigarh?");
    expect(out).toMatchObject({ success: true, mode: "analytics", answer: null, provider: "none", totalResponses: 2 });
    expect(out.notice).toMatch(/No AI provider is configured/);
    expect(out.facts.join(" ")).toContain("1 of 2 said yes or yes if it fits");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("reports zero responses instead of inventing data, and does not call the AI", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const admin = client(db, { AI_PROVIDER: "anthropic", ANTHROPIC_API_KEY: "sk-test" });
    await admin.login();
    const out = await ask(admin, "Summarise all family preferences.");
    expect(out.mode).toBe("analytics");
    expect(out.facts).toEqual(["No survey responses have been submitted yet, so there is nothing to analyse."]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("calls Anthropic with anonymised data only, then restores names for the admin", async () => {
    const fetchSpy = vi.fn(async (_url: string, _init: RequestInit) => new Response(JSON.stringify({ content: [{ type: "text", text: "Survey facts\nRespondent 1 and Respondent 2 both chose Wagah.\n\nSuggestions\nGo early." }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchSpy);
    const admin = await seeded({ AI_PROVIDER: "anthropic", ANTHROPIC_API_KEY: "sk-ant-test", ANTHROPIC_MODEL: "claude-test-model" });
    const out = await ask(admin, "Which activities should we prioritise?");
    expect(out).toMatchObject({ mode: "ai", provider: "anthropic", model: "claude-test-model" });
    expect(out.answer).toMatch(/Mehra and (Asha|Rohit) Mehra both chose Wagah/);
    expect(out.facts.length).toBeGreaterThan(0);

    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://api.anthropic.com/v1/messages");
    expect((init.headers as Record<string, string>)["x-api-key"]).toBe("sk-ant-test");
    const sent = init.body as string;
    expect(JSON.parse(sent).model).toBe("claude-test-model");
    expect(sent).toContain("Respondent 1");
    expect(sent).toContain("total_responses");
    for (const secret of ["Asha", "Rohit", "Mehra", "98765", "9876543210"]) expect(sent).not.toContain(secret);
    expect(sent).toContain("[number removed]");
    expect(JSON.stringify(out)).not.toContain("sk-ant-test");
  });

  it("calls Gemini when configured", async () => {
    const fetchSpy = vi.fn(async (_url: string, _init: RequestInit) => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "Survey facts\n2 responses." }] } }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchSpy);
    const admin = await seeded({ AI_PROVIDER: "gemini", GEMINI_API_KEY: "g-key", GEMINI_MODEL: "gemini-test" });
    const out = await ask(admin, "Summarise all family preferences.");
    expect(out).toMatchObject({ mode: "ai", provider: "gemini", answer: "Survey facts\n2 responses." });
    expect(fetchSpy.mock.calls[0][0]).toBe("https://generativelanguage.googleapis.com/v1beta/models/gemini-test:generateContent");
    expect(fetchSpy.mock.calls[0][0]).not.toContain("g-key");
  });

  it.each([
    [401, /rejected the API key/],
    [429, /rate or credit limit/],
    [500, /returned an error \(HTTP 500\)/],
  ])("falls back to calculated figures when the provider returns %i", async (status, message) => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: { message: "secret provider detail sk-ant-test" } }), { status })));
    const admin = await seeded({ AI_PROVIDER: "anthropic", ANTHROPIC_API_KEY: "sk-ant-test" });
    const out = await ask(admin, "Which five activities are most popular?");
    expect(out).toMatchObject({ success: true, mode: "analytics", answer: null });
    expect(out.notice).toMatch(message);
    expect(out.facts[0]).toMatch(/^1\. .+ — 2 of 2 \(100%\)$/);
    expect(JSON.stringify(out)).not.toContain("sk-ant-test");
  });

  it("handles network failures and a provider with a missing key", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("network down"); }));
    const admin = await seeded({ AI_PROVIDER: "anthropic", ANTHROPIC_API_KEY: "sk-ant-test" });
    expect((await ask(admin, "Summarise")).notice).toMatch(/could not be reached/);
    const noKey = await seeded({ AI_PROVIDER: "gemini" });
    expect((await ask(noKey, "Summarise")).notice).toMatch(/GEMINI_API_KEY is not set/);
    const settings = (await (await noKey.get("/api/admin/settings")).json()) as any;
    expect(settings.ai).toMatchObject({ provider: "gemini", configured: false });
  });
});
