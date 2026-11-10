import { useEffect, useRef, useState } from "react";
import type { Analytics, Tally } from "@shared/analytics";
import { Icon } from "../components/Icon";
import { Pill, btn } from "./charts";
import { PageTitle } from "./pages";

const PROMPTS = [
  "Summarise all family preferences.",
  "Which five activities are most popular?",
  "How many people want Chandigarh?",
  "What accommodation budget do most people prefer?",
  "Compare individual accommodation preferences.",
  "Which activities should we prioritise?",
  "Create a relaxed itinerary based on the responses.",
  "Build a balanced 4-day itinerary.",
  "Which activities have low interest?",
  "Analyse the farm experience preferences.",
  "Summarise special requirements for the child.",
  "Recommend accommodation criteria based on the responses.",
];

interface Reply {
  facts: string[];
  suggestion?: string[];
}
interface Message {
  role: "user" | "assistant";
  text?: string;
  reply?: Reply;
}

const line = (t: Tally, total: number) => `${t.label} — ${t.count} of ${total} (${t.pct}%)`;
const topOf = (items: Tally[]) => [...items].sort((x, y) => y.count - x.count)[0];

/**
 * PHASE 1 stand-in for the AI service. It builds replies from the analytics object with fixed
 * templates so the chat can be tried in the preview. No AI model is called.
 */
function demoReply(question: string, a: Analytics): Reply {
  const q = question.toLowerCase();
  const n = a.total;
  if (n === 0) return { facts: ["No survey responses have been submitted yet, so there is nothing to analyse."] };
  const top5 = a.allActivities.slice(0, 5);
  const pace = topOf(a.pace);
  const budget = topOf(a.accommodationBudgets);
  const type = topOf(a.accommodationTypes);

  if (q.includes("itinerary")) {
    const p = a.priorities.slice(0, 5).map((t) => t.label);
    return {
      facts: [`Most-named priorities: ${p.join("; ")}.`, `Preferred pace: ${line(pace, n)}.`, `Chandigarh: ${a.chandigarhInterested} of ${n} would include it.`],
      suggestion: [
        "Day 1 (Thu 3 Dec): Early start from Ashram, breakfast stop on the highway, check in by late afternoon, Golden Temple evening visit.",
        "Day 2 (Fri 4 Dec): Jallianwala Bagh and Partition Museum in the morning, rest after lunch, leave by 2 pm for the Wagah ceremony.",
        "Day 3 (Sat 5 Dec): Farm visit with tractor ride and farm-to-table lunch, evening food walk and Hall Bazaar.",
        "Day 4 (Sun 6 Dec): Optional early-morning Golden Temple, then drive home.",
      ],
    };
  }
  if (q.includes("chandigarh")) return { facts: [...a.chandigarh.map((t) => line(t, n)), `In total ${a.chandigarhInterested} of ${n} said yes or yes if it fits.`] };
  if (q.includes("low interest")) return { facts: a.consensus.low.length ? a.consensus.low.map((t) => line(t, n)) : ["No activity is at or below 20% interest."] };
  if (q.includes("farm")) return { facts: a.categories.find((c) => c.key === "farm_and_village_activities")!.items.map((t) => line(t, n)) };
  if (q.includes("child")) return { facts: a.notes.child.length ? a.notes.child.map((c) => `${c.name}: “${c.text}”`) : ["No child or family requirements have been entered."] };
  if (q.includes("budget") || q.includes("accommodation"))
    return {
      facts: [`Room budget: ${a.accommodationBudgets.filter((t) => t.count).map((t) => line(t, n)).join("; ")}.`, `Type: ${a.accommodationTypes.filter((t) => t.count).map((t) => line(t, n)).join("; ")}.`, `Most requested facilities: ${a.facilities.slice(0, 5).map((t) => `${t.label} (${t.count})`).join(", ")}.`],
      suggestion: q.includes("recommend") || q.includes("criteria") ? [`Shortlist properties in the ${budget.label} band that offer ${a.facilities.slice(0, 3).map((t) => t.label.toLowerCase()).join(", ")}.`] : undefined,
    };
  if (q.includes("popular") || q.includes("prioriti")) return { facts: top5.map((t, i) => `${i + 1}. ${line(t, n)}`), suggestion: q.includes("prioriti") ? [`Plan around the activities that are both widely selected and named as priorities: ${a.priorities.slice(0, 3).map((t) => t.label).join(", ")}.`] : undefined };
  return {
    facts: [
      `${n} responses received; ${a.fullTrip} can join all four days.`,
      `Accommodation: ${line(type, n)}; room budget ${line(budget, n)}.`,
      `Pace: ${line(pace, n)}.`,
      `Top activities: ${top5.slice(0, 3).map((t) => `${t.label} (${t.count})`).join(", ")}.`,
      `Chandigarh: ${a.chandigarhInterested} of ${n} would include it.`,
    ],
  };
}

