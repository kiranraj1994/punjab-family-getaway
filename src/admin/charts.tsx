import type { ReactNode } from "react";
import type { Tally } from "@shared/analytics";
import { Icon, type IconName } from "../components/Icon";

export const SERIES = ["#1c4131", "#b8923a", "#e08a1e", "#6f9c84", "#9a7b5b", "#b4412f"];

export function Card({ title, subtitle, action, children, className = "" }: { title?: string; subtitle?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-sand/80 bg-white p-5 shadow-soft sm:p-6 ${className}`}>
      {(title || action) && (
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            {title && <h2 className="font-display text-[1.45rem] font-semibold leading-tight text-forest-900">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Awaiting({ compact }: { compact?: boolean }) {
  return (
    <div className={`flex flex-col items-center justify-center rounded-xl border border-dashed border-sand bg-ivory/60 text-center ${compact ? "px-4 py-6" : "px-6 py-12"}`}>
      <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-gold-100 text-gold-600">
        <Icon name="chart" size={18} />
      </span>
      <p className="font-display text-xl font-semibold text-forest-900">Awaiting responses</p>
      {!compact && <p className="mt-1 max-w-xs text-sm text-muted">Figures appear here as soon as family members submit the survey.</p>}
    </div>
  );
}

export function Kpi({ icon, label, value, detail }: { icon: IconName; label: string; value: ReactNode; detail?: string }) {
  return (
    <div className="rounded-2xl border border-sand/80 bg-white p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{label}</p>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-forest-50 text-forest-700">
          <Icon name={icon} size={17} />
        </span>
      </div>
      <p className="mt-3 font-display text-[2rem] font-semibold leading-none text-forest-900">{value}</p>
      {detail && <p className="mt-2 text-sm text-muted">{detail}</p>}
    </div>
  );
}

/** Horizontal ranked bars. Bar length is the share of all respondents. */
export function BarList({ items, total, color = SERIES[0], limit, ranked }: { items: Tally[]; total: number; color?: string; limit?: number; ranked?: boolean }) {
  if (total === 0) return <Awaiting compact />;
  const rows = limit ? items.slice(0, limit) : items;
  return (
    <ol className="grid gap-3.5">
      {rows.map((t, i) => (
        <li key={t.id}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-baseline gap-2 font-medium text-ink">
              {ranked && <span className="w-5 shrink-0 font-display text-base font-semibold text-gold-600">{i + 1}</span>}
              <span className="truncate">{t.label}</span>
            </span>
            <span className="shrink-0 tabular-nums text-muted">
              <span className="font-semibold text-forest-900">{t.count}</span> · {t.pct}%
            </span>
          </div>
          <div className={`h-2 overflow-hidden rounded-full bg-cream ${ranked ? "ml-7" : ""}`}>
            <div className="h-full rounded-full transition-[width] duration-700 ease-out" style={{ width: `${t.pct}%`, background: color, minWidth: t.count ? 6 : 0 }} />
          </div>
        </li>
      ))}
    </ol>
  );
}

export function Donut({ items, total }: { items: Tally[]; total: number }) {
  const answered = items.reduce((s, t) => s + t.count, 0);
  if (total === 0 || answered === 0) return <Awaiting compact />;
  const R = 42;
  const C = 2 * Math.PI * R;
  let offset = 0;
  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg viewBox="0 0 120 120" className="h-36 w-36 shrink-0 -rotate-90" role="img" aria-label={items.map((t) => `${t.label}: ${t.count}`).join(", ")}>
        <circle cx="60" cy="60" r={R} fill="none" stroke="#f4eddd" strokeWidth="16" />
        {items.map((t, i) => {
          const len = (t.count / answered) * C;
          const seg = <circle key={t.id} cx="60" cy="60" r={R} fill="none" stroke={SERIES[i % SERIES.length]} strokeWidth="16" strokeDasharray={`${Math.max(len - 1.5, 0)} ${C}`} strokeDashoffset={-offset} />;
          offset += len;
          return t.count ? seg : null;
        })}
        <text x="60" y="60" transform="rotate(90 60 60)" textAnchor="middle" dominantBaseline="central" className="fill-forest-900 font-display text-[26px] font-semibold">
          {answered}
        </text>
      </svg>
      <ul className="grid min-w-40 flex-1 gap-2 text-sm">
        {items.map((t, i) => (
          <li key={t.id} className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: SERIES[i % SERIES.length] }} />
              <span className="truncate text-ink">{t.label}</span>
            </span>
            <span className="shrink-0 tabular-nums text-muted">
              <span className="font-semibold text-forest-900">{t.count}</span> · {t.pct}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Vertical columns for ordered scales such as budget bands. */
export function Columns({ items, total, color = SERIES[1] }: { items: Tally[]; total: number; color?: string }) {
  if (total === 0) return <Awaiting compact />;
  const max = Math.max(...items.map((t) => t.count), 1);
  return (
    <div className="flex h-52 items-end gap-2 sm:gap-3" role="img" aria-label={items.map((t) => `${t.label}: ${t.count}`).join(", ")}>
      {items.map((t) => (
        <div key={t.id} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
          <span className="text-sm font-semibold tabular-nums text-forest-900">{t.count}</span>
          <div className="w-full max-w-16 rounded-t-lg transition-[height] duration-700 ease-out" style={{ height: `${(t.count / max) * 68}%`, background: color, minHeight: t.count ? 6 : 2, opacity: t.count ? 1 : 0.25 }} />
          <span className="h-9 text-center text-[11px] leading-tight text-muted sm:text-xs">{t.label.replace(" for a good property", "")}</span>
        </div>
      ))}
    </div>
  );
}

export function Pill({ tone = "forest", children }: { tone?: "forest" | "gold" | "saffron" | "muted" | "rose"; children: ReactNode }) {
  const tones = {
    forest: "bg-forest-50 text-forest-800",
    gold: "bg-gold-100 text-gold-600",
    saffron: "bg-saffron-500/12 text-saffron-600",
    muted: "bg-cream text-muted",
    rose: "bg-rose-600/10 text-rose-600",
  };
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 animate-fade bg-forest-950/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative flex max-h-[92dvh] w-full animate-rise flex-col overflow-hidden rounded-t-3xl bg-ivory shadow-lift sm:rounded-3xl ${wide ? "sm:max-w-3xl" : "sm:max-w-lg"}`}>
        <div className="flex items-center justify-between border-b border-sand px-6 py-4">
          <h2 className="font-display text-2xl font-semibold text-forest-900">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-2 text-muted hover:bg-cream hover:text-forest-900">
            <Icon name="x" size={18} />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

export const btn = {
  primary: "inline-flex items-center justify-center gap-2 rounded-full bg-forest-800 px-4 py-2.5 text-sm font-semibold text-ivory shadow-soft transition-colors hover:bg-forest-700 disabled:opacity-50",
  ghost: "inline-flex items-center justify-center gap-2 rounded-full border border-sand bg-white px-4 py-2.5 text-sm font-semibold text-forest-800 transition-colors hover:border-gold-400 hover:bg-gold-100/40 disabled:opacity-50",
  danger: "inline-flex items-center justify-center gap-2 rounded-full bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-soft transition-colors hover:brightness-110",
};

export const input = "w-full rounded-xl border border-sand bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-muted/60 focus:border-forest-600 focus:outline-none focus:ring-2 focus:ring-forest-600/20";
