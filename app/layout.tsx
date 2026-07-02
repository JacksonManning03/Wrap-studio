import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wrap Studio — design your vehicle wrap",
  description:
    "Design and preview a vinyl wrap on your own vehicle, get an instant all-in price, and hand off print-ready art.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
