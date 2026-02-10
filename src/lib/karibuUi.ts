// src/lib/karibuUi.ts
// Pure helpers only. Safe to import from Client and Server Components.

export function s(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

export function normKey(v: unknown): string {
  return s(v)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function ms(x: any): number {
  if (!x) return 0;
  if (typeof x === "number") return Number.isFinite(x) ? x : 0;
  if (x instanceof Date) return x.getTime();
  const t = Date.parse(String(x));
  return Number.isFinite(t) ? t : 0;
}

export function initials(name: string): string {
  const parts = s(name).split(" ").filter(Boolean);
  if (parts.length === 0) return "?";
  const a = parts[0]?.[0] ?? "?";
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (a + b).toUpperCase();
}

export function fmt(ts: any): string {
  const n = ms(ts);
  if (!n) return "";
  try {
    const d = new Date(n);
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  } catch {
    return "";
  }
}

export function fmtMMSS(totalMs: number): string {
  const t = Math.max(0, Math.floor(totalMs / 1000));
  const m = Math.floor(t / 60);
  const s2 = t % 60;
  return `${String(m).padStart(2, "0")}:${String(s2).padStart(2, "0")}`;
}
