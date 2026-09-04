import { cookies } from "next/headers";
import { SESSION_COOKIE } from "./session";

// Thin HTTP client for the NestJS backend (see ../../api). Every data read and
// every mutation the app used to run against Mongo directly now goes through
// here. The session JWT is pulled from the `eos_session` cookie and forwarded as
// a Bearer token; the API verifies it with the shared AUTH_SECRET.

// API_BASE_URL points at the NestJS backend. Local dev: http://localhost:4000/api
// Production (Vercel): https://<render-service>.onrender.com/api
// A bare host (no scheme) is accepted and assumed https.
function resolveBaseUrl(): string {
  const raw = process.env.API_BASE_URL?.trim();
  if (!raw) return "http://localhost:4000/api";
  const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return withProto.replace(/\/$/, "");
}

const BASE_URL = resolveBaseUrl();

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// The API sends dates as ISO strings; the pages expect real Date objects (they
// call .getTime(), toLocaleDateString(), etc.). Revive anything that looks like
// an ISO-8601 timestamp.
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

function reviveDates<T>(value: T): T {
  if (typeof value === "string") {
    return (ISO_DATE_RE.test(value) ? new Date(value) : value) as T;
  }
  if (Array.isArray(value)) {
    return value.map(reviveDates) as unknown as T;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = reviveDates(v);
    return out as T;
  }
  return value;
}

async function sessionToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value;
}

// ---------------------------------------------------------------------------
// Short-TTL response cache
// ---------------------------------------------------------------------------
// The list/dashboard pages are `dynamic = "force-dynamic"` (they read the
// session cookie), so Next does no caching of its own and every navigation
// re-hits the API — several sequential queries against a remote Atlas cluster.
// This is a small in-process cache that holds each GET's result for a few
// seconds, keyed by the session token so it is never shared across users. Any
// mutation (`apiFetch` with a non-GET method, or `apiUpload`) flushes it, so a
// write is always followed by fresh reads; cross-user staleness is bounded by
// the TTL. Set `API_CACHE_TTL_MS=0` to disable.

const CACHE_TTL_MS = Math.max(0, Number(process.env.API_CACHE_TTL_MS ?? 10_000));
const CACHE_MAX_ENTRIES = 500;
type CacheEntry = { expires: number; promise: Promise<unknown> };
const responseCache = new Map<string, CacheEntry>();

/** Drop every cached response. Called on every write. */
export function clearApiCache(): void {
  responseCache.clear();
}

type Options = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  /**
   * Passed through to fetch cache control. Reads default to no-store. Setting
   * this to any value also opts the call out of the short-TTL response cache.
   */
  cache?: RequestCache;
};

export async function apiFetch<T>(path: string, opts: Options = {}): Promise<T> {
  const { method = "GET", body, cache = "no-store" } = opts;
  const token = await sessionToken();

  // A write can invalidate any cached read — flush the whole cache.
  if (method !== "GET") clearApiCache();

  const useCache = method === "GET" && CACHE_TTL_MS > 0 && opts.cache === undefined;
  const key = useCache ? `${token ?? "anon"}::${path}` : "";

  if (useCache) {
    const hit = responseCache.get(key);
    if (hit && hit.expires > Date.now()) return hit.promise as Promise<T>;
  }

  const request = (async () => {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      cache,
      headers: {
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const text = await res.text();
    const payload = text ? JSON.parse(text) : null;

    if (!res.ok) {
      const message =
        (payload && (payload.message || payload.error)) ||
        `API ${method} ${path} failed (${res.status})`;
      throw new ApiError(Array.isArray(message) ? message.join(", ") : String(message), res.status);
    }

    return reviveDates(payload) as T;
  })();

  if (useCache) {
    if (responseCache.size >= CACHE_MAX_ENTRIES) clearApiCache();
    responseCache.set(key, { expires: Date.now() + CACHE_TTL_MS, promise: request });
    // Never cache a failure.
    request.catch(() => {
      if (responseCache.get(key)?.promise === request) responseCache.delete(key);
    });
  }

  return request;
}

/**
 * Multipart POST for file uploads. Forwards the session as a Bearer token and
 * lets fetch set the multipart boundary. `form` is a FormData built in a server
 * action from the incoming request's files.
 */
export async function apiUpload<T>(path: string, form: FormData): Promise<T> {
  clearApiCache(); // a file upload is a write
  const token = await sessionToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    cache: "no-store",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });

  const text = await res.text();
  const payload = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const message =
      (payload && (payload.message || payload.error)) ||
      `API POST ${path} failed (${res.status})`;
    throw new ApiError(Array.isArray(message) ? message.join(", ") : String(message), res.status);
  }
  return reviveDates(payload) as T;
}

/** Same as apiFetch but never throws — returns null on any error (for optional reads). */
export async function apiFetchOrNull<T>(path: string, opts: Options = {}): Promise<T | null> {
  try {
    return await apiFetch<T>(path, opts);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 403)) return null;
    throw err;
  }
}

export const apiBaseUrl = BASE_URL;
