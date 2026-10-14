import type { Metadata } from "next";
import { ConfirmationView } from "@/components/confirmation/ConfirmationView";

export const metadata: Metadata = { title: "Order confirmation" };

export default function ConfirmationPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 md:py-14 lg:px-8">
      <ConfirmationView />
    </div>
  );
}
