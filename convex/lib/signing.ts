// HMAC-SHA256 request signing shared by both directions of the n8n integration.
// signature = hex(HMAC(secret, `${timestamp}.${body}`)), sent with the timestamp
// in headers. The timestamp is part of the signed string and must be recent,
// so a captured request can't be replayed later.

export const SIGNATURE_HEADER = "x-lendloop-signature";
export const TIMESTAMP_HEADER = "x-lendloop-timestamp";
const MAX_SKEW_MS = 5 * 60 * 1000;

function getSecret(): string {
  const secret = process.env.N8N_SHARED_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("N8N_SHARED_SECRET is missing or shorter than 32 characters.");
  }
  return secret;
}

async function hmacHex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function signBody(body: string) {
  const timestamp = Date.now().toString();
  const signature = await hmacHex(getSecret(), `${timestamp}.${body}`);
  return { timestamp, signature };
}

export async function verifyRequest(
  headers: Headers,
  body: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const timestamp = headers.get(TIMESTAMP_HEADER);
  const signature = headers.get(SIGNATURE_HEADER);
  if (!timestamp || !signature) return { ok: false, reason: "missing signature" };
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() - ts) > MAX_SKEW_MS) {
    return { ok: false, reason: "stale or invalid timestamp" };
  }
  const expected = await hmacHex(getSecret(), `${timestamp}.${body}`);
  return timingSafeEqual(expected, signature.toLowerCase())
    ? { ok: true }
    : { ok: false, reason: "bad signature" };
}
