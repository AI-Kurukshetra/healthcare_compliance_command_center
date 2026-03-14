import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Healthcare Compliance Command Center",
  description: "Operational compliance dashboard for healthcare teams."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
