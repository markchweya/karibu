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

  const store = await readStore();
  const forDate = todayISO();
  const hostKey = normKey(hostName);

  const todays = store.invites.filter((i) => i.forDate === forDate && i.hostKey === hostKey && i.status !== "cancelled");
  if (todays.length >= MAX_INVITES_PER_HOST_PER_DAY) {
    redirect(`/host?host=${encodeURIComponent(hostName)}&flash=limit`);
  }

  const dup = todays.some((i) => i.visitorIdNumber === visitorIdNumber && i.status === "pending");
  if (dup) redirect(`/host?host=${encodeURIComponent(hostName)}&flash=dup_invite`);

  const existingCodes = new Set<string>([
    ...store.invites.map((x) => x.code),
    ...store.visitors.map((x) => x.inviteCode || ""),
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
  redirect(`/host?host=${encodeURIComponent(hostName)}&flash=created`);
}

export async function hostCancelInvite(formData: FormData) {
  const inviteId = s(formData.get("inviteId"));
  const hostName = s(formData.get("hostName"));

  if (!inviteId) redirect("/host?flash=bad_cancel");

  const store = await readStore();
  const inv = store.invites.find((i) => i.id === inviteId);
  if (!inv) redirect(`/host?host=${encodeURIComponent(hostName)}&flash=not_found`);
  if (inv.status !== "pending") redirect(`/host?host=${encodeURIComponent(hostName)}&flash=cant_cancel`);

  inv.status = "cancelled";
  inv.cancelledAt = nowISO();

  await writeStore(store);

  revalidatePath("/host");
  revalidatePath("/security");
  redirect(`/host?host=${encodeURIComponent(hostName || inv.hostName)}&flash=cancelled`);
}

/* ======================================================
   HOST START CHECKOUT CLOCK (10 min)
   - Host triggers checkout request
   - Security sees immediately
====================================================== */
export async function hostStartCheckout(formData: FormData) {
  const hostName = s(formData.get("hostName"));
  const code = s(formData.get("code")).toUpperCase().replace(/\s+/g, "");

  if (hostName.length < 2) redirect("/host?flash=bad_host");
  if (!code) redirect(`/host?host=${encodeURIComponent(hostName)}&flash=code_missing`);

  const store = await readStore();

  // Find active visitor by invite code
  const v = store.visitors.find((x) => !x.checkedOutAt && (x.inviteCode || "").toUpperCase() === code);
  if (!v) {
    // if visitor not checked in yet, still allow host to request checkout? (usually no)
    redirect(`/host?host=${encodeURIComponent(hostName)}&flash=visitor_notfound`);
  }

  // Prevent duplicate checkout requests for same active visitor
  const existingActiveReq = store.checkoutRequests.find(
    (r) => r.visitorId === v.id && r.status === "requested"
  );
  if (existingActiveReq) {
    redirect(`/host?host=${encodeURIComponent(hostName)}&flash=checkout_already`);
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

  // Stamp on visitor so Security UI shows it clearly
  v.checkoutRequestedAt = req.requestedAt;
  v.checkoutRequestedBy = hostName;
  v.checkoutRequestId = req.id;

  await writeStore(store);

  revalidatePath("/host");
  revalidatePath("/security");

  // toast on host + security
  redirect(`/host?host=${encodeURIComponent(hostName)}&flash=checkout_started&guest=${encodeURIComponent(v.fullName)}`);
}
