import Shell from "@/components/Shell";
import Link from "next/link";
import { hostStartCheckout } from "../actions";

export default function HostCheckout() {
  return (
    <Shell
      title="Start checkout"
      subtitle="Enter visitor code to start the 10-minute exit clock."
      right={<Link href="/host" className="btn-ghost">Back</Link>}
    >
      <form action={hostStartCheckout} className="glass p-5 max-w-xl">
        <div>
          <div className="label">Visitor code</div>
          <input name="code" className="field mt-1 uppercase tracking-widest" placeholder="e.g., 7H3K2QZ" required />
        </div>
        <button className="btn-primary w-full mt-4">Start checkout clock</button>
        <div className="mt-3 text-xs text-white/60">
          If the gate created this visitor (walk-in), starting checkout will automatically assign the visit to you.
        </div>
      </form>
    </Shell>
  );
}