import Link from "next/link";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ======================================================
   TYPES
====================================================== */
type Decision = "pending" | "approved" | "rejected";
type VisitorKind = "invite" | "walkin";

type Visitor = {
  id: string;
  kind: VisitorKind;
  idNumber: string;
  fullName: string;
  email?: string;
  phone?: string;
  destination?: string;

  decision: Decision;
  createdAt: string;

  checkedOutAt?: string;
};

type Store = { visitors: Visitor[] };

/* ======================================================
   STORE (MVP JSON)
====================================================== */
const DATA_DIR = path.join(process.cwd(), ".arrivo-data");
const DATA_FILE = path.join(DATA_DIR, "visitors.json");

async function readStore(): Promise<Store> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return { visitors: [] };
  }
}

async function writeStore(store: Store) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(store, null, 2), "utf8");
}

/* ======================================================
   DESTINATIONS
====================================================== */
const DESTINATIONS = [
  "Admin",
  "Freida Brown",
  "School of Humanities and Social Sciences",
  "School of Science",
  "Wooden Block",
  "Lilian Beam",
  "Parking Lot A",
  "Parking Lot B",
  "Parking Lot C",
  "Auditorium",
  "Library",
  "Student Hostel",
];

/* ======================================================
   ACTIONS
====================================================== */
async function registerGuest(formData: FormData) {
  "use server";

  const store = await readStore();

  const visitor: Visitor = {
    id: randomUUID(),
    kind: "walkin",
    idNumber: String(formData.get("idNumber") || "").trim(),
    fullName: String(formData.get("fullName") || "").trim(),
    email: String(formData.get("email") || "").trim() || undefined,
    phone: String(formData.get("phone") || "").trim() || undefined,
    destination: String(formData.get("destination") || "").trim(),
    decision: "approved",
    createdAt: new Date().toISOString(),
  };

  store.visitors.unshift(visitor);
  await writeStore(store);
  revalidatePath("/security");
}

async function checkoutGuest(formData: FormData) {
  "use server";

  const idNumber = String(formData.get("idNumber") || "").trim();
  const store = await readStore();

  const v = store.visitors.find(
    x => x.idNumber === idNumber && !x.checkedOutAt
  );

  if (v) {
    v.checkedOutAt = new Date().toISOString();
    await writeStore(store);
  }

  revalidatePath("/security");
}

/* ======================================================
   PAGE
====================================================== */
export default async function SecurityPage() {
  const store = await readStore();

  const active = store.visitors.filter(v => !v.checkedOutAt);
  const completed = store.visitors.filter(v => v.checkedOutAt);

  return (
    <div className="min-h-screen bg-[#f9fafc] text-slate-900">
      {/* HEADER */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <div className="text-lg font-semibold">Arrivo</div>
            <div className="text-xs text-slate-500">Security Desk</div>
          </div>

          <Link
            href="/login"
            className="rounded-full border px-4 py-2 text-sm font-semibold"
          >
            Logout
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10 space-y-12">

        {/* ACTION BAR */}
        <section className="flex flex-wrap gap-4">
          <details className="group">
            <summary className="cursor-pointer rounded-2xl bg-[#203090] px-6 py-3 text-sm font-semibold text-white">
              Register Guest
            </summary>

            <form action={registerGuest} className="mt-6 grid grid-cols-1 gap-4 max-w-xl">
              <input name="idNumber" placeholder="ID Number" required className="rounded-xl border px-4 py-3" />
              <input name="fullName" placeholder="Full Name" required className="rounded-xl border px-4 py-3" />
              <input name="email" placeholder="Email (optional)" className="rounded-xl border px-4 py-3" />
              <input name="phone" placeholder="Phone (optional)" className="rounded-xl border px-4 py-3" />

              <select name="destination" required className="rounded-xl border px-4 py-3">
                <option value="">Select destination</option>
                {DESTINATIONS.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>

              <button className="rounded-xl bg-[#F0C000] px-5 py-3 font-semibold">
                Register & Approve
              </button>
            </form>
          </details>

          {/* CHECKOUT */}
          <form action={checkoutGuest} className="flex gap-3 items-center">
            <input
              name="idNumber"
              placeholder="ID to check out"
              className="rounded-xl border px-4 py-3"
              required
            />
            <button className="rounded-xl border px-5 py-3 font-semibold">
              Checkout
            </button>
          </form>
        </section>

        {/* ACTIVE VISITORS */}
        <section>
          <h2 className="mb-4 text-lg font-semibold">Active Visitors</h2>
          <div className="grid gap-3">
            {active.map(v => (
              <div key={v.id} className="rounded-2xl border bg-white px-5 py-4">
                <div className="font-semibold">{v.fullName}</div>
                <div className="text-sm text-slate-600">
                  {v.idNumber}  {v.destination}
                </div>
              </div>
            ))}
            {active.length === 0 && (
              <div className="text-sm text-slate-500">No active visitors.</div>
            )}
          </div>
        </section>

        {/* CHECKED OUT */}
        <section>
          <h2 className="mb-4 text-lg font-semibold">Checked Out</h2>
          <div className="grid gap-3">
            {completed.slice(0, 5).map(v => (
              <div key={v.id} className="rounded-2xl border bg-white px-5 py-4 opacity-70">
                <div className="font-semibold">{v.fullName}</div>
                <div className="text-sm text-slate-500">
                  Checked out at {new Date(v.checkedOutAt!).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </section>

      </main>
    </div>
  );
}
