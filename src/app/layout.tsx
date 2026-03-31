import type { Metadata } from "next";
import "./globals.css";
import KaribuInbox from "@/components/KaribuInbox";

export const metadata: Metadata = {
  title: "Karibu – USIU Visitor Control",
  description:
    "Karibu Visitor Management System – Invite, check-in, check-out, and overstay escalation.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        {children}
        <KaribuInbox />
      </body>
    </html>
  );
}
