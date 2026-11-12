# Punjab Family Getaway 2026

A small full-stack app for planning the family's Amritsar / Punjab trip (10–13 December 2026):
a public survey that collects everyone's preferences, and a private admin dashboard with
analytics, CSV export and an optional AI assistant for the organiser.

- **Frontend:** React + TypeScript + Vite, Tailwind CSS
- **Backend:** Cloudflare Workers + D1 (SQLite), via the [Hono](https://hono.dev) framework
- **Cost:** runs entirely on Cloudflare's free tier — see [Costs](#costs) below
- **AI assistant:** optional. The app works fully without it; see [AI assistant](#ai-assistant-optional)

## Contents

- [Quick start (local development)](#quick-start-local-development)
- [Deploying to Cloudflare](#deploying-to-cloudflare)
- [Day-to-day use](#day-to-day-use)
- [AI assistant (optional)](#ai-assistant-optional)
- [Backups](#backups)
- [Security](#security)
- [Costs](#costs)
- [Project layout](#project-layout)
- [Troubleshooting](#troubleshooting)

## Quick start (local development)

Requirements: Node.js 20+, npm, a free [Cloudflare account](https://dash.cloudflare.com/sign-up).

```bash
npm install

# Local secrets (never committed — .dev.vars is git-ignored)
cp .dev.vars.example .dev.vars
# edit .dev.vars: set ADMIN_PASSWORD and SESSION_SECRET to your own values

# Create the local database schema (a local-only SQLite file, not your real Cloudflare D1)
npm run db:migrate:local

# Build the frontend, then run the whole app (frontend + API) on one local server
npm run preview
```

Open `http://localhost:8787` for the survey, or `http://localhost:8787/admin` for the dashboard
(sign in with the `ADMIN_PASSWORD` you set above).

For frontend-only UI work (no backend, instant hot reload), `npm run dev` instead starts just
the Vite dev server against mock data.

Run the test suite with `npm test` (64 tests: survey UI, admin dashboard, analytics, and the
full backend API against a real SQLite-backed database).

## Deploying to Cloudflare

1. **Install and log in to Wrangler** (already a project dependency):
   ```bash
   npx wrangler login
   ```
   This opens a browser to authorize Wrangler against your Cloudflare account.

2. **Create the D1 database:**
   ```bash
   npx wrangler d1 create punjab-trip-db
   ```
   This prints a `database_id`. Copy it into `wrangler.jsonc`, replacing the placeholder
   `00000000-0000-0000-0000-000000000000` under `d1_databases`.

3. **Apply the database schema to the real (remote) database:**
   ```bash
   npm run db:migrate:remote
   ```

4. **Set the required secrets** (never stored in the repo or in `wrangler.jsonc`):
   ```bash
   npx wrangler secret put ADMIN_PASSWORD
   npx wrangler secret put SESSION_SECRET
   ```
   - `ADMIN_PASSWORD`: the password you and the family organiser will use to sign in to `/admin`.
     Use a long, memorable passphrase rather than a short password.
   - `SESSION_SECRET`: a random string of at least 32 characters, used to sign admin session
     cookies. Generate one with `openssl rand -base64 32`, or any password generator. You don't
     need to remember it — it's only read by the server.

5. **Deploy:**
   ```bash
   npm run deploy
   ```
   Wrangler prints your live URL, something like `https://punjab-family-getaway.<your-subdomain>.workers.dev`.

6. **Share the survey link** (the root URL, e.g. `https://punjab-family-getaway.<your-subdomain>.workers.dev/`)
   with the family on WhatsApp. It only shows the survey — never the dashboard or anyone else's
   answers.

7. **Use the dashboard** at the same URL with `/admin` appended (e.g.
   `.../admin`), signed in with the `ADMIN_PASSWORD` you set in step 4.

A custom domain is optional — the free `workers.dev` URL works fine. To use your own domain,
see [Cloudflare's custom domains guide](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)
(this does cost money, unlike everything else in this list).

### Redeploying after a change

```bash
npm run deploy
```

This rebuilds the frontend and redeploys the Worker. It does **not** re-run database migrations —
if you've added a new migration file, run `npm run db:migrate:remote` first.

## Day-to-day use

- **Family members** fill in the survey at the root URL. Answers autosave to their browser as
  they go, so refreshing or closing the tab doesn't lose progress. Submitting again with the
  same link is safe — it updates nothing extra and won't create a duplicate.
- **The organiser** reviews responses at `/admin`: an overview of trends, a searchable/filterable
  table of every response (with view/edit/delete), activity and accommodation breakdowns, trip
  insights, and CSV export (for Excel/Google Sheets).
- Once everyone has responded, the organiser plans the final itinerary and shares it back with
  the family outside this app (WhatsApp, etc.) — the survey page says as much to set expectations.

## AI assistant (optional)

The dashboard's "AI Trip Assistant" and "Recommendations" panel work out of the box using
**only** the numbers calculated from survey responses — no AI, no API key, no cost. To add an AI
model that can also write natural-language summaries and suggestions on top of those numbers:

1. Pick a provider: [Anthropic](https://console.anthropic.com/) (Claude) or
   [Google AI Studio](https://aistudio.google.com/) (Gemini). Both have a usage-based paid API —
   **this is the one part of the app with a running cost**, and it's entirely optional. A
   Claude.ai or Gemini subscription does not include API credits; API usage is billed separately.
2. Create an API key with your chosen provider.
3. Set the provider and key as Worker secrets:
   ```bash
   npx wrangler secret put ANTHROPIC_API_KEY   # if using Anthropic
   # or
   npx wrangler secret put GEMINI_API_KEY      # if using Gemini
   ```
4. Set `AI_PROVIDER` in `wrangler.jsonc` under `vars` to `"anthropic"` or `"gemini"`, and
   redeploy (`npm run deploy`).

The assistant only ever sees anonymised data (responses labelled "Respondent 1", "Respondent 2",
etc., with names, phone numbers and booking links stripped out) — never anyone's name or contact
details. Real names are substituted back into the reply afterwards, entirely on the server, after
the AI has already responded. If the provider is misconfigured, rate-limited, or unreachable, the
dashboard automatically falls back to the calculated-figures-only mode — the assistant never shows
an error page to the family or the organiser.

## Backups

Export every response as CSV at any time from the dashboard's Family Responses page (works from
day one, no setup needed).

For a full database backup:
```bash
npm run db:backup
```
This writes a complete SQL dump of the live database to `backup-<date>.sql` in the project folder.

## Security

- All database queries are parameterised (no string-built SQL).
- Admin sessions are signed, HttpOnly, Secure, SameSite=Strict cookies that expire after 12 hours.
- The admin password is never compared directly — a constant-time check prevents timing attacks.
- Survey submission and admin login are both rate-limited per connection.
- An audit log records which fields an edit changed, or that a response was deleted or exported —
  but never the before/after values, to avoid retaining sensitive personal data unnecessarily.
- The AI assistant never receives names, phone numbers or booking links (see
  [AI assistant](#ai-assistant-optional) above).
- Security headers (CSP, X-Frame-Options, etc.) are set on every response; see `public/_headers`
  and the equivalent headers set in `worker/index.ts` for API responses.
- No secrets are ever stored in the repository — only in `.dev.vars` locally (git-ignored) or as
  Cloudflare Worker secrets in production.

## Costs

Everything above runs on Cloudflare's free tier:

- **Workers (Free plan):** 100,000 requests/day, static assets served free and unlimited.
- **D1 (free tier):** 5 million rows read/day, 100,000 rows written/day, 5 GB storage. For a
  family trip survey with a few dozen responses, this is orders of magnitude more than you'll use.

The only costs that can arise are both optional and separate from Cloudflare:
- **AI provider API usage**, if you choose to connect one (see above) — billed by Anthropic or
  Google per request, not by Cloudflare.
- **A custom domain**, if you want one instead of the free `workers.dev` URL.

## Project layout

```
shared/        Code shared by the frontend and the Worker: trip configuration, validation,
                analytics, CSV export, deterministic "facts" generation.
worker/        The Cloudflare Worker: HTTP API (worker/index.ts), database access (db.ts),
                admin auth (auth.ts), the AI assistant integration (ai.ts).
migrations/    D1 database schema.
src/           The React frontend: the public survey (src/survey/) and the admin
                dashboard (src/admin/).
tests/         Vitest test suite — component tests (jsdom) and backend tests (against a
                real SQLite-backed database; see tests/worker-helpers.ts for why).
public/        Static files copied as-is into the deployed app, including security headers.
```

## Troubleshooting

- **"Sign-in is temporarily unavailable" on `/admin`:** `ADMIN_PASSWORD` or `SESSION_SECRET`
  hasn't been set (or is too short — `SESSION_SECRET` needs 32+ characters). Re-run the
  `wrangler secret put` commands under [Deploying](#deploying-to-cloudflare).
- **A survey submission fails with "we could not save your response":** usually a temporary
  network issue — the page says so and the family member's answers are still saved in their
  browser, so they can just try again.
- **Wrong database / "no responses" after deploying:** check that the `database_id` in
  `wrangler.jsonc` matches the one printed by `wrangler d1 create`, and that you've run
  `npm run db:migrate:remote` at least once.
