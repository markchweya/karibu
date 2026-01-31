"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  readStore,
  writeStore,
  s,
  todayISO,
  newId,
  type Visitor,
} from "@/lib/karibuStore";

/* =========================
   WALK-IN (existing behavior)
========================= */
export async function registerWalkin(formData: FormData) {
  const idNumber = s(formData.get("idNumber"));
  const fullName = s(formData.get("fullName"));
  const emailRaw = s(formData.get("email"));
  const phone = s(formData.get("phone"));
  const destination = s(formData.get("destination"));

  if (!idNumber || idNumber.length < 4) redirect("/security?flash=bad_id");
  if (!fullName || fullName.length < 2) redirect("/security?flash=bad_name");
  if (!destination) redirect("/security?flash=bad_dest");

  const store = await readStore();

  // block duplicate ACTIVE ID/email
  const active = store.visitors.filter((v) => !v.checkedOutAt);

  if (active.some((v) => v.idNumber === idNumber)) redirect("/security?flash=dup_id");

  const email = emailRaw.trim().toLowerCase();
  if (email) {
    const dupEmail = active.some((v) => (v.email || "").trim().toLowerCase() === email);
    if (dupEmail) redirect("/security?flash=dup_email");
  }

  const v: Visitor = {
    id: newId(),
    kind: "walkin",
    idNumber,
    fullName,
    email: emailRaw || undefined,
    phone: phone || undefined,
    destination,
    decision: "approved",
    createdAt: new Date().toISOString(),
  };

  store.visitors.unshift(v);
  await writeStore(store);

  revalidatePath("/security");
  redirect("/security?flash=registered");
}

/* =========================
   INVITE CHECK-IN
========================= */
export async function checkInInviteByCode(formData: FormData) {
  const code = s(formData.get("code")).toUpperCase().replace(/\s+/g, "");
  if (!code) redirect("/security?flash=code_missing");

  const store = await readStore();
  const today = todayISO();

  const inv = store.invites.find((i) => i.code === code);

  if (!inv) redirect("/security?flash=invite_notfound");
  if (inv.forDate !== today) redirect("/security?flash=invite_wrongday");
  if (inv.status === "cancelled") redirect("/security?flash=invite_cancelled");
  if (inv.status === "checkedin") redirect("/security?flash=invite_already");

  // prevent duplicate ACTIVE visit with same ID
  const active = store.visitors.filter((v) => !v.checkedOutAt);
  if (active.some((v) => v.idNumber === inv.visitorIdNumber)) redirect("/security?flash=dup_id");

  const visit: Visitor = {
    id: newId(),
    kind: "invite",
    idNumber: inv.visitorIdNumber,
    fullName: inv.visitorName,
    destination: inv.destination,
    purpose: inv.purpose,
    hostName: inv.hostName,
    inviteCode: inv.code,
    inviteId: inv.id,
    decision: "approved",
    createdAt: new Date().toISOString(),
  };

  inv.status = "checkedin";
  inv.checkedInAt = new Date().toISOString();

  store.visitors.unshift(visit);
  await writeStore(store);

  revalidatePath("/security");
  redirect("/security?flash=checked_in");
}

/* =========================
   CHECKOUT (same)
========================= */
export async function checkoutByIdNumber(formData: FormData) {
  const idNumber = s(formData.get("idNumber"));
  if (!idNumber) redirect("/security?flash=checkout_missing");

  const store = await readStore();
  const v = store.visitors.find((x) => x.idNumber === idNumber && !x.checkedOutAt);

  if (!v) redirect("/security?flash=checkout_notfound");

  v.checkedOutAt = new Date().toISOString();
  await writeStore(store);

  revalidatePath("/security");
  redirect("/security?flash=checked_out");
}

export async function checkoutByVisitorId(formData: FormData) {
  const vid = s(formData.get("visitorId"));
  if (!vid) redirect("/security?flash=checkout_missing");

  const store = await readStore();
  const v = store.visitors.find((x) => x.id === vid && !x.checkedOutAt);

  if (!v) redirect("/security?flash=checkout_notfound");

  v.checkedOutAt = new Date().toISOString();
  await writeStore(store);

  revalidatePath("/security");
  redirect("/security?flash=checked_out");
}
