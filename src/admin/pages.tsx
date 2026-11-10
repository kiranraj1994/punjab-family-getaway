import { useMemo, useState, type ReactNode } from "react";
import type { Analytics } from "@shared/analytics";
import {
  ACCOMMODATION_BUDGETS, ACCOMMODATION_TYPES, ACTIVITY_BUDGETS, CATEGORIES, CHANDIGARH_OPTIONS, DATE_OPTIONS,
  FACILITIES, PACE_OPTIONS, PLATFORMS, TRIP, YES_NO_UNSURE, activityTitle, labelOf, type Option, type SurveyResponse,
} from "@shared/trip";
import { Icon } from "../components/Icon";
import { toCsv } from "../lib/csv";
import { IS_PREVIEW } from "../lib/env";
import { Awaiting, BarList, Card, Columns, Donut, Kpi, Modal, Pill, SERIES, btn, input } from "./charts";

export interface PageProps {
  rows: SurveyResponse[];
  a: Analytics;
  setRows: (fn: (rows: SurveyResponse[]) => SurveyResponse[]) => void;
}

const INVITED_ADULTS = 11;

export function when(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
}

export function PageTitle({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-gold-600">{eyebrow}</p>
        <h1 className="font-display text-4xl font-semibold leading-none text-forest-900 sm:text-[2.75rem]">{title}</h1>
      </div>
      {children}
    </div>
  );
}

/* ───────────────────────────── Overview ───────────────────────────── */

export function Overview({ a }: PageProps) {
  const dash = <span className="text-2xl text-muted">Awaiting responses</span>;
  return (
    <>
      <PageTitle eyebrow={TRIP.dates} title="Overview" />
      <div className="stagger grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <Kpi icon="users" label="Total responses" value={a.total} detail={`of ${INVITED_ADULTS} adults travelling`} />
        <Kpi icon="calendar" label="Full-trip participants" value={a.total ? a.fullTrip : dash} detail={a.total ? "can join all four days" : undefined} />
        <Kpi icon="pin" label="Interested in Chandigarh" value={a.total ? a.chandigarhInterested : dash} detail={a.total ? "said yes, or yes if it fits" : undefined} />
        <Kpi icon="star" label="Most popular activity" value={a.mostPopularActivity ? <span className="text-2xl leading-tight">{a.mostPopularActivity.label}</span> : dash} detail={a.mostPopularActivity ? `${a.mostPopularActivity.count} of ${a.total} selected it` : undefined} />
        <Kpi icon="bed" label="Most common room budget" value={a.mostCommonBudget ? <span className="text-2xl leading-tight">{a.mostCommonBudget.label}</span> : dash} detail={a.mostCommonBudget ? `${a.mostCommonBudget.count} of ${a.total} respondents, per night` : undefined} />
        <Kpi icon="heart" label="Suggested properties" value={a.properties.length} detail="shared by the family" />
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card title="Activity popularity" subtitle="Share of respondents who selected each activity (top 8)">
          <BarList items={a.allActivities} total={a.total} limit={8} ranked />
        </Card>
        <Card title="Top three priorities" subtitle="How often each activity was named a must-do">
          <BarList items={a.priorities} total={a.total} limit={8} color={SERIES[1]} ranked />
        </Card>
        <Card title="Accommodation preferences"><Donut items={a.accommodationTypes} total={a.total} /></Card>
        <Card title="Budget distribution" subtitle="Per room, per night"><Columns items={a.accommodationBudgets} total={a.total} /></Card>
        <Card title="Trip pace"><Donut items={a.pace} total={a.total} /></Card>
        <Card title="Chandigarh interest"><BarList items={a.chandigarh} total={a.total} color={SERIES[2]} /></Card>
      </div>
    </>
  );
}

/* ───────────────────────────── Responses ───────────────────────────── */

