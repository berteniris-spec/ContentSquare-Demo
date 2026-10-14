import { Footer } from "./Footer";
import { Header } from "./Header";

/** Shop chrome: header, main landmark (skip-link target) and footer. */
export function ShopShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <Header />
      <main id="main" tabIndex={-1} className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
