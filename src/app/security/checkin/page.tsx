import Shell from "@/components/Shell";
import Link from "next/link";
import { securityCheckIn } from "../actions";

export default function CheckInPage() {
  return (
    <Shell title="Gate check-in" subtitle="Verify invite by code or ID number, then check in." right={<Link href="/security" className="btn-ghost">Back</Link>}>
      <form action={securityCheckIn} className="glass p-5 max-w-xl space-y-4">
        <div>
          <div className="label">Visitor code (preferred)</div>
          <input name="code" className="field mt-1 uppercase tracking-widest" placeholder="e.g., 7H3K2QZ" />
        </div>
        <div>
          <div className="label">OR ID / Passport number</div>
          <input name="idNumber" className="field mt-1" placeholder="e.g., A1234567" />
        </div>
        <button className="btn-primary w-full">Confirm check-in</button>
        <div className="text-xs text-white/60">If no invite exists, use Walk-in capture.</div>
      </form>
    </Shell>
  );
}