import { useEffect, useRef, useState } from "react";
import { Icon } from "../components/Icon";
import type { AdminApi, AiStatus, AssistantReply } from "./api";
import { Pill, btn } from "./charts";
import { PageTitle } from "./pages";

export const PROMPTS = [
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

interface Message {
  role: "user" | "assistant";
  text?: string;
  reply?: AssistantReply;
  error?: string;
}

/** One assistant reply: calculated survey facts first, then (if any) the AI's text in a gold panel. */
export function ReplyBody({ reply }: { reply: AssistantReply }) {
  return (
    <>
      <div className="mb-2 flex flex-wrap gap-1.5">
        <Pill tone="forest"><Icon name="check" size={12} stroke={2.6} /> Survey facts</Pill>
        <Pill tone="muted">Calculated from {reply.totalResponses} response{reply.totalResponses === 1 ? "" : "s"}</Pill>
      </div>
      <ul className="space-y-1.5 text-sm leading-relaxed text-ink">{reply.facts.map((f) => <li key={f}>{f}</li>)}</ul>
      {reply.answer && (
        <div className="mt-3 rounded-xl border border-dashed border-gold-400 bg-gold-100/50 p-3">
          <Pill tone="saffron"><Icon name="spark" size={12} /> AI reply – {reply.provider}{reply.model ? ` · ${reply.model}` : ""}</Pill>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink">{reply.answer}</p>
          <p className="mt-2 text-xs text-muted">Written by an AI model from anonymised survey data. Check suggestions against the facts above before acting on them.</p>
        </div>
      )}
      {reply.notice && <p className="mt-3 flex gap-2 text-xs leading-relaxed text-muted"><Icon name="info" size={14} className="mt-0.5" /> {reply.notice}</p>}
    </>
  );
}

export function Assistant({ api, ai, onAuthError }: { api: AdminApi; ai: AiStatus | null; onAuthError: (e: unknown) => boolean }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView?.({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  const ask = async (text: string) => {
    const question = text.trim();
    if (!question || busy) return;
    const earlier = messages.filter((m) => m.role === "user").map((m) => m.text!);
    setMessages((m) => [...m, { role: "user", text: question }]);
    setDraft("");
    setBusy(true);
    try {
      const reply = await api.ask(question, earlier);
      setMessages((m) => [...m, { role: "assistant", reply }]);
    } catch (e) {
      if (!onAuthError(e)) setMessages((m) => [...m, { role: "assistant", error: (e as Error).message || "The assistant could not answer. Please try again." }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-[calc(100dvh-9.5rem)] min-h-[32rem] flex-col lg:h-[calc(100dvh-6.5rem)]">
      <PageTitle eyebrow="Ask about the survey responses" title="Punjab AI Trip Assistant">
        <button type="button" className={btn.ghost} disabled={!messages.length} onClick={() => setMessages([])}><Icon name="trash" size={16} /> Clear conversation</button>
      </PageTitle>

      {ai?.configured ? (
        <p className="mb-4 flex flex-wrap items-center gap-2 text-sm text-muted">
          <Pill tone="forest"><Icon name="check" size={12} stroke={2.6} /> AI connected</Pill> {ai.provider} · {ai.model}. Names and contact numbers are never sent to the AI provider.
        </p>
      ) : (
        <div className="mb-4 flex gap-3 rounded-2xl border border-gold-200 bg-gold-100/60 px-4 py-3 text-sm leading-relaxed text-forest-900">
          <Icon name="info" size={18} className="mt-0.5 text-gold-600" />
          <p><strong>No AI provider is connected.</strong> {api.demo ? "This is the design preview." : ai?.note && ai.provider !== "none" ? ai.note : ""} Questions are answered with figures calculated directly from the survey responses. No reply here is written by an AI model.</p>
        </div>
      )}

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
                  {m.reply ? <ReplyBody reply={m.reply} /> : <p role="alert" className="text-sm font-medium text-rose-600">{m.error}</p>}
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
        <form onSubmit={(e) => { e.preventDefault(); void ask(draft); }} className="flex items-end gap-2 border-t border-sand/80 bg-ivory/60 p-3 sm:p-4">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void ask(draft); } }}
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
