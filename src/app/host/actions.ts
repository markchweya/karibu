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
import { getCurrentHost } from "@/lib/karibuSession";

const MAX_INVITES_PER_HOST_PER_DAY = 4;

function ensureArrays(store: any) {
  if (!Array.isArray(store.invites)) store.invites = [];
  if (!Array.isArray(store.visitors)) store.visitors = [];
  if (!Array.isArray(store.checkoutRequests)) store.checkoutRequests = [];
  return store;
}

export async function hostCreateInvite(formData: FormData) {
  const sessionHost = await getCurrentHost();

  const hostName = s(formData.get("hostName")) || sessionHost.name;
  const visitorName = s(formData.get("visitorName"));
  const visitorIdNumber = s(formData.get("visitorIdNumber"));
  const purpose = s(formData.get("purpose"));
  const destination = s(formData.get("destination"));

  if (hostName.length < 2) redirect("/host?flash=bad_host");
  if (visitorName.length < 2) redirect("/host?flash=bad_name");
  if (visitorIdNumber.length < 4) redirect("/host?flash=bad_id");
  if (purpose.length < 2) redirect("/host?flash=bad_purpose");

  const storeRaw = await readStore();
  const store = ensureArrays(storeRaw);

  const forDate = todayISO();
  const hostKey = normKey(hostName);

  const todays = store.invites.filter(
    (i: Invite) =>
      i.forDate === forDate &&
      (i.hostKey === hostKey || normKey(i.hostName) === hostKey) &&
      i.status !== "cancelled"
  );

  if (todays.length >= MAX_INVITES_PER_HOST_PER_DAY) {
    redirect("/host?flash=limit");
  }

  const dup = todays.some(
    (i: Invite) =>
      i.visitorIdNumber === visitorIdNumber && i.status === "pending"
  );
  if (dup) redirect("/host?flash=dup_invite");

  const existingCodes = new Set<string>([
    ...store.invites.map((x: Invite) => (x.code || "").toUpperCase()),
    ...store.visitors.map((x: any) =>
      ((x.inviteCode as string) || "").toUpperCase()
    ),
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

  redirect(`/host?flash=created&guest=${encodeURIComponent(visitorName)}`);
}

export async function hostCancelInvite(formData: FormData) {
  const sessionHost = await getCurrentHost();
  const inviteId = s(formData.get("inviteId"));

  if (!inviteId) redirect("/host?flash=bad_cancel");

  const storeRaw = await readStore();
  const store = ensureArrays(storeRaw);

  const inv = store.invites.find((i: Invite) => i.id === inviteId);
  if (!inv) redirect("/host?flash=not_found");
  if (inv.status !== "pending") redirect("/host?flash=cant_cancel");

  const ownerKey = inv.hostKey || normKey(inv.hostName);
  if (ownerKey !== sessionHost.key) redirect("/host?flash=forbidden");

  inv.status = "cancelled";
  (inv as any).cancelledAt = nowISO();

  await writeStore(store);

  revalidatePath("/host");
  revalidatePath("/security");

  redirect(
    `/host?flash=cancelled&guest=${encodeURIComponent(
      inv.visitorName || ""
    )}`
  );
}

export async function hostStartCheckout(formData: FormData) {
  const sessionHost = await getCurrentHost();
  const hostName = sessionHost.name;

  const code = s(formData.get("code")).toUpperCase().replace(/\s+/g, "");
  if (!code) redirect("/host?flash=code_missing");

  const storeRaw = await readStore();
  const store = ensureArrays(storeRaw);

  const v = store.visitors.find(
    (x: any) =>
      !x.checkedOutAt &&
      ((x.inviteCode as string) || "").toUpperCase() === code
  );

  if (!v) redirect("/host?flash=visitor_notfound");

  const visitorHostKey =
    normKey(v.hostName || v.host || "") ||
    normKey(v.hostKey || "");

  if (visitorHostKey && visitorHostKey !== sessionHost.key) {
    redirect("/host?flash=forbidden");
  }

  const existingActiveReq = store.checkoutRequests.find(
    (r: CheckoutRequest) =>
      r.visitorId === v.id && r.status === "requested"
  );

  if (existingActiveReq) {
    redirect(
      `/host?flash=checkout_already&guest=${encodeURIComponent(
        v.fullName || ""
      )}`
    );
  }

  const req: CheckoutRequest = {
    id: newId(),
    visitorId: v.id,
    visitorName: v.fullName,
    visitorIdNumber: v.idNumber,
    hostName,
    hostKey: sessionHost.key,
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

  redirect(
    `/host?flash=checkout_started&guest=${encodeURIComponent(
      v.fullName || ""
    )}`
  );
}
