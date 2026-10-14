import type { Metadata } from "next";
import { CartView } from "@/components/cart/CartView";

export const metadata: Metadata = { title: "Cart" };

export default function CartPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 md:py-14 lg:px-8">
      <h1 className="mb-6 text-3xl font-semibold tracking-tight md:mb-8 md:text-4xl">Cart</h1>
      <CartView />
    </div>
  );
}
