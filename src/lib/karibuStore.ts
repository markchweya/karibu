import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

/* ======================================================
   TYPES
====================================================== */
export type Decision = "pending" | "approved" | "rejected";
export type VisitorKind = "invite" | "walkin";
export type InviteStatus = "pending" | "checkedin" | "cancelled";
export type CheckoutStatus = "requested" | "finalized" | "cancelled";

export type CheckoutRequest = {
  id: string;
  visitorId: string;
  visitorName: string;
  visitorIdNumber: string;
  hostName: string;
  hostKey: string;
  inviteCode?: string;
  requestedAt: string;
  status: CheckoutStatus;
  finalizedAt?: string;
};

export type Invite = {
  id: string;
  code: string;
  hostName: string;
  hostKey: string;
  visitorName: string;
  visitorIdNumber: string;
  purpose: string;
  destination?: string;
  forDate: string; // YYYY-MM-DD
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

  checkoutRequestedAt?: string;
  checkoutRequestedBy?: string;
  checkoutRequestId?: string;

  decision: Decision;
  createdAt: string;
  checkedOutAt?: string;
};

export type Store = {
  visitors: Visitor[];
  invites: Invite[];
  checkoutRequests: CheckoutRequest[];
};

/* ======================================================
   FILE PATHS
   - Canonical: .karibu-data/store.json
   - Legacy:    .arrivo-data/visitors.json  (auto-migrated once)
====================================================== */
const KARIBU_DIR = path.join(process.cwd(), ".karibu-data");
const KARIBU_FILE = path.join(KARIBU_DIR, "store.json");

const LEGACY_DIR = path.join(process.cwd(), ".arrivo-data");
const LEGACY_FILE = path.join(LEGACY_DIR, "visitors.json");

function emptyStore(): Store {
  return { visitors: [], invites: [], checkoutRequests: [] };
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
export function nowISO() {
  return new Date().toISOString();
}
export function ms(iso: string) {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
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

/* ======================================================
   READ/WRITE + MIGRATION
====================================================== */

async function readJsonSafe<T>(file: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(file, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function writeJson(file: string, data: unknown) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(data, null, 2), "utf8");
}

type LegacyVisitor = {
  id: string;
  kind?: "invite" | "walkin";
  idNumber: string;
  fullName: string;
  email?: string;
  phone?: string;
  destination?: string;
  decision?: Decision;
  createdAt: string;
  checkedOutAt?: string;
};

type LegacyStore = { visitors: LegacyVisitor[] };

/**
 * If legacy exists and Karibu store is empty, migrate visitors over once.
 * This keeps your existing data from Arrivo.
 */
async function migrateLegacyIfNeeded(store: Store): Promise<Store> {
  if (store.visitors.length > 0 || store.invites.length > 0 || store.checkoutRequests.length > 0) return store;

  const legacy = await readJsonSafe<LegacyStore>(LEGACY_FILE);
  if (!legacy?.visitors?.length) return store;

  const migrated: Store = {
    visitors: legacy.visitors.map((v) => ({
      id: v.id || newId(),
      kind: (v.kind as VisitorKind) || "walkin",
      idNumber: v.idNumber,
      fullName: v.fullName,
      email: v.email,
      phone: v.phone,
      destination: v.destination,
      decision: v.decision || "approved",
      createdAt: v.createdAt,
      checkedOutAt: v.checkedOutAt,
    })),
    invites: [],
    checkoutRequests: [],
  };

  await writeJson(KARIBU_FILE, migrated);
  return migrated;
}

export async function readStore(): Promise<Store> {
  const parsed = (await readJsonSafe<Partial<Store>>(KARIBU_FILE)) ?? null;
  const store: Store = {
    visitors: Array.isArray(parsed?.visitors) ? (parsed!.visitors as Visitor[]) : [],
    invites: Array.isArray(parsed?.invites) ? (parsed!.invites as Invite[]) : [],
    checkoutRequests: Array.isArray(parsed?.checkoutRequests) ? (parsed!.checkoutRequests as CheckoutRequest[]) : [],
  };

  return migrateLegacyIfNeeded(store);
}

export async function writeStore(store: Store) {
  // Always write canonical
  await writeJson(KARIBU_FILE, store);

  // Also keep a tiny legacy mirror for debugging only (optional)
  // (If you hate this, tell me and we remove it.)
  try {
    const legacy: LegacyStore = {
      visitors: store.visitors.map((v) => ({
        id: v.id,
        kind: v.kind,
        idNumber: v.idNumber,
        fullName: v.fullName,
        email: v.email,
        phone: v.phone,
        destination: v.destination,
        decision: v.decision,
        createdAt: v.createdAt,
        checkedOutAt: v.checkedOutAt,
      })),
    };
    await writeJson(LEGACY_FILE, legacy);
  } catch {
    // ignore
  }
}
