"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { CartButton } from "./CartButton";
import { Wordmark } from "./Wordmark";
import { NAV_LINKS } from "./nav";
import { CloseIcon, MenuIcon } from "@/components/ui/icons";

export function Header() {
  const pathname = usePathname();
  // The menu is open only for the path it was opened on, so any route change closes it.
  const [openOnPath, setOpenOnPath] = useState<string | null>(null);
  const menuOpen = openOnPath === pathname;

  useEffect(() => {
    if (!menuOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpenOnPath(null);
        document.getElementById("mobile-menu-button")?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas/95 backdrop-blur supports-[backdrop-filter]:bg-canvas/80">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-1 items-center md:hidden">
          <button
            type="button"
            id="mobile-menu-button"
            data-testid="mobile-menu-button"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label="Menu"
            onClick={() => setOpenOnPath(menuOpen ? null : pathname)}
            className="-ml-2.5 grid size-11 place-items-center rounded-md text-ink hover:bg-sunken transition-colors duration-150"
          >
            {menuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>

        <Wordmark link />

        <nav aria-label="Main" className="hidden md:ml-10 md:flex md:flex-1 md:items-center md:gap-8">
          {NAV_LINKS.map((link) => {
            const current = pathname === link.href;
            return (
              <Link
                key={link.slug}
                href={link.href}
                data-testid={`nav-link-${link.slug}`}
                aria-current={current ? "page" : undefined}
                className={`inline-flex h-11 items-center border-b-2 text-sm font-medium transition-colors duration-150 ${
                  current ? "border-accent text-ink" : "border-transparent text-ink-2 hover:text-ink"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex flex-1 items-center justify-end md:flex-none">
          <CartButton />
        </div>
      </div>

      <nav
        id="mobile-nav"
        aria-label="Main"
        hidden={!menuOpen}
        className="border-t border-line bg-canvas md:hidden"
      >
        <ul className="mx-auto w-full max-w-7xl px-4 py-2 sm:px-6">
          {NAV_LINKS.map((link) => {
            const current = pathname === link.href;
            return (
              <li key={link.slug}>
                <Link
                  href={link.href}
                  data-testid={`mobile-nav-link-${link.slug}`}
                  aria-current={current ? "page" : undefined}
                  onClick={() => setOpenOnPath(null)}
                  className={`block py-3 text-base font-medium text-ink ${current ? "underline decoration-accent decoration-2 underline-offset-8" : ""}`}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
