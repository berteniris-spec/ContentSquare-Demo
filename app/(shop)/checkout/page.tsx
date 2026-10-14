import type { Metadata } from "next";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { DemoBanner } from "@/components/checkout/DemoBanner";

export const metadata: Metadata = { title: "Checkout" };

export default function CheckoutPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 md:py-14 lg:px-8">
      <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Checkout</h1>
      <div className="mb-8 mt-6">
        <DemoBanner />
      </div>
      <CheckoutForm />
    </div>
  );
}
