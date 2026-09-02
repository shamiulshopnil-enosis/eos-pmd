// The Next.js server actions used to read FormData; they now forward plain JSON
// to the API. These mirror the str/optStr/optInt/optDate helpers from
// src/lib/actions.ts so the write logic ports across unchanged.

type Body = Record<string, unknown>;

export function str(body: Body, key: string): string {
  const v = body[key];
  return typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim();
}

export function optStr(body: Body, key: string): string | null {
  const v = str(body, key);
  return v === "" ? null : v;
}

export function optInt(body: Body, key: string): number | null {
  const raw = body[key];
  if (raw == null || raw === "") return null;
  const n = typeof raw === "number" ? Math.trunc(raw) : Number.parseInt(String(raw), 10);
  return Number.isNaN(n) ? null : n;
}

export function optDate(body: Body, key: string): Date | null {
  const v = str(body, key);
  if (v === "") return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function bool(body: Body, key: string): boolean {
  const v = body[key];
  return v === true || v === "on" || v === "true" || v === 1 || v === "1";
}

export function strList(body: Body, key: string): string[] {
  const v = body[key];
  if (Array.isArray(v)) return v.map(String);
  if (typeof v === "string" && v !== "") return [v];
  return [];
}
