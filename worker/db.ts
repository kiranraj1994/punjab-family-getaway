/** All SQL lives here. Every statement is parameterised; no value is ever concatenated into SQL. */
import { CATEGORIES, TRIP, type SurveyAnswers, type SurveyResponse } from "../shared/trip";

const JSON_COLUMNS = ["accommodation_facilities", ...CATEGORIES.map((c) => c.key), "top_three_priorities", "property_suggestions"] as const;
const TEXT_COLUMNS = [
  "respondent_name", "contact_number", "date_confirmation", "accommodation_type", "accommodation_budget",
  "additional_accommodation_requirements", "chandigarh_preference", "trip_pace", "activity_budget",
  "additional_suggestions", "child_family_requirements",
] as const;
const COLUMNS = [...TEXT_COLUMNS, ...JSON_COLUMNS];

type Row = Record<string, string | number | null>;

function fromRow(row: Row): SurveyResponse {
  const out: Record<string, unknown> = { submission_id: row.submission_id, created_at: row.created_at, updated_at: row.updated_at };
  for (const c of TEXT_COLUMNS) out[c] = row[c] ?? "";
  for (const c of JSON_COLUMNS) {
    try {
      const parsed = JSON.parse(String(row[c] ?? "[]"));
      out[c] = Array.isArray(parsed) ? parsed : [];
    } catch {
      out[c] = [];
    }
  }
  return out as unknown as SurveyResponse;
}

const values = (a: SurveyAnswers) => COLUMNS.map((c) => ((JSON_COLUMNS as readonly string[]).includes(c) ? JSON.stringify(a[c]) : (a[c] as string)));

/** Inserts once per submission_id. Returns false when that id was already stored. */
export async function insertResponse(db: D1Database, submissionId: string, a: SurveyAnswers): Promise<boolean> {
  const sql = `INSERT INTO survey_responses (submission_id, trip_id, ${COLUMNS.join(", ")})
               VALUES (?, ?, ${COLUMNS.map(() => "?").join(", ")})
               ON CONFLICT (submission_id) DO NOTHING`;
  const result = await db.prepare(sql).bind(submissionId, TRIP.id, ...values(a)).run();
  return (result.meta.changes ?? 0) > 0;
}

export async function responseExists(db: D1Database, submissionId: string): Promise<boolean> {
  return (await db.prepare("SELECT 1 AS ok FROM survey_responses WHERE submission_id = ?").bind(submissionId).first()) !== null;
}

export async function listResponses(db: D1Database): Promise<SurveyResponse[]> {
  const { results } = await db.prepare("SELECT * FROM survey_responses WHERE trip_id = ? ORDER BY created_at DESC, id DESC").bind(TRIP.id).all<Row>();
  return results.map(fromRow);
}

export async function getResponse(db: D1Database, submissionId: string): Promise<SurveyResponse | null> {
  const row = await db.prepare("SELECT * FROM survey_responses WHERE submission_id = ? AND trip_id = ?").bind(submissionId, TRIP.id).first<Row>();
  return row ? fromRow(row) : null;
}

/** Update and audit entry are written in one atomic batch. Only field names are audited. */
export async function updateResponse(db: D1Database, before: SurveyResponse, a: SurveyAnswers): Promise<string[]> {
  const changed = COLUMNS.filter((c) => JSON.stringify(before[c]) !== JSON.stringify(a[c]));
  if (changed.length === 0) return [];
  await db.batch([
    db.prepare(`UPDATE survey_responses SET ${COLUMNS.map((c) => `${c} = ?`).join(", ")}, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE submission_id = ?`)
      .bind(...values(a), before.submission_id),
    db.prepare("INSERT INTO audit_log (action, submission_id, changed_fields) VALUES ('update', ?, ?)").bind(before.submission_id, JSON.stringify(changed)),
  ]);
  return changed;
}

export async function deleteResponse(db: D1Database, submissionId: string): Promise<boolean> {
  const [del] = await db.batch([
    db.prepare("DELETE FROM survey_responses WHERE submission_id = ? AND trip_id = ?").bind(submissionId, TRIP.id),
    db.prepare("INSERT INTO audit_log (action, submission_id) SELECT 'delete', ? WHERE changes() > 0").bind(submissionId),
  ]);
  return (del.meta.changes ?? 0) > 0;
}

export async function logExport(db: D1Database, count: number): Promise<void> {
  await db.prepare("INSERT INTO audit_log (action, changed_fields) VALUES ('export', ?)").bind(JSON.stringify([`${count} responses`])).run();
}

export interface AuditEntry { action: string; submission_id: string; changed_fields: string[]; created_at: string }

export async function recentAudit(db: D1Database, limit = 30): Promise<AuditEntry[]> {
  const { results } = await db.prepare("SELECT action, submission_id, changed_fields, created_at FROM audit_log ORDER BY id DESC LIMIT ?").bind(limit).all<Row>();
  return results.map((r) => ({ action: String(r.action), submission_id: String(r.submission_id), changed_fields: JSON.parse(String(r.changed_fields)), created_at: String(r.created_at) }));
}

/**
 * Fixed-window rate limit. Returns true while the caller is within the limit.
 * The key should already be a salted hash; raw IP addresses are never stored.
 */
export async function withinLimit(db: D1Database, key: string, limit: number, windowSeconds: number, now = Date.now()): Promise<boolean> {
  const window = Math.floor(now / 1000 / windowSeconds) * windowSeconds;
  const row = await db
    .prepare(
      `INSERT INTO rate_limits (key, window_start, count) VALUES (?1, ?2, 1)
       ON CONFLICT (key) DO UPDATE SET
         count = CASE WHEN rate_limits.window_start = ?2 THEN rate_limits.count + 1 ELSE 1 END,
         window_start = ?2
       RETURNING count`,
    )
    .bind(key, window)
    .first<{ count: number }>();
  if (Math.random() < 0.02) await db.prepare("DELETE FROM rate_limits WHERE window_start < ?").bind(window - 86400).run();
  return (row?.count ?? 1) <= limit;
}
