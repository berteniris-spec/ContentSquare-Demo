export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:px-4 focus:py-3 rounded-md bg-surface text-sm font-medium text-ink shadow-md"
    >
      Skip to content
    </a>
  );
}
