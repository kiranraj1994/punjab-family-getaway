/** Administrator sessions: a stateless, HMAC-signed, expiring token kept in an HttpOnly cookie. */
const encoder = new TextEncoder();

export const SESSION_COOKIE = "pfg_admin";
export const SESSION_TTL_SECONDS = 12 * 60 * 60;

function b64url(bytes: ArrayBuffer): string {
  let s = "";
  for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function hmac(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, encoder.encode(message)));
}

/** Constant-time comparison of two strings of equal length. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Compares via HMAC digests so neither length nor content of the password leaks through timing. */
export async function passwordMatches(secret: string, given: string, expected: string): Promise<boolean> {
  const [a, b] = await Promise.all([hmac(secret, `pw:${given}`), hmac(secret, `pw:${expected}`)]);
  return safeEqual(a, b);
}

export async function createSession(secret: string, now = Date.now()): Promise<string> {
  const payload = `${Math.floor(now / 1000) + SESSION_TTL_SECONDS}.${crypto.randomUUID()}`;
  return `${payload}.${await hmac(secret, `session:${payload}`)}`;
}

export async function verifySession(secret: string, token: string | undefined, now = Date.now()): Promise<boolean> {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [exp, nonce, sig] = parts;
  if (!/^\d+$/.test(exp) || Number(exp) * 1000 <= now) return false;
  return safeEqual(sig, await hmac(secret, `session:${exp}.${nonce}`));
}

export function isConfigured(env: { ADMIN_PASSWORD?: string; SESSION_SECRET?: string }): env is { ADMIN_PASSWORD: string; SESSION_SECRET: string } {
  return Boolean(env.ADMIN_PASSWORD && env.ADMIN_PASSWORD.length >= 8 && env.SESSION_SECRET && env.SESSION_SECRET.length >= 32);
}
