import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Arrivo  USIU Visitor Control",
  description: "Invite, check-in, check-out, and overstay escalation.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}

