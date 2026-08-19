import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Equb — Ethiopian Rotating Savings",
  description: "A modern platform for managing Equb (እቁብ) rotating savings groups",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
