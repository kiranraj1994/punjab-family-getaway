/**
 * Provider-independent AI service. The rest of the app only knows `AiProvider.generate`.
 * Providers are plain HTTPS calls, so adding another one is a single small function.
 * Keys are read from Worker secrets and are never sent to the browser.
 */
import type { Analytics } from "../shared/analytics";
import {
  ACCOMMODATION_BUDGETS, ACCOMMODATION_TYPES, ACTIVITY_BUDGETS, CATEGORIES, CHANDIGARH_OPTIONS, DATE_OPTIONS,
  FACILITIES, PACE_OPTIONS, TRIP, activityTitle, labelOf, type SurveyResponse,
} from "../shared/trip";

export interface AiEnv {
  AI_PROVIDER?: string;
  ANTHROPIC_API_KEY?: string;
  ANTHROPIC_MODEL?: string;
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
}

export interface ChatTurn { role: "user" | "assistant"; content: string }

export interface AiProvider {
  name: "anthropic" | "gemini";
  model: string;
  generate(system: string, turns: ChatTurn[]): Promise<string>;
}

export class AiError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
  }
}

export interface AiStatus { provider: "none" | "anthropic" | "gemini"; configured: boolean; model: string; note: string }

export function aiStatus(env: AiEnv): AiStatus {
  const provider = (env.AI_PROVIDER ?? "none").trim().toLowerCase();
  if (provider === "anthropic") {
    const model = env.ANTHROPIC_MODEL?.trim() || "claude-haiku-5-5";
    return env.ANTHROPIC_API_KEY ? { provider, configured: true, model, note: "" } : { provider, configured: false, model, note: "AI_PROVIDER is anthropic but ANTHROPIC_API_KEY is not set." };
  }
  if (provider === "gemini") {
    const model = env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
    return env.GEMINI_API_KEY ? { provider, configured: true, model, note: "" } : { provider, configured: false, model, note: "AI_PROVIDER is gemini but GEMINI_API_KEY is not set." };
  }
  return { provider: "none", configured: false, model: "", note: provider === "none" ? "No AI provider is configured." : `Unknown AI_PROVIDER "${provider}".` };
}

async function call(url: string, init: RequestInit, pick: (json: any) => string | undefined): Promise<string> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, signal: AbortSignal.timeout(45_000) });
  } catch {
    throw new AiError("The AI provider could not be reached. Please try again.");
  }
  if (res.status === 401 || res.status === 403) throw new AiError("The AI provider rejected the API key. Check the key in your Worker secrets.", res.status);
  if (res.status === 404) throw new AiError("The AI provider did not recognise the configured model name.", res.status);
  if (res.status === 429) throw new AiError("The AI provider's rate or credit limit was reached. Try again later.", res.status);
  if (!res.ok) throw new AiError(`The AI provider returned an error (HTTP ${res.status}).`, res.status);
  const text = pick(await res.json().catch(() => ({})));
  if (!text || !text.trim()) throw new AiError("The AI provider returned an empty reply.");
  return text.trim();
}

