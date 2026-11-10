import { describe, expect, it } from "vitest";
import { computeAnalytics } from "../shared/analytics";
import { ALL_ACTIVITIES } from "../shared/trip";
import { DEMO_RESPONSES } from "../src/admin/demo";
import { toCsv } from "../src/lib/csv";

describe("analytics", () => {
  it("handles zero responses without inventing figures", () => {
    const a = computeAnalytics([]);
    expect(a.total).toBe(0);
    expect(a.mostPopularActivity).toBeNull();
    expect(a.mostCommonBudget).toBeNull();
    expect(a.allActivities.every((t) => t.count === 0 && t.pct === 0)).toBe(true);
    expect(a.consensus).toEqual({ agreed: [], divided: [], low: [] });
  });

  it("counts match the underlying rows", () => {
    const rows = DEMO_RESPONSES;
    const a = computeAnalytics(rows);
    expect(a.total).toBe(rows.length);
    expect(a.fullTrip).toBe(rows.filter((r) => r.date_confirmation === "all-four-days").length);
    const wagah = a.allActivities.find((t) => t.id === "wagah-border")!;
    const expected = rows.filter((r) => r.amritsar_activities.includes("wagah-border")).length;
    expect(wagah.count).toBe(expected);
    expect(wagah.pct).toBe(Math.round((expected / rows.length) * 100));
    expect(a.allActivities).toHaveLength(ALL_ACTIVITIES.length);
    expect(a.priorities.reduce((s, t) => s + t.count, 0)).toBe(rows.length * 3);
    expect(a.accommodationBudgets.reduce((s, t) => s + t.count, 0)).toBe(rows.filter((r) => r.accommodation_budget).length);
  });

  it("demo rows only use ids that exist in the trip config", () => {
    const ids = new Set(ALL_ACTIVITIES.map((x) => x.id));
    for (const r of DEMO_RESPONSES) {
      const all = [...r.amritsar_activities, ...r.exhibitions_and_shopping, ...r.gardens_and_nature, ...r.farm_and_village_activities, ...r.chandigarh_activities, ...r.top_three_priorities];
      expect(all.filter((id) => !ids.has(id))).toEqual([]);
      expect(r.top_three_priorities).toHaveLength(3);
    }
  });

  it("exports one CSV line per response and neutralises formulas", () => {
    const rows = [{ ...DEMO_RESPONSES[0], respondent_name: '=HYPERLINK("x")' }, DEMO_RESPONSES[1]];
    const lines = toCsv(rows).split("\r\n");
    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain(`"'=HYPERLINK(""x"")"`);
  });
});
