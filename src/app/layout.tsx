import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "CPS Referral Directory | Fordham University",
  description: "Search off-campus mental health providers for student referrals",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
