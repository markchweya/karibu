import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

export type Decision = "pending" | "approved" | "rejected";
export type VisitorKind = "invite" | "walkin";

export type InviteStatus = "pending" | "checkedin" | "cancelled";

export type Invite = {
  id: string;
  code: string;         // what visitor presents at gate
  hostName: string;
  hostKey: string;      // normalized key for per-host counting
  visitorName: string;
  visitorIdNumber: string;
  purpose: string;
  destination?: string;

  forDate: string;      // YYYY-MM-DD (invite day)
  createdAt: string;

  status: InviteStatus;
  checkedInAt?: string;
  cancelledAt?: string;
};

export type Visitor = {
  id: string;
  kind: VisitorKind;
  idNumber: string;
  fullName: string;
  email?: string;
  phone?: string;
  destination?: string;

  purpose?: string;
  hostName?: string;
  inviteCode?: string;
  inviteId?: string;

  decision: Decision;
  createdAt: string;

  checkedOutAt?: string;
};

export type Store = { visitors: Visitor[]; invites: Invite[] };

/* ======================================================
   STORE FILE
====================================================== */
const DATA_DIR = path.join(process.cwd(), ".karibu-data");
const DATA_FILE = path.join(DATA_DIR, "store.json");

export async function readStore(): Promise<Store> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as Store;
    return {
      visitors: Array.isArray(parsed?.visitors) ? parsed.visitors : [],
      invites: Array.isArray(parsed?.invites) ? parsed.invites : [],
    };
  } catch {
    return { visitors: [], invites: [] };
  }
}

export async function writeStore(store: Store) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(store, null, 2), "utf8");
}

/* ======================================================
   HELPERS
====================================================== */
export function s(v: unknown) {
  return String(v ?? "").trim();
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function normKey(v: string) {
  return v.trim().toLowerCase().replace(/\s+/g, " ").replace(/[^a-z0-9 ]/g, "").replace(/\s/g, "_");
}

export function fmt(iso?: string) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function initials(name: string) {
  const parts = name.split(" ").filter(Boolean);
  const a = parts[0]?.[0] ?? "V";
  const b = parts[1]?.[0] ?? parts[0]?.[1] ?? "";
  return (a + b).toUpperCase();
}

export function makeCode(len = 7) {
  // base32-ish (no confusing chars)
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

export function newId() {
  return randomUUID();
}

export function ensureUniqueCode(existing: Set<string>, len = 7) {
  let code = makeCode(len);
  let guard = 0;
  while (existing.has(code) && guard < 50) {
    code = makeCode(len);
    guard++;
  }
  return code;
}
