"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { EmptyCart } from "@/components/cart/EmptyCart";
import { FieldError, labelClasses } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { useCart } from "@/lib/cart/CartProvider";
import {
  FIELD_ORDER,
  validateAll,
  validateField,
  type CheckoutField,
  type CheckoutValues,
  type ValidateOptions,
} from "@/lib/checkout/validation";
import { COUNTRIES, DEFAULT_COUNTRY, EXPRESS_SHIPPING } from "@/lib/config";
import { generateOrderNumber, saveLastOrder, type Order } from "@/lib/order";
import { shipping as shippingFor, totals as computeTotals, type ShippingMethod as Method } from "@/lib/pricing";
import { CheckoutSummary } from "./CheckoutSummary";
import { ShippingMethod } from "./ShippingMethod";
import { TextField } from "./TextField";

const FORM_ID = "checkout-form";
const PROCESSING_MS = 1500;

const EMPTY: CheckoutValues = {
  email: "",
  firstName: "",
  lastName: "",
  address: "",
  city: "",
  postcode: "",
  country: DEFAULT_COUNTRY,
  cardNumber: "",
  cardExpiry: "",
  cardCvc: "",
};

type Errors = Partial<Record<CheckoutField, string>>;

export function CheckoutForm() {
  const cart = useCart();
  const router = useRouter();
  // Card values live only in this component state: never persisted, logged or tracked.
  const [values, setValues] = useState<CheckoutValues>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [method, setMethod] = useState<Method>("standard");
  const [processing, setProcessing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  // M4 hook: postcodeValidation sets strictPostcode.
  const validateOpts: ValidateOptions = { strictPostcode: false };

  if (!cart.hydrated) return <div className="min-h-64" aria-hidden="true" />;
  if (cart.items.length === 0 && !processing) {
    return <EmptyCart testId="checkout-empty" message="Your cart is empty, so there is nothing to check out yet." />;
  }

  const totals = computeTotals(cart.items, cart.promoCode, method);
  const standardPrice = shippingFor(totals.subtotal - totals.discount, "standard");

  function setValue(field: CheckoutField, value: string) {
    const next = { ...values, [field]: value };
    setValues(next);
    // Errors appear on blur/submit, not while typing; but clear one as soon as it is fixed.
    setErrors((prev) => {
      const updated = { ...prev };
      if (prev[field] && !validateField(field, next, validateOpts)) delete updated[field];
      if (field === "country" && (prev.postcode || next.postcode)) {
        const pc = next.postcode ? validateField("postcode", next, validateOpts) : null;
        if (pc) updated.postcode = pc;
        else delete updated.postcode;
      }
      return updated;
    });
  }

  function onBlur(field: CheckoutField) {
    const e = validateField(field, values, validateOpts);
    setErrors((prev) => {
      const updated = { ...prev };
      if (e) updated[field] = e;
      else delete updated[field];
      return updated;
    });
  }

  // M4 hook: expressShippingError wraps this handler.
  function onShippingChange(next: Method) {
    setMethod(next);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (processing) return;
    const all = validateAll(values, validateOpts);
    setErrors(all);
    const first = FIELD_ORDER.find((f) => all[f]);
    if (first) {
      document.getElementById(`checkout-${first}`)?.focus();
      return;
    }
    setProcessing(true);
    timer.current = setTimeout(() => {
      const order: Order = {
        orderNumber: generateOrderNumber(),
        createdAt: new Date().toISOString(),
        email: values.email.trim(),
        items: cart.items,
        subtotal: totals.subtotal,
        discount: totals.discount,
        shipping: totals.shipping,
        total: totals.total,
        shippingMethod: method,
        promoCode: cart.promoCode,
        currency: "EUR",
        purchaseTracked: false,
      };
      saveLastOrder(order);
      router.push("/confirmation");
      cart.clear();
    }, PROCESSING_MS);
  }

  const field = (name: CheckoutField) => ({
    name,
    value: values[name],
    error: errors[name],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setValue(name, e.target.value),
    onBlur: () => onBlur(name),
    disabled: processing,
  });

  return (
    <div className="lg:grid lg:grid-cols-12 lg:items-start lg:gap-12">
      <form id={FORM_ID} noValidate onSubmit={onSubmit} className="space-y-10 lg:col-span-7">
        <p className="text-sm text-muted">All fields are required.</p>

        <fieldset className="space-y-5">
          <legend className="text-xl font-semibold text-ink">Contact</legend>
          <TextField {...field("email")} label="Email address" type="email" autoComplete="email" inputMode="email" />
        </fieldset>

        <fieldset className="space-y-5">
          <legend className="text-xl font-semibold text-ink">Shipping address</legend>
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField {...field("firstName")} label="First name" autoComplete="given-name" />
            <TextField {...field("lastName")} label="Last name" autoComplete="family-name" />
          </div>
          <TextField {...field("address")} label="Street and house number" autoComplete="address-line1" />
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField {...field("postcode")} label="Postcode" autoComplete="postal-code" />
            <TextField {...field("city")} label="Town or city" autoComplete="address-level2" />
          </div>
          <div>
            <label htmlFor="checkout-country" className={labelClasses}>
              Country
            </label>
            <Select
              id="checkout-country"
              name="country"
              data-testid="checkout-country"
              autoComplete="country"
              value={values.country}
              disabled={processing}
              onChange={(e) => setValue("country", e.target.value)}
              onBlur={() => onBlur("country")}
              aria-invalid={errors.country ? true : undefined}
              aria-describedby={errors.country ? "error-country" : undefined}
              className="mt-1.5"
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </Select>
            {errors.country && <FieldError id="error-country">{errors.country}</FieldError>}
          </div>
        </fieldset>

        <ShippingMethod
          value={method}
          standardPrice={standardPrice}
          expressPrice={EXPRESS_SHIPPING}
          onChange={onShippingChange}
        />

        <fieldset className="space-y-5">
          <legend className="text-xl font-semibold text-ink">Payment</legend>
          <TextField
            {...field("cardNumber")}
            label="Card number"
            inputMode="numeric"
            autoComplete="off"
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField {...field("cardExpiry")} label="Expiry date (MM/YY)" inputMode="numeric" autoComplete="off" />
            <TextField {...field("cardCvc")} label="Security code (CVC)" inputMode="numeric" autoComplete="off" />
          </div>
        </fieldset>
      </form>

      <div className="mt-10 lg:col-span-5 lg:mt-0">
        <CheckoutSummary
          items={cart.items}
          totals={totals}
          promoCode={cart.promoCode}
          processing={processing}
          formId={FORM_ID}
        />
        <p className="mt-4 text-center text-sm text-muted">
          <Link href="/cart" className="text-accent underline decoration-1 underline-offset-4 hover:text-accent-hover">
            Back to cart
          </Link>
        </p>
      </div>
    </div>
  );
}

