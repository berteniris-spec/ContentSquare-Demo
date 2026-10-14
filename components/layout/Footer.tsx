import Link from "next/link";
import { Wordmark } from "./Wordmark";
import { NAV_LINKS } from "./nav";

const HELP = ["Shipping", "Returns", "Contact"];
const ABOUT = ["Our materials", "Repairs"];

function ColumnHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-medium text-ink">{children}</h2>;
}

export function Footer() {
  return (
    <footer className="mt-24 border-t border-line bg-sunken py-12">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <Wordmark />
            <p className="mt-2 text-sm text-muted">Made for the long way round.</p>
          </div>
          <div>
            <ColumnHeading>Shop</ColumnHeading>
            <ul className="mt-2">
              {NAV_LINKS.map((link) => (
                <li key={link.slug}>
                  <Link
                    href={link.href}
                    className="inline-flex min-h-11 items-center text-sm text-ink-2 hover:text-ink hover:underline underline-offset-4"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <ColumnHeading>Help</ColumnHeading>
            <ul className="mt-2">
              {HELP.map((item) => (
                <li key={item} className="flex min-h-11 items-center text-sm text-ink-2">
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <ColumnHeading>About</ColumnHeading>
            <ul className="mt-2">
              {ABOUT.map((item) => (
                <li key={item} className="flex min-h-11 items-center text-sm text-ink-2">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="mt-10 border-t border-line pt-6 text-xs text-muted">
          © 2026 Tidewild. A fictional store built for a product demo.
        </p>
      </div>
    </footer>
  );
}
