import Shell from "@/components/Shell";
import Link from "next/link";
import { checkInInviteByCode } from "../actions";

export default function CheckInPage() {
  return (
    <Shell
      title="Visitor Check-In"
      subtitle="Enter invite code to check visitor in"
      right={<Link href="/security">Back</Link>}
    >
      <form action={checkInInviteByCode} className="max-w-xl space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2 text-white/80">
            Invite Code
          </label>
          <input
            name="code"
            required
            placeholder="Enter visitor invite code"
            className="w-full rounded-xl px-4 py-3 bg-black/40 backdrop-blur-md border border-black/30 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        <button className="w-full rounded-xl bg-black/80 hover:bg-black text-white font-semibold py-3 text-lg transition shadow-lg">
          Check In
        </button>
      </form>
    </Shell>
  );
}
