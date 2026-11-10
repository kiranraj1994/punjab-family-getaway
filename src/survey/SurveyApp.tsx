import { useEffect, useMemo, useRef, useState } from "react";
import {
  ACCOMMODATION_BUDGETS, ACCOMMODATION_TYPES, ACTIVITY_BUDGETS, CATEGORIES, CHANDIGARH_OPTIONS,
  DATE_OPTIONS, EMPTY_ANSWERS, EMPTY_PROPERTY, FACILITIES, MAX_PROPERTIES, PACE_OPTIONS, PLATFORMS,
  PRIORITY_COUNT, TRIP, YES_NO_UNSURE, activityTitle, labelOf,
  type ActivityCategory, type CategoryKey, type PropertySuggestion, type SurveyAnswers,
} from "@shared/trip";
import { Icon, type IconName } from "../components/Icon";
import { Photo } from "../components/Photo";
import { photoCredits } from "../lib/photos";
import { submitSurvey } from "../lib/api";
import { IS_PREVIEW } from "../lib/env";
import { clearDraft, loadDraft, newSubmissionId, saveDraft } from "../lib/draft";
import { ActivityCard, Chip, ChipGroup, ChoiceGroup, Field, Notice, Question, Select, StepHeader, TextArea, TextInput } from "./ui";

const STEPS = ["welcome", "dates", "stay", "amritsar", "exhibitions", "gardens", "farm", "chandigarh", "preferences", "properties", "review"] as const;
type StepId = (typeof STEPS)[number];

const STEP_LABEL: Record<StepId, string> = {
  welcome: "Welcome", dates: "Travel dates", stay: "Accommodation", amritsar: "Amritsar attractions",
  exhibitions: "Exhibitions, shopping & food", gardens: "Gardens & nature", farm: "Farm & village",
  chandigarh: "Chandigarh", preferences: "Trip preferences", properties: "Places to stay", review: "Review & submit",
};

const CATEGORY_STEP: Record<CategoryKey, StepId> = {
  amritsar_activities: "amritsar", exhibitions_and_shopping: "exhibitions", gardens_and_nature: "gardens",
  farm_and_village_activities: "farm", chandigarh_activities: "chandigarh",
};
const categoryFor = (step: StepId) => CATEGORIES.find((c) => CATEGORY_STEP[c.key] === step);

type Setter = <K extends keyof SurveyAnswers>(key: K, value: SurveyAnswers[K]) => void;
interface StepProps {
  data: SurveyAnswers;
  set: Setter;
  toggle: (key: CategoryKey | "accommodation_facilities", id: string) => void;
}

function validate(step: StepId, d: SurveyAnswers): string | null {
  if (step === "dates" && !d.date_confirmation) return "Please let us know whether you can join.";
  if (step === "preferences" && d.top_three_priorities.length !== PRIORITY_COUNT)
    return `Please choose exactly three priorities – you have chosen ${d.top_three_priorities.length}.`;
  if (step === "review" && !d.respondent_name.trim()) return "Please enter your name so we know whose preferences these are.";
  return null;
}

