/**
 * Pure analytics over survey responses. Everything shown in the dashboard is derived here
 * from the rows it is given: no figure is hard-coded. In Phase 2 the same functions run on
 * rows read from the database.
 */
import {
  ACCOMMODATION_BUDGETS, ACCOMMODATION_TYPES, ACTIVITY_BUDGETS, ALL_ACTIVITIES, CATEGORIES,
  CHANDIGARH_OPTIONS, DATE_OPTIONS, FACILITIES, PACE_OPTIONS,
  type CategoryKey, type Option, type PropertySuggestion, type SurveyResponse,
} from "./trip";

export interface Tally {
  id: string;
  label: string;
  count: number;
  /** Share of all respondents, 0–100, rounded to a whole number. */
  pct: number;
}

export interface SuggestedProperty extends PropertySuggestion {
  suggested_by: string;
}

export interface Analytics {
  total: number;
  fullTrip: number;
  chandigarhInterested: number;
  mostPopularActivity: Tally | null;
  mostCommonBudget: Tally | null;
  dates: Tally[];
  accommodationTypes: Tally[];
  accommodationBudgets: Tally[];
  facilities: Tally[];
  pace: Tally[];
  activityBudgets: Tally[];
  chandigarh: Tally[];
  categories: { key: CategoryKey; title: string; items: Tally[] }[];
  allActivities: Tally[];
  priorities: Tally[];
  properties: SuggestedProperty[];
  notes: {
    child: { name: string; text: string }[];
    suggestions: { name: string; text: string }[];
    accommodation: { name: string; text: string }[];
  };
  consensus: { agreed: Tally[]; divided: Tally[]; low: Tally[] };
}

export function pct(count: number, total: number): number {
  return total > 0 ? Math.round((count / total) * 100) : 0;
}

function tally(options: Option[], values: string[], total: number): Tally[] {
  return options.map((o) => {
    const count = values.filter((v) => v === o.id).length;
    return { id: o.id, label: o.label, count, pct: pct(count, total) };
  });
}

const byCount = (a: Tally, b: Tally) => b.count - a.count || a.label.localeCompare(b.label);

function top(items: Tally[]): Tally | null {
  const best = [...items].sort(byCount)[0];
  return best && best.count > 0 ? best : null;
}

function notes(rows: SurveyResponse[], field: "child_family_requirements" | "additional_suggestions" | "additional_accommodation_requirements") {
  return rows
    .filter((r) => r[field].trim())
    .map((r) => ({ name: r.respondent_name, text: r[field].trim() }));
}

export function computeAnalytics(rows: SurveyResponse[]): Analytics {
  const total = rows.length;
  const categories = CATEGORIES.map((c) => ({
    key: c.key,
    title: c.shortTitle,
    items: tally(c.activities.map((a) => ({ id: a.id, label: a.title })), rows.flatMap((r) => r[c.key]), total).sort(byCount),
  }));
  const allActivities = categories.flatMap((c) => c.items).sort(byCount);
  const chandigarh = tally(CHANDIGARH_OPTIONS, rows.map((r) => r.chandigarh_preference), total);
  const accommodationBudgets = tally(ACCOMMODATION_BUDGETS, rows.map((r) => r.accommodation_budget), total);

  return {
    total,
    fullTrip: rows.filter((r) => r.date_confirmation === "all-four-days").length,
    chandigarhInterested: rows.filter((r) => ["yes-definitely", "yes-if-fits"].includes(r.chandigarh_preference)).length,
    mostPopularActivity: top(allActivities),
    mostCommonBudget: top(accommodationBudgets),
    dates: tally(DATE_OPTIONS, rows.map((r) => r.date_confirmation), total),
    accommodationTypes: tally(ACCOMMODATION_TYPES, rows.map((r) => r.accommodation_type), total),
    accommodationBudgets,
    facilities: tally(FACILITIES, rows.flatMap((r) => r.accommodation_facilities), total).sort(byCount),
    pace: tally(PACE_OPTIONS, rows.map((r) => r.trip_pace), total),
    activityBudgets: tally(ACTIVITY_BUDGETS, rows.map((r) => r.activity_budget), total),
    chandigarh,
    categories,
    allActivities,
    priorities: tally(ALL_ACTIVITIES.map((a) => ({ id: a.id, label: a.title })), rows.flatMap((r) => r.top_three_priorities), total)
      .filter((t) => t.count > 0)
      .sort(byCount),
    properties: rows.flatMap((r) => r.property_suggestions.filter((p) => p.name.trim()).map((p) => ({ ...p, suggested_by: r.respondent_name }))),
    notes: {
      child: notes(rows, "child_family_requirements"),
      suggestions: notes(rows, "additional_suggestions"),
      accommodation: notes(rows, "additional_accommodation_requirements"),
    },
    consensus: {
      agreed: allActivities.filter((t) => total > 0 && t.pct >= 70),
      divided: allActivities.filter((t) => t.pct >= 40 && t.pct <= 60),
      low: allActivities.filter((t) => total > 0 && t.pct <= 20),
    },
  };
}
