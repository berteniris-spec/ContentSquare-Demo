import { Suspense } from "react";
import { MiniCartDrawer } from "@/components/layout/MiniCartDrawer";
import { ShopShell } from "@/components/layout/ShopShell";
import { RouteTracker } from "@/components/tracking/RouteTracker";
import { CartProvider } from "@/lib/cart/CartProvider";

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <ShopShell>{children}</ShopShell>
      <MiniCartDrawer />
      <Suspense fallback={null}>
        <RouteTracker />
      </Suspense>
    </CartProvider>
  );
}