export default function SurveyApp({ previewLink }: { previewLink?: React.ReactNode }) {
  const draft = useMemo(loadDraft, []);
  const [data, setData] = useState<SurveyAnswers>(draft?.data ?? EMPTY_ANSWERS);
  const [index, setIndex] = useState(draft?.index ?? 0);
  const [submissionId, setSubmissionId] = useState(draft?.submissionId ?? newSubmissionId());
  const [fromReview, setFromReview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "submitting" | "done">("idle");
  const [honeypot, setHoneypot] = useState("");
  const startedAt = useRef(draft?.startedAt ?? Date.now());
  const step = STEPS[index];

  useEffect(() => {
    if (status !== "done") saveDraft({ data, index, submissionId, startedAt: startedAt.current });
  }, [data, index, submissionId, status]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
    setError(null);
  }, [index]);

  const set: Setter = (key, value) => {
    setData((d) => ({ ...d, [key]: value }));
    setError(null);
  };
  const toggle: StepProps["toggle"] = (key, id) =>
    setData((d) => ({ ...d, [key]: d[key].includes(id) ? d[key].filter((x) => x !== id) : [...d[key], id] }));

  const goTo = (target: StepId, editing = false) => {
    setFromReview(editing);
    setIndex(STEPS.indexOf(target));
  };
  const next = () => {
    const problem = validate(step, data);
    if (problem) return setError(problem);
    if (fromReview) return goTo("review");
    setIndex((i) => Math.min(i + 1, STEPS.length - 1));
  };
  const previous = () => {
    setFromReview(false);
    setIndex((i) => Math.max(i - 1, 0));
  };

  const submit = async () => {
    const problem = (["dates", "preferences", "review"] as StepId[]).map((s) => validate(s, data)).find(Boolean);
    if (problem) return setError(problem);
    setStatus("submitting");
    setError(null);
    const result = await submitSurvey({ ...data, submission_id: submissionId, website: honeypot, started_at: startedAt.current });
    if (result.success) {
      clearDraft();
      setStatus("done");
    } else {
      setStatus("idle");
      setError(result.message);
    }
  };

  const restart = () => {
    setData(EMPTY_ANSWERS);
    setSubmissionId(newSubmissionId());
    startedAt.current = Date.now();
    setIndex(0);
    setStatus("idle");
  };

  if (status === "done") return <ThankYou name={data.respondent_name} onRestart={restart} />;
  if (step === "welcome") return <Welcome onStart={() => setIndex(1)} resumed={Boolean(draft && draft.index > 0)} previewLink={previewLink} />;

  const props: StepProps = { data, set, toggle };
  const category = categoryFor(step);
  const total = STEPS.length - 1;

  return (
    <div className="min-h-dvh bg-ivory">
      <header className="sticky top-0 z-30 border-b border-sand/70 bg-ivory/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-3.5">
          <button type="button" onClick={() => setIndex(0)} className="font-display text-lg font-semibold tracking-wide text-forest-900">
            Punjab Family Getaway <span className="text-gold-500">2026</span>
          </button>
          <p className="shrink-0 text-xs font-semibold uppercase tracking-[0.16em] text-muted" aria-live="polite">
            Step {index} <span className="text-sand">/</span> {total}
          </p>
        </div>
        <div className="h-1 bg-sand/50" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={index} aria-label={`Step ${index} of ${total}: ${STEP_LABEL[step]}`}>
          <div className="h-full rounded-r-full bg-gradient-to-r from-forest-700 via-gold-500 to-saffron-500 transition-[width] duration-500 ease-out" style={{ width: `${(index / total) * 100}%` }} />
        </div>
      </header>

      <main key={step} className="mx-auto max-w-5xl px-5 pb-36 pt-9 sm:pt-14">
        {step === "dates" && <DatesStep {...props} />}
        {step === "stay" && <StayStep {...props} />}
        {category && <ActivityStep category={category} {...props} />}
        {step === "preferences" && <PreferencesStep {...props} />}
        {step === "properties" && <PropertiesStep {...props} />}
        {step === "review" && <ReviewStep {...props} onEdit={(s) => goTo(s, true)} honeypot={honeypot} setHoneypot={setHoneypot} error={error} />}
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-sand/70 bg-ivory/95 backdrop-blur-md">
        {error && (
          <p role="alert" className="animate-fade border-b border-rose-600/20 bg-rose-600/10 px-5 py-2.5 text-center text-sm font-medium text-rose-600">
            {error}
          </p>
        )}
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-5 py-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))]">
          <button type="button" onClick={previous} className="inline-flex items-center gap-1.5 rounded-full px-4 py-3 text-sm font-semibold text-forest-800 transition-colors hover:bg-forest-50">
            <Icon name="left" size={16} stroke={2.2} /> Previous
          </button>
          {step === "review" ? (
            <button type="button" onClick={submit} disabled={status === "submitting"} className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-saffron-500 to-gold-500 px-6 py-3.5 text-sm font-bold uppercase tracking-[0.12em] text-forest-950 shadow-lift transition-all hover:brightness-105 disabled:opacity-70">
              {status === "submitting" ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-forest-950/30 border-t-forest-950" /> Saving…
                </>
              ) : (
                "Submit my preferences"
              )}
            </button>
          ) : (
            <button type="button" onClick={next} className="inline-flex items-center gap-2 rounded-full bg-forest-800 px-7 py-3.5 text-sm font-semibold uppercase tracking-[0.12em] text-ivory shadow-lift transition-all hover:bg-forest-700">
              {fromReview ? "Back to review" : "Next"} <Icon name="right" size={16} stroke={2.2} />
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}

