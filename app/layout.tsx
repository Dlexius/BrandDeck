import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BrandDeck Studio",
  description: "Deterministic brand-governed PowerPoint generation MVP"
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