type SortKey = "respondent_name" | "created_at" | "date_confirmation";

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: Option[] }) {
  return (
    <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className={`${input} !w-auto min-w-36 max-sm:flex-1`}>
      <option value="">{label}: all</option>
      {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
    </select>
  );
}

export function Responses({ rows, setRows }: PageProps) {
  const [q, setQ] = useState("");
  const [fDate, setFDate] = useState("");
  const [fPace, setFPace] = useState("");
  const [fStay, setFStay] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "created_at", dir: -1 });
  const [picked, setPicked] = useState<string[]>([]);
  const [viewing, setViewing] = useState<SurveyResponse | null>(null);
  const [editing, setEditing] = useState<SurveyResponse | null>(null);
  const [deleting, setDeleting] = useState<SurveyResponse | null>(null);
  const [csv, setCsv] = useState<string | null>(null);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows
      .filter((r) => !needle || [r.respondent_name, r.contact_number, r.additional_suggestions, r.child_family_requirements].join(" ").toLowerCase().includes(needle))
      .filter((r) => (!fDate || r.date_confirmation === fDate) && (!fPace || r.trip_pace === fPace) && (!fStay || r.accommodation_type === fStay))
      .sort((x, y) => x[sort.key].localeCompare(y[sort.key]) * sort.dir);
  }, [rows, q, fDate, fPace, fStay, sort]);

  const allPicked = shown.length > 0 && shown.every((r) => picked.includes(r.submission_id));
  const exportRows = (list: SurveyResponse[]) => {
    const text = toCsv(list);
    if (IS_PREVIEW) return setCsv(text);
    const url = URL.createObjectURL(new Blob(["﻿", text], { type: "text/csv;charset=utf-8" }));
    const link = Object.assign(document.createElement("a"), { href: url, download: `punjab-trip-responses-${new Date().toISOString().slice(0, 10)}.csv` });
    link.click();
    URL.revokeObjectURL(url);
  };
  const head = (key: SortKey, label: string) => (
    <button type="button" onClick={() => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : 1 }))} className="inline-flex items-center gap-1 font-semibold uppercase tracking-wider hover:text-forest-900">
      {label} <Icon name="sort" size={13} className={sort.key === key ? "text-gold-600" : "opacity-40"} />
    </button>
  );
  const dateTone = (id: string) => (id === "all-four-days" ? "forest" : id === "cannot-join" ? "rose" : id === "not-sure" ? "muted" : "gold");

  return (
    <>
      <PageTitle eyebrow={`${rows.length} submitted`} title="Family Responses">
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btn.ghost} disabled={!picked.length} onClick={() => exportRows(rows.filter((r) => picked.includes(r.submission_id)))}>
            <Icon name="download" size={16} /> Export selected ({picked.length})
          </button>
          <button type="button" className={btn.primary} disabled={!rows.length} onClick={() => exportRows(rows)}>
            <Icon name="download" size={16} /> Export CSV
          </button>
        </div>
      </PageTitle>

      <Card className="!p-0">
        <div className="flex flex-wrap items-center gap-2.5 border-b border-sand/70 p-4">
          <div className="relative min-w-52 flex-1">
            <Icon name="search" size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, phone or notes" aria-label="Search responses" className={`${input} pl-10`} />
          </div>
          <FilterSelect label="Dates" value={fDate} onChange={setFDate} options={DATE_OPTIONS} />
          <FilterSelect label="Stay" value={fStay} onChange={setFStay} options={ACCOMMODATION_TYPES} />
          <FilterSelect label="Pace" value={fPace} onChange={setFPace} options={PACE_OPTIONS} />
        </div>

        {rows.length === 0 ? (
          <div className="p-6"><Awaiting /></div>
        ) : shown.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted">No responses match these filters.</p>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-sand/70 bg-ivory/70 text-[11px] text-muted">
                  <tr>
                    <th className="w-10 py-3 pl-5"><input type="checkbox" aria-label="Select all" checked={allPicked} onChange={() => setPicked(allPicked ? [] : shown.map((r) => r.submission_id))} className="h-4 w-4 accent-forest-800" /></th>
                    <th className="px-3 py-3">{head("respondent_name", "Respondent")}</th>
                    <th className="px-3 py-3">{head("date_confirmation", "Dates")}</th>
                    <th className="px-3 py-3 font-semibold uppercase tracking-wider">Accommodation</th>
                    <th className="px-3 py-3 font-semibold uppercase tracking-wider">Budget</th>
                    <th className="px-3 py-3 font-semibold uppercase tracking-wider">Pace</th>
                    <th className="px-3 py-3 font-semibold uppercase tracking-wider">Chandigarh</th>
                    <th className="px-3 py-3">{head("created_at", "Submitted")}</th>
                    <th className="py-3 pr-5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-sand/50">
                  {shown.map((r) => (
                    <tr key={r.submission_id} className="transition-colors hover:bg-ivory/70">
                      <td className="py-3.5 pl-5"><input type="checkbox" aria-label={`Select ${r.respondent_name}`} checked={picked.includes(r.submission_id)} onChange={() => setPicked((p) => (p.includes(r.submission_id) ? p.filter((x) => x !== r.submission_id) : [...p, r.submission_id]))} className="h-4 w-4 accent-forest-800" /></td>
                      <td className="px-3 py-3.5"><button type="button" onClick={() => setViewing(r)} className="whitespace-nowrap text-left font-semibold text-forest-900 hover:underline">{r.respondent_name}</button></td>
                      <td className="px-3 py-3.5"><Pill tone={dateTone(r.date_confirmation)}>{labelOf(DATE_OPTIONS, r.date_confirmation) || "—"}</Pill></td>
                      <td className="px-3 py-3.5 text-ink">{labelOf(ACCOMMODATION_TYPES, r.accommodation_type) || "—"}</td>
                      <td className="whitespace-nowrap px-3 py-3.5 text-ink">{labelOf(ACCOMMODATION_BUDGETS, r.accommodation_budget).replace(" for a good property", "") || "—"}</td>
                      <td className="px-3 py-3.5 text-ink">{labelOf(PACE_OPTIONS, r.trip_pace).replace(" itinerary", "") || "—"}</td>
                      <td className="max-w-44 px-3 py-3.5 text-ink">{labelOf(CHANDIGARH_OPTIONS, r.chandigarh_preference) || "—"}</td>
                      <td className="whitespace-nowrap px-3 py-3.5 text-muted">{when(r.created_at)}</td>
                      <td className="py-3.5 pr-4">
                        <div className="flex justify-end gap-0.5 text-muted">
                          <button type="button" aria-label={`View ${r.respondent_name}`} onClick={() => setViewing(r)} className="rounded-full p-2 hover:bg-forest-50 hover:text-forest-800"><Icon name="eye" size={17} /></button>
                          <button type="button" aria-label={`Edit ${r.respondent_name}`} onClick={() => setEditing(r)} className="rounded-full p-2 hover:bg-forest-50 hover:text-forest-800"><Icon name="edit" size={17} /></button>
                          <button type="button" aria-label={`Delete ${r.respondent_name}`} onClick={() => setDeleting(r)} className="rounded-full p-2 hover:bg-rose-600/10 hover:text-rose-600"><Icon name="trash" size={17} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="divide-y divide-sand/60 lg:hidden">
              {shown.map((r) => (
                <li key={r.submission_id} className="flex gap-3 p-4">
                  <input type="checkbox" aria-label={`Select ${r.respondent_name}`} checked={picked.includes(r.submission_id)} onChange={() => setPicked((p) => (p.includes(r.submission_id) ? p.filter((x) => x !== r.submission_id) : [...p, r.submission_id]))} className="mt-1 h-4 w-4 accent-forest-800" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <button type="button" onClick={() => setViewing(r)} className="text-left font-semibold text-forest-900">{r.respondent_name}</button>
                      <span className="shrink-0 text-xs text-muted">{when(r.created_at)}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Pill tone={dateTone(r.date_confirmation)}>{labelOf(DATE_OPTIONS, r.date_confirmation) || "Dates —"}</Pill>
                      {r.accommodation_type && <Pill tone="muted">{labelOf(ACCOMMODATION_TYPES, r.accommodation_type)}</Pill>}
                      {r.accommodation_budget && <Pill tone="muted">{labelOf(ACCOMMODATION_BUDGETS, r.accommodation_budget).replace(" for a good property", "")}</Pill>}
                      {r.trip_pace && <Pill tone="muted">{labelOf(PACE_OPTIONS, r.trip_pace)}</Pill>}
                    </div>
                    <div className="mt-3 flex gap-2 text-sm font-semibold">
                      <button type="button" onClick={() => setViewing(r)} className="text-forest-800">View</button><span className="text-sand">·</span>
                      <button type="button" onClick={() => setEditing(r)} className="text-forest-800">Edit</button><span className="text-sand">·</span>
                      <button type="button" onClick={() => setDeleting(r)} className="text-rose-600">Delete</button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <p className="border-t border-sand/70 px-5 py-3 text-xs text-muted">Showing {shown.length} of {rows.length} responses</p>
          </>
        )}
      </Card>

      {viewing && <ResponseDetail r={viewing} onClose={() => setViewing(null)} onEdit={() => { setEditing(viewing); setViewing(null); }} />}
      {editing && (
        <EditResponse
          r={editing}
          onClose={() => setEditing(null)}
          onSave={(next) => { setRows((list) => list.map((x) => (x.submission_id === next.submission_id ? next : x))); setEditing(null); }}
        />
      )}
      {deleting && (
        <Modal title="Delete this response?" onClose={() => setDeleting(null)}>
          <p className="text-sm leading-relaxed text-ink">
            <strong>{deleting.respondent_name}</strong>'s response will be permanently removed and every chart will be recalculated. This cannot be undone.
          </p>
          <div className="mt-6 flex justify-end gap-2">
            <button type="button" className={btn.ghost} onClick={() => setDeleting(null)}>Keep response</button>
            <button type="button" className={btn.danger} onClick={() => { setRows((list) => list.filter((x) => x.submission_id !== deleting.submission_id)); setPicked((p) => p.filter((x) => x !== deleting.submission_id)); setDeleting(null); }}>
              <Icon name="trash" size={16} /> Delete response
            </button>
          </div>
        </Modal>
      )}
      {csv !== null && <CsvPreview text={csv} onClose={() => setCsv(null)} />}
    </>
  );
}

function CsvPreview({ text, onClose }: { text: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  return (
    <Modal title="CSV export" onClose={onClose} wide>
      <p className="mb-3 text-sm text-muted">The deployed app downloads this as a .csv file that opens in Excel or Google Sheets. File downloads are switched off inside this preview, so the contents are shown here instead.</p>
      <textarea readOnly value={text} rows={10} className={`${input} font-mono text-xs leading-relaxed`} aria-label="CSV contents" />
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" className={btn.ghost} onClick={onClose}>Close</button>
        <button type="button" className={btn.primary} onClick={copy}><Icon name={copied ? "check" : "copy"} size={16} /> {copied ? "Copied" : "Copy CSV"}</button>
      </div>
    </Modal>
  );
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[10rem_1fr] sm:gap-4">
      <dt className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</dt>
      <dd className="text-sm text-ink">{children || <span className="text-muted/70">Not answered</span>}</dd>
    </div>
  );
}

function ResponseDetail({ r, onClose, onEdit }: { r: SurveyResponse; onClose: () => void; onEdit: () => void }) {
  const tags = (items: string[]) => items.length > 0 && <span className="flex flex-wrap gap-1.5">{items.map((t) => <Pill key={t}>{t}</Pill>)}</span>;
  return (
    <Modal title={r.respondent_name} onClose={onClose} wide>
      <p className="-mt-1 mb-2 text-sm text-muted">Submitted {when(r.created_at)}{r.contact_number && ` · ${r.contact_number}`}</p>
      <dl className="divide-y divide-sand/70">
        <DetailRow label="Dates">{labelOf(DATE_OPTIONS, r.date_confirmation)}</DetailRow>
        <DetailRow label="Accommodation">{[labelOf(ACCOMMODATION_TYPES, r.accommodation_type), labelOf(ACCOMMODATION_BUDGETS, r.accommodation_budget)].filter(Boolean).join(" · ")}</DetailRow>
        <DetailRow label="Facilities">{tags(r.accommodation_facilities.map((f) => labelOf(FACILITIES, f)))}</DetailRow>
        {r.additional_accommodation_requirements && <DetailRow label="Stay notes">{r.additional_accommodation_requirements}</DetailRow>}
        <DetailRow label="Top 3 priorities">
          {r.top_three_priorities.length > 0 && <ol className="list-inside list-decimal font-medium">{r.top_three_priorities.map((p) => <li key={p}>{activityTitle(p)}</li>)}</ol>}
        </DetailRow>
        {CATEGORIES.map((c) => <DetailRow key={c.key} label={c.shortTitle}>{tags(r[c.key].map(activityTitle))}</DetailRow>)}
        <DetailRow label="Chandigarh">{labelOf(CHANDIGARH_OPTIONS, r.chandigarh_preference)}</DetailRow>
        <DetailRow label="Pace & budget">{[labelOf(PACE_OPTIONS, r.trip_pace), labelOf(ACTIVITY_BUDGETS, r.activity_budget) && `${labelOf(ACTIVITY_BUDGETS, r.activity_budget)} per person`].filter(Boolean).join(" · ")}</DetailRow>
        {r.additional_suggestions && <DetailRow label="Suggestions">{r.additional_suggestions}</DetailRow>}
        {r.child_family_requirements && <DetailRow label="Child & family">{r.child_family_requirements}</DetailRow>}
        {r.property_suggestions.filter((p) => p.name).map((p, i) => (
          <DetailRow key={i} label={`Property ${i + 1}`}>
            <span className="font-semibold">{p.name}</span>
            <span className="block text-muted">{[labelOf(PLATFORMS, p.platform), p.total_price && `₹${Number(p.total_price).toLocaleString("en-IN")}`, p.rating && `★ ${p.rating}`, p.bedrooms && `${p.bedrooms} bed`, p.bathrooms && `${p.bathrooms} bath`].filter(Boolean).join(" · ")}</span>
            {p.comments && <span className="block">{p.comments}</span>}
          </DetailRow>
        ))}
      </dl>
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" className={btn.ghost} onClick={onClose}>Close</button>
        <button type="button" className={btn.primary} onClick={onEdit}><Icon name="edit" size={16} /> Edit response</button>
      </div>
    </Modal>
  );
}

function EditResponse({ r, onClose, onSave }: { r: SurveyResponse; onClose: () => void; onSave: (r: SurveyResponse) => void }) {
  const [d, setD] = useState(r);
  const sel = (label: string, key: "date_confirmation" | "accommodation_type" | "accommodation_budget" | "trip_pace" | "activity_budget" | "chandigarh_preference", options: Option[]) => (
    <label className="block text-sm font-medium text-forest-900">
      {label}
      <select value={d[key]} onChange={(e) => setD({ ...d, [key]: e.target.value })} className={`${input} mt-1.5`}>
        <option value="">Not answered</option>
        {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
    </label>
  );
  const area = (label: string, key: "additional_suggestions" | "child_family_requirements" | "additional_accommodation_requirements") => (
    <label className="block text-sm font-medium text-forest-900 sm:col-span-2">
      {label}
      <textarea rows={2} value={d[key]} onChange={(e) => setD({ ...d, [key]: e.target.value })} className={`${input} mt-1.5`} />
    </label>
  );
  return (
    <Modal title="Edit response" onClose={onClose} wide>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-forest-900">Respondent name<input value={d.respondent_name} onChange={(e) => setD({ ...d, respondent_name: e.target.value })} className={`${input} mt-1.5`} /></label>
        <label className="block text-sm font-medium text-forest-900">Contact number<input value={d.contact_number} onChange={(e) => setD({ ...d, contact_number: e.target.value })} className={`${input} mt-1.5`} /></label>
        {sel("Dates", "date_confirmation", DATE_OPTIONS)}
        {sel("Accommodation", "accommodation_type", ACCOMMODATION_TYPES)}
        {sel("Room budget", "accommodation_budget", ACCOMMODATION_BUDGETS)}
        {sel("Trip pace", "trip_pace", PACE_OPTIONS)}
        {sel("Activity budget", "activity_budget", ACTIVITY_BUDGETS)}
        {sel("Chandigarh", "chandigarh_preference", CHANDIGARH_OPTIONS)}
        {area("Accommodation notes", "additional_accommodation_requirements")}
        {area("Suggestions", "additional_suggestions")}
        {area("Child & family requirements", "child_family_requirements")}
      </div>
      <div className="mt-6 flex items-center justify-between gap-2">
        <p className="text-xs text-muted">Edits are recorded in the audit log.</p>
        <div className="flex gap-2">
          <button type="button" className={btn.ghost} onClick={onClose}>Cancel</button>
          <button type="button" className={btn.primary} disabled={!d.respondent_name.trim()} onClick={() => onSave({ ...d, updated_at: new Date().toISOString() })}>Save changes</button>
        </div>
      </div>
    </Modal>
  );
}

/* ───────────────────────────── Activity analysis ───────────────────────────── */

export function Activities({ a }: PageProps) {
  const [tab, setTab] = useState<string>("all");
  const groups = tab === "all" ? a.categories : a.categories.filter((c) => c.key === tab);
  return (
    <>
      <PageTitle eyebrow="Ranked by selections" title="Activity Analysis" />
      <div className="-mx-1 mb-5 flex gap-2 overflow-x-auto px-1 pb-1">
        {[{ key: "all", title: "All categories" }, ...a.categories].map((c) => (
          <button key={c.key} type="button" onClick={() => setTab(c.key)} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors ${tab === c.key ? "bg-forest-800 text-ivory" : "border border-sand bg-white text-forest-800 hover:border-gold-400"}`}>
            {c.title}
          </button>
        ))}
      </div>
      <div className={`grid gap-5 ${tab === "all" ? "lg:grid-cols-2" : ""}`}>
        {groups.map((c, i) => (
          <Card key={c.key} title={c.title} subtitle={a.total ? `${c.items.filter((t) => t.count).length} of ${c.items.length} activities chosen at least once` : undefined}>
            <BarList items={c.items} total={a.total} color={SERIES[i % 4]} ranked />
          </Card>
        ))}
        {tab === "all" && (
          <Card title="Overall ranking" subtitle="All 34 activities across every category" className="lg:col-span-2">
            {a.total === 0 ? <Awaiting compact /> : (
              <div className="grid gap-x-10 gap-y-3.5 md:grid-cols-2">
                <BarList items={a.allActivities.slice(0, 17)} total={a.total} ranked />
                <BarList items={a.allActivities.slice(17)} total={a.total} color={SERIES[3]} />
              </div>
            )}
          </Card>
        )}
      </div>
    </>
  );
}

/* ───────────────────────────── Accommodation analysis ───────────────────────────── */

const yn = (v: string) => (v ? <Pill tone={v === "yes" ? "forest" : v === "no" ? "rose" : "muted"}>{labelOf(YES_NO_UNSURE, v)}</Pill> : <span className="text-muted">—</span>);

export function Accommodation({ a }: PageProps) {
  const need = (id: string) => a.facilities.find((f) => f.id === id);
  return (
    <>
      <PageTitle eyebrow={TRIP.rooms} title="Accommodation Analysis" />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Kpi icon="car" label="Need parking for 3 cars" value={a.total ? `${need("parking")?.count ?? 0} / ${a.total}` : "—"} detail={a.total ? `${need("parking")?.pct}% of respondents` : "Awaiting responses"} />
        <Kpi icon="star" label="Want breakfast included" value={a.total ? `${need("breakfast")?.count ?? 0} / ${a.total}` : "—"} detail={a.total ? `${need("breakfast")?.pct}% of respondents` : "Awaiting responses"} />
        <Kpi icon="bed" label="Top accommodation type" value={<span className="text-2xl leading-tight">{[...a.accommodationTypes].sort((x, y) => y.count - x.count)[0]?.count ? [...a.accommodationTypes].sort((x, y) => y.count - x.count)[0].label : "—"}</span>} />
        <Kpi icon="heart" label="Properties suggested" value={a.properties.length} />
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card title="Accommodation type"><Donut items={a.accommodationTypes} total={a.total} /></Card>
        <Card title="Budget preferences" subtitle="Per room, per night"><Columns items={a.accommodationBudgets} total={a.total} /></Card>
        <Card title="Facilities requested" subtitle="Share of respondents asking for each" className="lg:col-span-2">
          {a.total === 0 ? <Awaiting compact /> : (
            <div className="grid gap-x-10 gap-y-3.5 md:grid-cols-2">
              <BarList items={a.facilities.slice(0, 5)} total={a.total} ranked />
              <BarList items={a.facilities.slice(5)} total={a.total} color={SERIES[3]} />
            </div>
          )}
        </Card>
        <Card title="Suggested properties" subtitle="Exactly as entered by family members – not verified" className="lg:col-span-2 !px-0">
          {a.properties.length === 0 ? <div className="px-6"><Awaiting compact /></div> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[46rem] text-left text-sm">
                <thead className="border-y border-sand/70 bg-ivory/70 text-[11px] font-semibold uppercase tracking-wider text-muted">
                  <tr>{["Property", "Suggested by", "3 nights", "Rating", "Bed / Bath", "Parking", "Breakfast", "Free cancel"].map((h) => <th key={h} className="px-4 py-3 first:pl-6">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-sand/50">
                  {a.properties.map((p, i) => (
                    <tr key={i}>
                      <td className="py-3.5 pl-6 pr-4">
                        <span className="font-semibold text-forest-900">{p.name}</span>
                        <span className="block text-xs text-muted">{labelOf(PLATFORMS, p.platform)}{p.comments && ` · ${p.comments}`}</span>
                      </td>
                      <td className="px-4 py-3.5">{p.suggested_by}</td>
                      <td className="whitespace-nowrap px-4 py-3.5 font-semibold tabular-nums">{p.total_price ? `₹${Number(p.total_price).toLocaleString("en-IN")}` : "—"}</td>
                      <td className="whitespace-nowrap px-4 py-3.5">{p.rating ? <>★ {p.rating}<span className="block text-xs text-muted">{p.review_count && `${Number(p.review_count).toLocaleString("en-IN")} reviews`}</span></> : "—"}</td>
                      <td className="whitespace-nowrap px-4 py-3.5 tabular-nums">{p.bedrooms || "—"} / {p.bathrooms || "—"}</td>
                      <td className="px-4 py-3.5">{yn(p.parking)}</td>
                      <td className="px-4 py-3.5">{yn(p.breakfast)}</td>
                      <td className="px-4 py-3.5">{yn(p.free_cancellation)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        <Card title="Additional accommodation requirements" className="lg:col-span-2"><Quotes items={a.notes.accommodation} /></Card>
      </div>
    </>
  );
}

function Quotes({ items }: { items: { name: string; text: string }[] }) {
  if (!items.length) return <p className="text-sm text-muted">Nothing noted yet.</p>;
  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {items.map((n, i) => (
        <li key={i} className="rounded-xl border-l-[3px] border-gold-400 bg-ivory/70 px-4 py-3">
          <p className="text-sm leading-relaxed text-ink">“{n.text}”</p>
          <p className="mt-1.5 text-xs font-semibold text-muted">— {n.name}</p>
        </li>
      ))}
    </ul>
  );
}

/* ───────────────────────────── Trip insights ───────────────────────────── */

function Fact() {
  return <Pill tone="forest"><Icon name="check" size={12} stroke={2.6} /> Survey fact</Pill>;
}

export function Insights({ a }: PageProps) {
  const lists: [string, string, typeof a.consensus.agreed, "forest" | "gold" | "muted"][] = [
    ["Strong agreement", "Chosen by 70% or more", a.consensus.agreed, "forest"],
    ["Family is divided", "Chosen by 40–60%", a.consensus.divided, "gold"],
    ["Low interest", "Chosen by 20% or fewer", a.consensus.low, "muted"],
  ];
  return (
    <>
      <PageTitle eyebrow="What the family is telling us" title="Trip Insights" />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Top three family priorities" action={<Fact />}><BarList items={a.priorities} total={a.total} limit={6} color={SERIES[1]} ranked /></Card>
        <Card title="Relaxed, balanced or packed?" action={<Fact />}><Donut items={a.pace} total={a.total} /></Card>
        <Card title="Chandigarh preference" action={<Fact />}><BarList items={a.chandigarh} total={a.total} color={SERIES[2]} /></Card>
        <Card title="Activity spending per person" action={<Fact />}><Columns items={a.activityBudgets} total={a.total} color={SERIES[3]} /></Card>

        <Card title="Agreement and disagreement" subtitle="Based on the share of respondents selecting each activity" action={<Fact />} className="lg:col-span-2">
          {a.total === 0 ? <Awaiting compact /> : (
            <div className="grid gap-5 md:grid-cols-3">
              {lists.map(([title, rule, items, tone]) => (
                <div key={title} className="rounded-xl bg-ivory/70 p-4">
                  <h3 className="font-display text-xl font-semibold text-forest-900">{title}</h3>
                  <p className="mb-3 text-xs text-muted">{rule}</p>
                  {items.length === 0 ? <p className="text-sm text-muted">None</p> : (
                    <ul className="flex flex-wrap gap-1.5">{items.map((t) => <li key={t.id}><Pill tone={tone}>{t.label} · {t.pct}%</Pill></li>)}</ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Special child and family requirements" action={<Fact />} className="lg:col-span-2"><Quotes items={a.notes.child} /></Card>
        <Card title="Other suggestions from the family" action={<Fact />} className="lg:col-span-2"><Quotes items={a.notes.suggestions} /></Card>

        <section className="rounded-2xl border-2 border-dashed border-gold-400 bg-gold-100/40 p-5 sm:p-6 lg:col-span-2">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-[1.45rem] font-semibold text-forest-900">Recommendations</h2>
            <Pill tone="saffron"><Icon name="spark" size={12} /> AI suggestion – not a survey fact</Pill>
          </div>
          <p className="max-w-3xl text-sm leading-relaxed text-ink">
            AI-written recommendations will always appear in a gold dashed panel like this one, separate from the facts above. No AI provider is connected in this preview, so no recommendation has been generated.
          </p>
        </section>
      </div>
    </>
  );
}

/* ───────────────────────────── Settings ───────────────────────────── */

export function Settings({ rows, onLogout }: PageProps & { onLogout: () => void }) {
  const [copied, setCopied] = useState(false);
  const link = "https://punjab-family-getaway.<your-subdomain>.workers.dev";
  const line = (k: string, v: ReactNode) => (
    <div className="flex items-baseline justify-between gap-4 py-2.5 text-sm"><dt className="text-muted">{k}</dt><dd className="text-right font-medium text-ink">{v}</dd></div>
  );
  return (
    <>
      <PageTitle eyebrow="Configuration" title="Settings" />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Trip details" subtitle="Read from the trip configuration file">
          <dl className="divide-y divide-sand/60">
            {line("Trip", TRIP.name)}{line("Dates", TRIP.dates)}{line("Destination", `${TRIP.destination} (optional: ${TRIP.optionalDestination})`)}
            {line("Starting from", TRIP.start)}{line("Travellers", "11 adults, 1 child (2 years)")}{line("Vehicles", TRIP.vehicleDetail)}{line("Stay", TRIP.rooms)}
          </dl>
        </Card>
        <div className="grid content-start gap-5">
          <Card title="Public survey link" subtitle="Share this on WhatsApp. It never shows the dashboard or anyone's answers.">
            <div className="flex gap-2">
              <input readOnly value={link} aria-label="Public survey link" className={`${input} font-mono text-xs`} />
              <button type="button" className={btn.ghost} onClick={async () => { try { await navigator.clipboard.writeText(link); setCopied(true); } catch { setCopied(false); } }}>
                <Icon name={copied ? "check" : "copy"} size={16} /> {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="mt-2 text-xs text-muted">Placeholder – your real link is created when the app is deployed.</p>
          </Card>
          <Card title="AI Trip Assistant" action={<Pill tone="muted">Not configured</Pill>}>
            <p className="text-sm leading-relaxed text-ink">The dashboard and all analytics work without AI. To switch the assistant on later, set a provider and its key as server secrets – keys are never placed in the browser.</p>
            <dl className="mt-3 divide-y divide-sand/60 font-mono text-xs">
              {line("AI_PROVIDER", "none · anthropic · gemini")}{line("ANTHROPIC_API_KEY", "not set")}{line("GEMINI_API_KEY", "not set")}
            </dl>
          </Card>
        </div>
        <Card title="Data and backup" subtitle={`${rows.length} responses stored`}>
          <p className="text-sm leading-relaxed text-ink">Export everything as CSV from Family Responses at any time. A full database backup command is included in the deployment guide.</p>
        </Card>
        <Card title="Administrator session">
          <p className="text-sm leading-relaxed text-ink">You are signed in as the trip administrator. Sessions end automatically after 12 hours.</p>
          <button type="button" className={`${btn.ghost} mt-4`} onClick={onLogout}><Icon name="logout" size={16} /> Log out</button>
        </Card>
      </div>
    </>
  );
}