/* ───────────────────────────── Welcome ───────────────────────────── */

const ITINERARY_NOTE = "Once everyone has submitted their preferences, the final itinerary will be shared with the whole family.";

const FACTS: { icon: IconName; label: string }[] = [
  { icon: "calendar", label: TRIP.dates },
  { icon: "pin", label: TRIP.destination },
  { icon: "users", label: TRIP.travellers },
  { icon: "car", label: TRIP.vehicles },
  { icon: "moon", label: TRIP.nights },
];

function Welcome({ onStart, resumed, previewLink }: { onStart: () => void; resumed: boolean; previewLink?: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col bg-forest-950 text-ivory">
      <Photo id="hero" alt="The Golden Temple illuminated at night, reflected in the sarovar" scene="temple" eager width={1600} className="!absolute inset-x-0 top-0 h-[58dvh] w-full sm:left-[36%] sm:h-full sm:w-[64%]" />
      <div className="absolute inset-0 bg-gradient-to-b from-forest-950/50 via-forest-950/10 via-30% to-forest-950 to-[58dvh] sm:via-forest-950/30 sm:via-40% sm:to-forest-950/95 sm:to-100%" />
      <div className="absolute inset-y-0 left-[36%] right-0 hidden bg-gradient-to-r from-forest-950 via-forest-950/30 to-transparent sm:block" />
      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 pb-10 pt-7 sm:px-10 sm:pb-16">
        <div className="flex animate-fade items-center justify-between gap-3">
          <p className="whitespace-nowrap font-display text-base tracking-wide text-ivory/90 sm:text-lg">
            Family Road Trip <span className="mx-1 text-gold-300 sm:mx-2">·</span> Dec 2026
          </p>
          {previewLink}
        </div>
        <div className="mt-auto max-w-3xl pt-[26dvh] sm:pt-10">
          <p className="mb-5 flex animate-rise items-center gap-3 text-xs font-semibold uppercase tracking-[0.28em] text-gold-300">
            <span className="h-px w-10 bg-gold-300" /> You're invited to plan with us
          </p>
          <h1 aria-label="Punjab Family Getaway 2026" className="animate-rise font-display text-[3.4rem] font-semibold leading-[0.95] sm:text-8xl">
            Punjab Family
            <br />
            Getaway <span className="italic text-gold-300">2026</span>
          </h1>
          <p className="mt-6 max-w-xl animate-rise text-lg leading-relaxed text-ivory/90 [animation-delay:120ms] sm:text-xl">{TRIP.subtitle}</p>
          <ul className="stagger mt-8 flex flex-wrap gap-2.5">
            {FACTS.map((f) => (
              <li key={f.label} className="inline-flex items-center gap-2 rounded-full border border-ivory/20 bg-ivory/10 px-4 py-2 text-sm font-medium backdrop-blur-md">
                <Icon name={f.icon} size={16} className="text-gold-300" /> {f.label}
              </li>
            ))}
          </ul>
          <p className="mt-8 max-w-xl animate-rise text-base leading-relaxed text-ivory/80 [animation-delay:240ms]">{TRIP.intro}</p>
          <div className="mt-8 flex animate-rise flex-wrap items-center gap-x-6 gap-y-3 [animation-delay:320ms]">
            <button type="button" onClick={onStart} className="group inline-flex items-center gap-3 rounded-full bg-gold-400 px-8 py-4 text-sm font-bold uppercase tracking-[0.18em] text-forest-950 shadow-lift transition-all hover:bg-gold-300">
              {resumed ? "Continue planning" : "Start planning"}
              <Icon name="right" size={18} stroke={2.4} className="transition-transform group-hover:translate-x-1" />
            </button>
            <p className="text-sm text-ivory/70">Takes about 5 minutes · No login needed</p>
          </div>
          <p className="mt-7 flex max-w-xl animate-rise items-start gap-2.5 rounded-2xl border border-gold-300/30 bg-gold-300/10 px-4 py-3 text-sm leading-relaxed text-ivory/90 backdrop-blur-sm [animation-delay:400ms]">
            <Icon name="info" size={17} className="mt-0.5 text-gold-300" />
            <span>{ITINERARY_NOTE}</span>
          </p>
          <PhotoCredits className="mt-5 text-ivory/60 hover:text-ivory" />
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────────── Steps ───────────────────────────── */

function DatesStep({ data, set }: StepProps) {
  return (
    <div className="mx-auto max-w-2xl">
      <StepHeader eyebrow="Travel dates" title="Can you join the trip from 3–6 December 2026?" intro={`We set off from ${TRIP.start} on Thursday 3 December and return on Sunday 6 December.`} />
      <ChoiceGroup label="Date confirmation" options={DATE_OPTIONS} value={data.date_confirmation} onChange={(v) => set("date_confirmation", v)} />
    </div>
  );
}

function StayStep({ data, set, toggle }: StepProps) {
  return (
    <div className="mx-auto max-w-3xl">
      <StepHeader eyebrow="Accommodation" title="Where should we stay?" intro={`We need ${TRIP.rooms} for 11 adults and a two-year-old, with space for three cars.`} />
      <Question label="Preferred accommodation">
        <ChoiceGroup label="Preferred accommodation" options={ACCOMMODATION_TYPES} value={data.accommodation_type} onChange={(v) => set("accommodation_type", v)} columns={2} />
      </Question>
      <Question label="Budget per room, per night">
        <ChoiceGroup label="Budget per room per night" options={ACCOMMODATION_BUDGETS} value={data.accommodation_budget} onChange={(v) => set("accommodation_budget", v)} columns={2} />
      </Question>
      <Question label="Facilities that matter to you" hint="Choose as many as you like.">
        <ChipGroup label="Facilities" options={FACILITIES} values={data.accommodation_facilities} onToggle={(id) => toggle("accommodation_facilities", id)} />
      </Question>
      <Field label="Anything else we should look for?" optional>
        <TextArea value={data.additional_accommodation_requirements} maxLength={1000} onChange={(e) => set("additional_accommodation_requirements", e.target.value)} placeholder="e.g. ground-floor room for grandparents, close to the Golden Temple…" />
      </Field>
    </div>
  );
}

function ActivityStep({ category, data, set, toggle }: StepProps & { category: ActivityCategory }) {
  const selected = data[category.key];
  return (
    <div>
      <StepHeader eyebrow={category.eyebrow} title={category.title} intro={category.intro} />
      {category.notice && <Notice>{category.notice}</Notice>}
      <div className="mb-5 flex items-center justify-between text-sm">
        <p className="font-medium text-forest-800" aria-live="polite">
          {selected.length === 0 ? "Nothing selected yet" : `${selected.length} of ${category.activities.length} selected`}
        </p>
        {selected.length > 0 && (
          <button type="button" onClick={() => set(category.key, [])} className="font-medium text-muted underline-offset-4 hover:text-forest-800 hover:underline">
            Clear all
          </button>
        )}
      </div>
      <div className="stagger grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
        {category.activities.map((a) => (
          <ActivityCard key={a.id} activity={a} on={selected.includes(a.id)} onToggle={() => toggle(category.key, a.id)} />
        ))}
      </div>
      {category.key === "chandigarh_activities" && (
        <div className="mx-auto mt-14 max-w-3xl">
          <Question label="Would you like to include Chandigarh?">
            <ChoiceGroup label="Include Chandigarh" options={CHANDIGARH_OPTIONS} value={data.chandigarh_preference} onChange={(v) => set("chandigarh_preference", v)} columns={2} />
          </Question>
        </div>
      )}
    </div>
  );
}

function PreferencesStep({ data, set }: StepProps) {
  const picks = data.top_three_priorities;
  const full = picks.length >= PRIORITY_COUNT;
  const mine = new Set(CATEGORIES.flatMap((c) => data[c.key]));
  const togglePick = (id: string) => {
    if (picks.includes(id)) set("top_three_priorities", picks.filter((x) => x !== id));
    else if (!full) set("top_three_priorities", [...picks, id]);
  };
  return (
    <div className="mx-auto max-w-3xl">
      <StepHeader eyebrow="Overall preferences" title="How should the trip feel?" />
      <Question label="Trip pace">
        <ChoiceGroup label="Trip pace" options={PACE_OPTIONS} value={data.trip_pace} onChange={(v) => set("trip_pace", v)} />
      </Question>
      <Question label="Activity budget per person" hint="For entry tickets and experiences, not including food and stay.">
        <ChoiceGroup label="Activity budget per person" options={ACTIVITY_BUDGETS} value={data.activity_budget} onChange={(v) => set("activity_budget", v)} columns={2} />
      </Question>

      <Question label="Your top 3 priorities" required hint="If we could only do three things, which should they be? Activities you picked earlier are marked with a heart.">
        <div className="sticky top-[4.2rem] z-20 -mx-2 mb-5 rounded-2xl border border-sand bg-ivory/95 p-3 shadow-soft backdrop-blur">
          <div className="grid gap-1.5 sm:grid-cols-3 sm:gap-2" aria-live="polite">
            {Array.from({ length: PRIORITY_COUNT }, (_, i) => (
              <div key={i} className={`flex min-h-9 items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-medium leading-snug sm:min-h-14 sm:py-2 ${picks[i] ? "animate-pop bg-forest-800 text-ivory" : "border border-dashed border-gold-400 text-muted"}`}>
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-display text-base font-bold ${picks[i] ? "bg-gold-400 text-forest-950" : "bg-gold-100 text-gold-600"}`}>{i + 1}</span>
                <span className="truncate sm:line-clamp-2 sm:whitespace-normal">{picks[i] ? activityTitle(picks[i]) : `Choose priority ${i + 1}`}</span>
              </div>
            ))}
          </div>
        </div>
        {CATEGORIES.map((c) => (
          <div key={c.key} className="mb-6">
            <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-gold-600">{c.shortTitle}</h3>
            <div className="flex flex-wrap gap-2">
              {c.activities.map((a) => (
                <Chip key={a.id} on={picks.includes(a.id)} disabled={full && !picks.includes(a.id)} onClick={() => togglePick(a.id)}>
                  {a.title}
                  {mine.has(a.id) && !picks.includes(a.id) && <Icon name="heart" size={13} className="text-saffron-500" stroke={2.2} />}
                </Chip>
              ))}
            </div>
          </div>
        ))}
      </Question>

      <div className="grid gap-6">
        <Field label="Any other suggestions for the trip?" optional>
          <TextArea value={data.additional_suggestions} maxLength={1500} onChange={(e) => set("additional_suggestions", e.target.value)} placeholder="Places to eat, things to avoid, ideas for the drive…" />
        </Field>
        <Field label="Child and family requirements" optional>
          <TextArea value={data.child_family_requirements} maxLength={1500} onChange={(e) => set("child_family_requirements", e.target.value)} placeholder="Anything we should plan for our two-year-old traveller or other family members – nap times, mobility, dietary or medical needs…" />
        </Field>
      </div>
    </div>
  );
}

function PropertiesStep({ data, set }: StepProps) {
  const list = data.property_suggestions;
  const update = (i: number, patch: Partial<PropertySuggestion>) => set("property_suggestions", list.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  const text = (i: number, key: keyof PropertySuggestion, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <TextInput value={list[i][key]} onChange={(e) => update(i, { [key]: e.target.value })} {...extra} />
  );
  return (
    <div className="mx-auto max-w-3xl">
      <StepHeader eyebrow="Accommodation suggestions" title="Seen a place you love?" intro="Share up to three hotels, villas or homestays. Everything on this page is optional – skip it if you have nothing in mind." />
      <div className="grid gap-6">
        {list.map((p, i) => (
          <article key={i} className="animate-rise rounded-3xl border border-sand bg-white/80 p-5 shadow-soft sm:p-7">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-2xl font-semibold text-forest-900">Property {i + 1}</h2>
              <button type="button" onClick={() => set("property_suggestions", list.filter((_, j) => j !== i))} className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-600/10">
                <Icon name="trash" size={16} /> Remove
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2"><Field label="Property name">{text(i, "name", { maxLength: 120, placeholder: "e.g. Heritage Haveli Amritsar" })}</Field></div>
              <div className="sm:col-span-2"><Field label="Website / booking link">{text(i, "link", { type: "url", inputMode: "url", maxLength: 500, placeholder: "https://" })}</Field></div>
              <Field label="Platform"><Select options={PLATFORMS} value={p.platform} onChange={(e) => update(i, { platform: e.target.value })} /></Field>
              <Field label="Total for 3 nights, incl. taxes (₹)">{text(i, "total_price", { type: "number", inputMode: "numeric", min: 0, placeholder: "e.g. 48000" })}</Field>
              <Field label="Property rating">{text(i, "rating", { maxLength: 12, placeholder: "e.g. 4.6 or 8.9/10" })}</Field>
              <Field label="Number of reviews">{text(i, "review_count", { type: "number", inputMode: "numeric", min: 0 })}</Field>
              <Field label="Bedrooms">{text(i, "bedrooms", { type: "number", inputMode: "numeric", min: 0, max: 30 })}</Field>
              <Field label="Bathrooms">{text(i, "bathrooms", { type: "number", inputMode: "numeric", min: 0, max: 30 })}</Field>
              <Field label="Parking for 3 cars"><Select options={YES_NO_UNSURE} value={p.parking} onChange={(e) => update(i, { parking: e.target.value })} /></Field>
              <Field label="Breakfast available"><Select options={YES_NO_UNSURE} value={p.breakfast} onChange={(e) => update(i, { breakfast: e.target.value })} /></Field>
              <Field label="Free cancellation"><Select options={YES_NO_UNSURE} value={p.free_cancellation} onChange={(e) => update(i, { free_cancellation: e.target.value })} /></Field>
              <div className="sm:col-span-2"><Field label="Additional comments"><TextArea rows={3} maxLength={800} value={p.comments} onChange={(e) => update(i, { comments: e.target.value })} /></Field></div>
            </div>
          </article>
        ))}
        {list.length < MAX_PROPERTIES ? (
          <button type="button" onClick={() => set("property_suggestions", [...list, { ...EMPTY_PROPERTY }])} className="flex items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-gold-400 bg-gold-100/40 px-6 py-8 font-semibold text-forest-800 transition-colors hover:bg-gold-100">
            <Icon name="plus" size={20} /> {list.length === 0 ? "Suggest a property" : "Add another property"}
            <span className="font-normal text-muted">({list.length}/{MAX_PROPERTIES})</span>
          </button>
        ) : (
          <p className="text-center text-sm text-muted">That's the maximum of three suggestions.</p>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────────── Review ───────────────────────────── */

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 py-2.5 sm:grid-cols-[11rem_1fr] sm:gap-4">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-sm font-medium text-ink">{children || <span className="font-normal text-muted/70">Not answered</span>}</dd>
    </div>
  );
}

function Tags({ ids }: { ids: string[] }) {
  if (!ids.length) return null;
  return (
    <span className="flex flex-wrap gap-1.5">
      {ids.map((id) => (
        <span key={id} className="rounded-full bg-forest-50 px-2.5 py-1 text-xs font-medium text-forest-800">{id}</span>
      ))}
    </span>
  );
}

function ReviewCard({ title, onEdit, children }: { title: string; onEdit: () => void; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-sand bg-white/80 p-5 shadow-soft sm:p-6">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-semibold text-forest-900">{title}</h2>
        <button type="button" onClick={onEdit} aria-label={`Edit ${title}`} className="inline-flex items-center gap-1.5 rounded-full border border-sand px-3.5 py-2 text-sm font-semibold text-forest-800 transition-colors hover:border-gold-400 hover:bg-gold-100/50">
          <Icon name="edit" size={15} /> Edit
        </button>
      </div>
      <dl className="divide-y divide-sand/60">{children}</dl>
    </section>
  );
}

function ReviewStep({ data, set, onEdit, honeypot, setHoneypot, error }: StepProps & { onEdit: (s: StepId) => void; honeypot: string; setHoneypot: (v: string) => void; error: string | null }) {
  const titles = (ids: string[]) => ids.map(activityTitle);
  const nameMissing = Boolean(error) && !data.respondent_name.trim();
  return (
    <div className="mx-auto max-w-3xl">
      <StepHeader eyebrow="Review & submit" title="One last look" intro="Check your answers, add your name and send them to the family planners. Only the organiser can see what you submit." />
      <Notice>{ITINERARY_NOTE}</Notice>
      <div className="stagger grid gap-5">
        <ReviewCard title="Travel dates" onEdit={() => onEdit("dates")}>
          <Row label="Joining">{labelOf(DATE_OPTIONS, data.date_confirmation)}</Row>
        </ReviewCard>
        <ReviewCard title="Accommodation" onEdit={() => onEdit("stay")}>
          <Row label="Type">{labelOf(ACCOMMODATION_TYPES, data.accommodation_type)}</Row>
          <Row label="Budget per room">{labelOf(ACCOMMODATION_BUDGETS, data.accommodation_budget)}</Row>
          <Row label="Facilities"><Tags ids={data.accommodation_facilities.map((f) => labelOf(FACILITIES, f))} /></Row>
          {data.additional_accommodation_requirements && <Row label="Other requirements">{data.additional_accommodation_requirements}</Row>}
        </ReviewCard>
        <ReviewCard title="Activities" onEdit={() => onEdit("amritsar")}>
          {CATEGORIES.map((c) => (
            <div key={c.key} className="grid gap-1 py-2.5 sm:grid-cols-[11rem_1fr] sm:gap-4">
              <dt className="text-sm text-muted">
                <button type="button" onClick={() => onEdit(CATEGORY_STEP[c.key])} className="text-left underline decoration-sand underline-offset-4 hover:text-forest-800 hover:decoration-gold-400">{c.shortTitle}</button>
              </dt>
              <dd className="text-sm font-medium">{data[c.key].length ? <Tags ids={titles(data[c.key])} /> : <span className="font-normal text-muted/70">None selected</span>}</dd>
            </div>
          ))}
          <Row label="Include Chandigarh?">{labelOf(CHANDIGARH_OPTIONS, data.chandigarh_preference)}</Row>
        </ReviewCard>
        <ReviewCard title="Trip preferences" onEdit={() => onEdit("preferences")}>
          <Row label="Pace">{labelOf(PACE_OPTIONS, data.trip_pace)}</Row>
          <Row label="Activity budget">{labelOf(ACTIVITY_BUDGETS, data.activity_budget)}</Row>
          <Row label="Top 3 priorities">
            {data.top_three_priorities.length > 0 && (
              <ol className="grid gap-1">
                {titles(data.top_three_priorities).map((t, i) => (
                  <li key={t} className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gold-400 font-display text-sm font-bold text-forest-950">{i + 1}</span> {t}
                  </li>
                ))}
              </ol>
            )}
          </Row>
          {data.additional_suggestions && <Row label="Suggestions">{data.additional_suggestions}</Row>}
          {data.child_family_requirements && <Row label="Child & family needs">{data.child_family_requirements}</Row>}
        </ReviewCard>
        <ReviewCard title="Places to stay" onEdit={() => onEdit("properties")}>
          {data.property_suggestions.filter((p) => p.name.trim()).length === 0 ? (
            <p className="py-2.5 text-sm text-muted/80">No properties suggested.</p>
          ) : (
            data.property_suggestions.filter((p) => p.name.trim()).map((p, i) => (
              <Row key={i} label={`Property ${i + 1}`}>
                {p.name}
                <span className="block font-normal text-muted">
                  {[labelOf(PLATFORMS, p.platform), p.total_price && `₹${Number(p.total_price).toLocaleString("en-IN")} for 3 nights`, p.rating && `Rated ${p.rating}`, p.bedrooms && `${p.bedrooms} bedrooms`].filter(Boolean).join(" · ")}
                </span>
              </Row>
            ))
          )}
        </ReviewCard>

        <section className="rounded-3xl bg-forest-900 p-6 text-ivory shadow-lift sm:p-8">
          <h2 className="font-display text-3xl font-semibold">Who is this from?</h2>
          <p className="mt-1 text-sm text-forest-100">So the organiser knows whose preferences these are.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 [&_span]:!text-ivory">
            <Field label="Your name" error={nameMissing ? "Your name is required" : undefined}>
              <TextInput autoComplete="name" maxLength={80} value={data.respondent_name} onChange={(e) => set("respondent_name", e.target.value)} aria-required="true" aria-invalid={nameMissing} placeholder="Full name" />
            </Field>
            <Field label="Contact number" optional>
              <TextInput type="tel" inputMode="tel" autoComplete="tel" maxLength={20} value={data.contact_number} onChange={(e) => set("contact_number", e.target.value)} placeholder="+91" />
            </Field>
          </div>
          {/* Honeypot: hidden from people, tempting to bots. */}
          <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
            <label>
              Website
              <input tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
            </label>
          </div>
        </section>
      </div>
    </div>
  );
}

function ThankYou({ name, onRestart }: { name: string; onRestart: () => void }) {
  return (
    <div className="relative flex min-h-dvh items-center justify-center bg-forest-950 px-6 py-16 text-center text-ivory">
      <Photo id="thanks" alt="Winter fields in the Punjab countryside" scene="fields" width={1600} className="!absolute inset-0 h-full w-full opacity-40" />
      <div className="absolute inset-0 bg-gradient-to-b from-forest-950/80 to-forest-950/95" />
      <div className="relative z-10 max-w-xl animate-rise">
        <span className="mx-auto mb-7 flex h-20 w-20 animate-pop items-center justify-center rounded-full bg-gold-400 text-forest-950 shadow-lift">
          <Icon name="check" size={40} stroke={2.4} />
        </span>
        <h1 className="font-display text-6xl font-semibold">Thank You{name.trim() ? `, ${name.trim().split(/\s+/)[0]}` : ""}!</h1>
        <p className="mt-5 text-lg leading-relaxed text-ivory/90">Your preferences have been recorded. Together, let's make this Punjab family trip unforgettable!</p>
        <p className="mx-auto mt-6 max-w-md rounded-2xl border border-ivory/15 bg-ivory/10 px-5 py-4 text-base leading-relaxed text-ivory backdrop-blur-sm">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-gold-300">What happens next</span>
          {ITINERARY_NOTE}
        </p>
        {IS_PREVIEW && <p className="mx-auto mt-8 w-fit rounded-full border border-gold-300/40 bg-gold-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-gold-200">UI preview – this response was not saved</p>}
        <button type="button" onClick={onRestart} className="mt-8 block w-full text-sm font-medium text-ivory/70 underline underline-offset-4 hover:text-ivory">
          Someone else on this phone? Start a new response
        </button>
      </div>
    </div>
  );
}

/* ───────────────────────────── Photo credits ───────────────────────────── */

function PhotoCredits({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const credits = useMemo(photoCredits, []);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`text-xs font-medium underline underline-offset-4 ${className}`}>
        Photo credits
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="Photo credits">
          <div className="absolute inset-0 animate-fade bg-forest-950/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative flex max-h-[85dvh] w-full animate-rise flex-col overflow-hidden rounded-t-3xl bg-ivory text-ink shadow-lift sm:max-w-lg sm:rounded-3xl">
            <div className="flex items-center justify-between border-b border-sand px-6 py-4">
              <h2 className="font-display text-2xl font-semibold text-forest-900">Photo credits</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="rounded-full p-2 text-muted hover:bg-cream hover:text-forest-900">
                <Icon name="x" size={18} />
              </button>
            </div>
            <div className="overflow-y-auto px-6 py-4">
              <p className="mb-3 text-sm leading-relaxed text-muted">Photographs are from Wikimedia Commons and are used under the free licence shown on each photo's page. Pictures without a photograph are illustrations.</p>
              <ul className="divide-y divide-sand/70 text-sm">
                {credits.map((c) => (
                  <li key={c.page} className="flex items-baseline justify-between gap-3 py-2.5">
                    <a href={c.page} target="_blank" rel="noreferrer" className="font-medium text-forest-800 underline decoration-sand underline-offset-4 hover:decoration-gold-400">{c.subject}</a>
                    <span className="shrink-0 text-right text-muted">{c.author}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
