import { MiniCartDrawer } from "@/components/layout/MiniCartDrawer";
import { ShopShell } from "@/components/layout/ShopShell";
import { CartProvider } from "@/lib/cart/CartProvider";

// RouteTracker is added in M5.
export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <ShopShell>{children}</ShopShell>
      <MiniCartDrawer />
    </CartProvider>
  );
}
