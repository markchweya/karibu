import Shell from "@/components/Shell";
import { hostCreateInvite } from "../actions";
import { inviteQuestionnaire } from "@/lib/questionnaire";
import Link from "next/link";

export default function InvitePage() {
  return (
    <Shell
      title="Invite visitor"
      subtitle="Pre-register a visitor. Security will see it instantly on check-in."
      right={<Link href="/host" className="btn-ghost">Back</Link>}
    >
      <form action={hostCreateInvite} className="grid lg:grid-cols-2 gap-6">
        <div className="glass p-5 space-y-4">
          <div className="text-sm font-semibold">Invitee details</div>

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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="label">Destination (office)</div>
              <input name="destination" className="field mt-1" placeholder="e.g., Admin Block" required />
            </div>
            <div>
              <div className="label">Purpose</div>
              <input name="purpose" className="field mt-1" placeholder="e.g., Meeting" required />
            </div>
          </div>
        </div>

        <div className="glass p-5 space-y-4">
          <div className="text-sm font-semibold">Security questionnaire</div>
          <div className="text-xs text-white/60">This is stored on the visit record so gate + office can see it.</div>

          {inviteQuestionnaire.map((q) => (
            <div key={q.key}>
              <div className="label">
                {q.label}{q.required ? " *" : ""}
              </div>
              {"options" in q ? (
                <select name={q.key} className="field mt-1" required={q.required} defaultValue="">
                  <option value="" disabled>Select</option>
                  {q.options!.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input name={q.key} className="field mt-1" required={q.required} />
              )}
            </div>
          ))}

          <button className="btn-primary w-full mt-2">Create invite</button>

          <div className="text-xs text-white/55">
            After creation, use the host dashboard to see the generated visitor code.
          </div>
        </div>
      </form>
    </Shell>
  );
}