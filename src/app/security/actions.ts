"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { readStore, writeStore, s, todayISO, newId } from "@/lib/karibuStore";

/**
 * Security checks in an invite by code:
 * - Marks invite as checkedin
 * - Creates/updates an ACTIVE visitor record linked to invite
 */
export async function checkInInviteByCode(formData: FormData) {
  const code = s(formData.get("code")).toUpperCase();
  if (!code) redirect("/security?flash=code_missing");

  const store = await readStore();
  const today = todayISO();

  const inv = store.invites.find((i) => i.code === code);
  if (!inv) redirect("/security?flash=invite_notfound");
  if (inv.forDate !== today) redirect("/security?flash=invite_wrongday");
  if (inv.status === "cancelled") redirect("/security?flash=invite_cancelled");
  if (inv.status === "checkedin") redirect("/security?flash=invite_already");

  // mark checked in
  inv.status = "checkedin";
  inv.checkedInAt = new Date().toISOString();

  // Ensure visitor exists (active)
  const existingActive = store.visitors.find(
    (v) => v.inviteId === inv.id && !v.checkedOutAt
  );

  if (!existingActive) {
    store.visitors.unshift({
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
    });
  }

  await writeStore(store);
  revalidatePath("/security");
  redirect("/security?flash=checked_in");
}

/**
 * Security registers a walk-in (MVP):
 * - Creates an active visitor record
 */
export async function registerWalkin(formData: FormData) {
  const idNumber = s(formData.get("idNumber"));
  const fullName = s(formData.get("fullName"));
  const destination = s(formData.get("destination"));
  const purpose = s(formData.get("purpose"));

  if (!idNumber || idNumber.length < 4) redirect("/security?flash=bad_id");
  if (!fullName || fullName.length < 2) redirect("/security?flash=bad_name");
  if (!destination) redirect("/security?flash=bad_dest");

  const store = await readStore();
  const active = store.visitors.filter((v) => !v.checkedOutAt);

  // block duplicate active ID
  if (active.some((v) => v.idNumber === idNumber)) redirect("/security?flash=dup_id");

  store.visitors.unshift({
    id: newId(),
    kind: "walkin",
    idNumber,
    fullName,
    destination,
    purpose: purpose || undefined,
    decision: "approved",
    createdAt: new Date().toISOString(),
  });

  await writeStore(store);
  revalidatePath("/security");
  redirect("/security?flash=registered");
}

/**
 * Security finalizes a checkout after host started the 10-min clock.
 */
export async function securityFinalizeCheckout(formData: FormData) {
  const visitorId = s(formData.get("visitorId"));
  if (!visitorId) redirect("/security?flash=checkout_missing");

  const store = await readStore();
  const v = store.visitors.find((x) => x.id === visitorId && !x.checkedOutAt);
  if (!v) redirect("/security?flash=checkout_notfound");

  v.checkedOutAt = new Date().toISOString();
  await writeStore(store);

  revalidatePath("/security");
  redirect("/security?flash=checked_out");
}
