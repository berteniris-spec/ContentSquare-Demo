import { InfoIcon } from "@/components/ui/icons";

export const DEMO_BANNER_TEXT =
  "Demo store: no real payment is taken. Use any test details, e.g. 4242 4242 4242 4242.";

export function DemoBanner() {
  return (
    <div data-testid="checkout-demo-banner" className="flex gap-3 rounded-md border border-line bg-sunken px-4 py-3 text-sm text-ink-2">
      <InfoIcon size={20} className="shrink-0 text-accent" />
      <p>{DEMO_BANNER_TEXT}</p>
    </div>
  );
}
