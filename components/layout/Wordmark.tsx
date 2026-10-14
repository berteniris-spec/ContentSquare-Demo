import Link from "next/link";
import { TideGlyph } from "@/components/ui/icons";

function Mark() {
  return (
    <>
      <TideGlyph className="text-accent" />
      <span className="text-lg font-semibold tracking-[0.2em] text-ink">TIDEWILD</span>
    </>
  );
}

/** Text wordmark with tide glyph. `link` renders it as the home link (header). */
export function Wordmark({ link = false, className = "" }: { link?: boolean; className?: string }) {
  const classes = `inline-flex min-h-11 items-center gap-2 ${className}`.trim();
  if (link) {
    return (
      <Link href="/" aria-label="Tidewild home" data-testid="nav-logo" className={classes}>
        <Mark />
      </Link>
    );
  }
  return (
    <span className={classes}>
      <Mark />
    </span>
  );
}
