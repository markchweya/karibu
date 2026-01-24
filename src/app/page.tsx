import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const s = await getSession();
  if (!s) redirect("/login");

  if (s.role === "SECURITY") redirect("/security");
  if (s.role === "ADMIN") redirect("/admin");
  redirect("/host");
}