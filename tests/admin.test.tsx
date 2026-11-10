// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { computeAnalytics } from "../shared/analytics";
import AdminApp from "../src/admin/AdminApp";
import { AuthError, type AdminApi } from "../src/admin/api";
import { DEMO_RESPONSES } from "../src/admin/demo";
import { submitSurvey } from "../src/lib/api";
import type { Route } from "../src/lib/router";
import { submission } from "./helpers";

window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;

function fakeApi(overrides: Partial<AdminApi> = {}): AdminApi {
  let rows = DEMO_RESPONSES.slice(0, 4);
  let signedIn = false;
  return {
    demo: false,
    session: async () => ({ authenticated: signedIn, configured: true }),
    login: async (password) => (password === "letmein" ? ((signedIn = true), { ok: true }) : { ok: false, message: "Incorrect password." }),
    logout: vi.fn(async () => { signedIn = false; }),
    load: async () => ({ responses: rows, analytics: computeAnalytics(rows) }),
    update: vi.fn(async (r) => { rows = rows.map((x) => (x.submission_id === r.submission_id ? r : x)); }),
    remove: vi.fn(async (id) => { rows = rows.filter((x) => x.submission_id !== id); }),
    exportCsv: vi.fn(async () => undefined),
    settings: async () => ({ ai: { provider: "none", configured: false, model: "", note: "No AI provider is configured." }, audit: [] }),
    ask: vi.fn(async () => ({ mode: "analytics" as const, facts: ["4 responses received; 3 can join all four days."], answer: null, provider: "none", totalResponses: 4, notice: "No AI provider is configured." })),
    ...overrides,
  };
}

function Harness({ api, start = "admin" as Route }: { api: AdminApi; start?: Route }) {
  const [route, setRoute] = useState<Route>(start);
  return <AdminApp api={api} route={route} navigate={setRoute} />;
}

const signIn = async (api: AdminApi, start?: Route) => {
  render(<Harness api={api} start={start} />);
  await userEvent.type(await screen.findByLabelText(/password/i), "letmein");
  await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
};

describe("admin dashboard", () => {
  it("shows the sign-in screen and no data until the right password is entered", async () => {
    render(<Harness api={fakeApi()} />);
    await userEvent.type(await screen.findByLabelText(/password/i), "wrong");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/incorrect password/i);
    expect(screen.queryByText(/total responses/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Asha Mehra")).not.toBeInTheDocument();
  });

  it("shows figures calculated from the loaded responses and no demo banner", async () => {
    await signIn(fakeApi());
    const card = (await screen.findByText(/total responses/i)).closest("div")!.parentElement!;
    expect(within(card).getByText("4")).toBeInTheDocument();
    expect(screen.queryByText(/demo data/i)).not.toBeInTheDocument();
    expect(screen.getAllByText(/wagah border beating retreat ceremony/i).length).toBeGreaterThan(0);
  });

  it("shows 'Awaiting responses' instead of numbers when nothing has been submitted", async () => {
    await signIn(fakeApi({ load: async () => ({ responses: [], analytics: computeAnalytics([]) }) }));
    expect((await screen.findAllByText(/awaiting responses/i)).length).toBeGreaterThan(3);
  });

  it("searches, filters, exports and deletes with confirmation", async () => {
    const api = fakeApi();
    await signIn(api, "admin-responses");
    expect(await screen.findAllByText("Asha Mehra")).not.toHaveLength(0);
    await userEvent.type(screen.getByRole("searchbox"), "neha");
    expect(screen.queryByText("Asha Mehra")).not.toBeInTheDocument();
    expect(screen.getAllByText("Neha Kapoor").length).toBeGreaterThan(0);
    await userEvent.clear(screen.getByRole("searchbox"));
    await userEvent.selectOptions(screen.getByLabelText("Dates"), "prefer-4-6");
    expect(screen.getByText(/showing 1 of 4 responses/i)).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText("Dates"), "");

    await userEvent.click(screen.getByRole("button", { name: /^export csv$/i }));
    expect(api.exportCsv).toHaveBeenCalledWith(undefined);
    await userEvent.click(screen.getAllByRole("checkbox", { name: /select asha mehra/i })[0]);
    await userEvent.click(screen.getByRole("button", { name: /export selected \(1\)/i }));
    expect(api.exportCsv).toHaveBeenLastCalledWith(["demo-001"]);

    await userEvent.click(screen.getAllByRole("button", { name: /delete rohit mehra/i })[0]);
    expect(api.remove).not.toHaveBeenCalled();
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: /delete response/i }));
    expect(api.remove).toHaveBeenCalledWith("demo-002");
    expect(await screen.findByText(/showing 3 of 3 responses/i)).toBeInTheDocument();
  });

  it("returns to sign-in when the session expires, and logs out on request", async () => {
    let expired = false;
    const base = fakeApi();
    const api = { ...base, load: async () => { if (expired) throw new AuthError("expired"); return base.load(); } };
    await signIn(api, "admin-responses");
    await screen.findAllByText("Asha Mehra");
    expired = true;
    await userEvent.click(screen.getAllByRole("button", { name: /delete rohit mehra/i })[0]);
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: /delete response/i }));
    expect(await screen.findByText(/session has ended/i)).toBeInTheDocument();
    expect(screen.queryByText("Asha Mehra")).not.toBeInTheDocument();
  });

  it("labels assistant replies as calculated facts when no AI is connected", async () => {
    const api = fakeApi();
    await signIn(api, "admin-assistant");
    expect(await screen.findByText(/no ai provider is connected/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Summarise all family preferences." }));
    expect(await screen.findByText(/4 responses received/i)).toBeInTheDocument();
    expect(screen.getByText(/calculated from 4 responses/i)).toBeInTheDocument();
    expect(screen.queryByText(/ai reply/i)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /clear conversation/i }));
    expect(screen.queryByText(/4 responses received/i)).not.toBeInTheDocument();
  });
});

describe("survey submission client", () => {
  const payload = submission();
  it("reports success only when the server confirms the save", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ success: true, message: "Response saved successfully", responseId: payload.submission_id }), { status: 201 })));
    expect(await submitSurvey(payload)).toMatchObject({ success: true, responseId: payload.submission_id });
  });
  it.each([
    ["a network failure", () => Promise.reject(new TypeError("offline")), /could not reach the server/i],
    ["a server error", async () => new Response("<html>502</html>", { status: 502 }), /could not save/i],
    ["a database failure", async () => new Response(JSON.stringify({ success: false, message: "We could not save your response. Please try again." }), { status: 500 }), /could not save/i],
    ["a 200 without confirmation", async () => new Response("{}", { status: 200 }), /could not save/i],
    ["rate limiting", async () => new Response(JSON.stringify({ success: false, message: "Too many submissions from this connection." }), { status: 429 }), /too many/i],
  ])("does not report success after %s", async (_label, impl, message) => {
    vi.stubGlobal("fetch", vi.fn(impl as () => Promise<Response>));
    const result = await submitSurvey(payload);
    expect(result.success).toBe(false);
    expect(result.message).toMatch(message);
  });
});
