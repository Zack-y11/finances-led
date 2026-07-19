import type { Metadata } from "next";
import "./globals.css";

import { AppShell } from "@/components/shell/app-shell";

export const metadata: Metadata = {
  title: { default: "Ledger AI", template: "%s | Ledger AI" },
  description: "A privacy-first personal finance ledger.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body><AppShell>{children}</AppShell></body>
    </html>
  );
}
