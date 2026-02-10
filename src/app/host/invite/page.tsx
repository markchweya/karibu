import Shell from "@/components/Shell";
import { hostCreateInvite } from "../actions";
import Link from "next/link";

export default function InvitePage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const host = typeof searchParams?.host === "string" ? searchParams?.host : "";

  return (
    <Shell
      title="Invite visitor"
      subtitle="Pre-register a visitor. Security will see it instantly on check-in."
      right={<Link href={host ? `/host?host=${encodeURIComponent(host)}` : "/host"} className="btn-ghost">Back</Link>}
    >
      <form action={hostCreateInvite} className="grid lg:grid-cols-2 gap-6">
        <div className="glass p-5 space-y-4">
          <div className="text-sm font-semibold">Invite details</div>

          <div>
            <div className="label">Your name (Host)</div>
            <input name="hostName" className="field mt-1" required defaultValue={host} />
          </div>

          <div>
            <div className="label">Visitor full name</div>
            <input name="visitorName" className="field mt-1" required />
          </div>

          <div>
            <div className="label">Visitor ID / Passport number</div>
            <input name="visitorIdNumber" className="field mt-1" required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="label">Destination (office)</div>
              <input name="destination" className="field mt-1" placeholder="e.g., Admin Block" />
            </div>
            <div>
              <div className="label">Purpose</div>
              <input name="purpose" className="field mt-1" placeholder="e.g., Meeting" required />
            </div>
          </div>

          <button className="btn-primary w-full mt-2">Create invite</button>
        </div>

        <div className="glass p-5 space-y-4">
          <div className="text-sm font-semibold">Note</div>
          <div className="text-xs text-white/60">
            After creation, go back to the Host dashboard to see the contact card and visitor code.
          </div>
        </div>
      </form>
    </Shell>
  );
}
