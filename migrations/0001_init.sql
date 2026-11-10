-- Punjab Family Getaway 2026: initial schema for Cloudflare D1 (SQLite).
-- Apply with: wrangler d1 migrations apply punjab-trip-db --local | --remote

CREATE TABLE IF NOT EXISTS survey_responses (
  id                                    INTEGER PRIMARY KEY AUTOINCREMENT,
  submission_id                         TEXT    NOT NULL UNIQUE,
  trip_id                               TEXT    NOT NULL DEFAULT 'punjab-2026',
  respondent_name                       TEXT    NOT NULL CHECK (length(trim(respondent_name)) BETWEEN 1 AND 80),
  contact_number                        TEXT    NOT NULL DEFAULT '' CHECK (length(contact_number) <= 20),
  date_confirmation                     TEXT    NOT NULL,
  accommodation_type                    TEXT    NOT NULL DEFAULT '',
  accommodation_budget                  TEXT    NOT NULL DEFAULT '',
  accommodation_facilities              TEXT    NOT NULL DEFAULT '[]' CHECK (json_valid(accommodation_facilities)),
  additional_accommodation_requirements TEXT    NOT NULL DEFAULT '',
  amritsar_activities                   TEXT    NOT NULL DEFAULT '[]' CHECK (json_valid(amritsar_activities)),
  exhibitions_and_shopping              TEXT    NOT NULL DEFAULT '[]' CHECK (json_valid(exhibitions_and_shopping)),
  gardens_and_nature                    TEXT    NOT NULL DEFAULT '[]' CHECK (json_valid(gardens_and_nature)),
  farm_and_village_activities           TEXT    NOT NULL DEFAULT '[]' CHECK (json_valid(farm_and_village_activities)),
  chandigarh_activities                 TEXT    NOT NULL DEFAULT '[]' CHECK (json_valid(chandigarh_activities)),
  chandigarh_preference                 TEXT    NOT NULL DEFAULT '',
  trip_pace                             TEXT    NOT NULL DEFAULT '',
  activity_budget                       TEXT    NOT NULL DEFAULT '',
  top_three_priorities                  TEXT    NOT NULL CHECK (json_valid(top_three_priorities) AND json_array_length(top_three_priorities) = 3),
  additional_suggestions                TEXT    NOT NULL DEFAULT '',
  child_family_requirements             TEXT    NOT NULL DEFAULT '',
  property_suggestions                  TEXT    NOT NULL DEFAULT '[]' CHECK (json_valid(property_suggestions)),
  created_at                            TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at                            TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_responses_trip_created ON survey_responses (trip_id, created_at);
CREATE INDEX IF NOT EXISTS idx_responses_name ON survey_responses (respondent_name COLLATE NOCASE);

-- Administrator changes. Records which fields changed, never their values.
CREATE TABLE IF NOT EXISTS audit_log (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  action         TEXT NOT NULL CHECK (action IN ('update', 'delete', 'export')),
  submission_id  TEXT NOT NULL DEFAULT '',
  changed_fields TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(changed_fields)),
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log (created_at);

-- Fixed-window counters for abuse protection. Keys are salted hashes, not IP addresses.
CREATE TABLE IF NOT EXISTS rate_limits (
  key          TEXT    PRIMARY KEY,
  window_start INTEGER NOT NULL,
  count        INTEGER NOT NULL
);
