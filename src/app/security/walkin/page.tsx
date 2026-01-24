import Shell from "@/components/Shell";
import Link from "next/link";
import { securityWalkIn } from "../actions";

export default function WalkInPage() {
  return (
    <Shell title="Walk-in capture" subtitle="Create a visitor record at the gate when not pre-invited." right={<Link href="/security" className="btn-ghost">Back</Link>}>
      <form action={securityWalkIn} className="grid lg:grid-cols-2 gap-6">
        <div className="glass p-5 space-y-4">
          <div className="text-sm font-semibold">Visitor details</div>
          <div>
            <div className="label">Full name</div>
            <input name="fullName" className="field mt-1" required />
          </div>
          <div>
            <div className="label">ID / Passport number</div>
            <input name="idNumber" className="field mt-1" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="label">Email (optional)</div>
              <input name="email" className="field mt-1" />
            </div>
            <div>
              <div className="label">Phone (optional)</div>
              <input name="phone" className="field mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="label">Vehicle plate (optional)</div>
              <input name="vehiclePlate" className="field mt-1" />
            </div>
            <div>
              <div className="label">How many people?</div>
              <input name="numPeople" type="number" min="1" defaultValue={1} className="field mt-1" />
            </div>
          </div>
        </div>

        <div className="glass p-5 space-y-4">
          <div className="text-sm font-semibold">Purpose + destination</div>
          <div>
            <div className="label">Destination (office)</div>
            <input name="destination" className="field mt-1" placeholder="e.g., Admin Block" required />
          </div>
          <div>
            <div className="label">Purpose</div>
            <input name="purpose" className="field mt-1" placeholder="e.g., Meeting / Delivery / Appointment" required />
          </div>

          <button className="btn-primary w-full mt-2">Create + auto check-in</button>

          <div className="text-xs text-white/60">
            This immediately marks the visitor as checked-in and generates a visitor code to be used at the office for checkout start.
          </div>
        </div>
      </form>
    </Shell>
  );
}