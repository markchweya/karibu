import Shell from "@/components/Shell";
import Link from "next/link";
import { securityConfirmExit } from "../actions";

export default function ExitPage() {
  return (
    <Shell title="Gate exit confirmation" subtitle="Confirm the visitor has left campus." right={<Link href="/security" className="btn-ghost">Back</Link>}>
      <form action={securityConfirmExit} className="glass p-5 max-w-xl space-y-4">
        <div>
          <div className="label">Visitor code</div>
          <input name="code" className="field mt-1 uppercase tracking-widest" placeholder="e.g., 7H3K2QZ" required />
        </div>
        <button className="btn-primary w-full">Confirm exit</button>
        <div className="text-xs text-white/60">This stops all overstay notifications and closes the visit.</div>
      </form>
    </Shell>
  );
}