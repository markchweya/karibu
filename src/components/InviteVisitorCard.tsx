// components/InviteVisitorCard.tsx
import { initials } from "@/lib/karibuUi";

export function InviteVisitorCard({ visitor }: { visitor: any }) {
  const isCheckedOut = Boolean(visitor.checkedOutAt);
  const isCheckoutInProgress =
    Boolean(visitor.checkoutRequestedAt && !visitor.checkedOutAt);

  // ✅ HARD STOP: once checked out, REMOVE the card
  if (isCheckedOut) {
    return null;
  }

  let statusLabel = "Checked in";
  let statusColor = "bg-green-100 text-green-700";

  if (isCheckoutInProgress) {
    statusLabel = "Exit in progress";
    statusColor = "bg-yellow-100 text-yellow-800";
  }

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm flex justify-between items-start">
      <div className="flex gap-4">
        <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold">
          {initials(visitor.fullName)}
        </div>

        <div>
          <div className="font-semibold">{visitor.fullName}</div>
          <div className="text-sm text-gray-500">
            ID **{visitor.idNumber?.slice(-4)}
          </div>

          <div className="mt-3 space-y-1 text-sm">
            <div>
              <span className="text-gray-400">Code</span>{" "}
              <span className="font-mono font-medium">
                {visitor.inviteCode}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Purpose</span>{" "}
              {visitor.purpose}
            </div>
            <div>
              <span className="text-gray-400">Destination</span>{" "}
              {visitor.destination}
            </div>
          </div>
        </div>
      </div>

      <span
        className={`px-3 py-1 rounded-full text-xs font-medium ${statusColor}`}
      >
        {statusLabel}
      </span>
    </div>
  );
}
