"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { inputClasses } from "@/components/ui/Field";
import { AlertCircleIcon, CheckIcon, MinusIcon, PlusIcon } from "@/components/ui/icons";
import { useCart } from "@/lib/cart/CartProvider";
import { isValidPromo } from "@/lib/pricing";

export type PromoVariant = "collapsed" | "prominent";

/**
 * Promo code entry. "collapsed" is the clean state (small disclosure below the totals).
 * "prominent" is the M4 promoField hook (always-open accent block above the totals).
 */
export function PromoCode({ variant = "collapsed" }: { variant?: PromoVariant }) {
  const { promoCode, applyPromo, removePromo } = useCart();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const id = useId();
  const inputVisible = variant === "prominent" || open;

  function onApply(e: React.FormEvent) {
    e.preventDefault();
    if (isValidPromo(value)) {
      applyPromo();
      setValue("");
      setMessage({ kind: "success", text: "DEMO10 applied: 10% off your order" });
    } else {
      setMessage({ kind: "error", text: "This code isn't valid" });
    }
  }

  const messageEl = (
    <div aria-live="polite" data-testid="promo-code-message" className="empty:hidden">
      {message && (
        <p className={`mt-2 flex gap-1.5 text-sm ${message.kind === "success" ? "text-success" : "text-error"}`}>
          {message.kind === "success" ? (
            <CheckIcon size={16} className="mt-0.5 shrink-0" />
          ) : (
            <AlertCircleIcon size={16} className="mt-0.5 shrink-0" />
          )}
          <span>{message.text}</span>
        </p>
      )}
    </div>
  );

  if (promoCode) {
    return (
      <div className={variant === "prominent" ? "rounded-lg bg-accent-soft p-5" : ""}>
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-1.5 text-sm text-success">
            <CheckIcon size={16} className="shrink-0" />
            <span>{promoCode} applied: 10% off your order</span>
          </p>
          <Button
            variant="ghost"
            data-testid="promo-code-remove"
            className="shrink-0 whitespace-nowrap"
            onClick={() => {
              removePromo();
              setMessage(null);
            }}
          >
            Remove code
          </Button>
        </div>
        <div aria-live="polite" data-testid="promo-code-message" className="sr-only">
          {message?.text}
        </div>
      </div>
    );
  }

  const form = (
    <form onSubmit={onApply} noValidate className="mt-2">
      <label htmlFor="promo-code" className="sr-only">
        Promo code
      </label>
      <div className="flex flex-col gap-2 xs:flex-row">
        <input
          id="promo-code"
          data-testid="promo-code-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoComplete="off"
          placeholder="Enter code"
          aria-invalid={message?.kind === "error" ? true : undefined}
          aria-describedby={message ? `${id}-msg` : undefined}
          className={`${inputClasses} xs:flex-1`}
        />
        <Button type="submit" variant="secondary" size="sm" data-testid="promo-code-apply" className="xs:h-12">
          Apply
        </Button>
      </div>
      <span id={`${id}-msg`} className="sr-only">
        {message?.text}
      </span>
    </form>
  );

  if (variant === "prominent") {
    return (
      <div className="rounded-lg bg-accent-soft p-5">
        <p className="text-base font-semibold text-accent-ink">Have a promo code?</p>
        <p className="text-sm text-ink-2">Unlock extra savings on your order.</p>
        {form}
        {messageEl}
      </div>
    );
  }

  return (
    <div>
      <Button
        variant="ghost"
        data-testid="promo-code-toggle"
        aria-expanded={inputVisible}
        aria-controls={`${id}-panel`}
        onClick={() => setOpen((o) => !o)}
        className="-ml-2"
      >
        {inputVisible ? <MinusIcon size={16} /> : <PlusIcon size={16} />}
        Add a promo code
      </Button>
      <div id={`${id}-panel`} hidden={!inputVisible}>
        {form}
      </div>
      {messageEl}
    </div>
  );
}
