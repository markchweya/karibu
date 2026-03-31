import Shell from "@/components/Shell";
import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import SecurityExitClient from "./SecurityExitClient";

export default async function ExitPage() {
  const session = await requireSession();
  if (session.role !== "security") redirect("/login");

  return (
    <Shell
      title="Gate exit confirmation"
      subtitle="Search checked-in visitors and confirm exit."
      right={<Link href="/security" className="btn-ghost">Back</Link>}
    >
      <SecurityExitClient />
    </Shell>
  );
}
