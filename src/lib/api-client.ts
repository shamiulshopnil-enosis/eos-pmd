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

async function authHeader(): Promise<Record<string, string>> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

type Options = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  /** Passed through to fetch cache control. Reads default to no-store. */
  cache?: RequestCache;
};

export async function apiFetch<T>(path: string, opts: Options = {}): Promise<T> {
  const { method = "GET", body, cache = "no-store" } = opts;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    cache,
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(await authHeader()),
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
}

/**
 * Multipart POST for file uploads. Forwards the session as a Bearer token and
 * lets fetch set the multipart boundary. `form` is a FormData built in a server
 * action from the incoming request's files.
 */
export async function apiUpload<T>(path: string, form: FormData): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    cache: "no-store",
    headers: { ...(await authHeader()) },
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
