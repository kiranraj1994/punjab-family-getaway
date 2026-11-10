/**
 * Validation for survey answers. The server is the authority: every submission and every
 * admin edit passes through here before touching the database. Unknown option ids, wrong
 * types and over-long text are rejected rather than silently repaired.
 */
import {
  ACCOMMODATION_BUDGETS, ACCOMMODATION_TYPES, ACTIVITY_BUDGETS, ALL_ACTIVITIES, CATEGORIES, CHANDIGARH_OPTIONS,
  DATE_OPTIONS, EMPTY_PROPERTY, FACILITIES, MAX_PROPERTIES, PACE_OPTIONS, PLATFORMS, PRIORITY_COUNT, YES_NO_UNSURE,
  type Option, type PropertySuggestion, type SurveyAnswers,
} from "./trip";

export const LIMITS = { name: 80, contact: 20, note: 1500, accommodationNote: 1000, propertyName: 120, link: 500, rating: 12, comments: 800 };

export type Validation = { ok: true; data: SurveyAnswers } | { ok: false; errors: string[] };

const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const idSet = (options: Option[]) => new Set(options.map((o) => o.id));
const ALL_IDS = new Set(ALL_ACTIVITIES.map((a) => a.id));

export function validateAnswers(input: unknown): Validation {
  const errors: string[] = [];
  if (typeof input !== "object" || input === null || Array.isArray(input)) return { ok: false, errors: ["Invalid request body"] };
  const src = input as Record<string, unknown>;

  const text = (key: string, max: number, required = false): string => {
    const v = src[key];
    if (v === undefined || v === null || v === "") {
      if (required) errors.push(`${key} is required`);
      return "";
    }
    if (typeof v !== "string") {
      errors.push(`${key} must be text`);
      return "";
    }
    const clean = v.replace(CONTROL, "").trim();
    if (clean.length > max) errors.push(`${key} is too long (max ${max} characters)`);
    if (required && !clean) errors.push(`${key} is required`);
    return clean;
  };
  const choice = (key: string, options: Option[], required = false): string => {
    const v = text(key, 40, required);
    if (v && !idSet(options).has(v)) errors.push(`${key} has an unknown value`);
    return v;
  };
  const many = (key: string, allowed: Set<string>): string[] => {
    const v = src[key];
    if (v === undefined || v === null) return [];
    if (!Array.isArray(v) || v.some((x) => typeof x !== "string")) {
      errors.push(`${key} must be a list`);
      return [];
    }
    const unique = [...new Set(v as string[])];
    if (unique.some((x) => !allowed.has(x))) errors.push(`${key} contains an unknown value`);
    return unique;
  };

  const data: SurveyAnswers = {
    respondent_name: text("respondent_name", LIMITS.name, true),
    contact_number: text("contact_number", LIMITS.contact),
    date_confirmation: choice("date_confirmation", DATE_OPTIONS, true),
    accommodation_type: choice("accommodation_type", ACCOMMODATION_TYPES),
    accommodation_budget: choice("accommodation_budget", ACCOMMODATION_BUDGETS),
    accommodation_facilities: many("accommodation_facilities", idSet(FACILITIES)),
    additional_accommodation_requirements: text("additional_accommodation_requirements", LIMITS.accommodationNote),
    amritsar_activities: [], exhibitions_and_shopping: [], gardens_and_nature: [],
    farm_and_village_activities: [], chandigarh_activities: [],
    chandigarh_preference: choice("chandigarh_preference", CHANDIGARH_OPTIONS),
    trip_pace: choice("trip_pace", PACE_OPTIONS),
    activity_budget: choice("activity_budget", ACTIVITY_BUDGETS),
    top_three_priorities: many("top_three_priorities", ALL_IDS),
    additional_suggestions: text("additional_suggestions", LIMITS.note),
    child_family_requirements: text("child_family_requirements", LIMITS.note),
    property_suggestions: [],
  };
  for (const c of CATEGORIES) data[c.key] = many(c.key, new Set(c.activities.map((a) => a.id)));

  if (data.contact_number && !/^[0-9+()\-\s.]+$/.test(data.contact_number)) errors.push("contact_number may only contain digits, spaces and + ( ) -");
  if (data.top_three_priorities.length !== PRIORITY_COUNT) errors.push(`top_three_priorities must contain exactly ${PRIORITY_COUNT} different activities`);

  const props = src.property_suggestions;
  if (props !== undefined && props !== null) {
    if (!Array.isArray(props)) errors.push("property_suggestions must be a list");
    else {
      const kept = props.map((p, i) => property(p, i, errors)).filter((p): p is PropertySuggestion => p !== null);
      if (kept.length > MAX_PROPERTIES) errors.push(`At most ${MAX_PROPERTIES} property suggestions are allowed`);
      data.property_suggestions = kept.slice(0, MAX_PROPERTIES);
    }
  }
  return errors.length ? { ok: false, errors } : { ok: true, data };
}

function property(raw: unknown, index: number, errors: string[]): PropertySuggestion | null {
  const at = `property ${index + 1}`;
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    errors.push(`${at} is invalid`);
    return null;
  }
  const src = raw as Record<string, unknown>;
  const out: PropertySuggestion = { ...EMPTY_PROPERTY };
  const max: Record<keyof PropertySuggestion, number> = {
    name: LIMITS.propertyName, link: LIMITS.link, platform: 20, total_price: 12, rating: LIMITS.rating, review_count: 9,
    bedrooms: 3, bathrooms: 3, parking: 10, breakfast: 10, free_cancellation: 10, comments: LIMITS.comments,
  };
  for (const key of Object.keys(max) as (keyof PropertySuggestion)[]) {
    const v = src[key];
    if (v === undefined || v === null || v === "") continue;
    if (typeof v !== "string" && typeof v !== "number") {
      errors.push(`${at}: ${key} must be text`);
      continue;
    }
    const clean = String(v).replace(CONTROL, "").trim();
    if (clean.length > max[key]) errors.push(`${at}: ${key} is too long`);
    out[key] = clean;
  }
  if (Object.values(out).every((v) => !v)) return null;
  if (out.link && !/^https?:\/\/[^\s<>"']+$/i.test(out.link)) errors.push(`${at}: link must start with http:// or https://`);
  if (out.platform && !idSet(PLATFORMS).has(out.platform)) errors.push(`${at}: unknown platform`);
  for (const key of ["total_price", "review_count", "bedrooms", "bathrooms"] as const)
    if (out[key] && !/^\d+(\.\d{1,2})?$/.test(out[key])) errors.push(`${at}: ${key} must be a number`);
  for (const key of ["parking", "breakfast", "free_cancellation"] as const)
    if (out[key] && !idSet(YES_NO_UNSURE).has(out[key])) errors.push(`${at}: ${key} has an unknown value`);
  return out;
}

export function isValidSubmissionId(id: unknown): id is string {
  return typeof id === "string" && /^[A-Za-z0-9][A-Za-z0-9-]{9,63}$/.test(id);
}
