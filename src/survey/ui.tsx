import type { ReactNode } from "react";
import type { Activity, Option } from "@shared/trip";
import { Icon } from "../components/Icon";
import { Photo } from "../components/Photo";

export function StepHeader({ eyebrow, title, intro }: { eyebrow: string; title: string; intro?: string }) {
  return (
    <header className="mb-8 animate-rise">
      <p className="mb-3 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-gold-600">
        <span className="h-px w-8 bg-gold-400" />
        {eyebrow}
      </p>
      <h1 className="font-display text-[2.1rem] font-semibold leading-[1.08] text-forest-900 sm:text-5xl">{title}</h1>
      {intro && <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">{intro}</p>}
    </header>
  );
}

export function Question({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="font-display text-2xl font-semibold text-forest-900">
        {label}
        {required && <span className="ml-2 align-middle font-sans text-xs font-semibold uppercase tracking-wider text-saffron-600">Required</span>}
      </h2>
      {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="mb-8 flex gap-3 rounded-2xl border border-gold-200 bg-gold-100/60 px-4 py-3.5 text-sm leading-relaxed text-forest-900">
      <Icon name="info" size={18} className="mt-0.5 text-gold-600" />
      <p>{children}</p>
    </div>
  );
}

export function ChoiceGroup({ label, options, value, onChange, columns = 1 }: { label: string; options: Option[]; value: string; onChange: (id: string) => void; columns?: 1 | 2 }) {
  return (
    <div role="radiogroup" aria-label={label} className={`stagger grid gap-3 ${columns === 2 ? "sm:grid-cols-2" : ""}`}>
      {options.map((o) => {
        const on = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(on ? "" : o.id)}
            className={`group flex items-center gap-4 rounded-2xl border px-5 py-4 text-left transition-all duration-200 ${
              on ? "border-forest-800 bg-forest-800 text-ivory shadow-lift" : "border-sand bg-white/70 text-ink shadow-soft hover:-translate-y-0.5 hover:border-gold-400 hover:bg-white"
            }`}
          >
            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors ${on ? "border-gold-300 bg-gold-400 text-forest-950" : "border-sand bg-ivory text-transparent group-hover:border-gold-400"}`}>
              <Icon name="check" size={14} stroke={2.6} />
            </span>
            <span>
              <span className="block font-medium">{o.label}</span>
              {o.hint && <span className={`mt-0.5 block text-sm ${on ? "text-forest-100" : "text-muted"}`}>{o.hint}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function Chip({ on, disabled, onClick, children }: { on: boolean; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 py-2 text-left text-sm font-medium transition-all duration-200 ${
        on
          ? "border-forest-800 bg-forest-800 text-ivory shadow-soft"
          : disabled
            ? "border-sand/70 bg-cream/50 text-muted/60"
            : "border-sand bg-white/70 text-ink hover:border-gold-400 hover:bg-white"
      }`}
    >
      {on && <Icon name="check" size={14} stroke={2.6} className="animate-pop text-gold-300" />}
      {children}
    </button>
  );
}

export function ChipGroup({ label, options, values, onToggle }: { label: string; options: Option[]; values: string[]; onToggle: (id: string) => void }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2.5">
      {options.map((o) => (
        <Chip key={o.id} on={values.includes(o.id)} onClick={() => onToggle(o.id)}>
          {o.label}
        </Chip>
      ))}
    </div>
  );
}

export function ActivityCard({ activity, on, onToggle }: { activity: Activity; on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onToggle}
      className={`group relative flex overflow-hidden rounded-3xl border bg-white text-left transition-all duration-300 sm:flex-col ${
        on ? "border-forest-800 shadow-lift ring-2 ring-forest-800" : "border-sand/80 shadow-soft hover:-translate-y-1 hover:shadow-lift"
      }`}
    >
      <div className="relative w-[34%] shrink-0 sm:w-full">
        <Photo id={activity.id} width={640} alt={activity.title} scene={activity.scene} tone={activity.tone} className="h-full min-h-32 sm:aspect-[4/3] sm:h-auto [&>svg]:transition-transform [&>svg]:duration-700 group-hover:[&>svg]:scale-105 [&>img]:transition-transform [&>img]:duration-700 group-hover:[&>img]:scale-105" />
        <div className={`absolute inset-0 transition-colors duration-300 ${on ? "bg-forest-900/35" : "bg-transparent"}`} />
        {activity.note && (
          <span className="absolute bottom-2 left-2 right-2 hidden w-fit rounded-full bg-ivory/95 px-2.5 py-1 text-[11px] font-semibold text-forest-900 sm:block">{activity.note}</span>
        )}
      </div>
      <div className="flex-1 p-4 pr-12 sm:p-5 sm:pr-5">
        <h3 className="font-display text-xl font-semibold leading-tight text-forest-900">{activity.title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">{activity.description}</p>
        {activity.note && <p className="mt-2 text-xs font-semibold text-gold-600 sm:hidden">{activity.note}</p>}
      </div>
      <span
        className={`absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-200 ${
          on ? "border-gold-300 bg-gold-400 text-forest-950" : "border-sand bg-ivory/90 text-transparent sm:border-white/80 sm:bg-white/30 sm:backdrop-blur"
        }`}
      >
        {on && <Icon name="check" size={16} stroke={2.8} className="animate-pop" />}
      </span>
      <span className="sr-only">{on ? "Selected" : "Not selected"}</span>
    </button>
  );
}

const fieldBase =
  "w-full rounded-xl border border-sand bg-white/80 px-4 py-3 text-base text-ink placeholder:text-muted/60 shadow-soft transition-colors focus:border-forest-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-forest-600/20";

export function Field({ label, optional, error, children }: { label: string; optional?: boolean; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-forest-900">
        {label}
        {optional && <span className="text-xs font-normal text-muted">Optional</span>}
      </span>
      {children}
      {error && <span className="mt-1.5 block text-sm font-medium text-rose-600">{error}</span>}
    </label>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${fieldBase} ${props.className ?? ""}`} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={4} {...props} className={`${fieldBase} resize-y leading-relaxed ${props.className ?? ""}`} />;
}

export function Select({ options, placeholder = "Select…", ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { options: Option[]; placeholder?: string }) {
  return (
    <select {...props} className={`${fieldBase} appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23667066%22 stroke-width=%222%22><path d=%22M6 9l6 6 6-6%22/></svg>')] bg-[length:1.1rem] bg-[right_0.9rem_center] bg-no-repeat pr-10 ${props.className ?? ""}`}>
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
