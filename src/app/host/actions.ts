"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  readStore,
  writeStore,
  s,
  todayISO,
  normKey,
  ensureUniqueCode,
  newId,
  nowISO,
  type Invite,
  type CheckoutRequest,
} from "@/lib/karibuStore";

const MAX_INVITES_PER_HOST_PER_DAY = 4;

function ensureArrays(store: any) {
  if (!Array.isArray(store.invites)) store.invites = [];
  if (!Array.isArray(store.visitors)) store.visitors = [];
  if (!Array.isArray(store.checkoutRequests)) store.checkoutRequests = [];
  return store;
}

export async function hostCreateInvite(formData: FormData) {
  const hostName = s(formData.get("hostName"));
  const visitorName = s(formData.get("visitorName"));
  const visitorIdNumber = s(formData.get("visitorIdNumber"));
  const purpose = s(formData.get("purpose"));
  const destination = s(formData.get("destination"));

  if (hostName.length < 2) redirect("/host?flash=bad_host");
  if (visitorName.length < 2) redirect(`/host?host=${encodeURIComponent(hostName)}&flash=bad_name`);
  if (visitorIdNumber.length < 4) redirect(`/host?host=${encodeURIComponent(hostName)}&flash=bad_id`);
  if (purpose.length < 2) redirect(`/host?host=${encodeURIComponent(hostName)}&flash=bad_purpose`);

  const storeRaw = await readStore();
  const store = ensureArrays(storeRaw);

  const forDate = todayISO();
  const hostKey = normKey(hostName);

  const todays = store.invites.filter(
    (i: Invite) => i.forDate === forDate && i.hostKey === hostKey && i.status !== "cancelled"
  );

  if (todays.length >= MAX_INVITES_PER_HOST_PER_DAY) {
    redirect(`/host?host=${encodeURIComponent(hostName)}&flash=limit`);
  }

  const dup = todays.some((i: Invite) => i.visitorIdNumber === visitorIdNumber && i.status === "pending");
  if (dup) redirect(`/host?host=${encodeURIComponent(hostName)}&flash=dup_invite`);

  const existingCodes = new Set<string>([
    ...store.invites.map((x: Invite) => (x.code || "").toUpperCase()),
    ...store.visitors.map((x: any) => ((x.inviteCode as string) || "").toUpperCase()),
  ]);

  const invite: Invite = {
    id: newId(),
    code: ensureUniqueCode(existingCodes, 7),
    hostName,
    hostKey,
    visitorName,
    visitorIdNumber,
    purpose,
    destination: destination || undefined,
    forDate,
    createdAt: nowISO(),
    status: "pending",
  };

  store.invites.unshift(invite);
  await writeStore(store);

  revalidatePath("/host");
  revalidatePath("/security");

  redirect(`/host?host=${encodeURIComponent(hostName)}&flash=created&guest=${encodeURIComponent(visitorName)}`);
}

export async function hostCancelInvite(formData: FormData) {
  const inviteId = s(formData.get("inviteId"));
  const hostName = s(formData.get("hostName"));

  if (!inviteId) redirect("/host?flash=bad_cancel");

  const storeRaw = await readStore();
  const store = ensureArrays(storeRaw);

  const inv = store.invites.find((i: Invite) => i.id === inviteId);
  if (!inv) redirect(`/host?host=${encodeURIComponent(hostName)}&flash=not_found`);
  if (inv.status !== "pending") redirect(`/host?host=${encodeURIComponent(hostName || inv.hostName)}&flash=cant_cancel`);

  inv.status = "cancelled";
  (inv as any).cancelledAt = nowISO();

  await writeStore(store);

  revalidatePath("/host");
  revalidatePath("/security");

  redirect(`/host?host=${encodeURIComponent(hostName || inv.hostName)}&flash=cancelled&guest=${encodeURIComponent(inv.visitorName || "")}`);
}

/**
 * Shared logic (used by both actions)
 */
async function startCheckoutInternal(hostName: string, codeRaw: string) {
  const code = codeRaw.toUpperCase().replace(/\s+/g, "");

  if (hostName.length < 2) return { ok: false as const, flash: "bad_host", guest: "" };
  if (!code) return { ok: false as const, flash: "code_missing", guest: "" };

  const storeRaw = await readStore();
  const store = ensureArrays(storeRaw);

  const v = store.visitors.find(
    (x: any) => !x.checkedOutAt && (((x.inviteCode as string) || "").toUpperCase() === code)
  );

  if (!v) return { ok: false as const, flash: "visitor_notfound", guest: "" };

  const existingActiveReq = store.checkoutRequests.find(
    (r: CheckoutRequest) => r.visitorId === v.id && r.status === "requested"
  );

  if (existingActiveReq) {
    return { ok: true as const, flash: "checkout_already", guest: (v.fullName || "").toString() };
  }

  const req: CheckoutRequest = {
    id: newId(),
    visitorId: v.id,
    visitorName: v.fullName,
    visitorIdNumber: v.idNumber,
    hostName,
    hostKey: normKey(hostName),
    inviteCode: v.inviteCode,
    requestedAt: nowISO(),
    status: "requested",
  };

  store.checkoutRequests.unshift(req);

  v.checkoutRequestedAt = req.requestedAt;
  v.checkoutRequestedBy = hostName;
  v.checkoutRequestId = req.id;

  await writeStore(store);

  revalidatePath("/host");
  revalidatePath("/security");

  return { ok: true as const, flash: "checkout_started", guest: (v.fullName || "").toString() };
}

/**
 * Use this for client “instant” button (NO redirect)
 */
export async function hostStartCheckoutLive(formData: FormData) {
  const hostName = s(formData.get("hostName"));
  const code = s(formData.get("code"));
  return startCheckoutInternal(hostName, code);
}

/**
 * Keep this for classic <form action={hostStartCheckout}> flows (WITH redirect + toast)
 */
export async function hostStartCheckout(formData: FormData) {
  const hostName = s(formData.get("hostName"));
  const code = s(formData.get("code"));

  const res = await startCheckoutInternal(hostName, code);

  if (!res.ok) {
    if (res.flash === "code_missing") {
      redirect(`/host?host=${encodeURIComponent(hostName)}&flash=code_missing`);
    }
    if (res.flash === "visitor_notfound") {
      redirect(`/host?host=${encodeURIComponent(hostName)}&flash=visitor_notfound`);
    }
    redirect(`/host?host=${encodeURIComponent(hostName)}&flash=bad_host`);
  }

  if (res.flash === "checkout_already") {
    redirect(`/host?host=${encodeURIComponent(hostName)}&flash=checkout_already&guest=${encodeURIComponent(res.guest || "")}`);
  }

  redirect(`/host?host=${encodeURIComponent(hostName)}&flash=checkout_started&guest=${encodeURIComponent(res.guest || "")}`);
}
