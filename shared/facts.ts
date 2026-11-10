/**
 * Deterministic answers to common questions, built only from computed analytics.
 * Used by the assistant when no AI provider is configured, and shown alongside every AI reply
 * so the administrator can always see the underlying figures.
 */
import type { Analytics, Tally } from "./analytics";

const line = (t: Tally, total: number) => `${t.label} — ${t.count} of ${total} (${t.pct}%)`;
const answered = (items: Tally[], total: number) => items.filter((t) => t.count).map((t) => line(t, total)).join("; ") || "no answers yet";
const leader = (items: Tally[]) => [...items].sort((x, y) => y.count - x.count)[0];

export function factsFor(question: string, a: Analytics): string[] {
  const q = question.toLowerCase();
  const n = a.total;
  if (n === 0) return ["No survey responses have been submitted yet, so there is nothing to analyse."];
  const top5 = a.allActivities.slice(0, 5);

  if (q.includes("itinerary") || q.includes("plan"))
    return [
      `Most-named priorities: ${a.priorities.slice(0, 5).map((t) => `${t.label} (${t.count})`).join("; ")}.`,
      `Pace: ${answered(a.pace, n)}.`,
      `Dates: ${answered(a.dates, n)}.`,
      `Chandigarh: ${a.chandigarhInterested} of ${n} said yes or yes if it fits.`,
      ...(a.notes.child.length ? [`${a.notes.child.length} respondent(s) noted child or family requirements.`] : []),
    ];
  if (q.includes("chandigarh")) return [...a.chandigarh.map((t) => line(t, n)), `In total ${a.chandigarhInterested} of ${n} said yes or yes if it fits.`];
  if (q.includes("low interest") || q.includes("least")) return a.consensus.low.length ? a.consensus.low.map((t) => line(t, n)) : ["No activity is at or below 20% interest."];
  if (q.includes("farm") || q.includes("village")) return a.categories.find((c) => c.key === "farm_and_village_activities")!.items.map((t) => line(t, n));
  if (q.includes("child") || q.includes("kid") || q.includes("toddler"))
    return a.notes.child.length ? a.notes.child.map((c) => `${c.name}: “${c.text}”`) : ["No child or family requirements have been entered."];
  if (q.includes("budget") || q.includes("accommodation") || q.includes("hotel") || q.includes("villa") || q.includes("stay"))
    return [
      `Room budget per night: ${answered(a.accommodationBudgets, n)}.`,
      `Accommodation type: ${answered(a.accommodationTypes, n)}.`,
      `Most requested facilities: ${a.facilities.filter((t) => t.count).slice(0, 6).map((t) => `${t.label} (${t.count})`).join(", ") || "none selected"}.`,
      `Activity budget per person: ${answered(a.activityBudgets, n)}.`,
      `${a.properties.length} propert${a.properties.length === 1 ? "y" : "ies"} suggested.`,
    ];
  if (q.includes("popular") || q.includes("prioriti") || q.includes("activities")) return top5.map((t, i) => `${i + 1}. ${line(t, n)}`);
  return [
    `${n} response${n === 1 ? "" : "s"} received; ${a.fullTrip} can join all four days.`,
    `Accommodation: ${line(leader(a.accommodationTypes), n)}; room budget ${line(leader(a.accommodationBudgets), n)}.`,
    `Pace: ${answered(a.pace, n)}.`,
    `Top activities: ${top5.slice(0, 3).map((t) => `${t.label} (${t.count})`).join(", ")}.`,
    `Chandigarh: ${a.chandigarhInterested} of ${n} would include it.`,
  ];
}
