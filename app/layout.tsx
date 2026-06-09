import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BrandDeck Studio",
  description: "Brand-governed PowerPoint generation for approved templates"
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
