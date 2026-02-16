import Shell from "@/components/Shell";
import Link from "next/link";
import { confirmExit } from "../actions";

export default function ExitPage() {
  return (
    <Shell title="Gate exit confirmation" subtitle="Confirm the visitor has left campus." right={<Link href="/security" className="btn-ghost">Back</Link>}>
      <form action={confirmExit} className="glass p-5 max-w-xl space-y-4">
        <div>
          <div className="label">Visitor full name</div>
          <input name="fullName" className="field mt-1" placeholder="e.g., John Doe" required />
        </div>
        <button className="btn-primary w-full">Confirm exit</button>
        <div className="text-xs text-white/60">This stops all overstay notifications and closes the visit.</div>
      </form>
    </Shell>
  );
}