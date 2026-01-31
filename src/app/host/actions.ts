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
  type Invite,
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

  // count invites created today for this host (excluding cancelled)
  const todays = store.invites.filter((i) => i.forDate === forDate && i.hostKey === hostKey && i.status !== "cancelled");
  if (todays.length >= MAX_INVITES_PER_HOST_PER_DAY) {
    redirect(`/host?host=${encodeURIComponent(hostName)}&flash=limit`);
  }

  // no duplicates: same visitor ID already invited today by this host (pending)
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
    createdAt: new Date().toISOString(),
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

  // only cancel pending (checked-in should not be cancelled)
  if (inv.status !== "pending") redirect(`/host?host=${encodeURIComponent(hostName)}&flash=cant_cancel`);

  inv.status = "cancelled";
  inv.cancelledAt = new Date().toISOString();

  await writeStore(store);

  revalidatePath("/host");
  revalidatePath("/security");
  redirect(`/host?host=${encodeURIComponent(hostName || inv.hostName)}&flash=cancelled`);
}
