import {
  ACCOMMODATION_BUDGETS, ACCOMMODATION_TYPES, ACTIVITY_BUDGETS, CATEGORIES, CHANDIGARH_OPTIONS,
  DATE_OPTIONS, FACILITIES, PACE_OPTIONS, activityTitle, labelOf, type SurveyResponse,
} from "@shared/trip";

/** Quote a cell and neutralise spreadsheet formula injection (cells starting with = + - @). */
function cell(value: unknown): string {
  let s = String(value ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export function toCsv(rows: SurveyResponse[]): string {
  const header = [
    "Submission ID", "Submitted at", "Name", "Contact", "Dates", "Accommodation", "Room budget", "Facilities",
    "Accommodation notes", ...CATEGORIES.map((c) => c.shortTitle), "Chandigarh", "Pace", "Activity budget",
    "Top 3 priorities", "Suggestions", "Child & family needs", "Suggested properties",
  ];
  const lines = rows.map((r) =>
    [
      r.submission_id, r.created_at, r.respondent_name, r.contact_number,
      labelOf(DATE_OPTIONS, r.date_confirmation), labelOf(ACCOMMODATION_TYPES, r.accommodation_type),
      labelOf(ACCOMMODATION_BUDGETS, r.accommodation_budget),
      r.accommodation_facilities.map((f) => labelOf(FACILITIES, f)).join("; "),
      r.additional_accommodation_requirements,
      ...CATEGORIES.map((c) => r[c.key].map(activityTitle).join("; ")),
      labelOf(CHANDIGARH_OPTIONS, r.chandigarh_preference), labelOf(PACE_OPTIONS, r.trip_pace),
      labelOf(ACTIVITY_BUDGETS, r.activity_budget), r.top_three_priorities.map(activityTitle).join("; "),
      r.additional_suggestions, r.child_family_requirements,
      r.property_suggestions.filter((p) => p.name).map((p) => `${p.name} (${p.link || "no link"})`).join("; "),
    ].map(cell).join(","),
  );
  return [header.map(cell).join(","), ...lines].join("\r\n");
}