export function Assistant({ a }: { a: Analytics }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView?.({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  const ask = (text: string) => {
    const question = text.trim();
    if (!question || busy) return;
    setMessages((m) => [...m, { role: "user", text: question }]);
    setDraft("");
    setBusy(true);
    window.setTimeout(() => {
      setMessages((m) => [...m, { role: "assistant", reply: demoReply(question, a) }]);
      setBusy(false);
    }, 700);
  };

  return (
    <div className="flex h-[calc(100dvh-9.5rem)] min-h-[32rem] flex-col lg:h-[calc(100dvh-6.5rem)]">
      <PageTitle eyebrow="Ask about the survey responses" title="Punjab AI Trip Assistant">
        <button type="button" className={btn.ghost} disabled={!messages.length} onClick={() => setMessages([])}><Icon name="trash" size={16} /> Clear conversation</button>
      </PageTitle>

      <div className="mb-4 flex gap-3 rounded-2xl border border-gold-200 bg-gold-100/60 px-4 py-3 text-sm leading-relaxed text-forest-900">
        <Icon name="info" size={18} className="mt-0.5 text-gold-600" />
        <p><strong>No AI provider is connected.</strong> Replies in this preview are assembled from the demo figures with fixed templates so you can try the chat. Nothing here was written by an AI model.</p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-sand/80 bg-white shadow-soft">
        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6" aria-live="polite">
          {messages.length === 0 && (
            <div className="mx-auto max-w-2xl py-4 text-center">
              <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-forest-800 text-gold-300"><Icon name="spark" size={24} /></span>
              <h2 className="font-display text-3xl font-semibold text-forest-900">What would you like to know?</h2>
              <p className="mt-1 text-sm text-muted">Pick a question or type your own.</p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {PROMPTS.map((p) => (
                  <button key={p} type="button" onClick={() => ask(p)} className="rounded-full border border-sand bg-ivory/60 px-3.5 py-2 text-left text-sm font-medium text-forest-800 transition-colors hover:border-gold-400 hover:bg-gold-100/60">{p}</button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="flex animate-rise justify-end">
                <p className="max-w-[85%] rounded-2xl rounded-br-md bg-forest-800 px-4 py-2.5 text-sm leading-relaxed text-ivory sm:max-w-[70%]">{m.text}</p>
              </div>
            ) : (
              <div key={i} className="flex animate-rise gap-3">
                <span className="mt-1 hidden h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold-100 text-gold-600 sm:flex"><Icon name="spark" size={16} /></span>
                <div className="max-w-[92%] rounded-2xl rounded-bl-md border border-sand/80 bg-ivory/70 px-4 py-3.5 sm:max-w-[78%]">
                  <div className="mb-2 flex flex-wrap gap-1.5"><Pill tone="forest"><Icon name="check" size={12} stroke={2.6} /> Survey facts</Pill><Pill tone="muted">Demo reply · no AI used</Pill></div>
                  <ul className="space-y-1.5 text-sm leading-relaxed text-ink">{m.reply!.facts.map((f) => <li key={f}>{f}</li>)}</ul>
                  {m.reply!.suggestion && (
                    <div className="mt-3 rounded-xl border border-dashed border-gold-400 bg-gold-100/50 p-3">
                      <Pill tone="saffron"><Icon name="spark" size={12} /> Suggestion – not a survey fact</Pill>
                      <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-ink">{m.reply!.suggestion.map((s) => <li key={s}>{s}</li>)}</ul>
                    </div>
                  )}
                </div>
              </div>
            ),
          )}
          {busy && (
            <div className="flex items-center gap-1.5 pl-1 sm:pl-11" role="status" aria-label="Assistant is replying">
              {[0, 150, 300].map((d) => <span key={d} className="h-2 w-2 animate-bounce rounded-full bg-gold-500" style={{ animationDelay: `${d}ms` }} />)}
            </div>
          )}
          <div ref={end} />
        </div>
        {messages.length > 0 && (
          <div className="flex gap-2 overflow-x-auto border-t border-sand/60 px-4 py-2.5">
            {PROMPTS.map((p) => (
              <button key={p} type="button" onClick={() => ask(p)} disabled={busy} className="whitespace-nowrap rounded-full border border-sand px-3 py-1.5 text-xs font-medium text-forest-800 hover:border-gold-400 disabled:opacity-50">{p}</button>
            ))}
          </div>
        )}
        <form onSubmit={(e) => { e.preventDefault(); ask(draft); }} className="flex items-end gap-2 border-t border-sand/80 bg-ivory/60 p-3 sm:p-4">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(draft); } }}
            rows={1}
            maxLength={600}
            placeholder="Ask about family preferences…"
            aria-label="Message the assistant"
            className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl border border-sand bg-white px-4 py-2.5 text-sm focus:border-forest-600 focus:outline-none focus:ring-2 focus:ring-forest-600/20"
          />
          <button type="submit" disabled={!draft.trim() || busy} aria-label="Send" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-forest-800 text-ivory transition-colors hover:bg-forest-700 disabled:opacity-40"><Icon name="send" size={18} /></button>
        </form>
      </div>
    </div>
  );
}
