/** Backend-only test fixtures (Node built-ins, the Worker app). Kept separate from helpers.ts so jsdom component tests never pull in node:sqlite. */
import { readFileSync } from "node:fs";
import { DatabaseSync, type StatementResultingChanges } from "node:sqlite";
import app, { type Env } from "../worker/index";

export { submission } from "./helpers";

export const PASSWORD = "correct horse battery staple";
export const SECRETS = { ADMIN_PASSWORD: PASSWORD, SESSION_SECRET: "test-session-secret-0123456789-abcdefghij" };

/**
 * A minimal D1Database-compatible shim backed by Node's built-in SQLite.
 * D1 *is* SQLite, so this runs the real schema (CHECK/UNIQUE/json_valid constraints,
 * RETURNING, strftime defaults) without needing a workerd sandbox — this project's
 * installed Miniflare build is a pre-release beta whose constructor API has changed
 * incompatibly with its own documented shape, and the matching @cloudflare/vitest-pool-workers
 * release only supports Vitest 4.x while this project is pinned to Vitest 5.
 */
class FakeD1Statement {
  constructor(private readonly db: DatabaseSync, private readonly sql: string, private readonly params: unknown[] = []) {}

  bind(...params: unknown[]): FakeD1Statement {
    return new FakeD1Statement(this.db, this.sql, params);
  }

  async run(): Promise<{ success: true; meta: { changes: number; last_row_id: number | bigint }; results: never[] }> {
    const info = this.db.prepare(this.sql).run(...(this.params as never[])) as StatementResultingChanges;
    return { success: true, meta: { changes: Number(info.changes), last_row_id: info.lastInsertRowid }, results: [] };
  }

  async all<T = Record<string, unknown>>(): Promise<{ success: true; results: T[] }> {
    const rows = this.db.prepare(this.sql).all(...(this.params as never[])) as T[];
    return { success: true, results: rows };
  }

  async first<T = Record<string, unknown>>(): Promise<T | null> {
    const row = this.db.prepare(this.sql).get(...(this.params as never[]));
    return (row ?? null) as T | null;
  }
}

class FakeD1 {
  readonly db: DatabaseSync;
  constructor() {
    this.db = new DatabaseSync(":memory:");
  }
  prepare(sql: string): FakeD1Statement {
    return new FakeD1Statement(this.db, sql);
  }
  exec(sql: string): void {
    this.db.exec(sql);
  }
  async batch<T>(statements: FakeD1Statement[]): Promise<T[]> {
    this.db.exec("BEGIN");
    try {
      const results: T[] = [];
      for (const s of statements) results.push((await s.run()) as unknown as T);
      this.db.exec("COMMIT");
      return results;
    } catch (err) {
      this.db.exec("ROLLBACK");
      throw err;
    }
  }
}

export function createTestDb(): D1Database {
  const fake = new FakeD1();
  fake.exec(readFileSync(new URL("../migrations/0001_init.sql", import.meta.url), "utf8"));
  return fake as unknown as D1Database;
}

export function client(db: D1Database, extra: Partial<Env> = {}) {
  const env = { DB: db, ...SECRETS, AI_PROVIDER: "none", ...extra } as Env;
  let cookie = "";
  const call = async (method: string, path: string, body?: unknown, headers: Record<string, string> = {}) => {
    const res = await app.fetch(
      new Request(`https://trip.example${path}`, {
        method,
        headers: { ...(body !== undefined ? { "content-type": "application/json" } : {}), ...(cookie ? { cookie } : {}), "cf-connecting-ip": "203.0.113.7", ...headers },
        body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
      }),
      env,
    );
    const set = res.headers.get("set-cookie");
    if (set) cookie = set.split(";")[0].endsWith("=") ? "" : set.split(";")[0];
    return res;
  };
  return {
    call,
    get: (p: string) => call("GET", p),
    post: (p: string, b?: unknown, h?: Record<string, string>) => call("POST", p, b, h),
    login: (password = PASSWORD) => call("POST", "/api/admin/login", { password }),
    clearCookie: () => { cookie = ""; },
    setCookie: (c: string) => { cookie = c; },
  };
}
