import type { Metadata } from "next";
import { ShopShell } from "@/components/layout/ShopShell";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <ShopShell>
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center px-4 py-24 text-center sm:px-6 lg:px-8">
        <p className="text-sm font-medium text-accent">404</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">This trail doesn’t go anywhere</h1>
        <p className="mt-4 max-w-prose text-base text-ink-2">
          The page you are looking for has moved or never existed.
        </p>
        <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <ButtonLink href="/" className="w-full sm:w-auto">
            Back to home
          </ButtonLink>
          <ButtonLink href="/category/all" variant="secondary" className="w-full sm:w-auto">
            Shop all products
          </ButtonLink>
        </div>
      </div>
    </ShopShell>
  );
}
