import { ButtonLink } from "@/components/ui/Button";

/** Neutral stand-in for pages that are built in a later milestone. */
export function PagePlaceholder({
  title,
  children,
  testId,
}: {
  title: string;
  children?: React.ReactNode;
  testId?: string;
}) {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 md:py-20 lg:px-8">
      <h1 className="text-3xl font-semibold tracking-tight md:text-4xl" data-testid={testId}>
        {title}
      </h1>
      <div className="mt-4 max-w-prose text-base text-ink-2">
        {children ?? <p>This page is coming soon.</p>}
      </div>
      <div className="mt-8">
        <ButtonLink href="/category/all" variant="secondary">
          Shop all products
        </ButtonLink>
      </div>
    </div>
  );
}
