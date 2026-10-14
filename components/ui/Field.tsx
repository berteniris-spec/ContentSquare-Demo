import { AlertCircleIcon } from "./icons";

/** Shared input control classes (DESIGN_TOKENS section 7, Inputs). */
export const inputClasses =
  "h-12 w-full rounded-md border border-line-strong bg-surface px-3.5 text-base text-ink placeholder:text-muted focus-visible:border-accent aria-[invalid=true]:border-error";

export const labelClasses = "block text-sm font-medium text-ink";

export function FieldError({ id, children, testId }: { id: string; children: React.ReactNode; testId?: string }) {
  return (
    <p id={id} data-testid={testId ?? id} role="alert" className="mt-1.5 flex gap-1.5 text-sm text-error">
      <AlertCircleIcon size={16} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}
