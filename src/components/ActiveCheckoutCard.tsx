// components/ActiveCheckoutCard.tsx
import { initials, fmtMMSS } from "@/lib/karibuUi";

export function ActiveCheckoutCard({ visitor }: { visitor: any }) {
  const startedAt = visitor.checkoutRequestedAt;
  const elapsedMs = startedAt
    ? Date.now() - new Date(startedAt).getTime()
    : 0;

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm flex justify-between items-center">
      <div className="flex gap-4">
        <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold">
          {initials(visitor.fullName)}
        </div>

        <div>
          <div className="font-semibold">{visitor.fullName}</div>
          <div className="text-sm text-gray-500">
            Code {visitor.inviteCode}
          </div>

          <div className="text-sm mt-1">
            Purpose <span className="font-medium">{visitor.purpose}</span>
          </div>

          <div className="text-xs text-gray-400 mt-1">
            Timer {fmtMMSS(elapsedMs)}
          </div>
        </div>
      </div>

      <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        Checkout started
      </span>
    </div>
  );
}
