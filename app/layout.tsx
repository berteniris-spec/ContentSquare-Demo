import type { Metadata } from "next";
import { SkipLink } from "@/components/layout/SkipLink";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Tidewild · Made for the long way round.",
    template: "%s · Tidewild",
  },
  description:
    "Tidewild makes packs, layers and small essentials for long days outside. A fictional store built for a product demo.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className="h-full">
      <body className="flex min-h-full flex-col bg-canvas font-sans text-base text-ink-2 antialiased">
        <SkipLink />
        {children}
      </body>
    </html>
  );
}
