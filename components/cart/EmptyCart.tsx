import { ButtonLink } from "@/components/ui/Button";

export function EmptyCart({ testId = "cart-empty", message = "Your cart is empty." }: { testId?: string; message?: string }) {
  return (
    <div data-testid={testId} className="rounded-lg border border-line bg-surface p-8 text-center md:p-12">
      <p className="text-lg text-ink">{message}</p>
      <p className="mt-2 text-base text-ink-2">Packs, layers and small essentials are waiting for you.</p>
      <ButtonLink href="/category/all" className="mt-6 w-full sm:w-auto">
        Shop all products
      </ButtonLink>
    </div>
  );
}
