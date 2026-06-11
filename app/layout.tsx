import { ClerkProvider, Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
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
      <body>
        <ClerkProvider>
          <header className="flex items-center justify-end gap-3 bg-[#111111] px-6 py-2">
            <Show when="signed-out">
              <SignInButton>
                <button
                  type="button"
                  className="rounded-md px-3 py-1.5 text-sm font-bold text-white transition hover:bg-white/10"
                >
                  Sign In
                </button>
              </SignInButton>
              <SignUpButton>
                <button
                  type="button"
                  className="rounded-md bg-brand-orange px-3 py-1.5 text-sm font-bold text-white transition hover:opacity-90"
                >
                  Sign Up
                </button>
              </SignUpButton>
            </Show>
            <Show when="signed-in">
              <UserButton />
            </Show>
          </header>
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
