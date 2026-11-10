import { useCallback, useEffect, useMemo, useState } from "react";
import { computeAnalytics } from "@shared/analytics";
import { Icon, type IconName } from "../components/Icon";
import { Photo } from "../components/Photo";
import type { Route } from "../lib/router";
import { AuthError, type AdminApi, type AdminData, type AdminSettings } from "./api";
import { Assistant } from "./Assistant";
import { Accommodation, Activities, Insights, Overview, Responses, Settings, type PageProps } from "./pages";

const NAV: { route: Route; label: string; icon: IconName }[] = [
  { route: "admin", label: "Overview", icon: "grid" },
  { route: "admin-responses", label: "Family Responses", icon: "table" },
  { route: "admin-activities", label: "Activity Analysis", icon: "chart" },
  { route: "admin-accommodation", label: "Accommodation Analysis", icon: "bed" },
  { route: "admin-insights", label: "Trip Insights", icon: "spark" },
  { route: "admin-assistant", label: "AI Trip Assistant", icon: "chat" },
  { route: "admin-settings", label: "Settings", icon: "cog" },
];

const EMPTY: AdminData = { responses: [], analytics: computeAnalytics([]) };

export default function AdminApp({ api, route, navigate }: { api: AdminApi; route: Route; navigate: (to: Route) => void }) {
  const [phase, setPhase] = useState<"checking" | "signed-out" | "signed-in">("checking");
  const [configured, setConfigured] = useState(true);
  const [data, setData] = useState<AdminData | null>(null);
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [empty, setEmpty] = useState(false);
  const [menu, setMenu] = useState(false);

  /** Returns true when the error was an expired session (and the user has been signed out). */
  const onAuthError = useCallback((e: unknown) => {
    if (!(e instanceof AuthError)) return false;
    setPhase("signed-out");
    setData(null);
    setNotice("Your session has ended. Please sign in again.");
    return true;
  }, []);

  const reload = useCallback(async () => {
    try {
      const [d, s] = await Promise.all([api.load(), api.settings()]);
      setData(d);
      setSettings(s);
      setError(null);
    } catch (e) {
      if (!onAuthError(e)) setError((e as Error).message);
    }
  }, [api, onAuthError]);

  useEffect(() => {
    api.session().then(
      (s) => {
        setConfigured(s.configured);
        setPhase(s.authenticated ? "signed-in" : "signed-out");
      },
      () => setPhase("signed-out"),
    );
  }, [api]);

  useEffect(() => {
    if (phase === "signed-in") void reload();
  }, [phase, reload]);

  const shown = useMemo(() => (empty ? EMPTY : data), [empty, data]);

  if (phase === "checking") return <Splash />;
  if (phase === "signed-out")
    return <Login api={api} configured={configured} notice={notice} onEnter={() => { setNotice(null); setPhase("signed-in"); }} onSurvey={() => navigate("survey")} />;

  const logout = async () => {
    await api.logout();
    setData(null);
    setPhase("signed-out");
  };
  /** Runs a change, then re-reads everything from the server so every figure reflects the database. */
  const change = async (fn: () => Promise<void>) => {
    try {
      await fn();
      await reload();
    } catch (e) {
      if (!onAuthError(e)) throw e;
    }
  };
  const props: PageProps | null = shown && {
    rows: shown.responses,
    a: shown.analytics,
    demo: api.demo,
    onSave: (r) => change(() => api.update(r)),
    onDelete: (id) => change(() => api.remove(id)),
    onExport: async (ids) => {
      try {
        const out = await api.exportCsv(ids);
        if (!api.demo) void api.settings().then(setSettings, () => undefined);
        return out;
      } catch (e) {
        if (!onAuthError(e)) setError((e as Error).message);
      }
    },
  };
  const go = (to: Route) => {
    navigate(to);
    setMenu(false);
  };

  const sidebar = (
    <nav className="flex h-full flex-col bg-forest-900 text-forest-100" aria-label="Dashboard sections">
      <div className="px-6 pb-6 pt-7">
        <p className="font-display text-2xl font-semibold leading-tight text-ivory">Punjab Family<br />Getaway <span className="italic text-gold-300">2026</span></p>
        <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-300/80">Trip administrator</p>
      </div>
      <ul className="flex-1 space-y-1 px-3">
        {NAV.map((n) => {
          const on = route === n.route;
          return (
            <li key={n.route}>
              <button type="button" onClick={() => go(n.route)} aria-current={on ? "page" : undefined} className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-medium transition-colors ${on ? "bg-ivory/10 text-ivory shadow-[inset_3px_0_0_var(--color-gold-400)]" : "hover:bg-ivory/5 hover:text-ivory"}`}>
                <Icon name={n.icon} size={18} className={on ? "text-gold-300" : ""} /> {n.label}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="space-y-1 border-t border-ivory/10 p-3">
        <button type="button" onClick={() => go("survey")} className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium hover:bg-ivory/5 hover:text-ivory"><Icon name="eye" size={18} /> View public survey</button>
        <button type="button" onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium hover:bg-ivory/5 hover:text-ivory"><Icon name="logout" size={18} /> Log out</button>
      </div>
    </nav>
  );

  return (
    <div className="min-h-dvh bg-ivory lg:pl-64">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block">{sidebar}</aside>
      {menu && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 animate-fade bg-forest-950/50" onClick={() => setMenu(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] animate-fade shadow-lift">{sidebar}</aside>
        </div>
      )}

      <div className="sticky top-0 z-30">
        <div className="flex items-center justify-between gap-3 border-b border-sand/70 bg-ivory/95 px-4 py-3 backdrop-blur lg:hidden">
          <button type="button" onClick={() => setMenu(true)} aria-label="Open navigation" className="rounded-full p-2 text-forest-900 hover:bg-cream"><Icon name="menu" size={22} /></button>
          <p className="font-display text-lg font-semibold text-forest-900">{NAV.find((n) => n.route === route)?.label}</p>
          <span className="w-9" />
        </div>
        {api.demo && (
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-saffron-500 px-4 py-1.5 text-center text-xs font-bold uppercase tracking-[0.14em] text-forest-950">
            <span>Demo data – {data?.responses.length ?? 0} invented responses, for UI preview only</span>
            <button type="button" onClick={() => setEmpty((e) => !e)} className="rounded-full bg-forest-950/15 px-2.5 py-0.5 normal-case tracking-normal underline-offset-2 hover:underline">
              {empty ? "Show demo data" : "Preview empty state"}
            </button>
          </div>
        )}
        {error && (
          <div role="alert" className="flex items-center justify-center gap-3 bg-rose-600 px-4 py-2 text-center text-sm font-medium text-white">
            {error}
            <button type="button" onClick={() => void reload()} className="rounded-full bg-white/20 px-3 py-0.5 text-xs font-semibold hover:bg-white/30">Retry</button>
          </div>
        )}
      </div>

      <main key={route} className="mx-auto max-w-7xl animate-fade px-4 py-7 sm:px-8 sm:py-9">
        {!props ? (
          error ? null : <p className="py-24 text-center text-sm text-muted" role="status">Loading responses…</p>
        ) : (
          <>
            {route === "admin" && <Overview {...props} />}
            {route === "admin-responses" && <Responses {...props} />}
            {route === "admin-activities" && <Activities {...props} />}
            {route === "admin-accommodation" && <Accommodation {...props} />}
            {route === "admin-insights" && (
              <Insights {...props} ai={settings?.ai ?? null} onAsk={async (q) => { try { return await api.ask(q, []); } catch (e) { if (!onAuthError(e)) setError((e as Error).message); return null; } }} />
            )}
            {route === "admin-assistant" && <Assistant api={api} ai={settings?.ai ?? null} onAuthError={onAuthError} />}
            {route === "admin-settings" && <Settings {...props} settings={settings} onLogout={logout} />}
          </>
        )}
      </main>
    </div>
  );
}

function Splash() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-ivory" role="status" aria-label="Loading">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-sand border-t-forest-800" />
    </div>
  );
}

function Login({ api, configured, notice, onEnter, onSurvey }: { api: AdminApi; configured: boolean; notice: string | null; onEnter: () => void; onSurvey: () => void }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    setBusy(true);
    setError(null);
    const result = await api.login(password);
    setBusy(false);
    if (result.ok) onEnter();
    else setError(result.message ?? "Sign-in failed.");
  };
  return (
    <div className="grid min-h-dvh bg-ivory lg:grid-cols-2">
      <div className="relative hidden lg:block">
        <Photo id="login" alt="The Golden Temple at night" scene="temple" width={1280} className="!absolute inset-0 h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-forest-950/90 via-forest-950/20 to-forest-950/40" />
        <p className="absolute bottom-12 left-12 right-12 font-display text-5xl font-semibold leading-tight text-ivory">Every preference,<br />in <span className="italic text-gold-300">one place.</span></p>
      </div>
      <div className="flex items-center justify-center px-6 py-12">
        <form onSubmit={(e) => { e.preventDefault(); void submit(); }} className="w-full max-w-sm animate-rise">
          <span className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-forest-800 text-gold-300"><Icon name="lock" size={20} /></span>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-600">Punjab Family Getaway 2026</p>
          <h1 className="mt-2 font-display text-5xl font-semibold text-forest-900">Administrator</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">Sign in to see the family's responses and plan the trip.</p>
          {notice && <p className="mt-4 rounded-xl bg-gold-100/70 px-3.5 py-2.5 text-sm text-forest-900">{notice}</p>}
          <label className="mt-7 block text-sm font-medium text-forest-900">
            Password
            <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" aria-invalid={Boolean(error)} className="mt-1.5 w-full rounded-xl border border-sand bg-white px-4 py-3 text-base shadow-soft focus:border-forest-600 focus:outline-none focus:ring-2 focus:ring-forest-600/20" />
          </label>
          {error && <p role="alert" className="mt-2 text-sm font-medium text-rose-600">{error}</p>}
          <button type="submit" disabled={busy || (!api.demo && !password)} className="mt-4 w-full rounded-full bg-forest-800 px-6 py-3.5 text-sm font-semibold uppercase tracking-[0.14em] text-ivory shadow-lift transition-colors hover:bg-forest-700 disabled:opacity-50">{busy ? "Signing in…" : "Sign in"}</button>
          {api.demo && <p className="mt-4 rounded-xl bg-gold-100/70 px-3.5 py-2.5 text-xs leading-relaxed text-forest-900"><strong>UI preview:</strong> press Sign in with any or no password to open the demo dashboard.</p>}
          {!configured && <p className="mt-4 rounded-xl bg-rose-600/10 px-3.5 py-2.5 text-xs leading-relaxed text-rose-600">Administrator access is not set up on this deployment yet. Set the ADMIN_PASSWORD and SESSION_SECRET secrets (see the README), then reload.</p>}
          <button type="button" onClick={onSurvey} className="mt-6 text-sm font-medium text-muted underline underline-offset-4 hover:text-forest-800">← Back to the family survey</button>
        </form>
      </div>
    </div>
  );
}