export function getProvider(env: AiEnv): AiProvider | null {
  const status = aiStatus(env);
  if (!status.configured) return null;
  if (status.provider === "anthropic")
    return {
      name: "anthropic",
      model: status.model,
      generate: (system, turns) =>
        call(
          "https://api.anthropic.com/v1/messages",
          {
            method: "POST",
            headers: { "content-type": "application/json", "x-api-key": env.ANTHROPIC_API_KEY!, "anthropic-version": "2023-06-01" },
            body: JSON.stringify({ model: status.model, max_tokens: 1500, system, messages: turns }),
          },
          (j) => (Array.isArray(j?.content) ? j.content.filter((b: any) => b?.type === "text").map((b: any) => b.text).join("\n") : undefined),
        ),
    };
  return {
    name: "gemini",
    model: status.model,
    generate: (system, turns) =>
      call(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(status.model)}:generateContent`,
        {
          method: "POST",
          headers: { "content-type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY! },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents: turns.map((t) => ({ role: t.role === "assistant" ? "model" : "user", parts: [{ text: t.content }] })),
            generationConfig: { maxOutputTokens: 1500 },
          }),
        },
        (j) => j?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text ?? "").join(""),
      ),
  };
}

/** Removes anything that looks like a phone number or e-mail address from free text. */
export function scrub(text: string): string {
  return text.replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[email removed]").replace(/\+?\d[\d\s().-]{6,}\d/g, "[number removed]");
}

export const respondentLabel = (index: number) => `Respondent ${index + 1}`;

/**
 * The only survey data an AI provider ever receives: computed counts plus per-respondent
 * choices under neutral labels. Names, contact numbers and booking links are left out.
 */
export function buildContext(rows: SurveyResponse[], a: Analytics): string {
  const ordered = [...rows].sort((x, y) => x.created_at.localeCompare(y.created_at));
  const tally = (items: { label: string; count: number; pct: number }[]) => items.filter((t) => t.count).map((t) => ({ option: t.label, respondents: t.count, percent: t.pct }));
  return JSON.stringify({
    total_responses: a.total,
    adults_travelling: 11,
    counts: {
      dates: tally(a.dates), accommodation_type: tally(a.accommodationTypes), room_budget_per_night: tally(a.accommodationBudgets),
      facilities: tally(a.facilities), trip_pace: tally(a.pace), activity_budget_per_person: tally(a.activityBudgets),
      chandigarh: tally(a.chandigarh), top_three_priorities: tally(a.priorities),
      activities: Object.fromEntries(a.categories.map((c) => [c.title, c.items.map((t) => ({ activity: t.label, respondents: t.count, percent: t.pct }))])),
    },
    respondents: ordered.map((r, i) => ({
      label: respondentLabel(i),
      dates: labelOf(DATE_OPTIONS, r.date_confirmation), accommodation: labelOf(ACCOMMODATION_TYPES, r.accommodation_type),
      room_budget: labelOf(ACCOMMODATION_BUDGETS, r.accommodation_budget), facilities: r.accommodation_facilities.map((f) => labelOf(FACILITIES, f)),
      pace: labelOf(PACE_OPTIONS, r.trip_pace), activity_budget: labelOf(ACTIVITY_BUDGETS, r.activity_budget),
      chandigarh: labelOf(CHANDIGARH_OPTIONS, r.chandigarh_preference), priorities: r.top_three_priorities.map(activityTitle),
      selected: CATEGORIES.flatMap((c) => r[c.key]).map(activityTitle),
      accommodation_note: scrub(r.additional_accommodation_requirements), suggestions: scrub(r.additional_suggestions),
      child_and_family_needs: scrub(r.child_family_requirements),
      suggested_properties: r.property_suggestions.filter((p) => p.name).map((p) => ({ name: p.name, total_3_nights_inr: p.total_price, rating: p.rating, bedrooms: p.bedrooms, bathrooms: p.bathrooms, parking: p.parking, breakfast: p.breakfast, free_cancellation: p.free_cancellation })),
    })),
  });
}

export function systemPrompt(context: string): string {
  return `You are the planning assistant for "${TRIP.name}", a family road trip.
Trip facts: ${TRIP.dates}; ${TRIP.duration}; from ${TRIP.start} to ${TRIP.destination} (optional stop: ${TRIP.optionalDestination}); 11 adults and one 2-year-old child; ${TRIP.vehicleDetail}; needs ${TRIP.rooms}; vegetarian and non-vegetarian food.

You are talking to the trip organiser. Answer using ONLY the SURVEY DATA below.
Rules:
- Never invent respondents, counts, percentages, preferences, prices or opening times. If the data does not answer the question, say so.
- Quote counts exactly as given (for example "5 of 9").
- Refer to people only by their labels ("Respondent 3"). You do not know their names.
- Structure every reply in two parts with these exact headings: "Survey facts" (what the data shows) and "Suggestions" (your own recommendations, clearly your opinion).
- Early December is usually too early for fully yellow mustard fields; never promise blooms.
- Dates of exhibitions and flower shows are unconfirmed; say they must be reconfirmed.
- Nothing is booked. Do not imply that any hotel, ticket or activity has been reserved.
- Keep replies concise and practical. Plain text only, no markdown tables.

SURVEY DATA (JSON):
${context}`;
}

/** Puts real names back into an AI reply. This happens on our server, after the AI call. */
export function restoreNames(text: string, rows: SurveyResponse[]): string {
  const ordered = [...rows].sort((x, y) => x.created_at.localeCompare(y.created_at));
  return text.replace(/Respondent (\d+)/g, (match, n) => {
    const r = ordered[Number(n) - 1];
    return r ? r.respondent_name : match;
  });
}
