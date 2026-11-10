/** Shared, environment-agnostic test fixtures. Keep this free of Node-only imports (e.g. node:sqlite) — it's imported by jsdom component tests too. */

let n = 0;
export function submission(overrides: Record<string, unknown> = {}) {
  n += 1;
  return {
    submission_id: `11111111-2222-4333-8444-${String(n).padStart(12, "0")}`,
    website: "",
    started_at: Date.now() - 60_000,
    respondent_name: `Tester ${n}`,
    contact_number: "+91 98765 43210",
    date_confirmation: "all-four-days",
    accommodation_type: "villa",
    accommodation_budget: "4000-5000",
    accommodation_facilities: ["parking", "breakfast"],
    additional_accommodation_requirements: "",
    amritsar_activities: ["golden-temple-evening", "wagah-border"],
    exhibitions_and_shopping: ["food-experience"],
    gardens_and_nature: [],
    farm_and_village_activities: ["tractor-ride"],
    chandigarh_activities: [],
    chandigarh_preference: "yes-if-fits",
    trip_pace: "balanced",
    activity_budget: "1000-2000",
    top_three_priorities: ["golden-temple-evening", "wagah-border", "tractor-ride"],
    additional_suggestions: "",
    child_family_requirements: "Needs a cot. Call me on 9876543210.",
    property_suggestions: [],
    ...overrides,
  };
}
