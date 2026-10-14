import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Demo controls",
  robots: { index: false, follow: false },
};

// Internal panel: minimal chrome, no shop header/footer, no tracking.
export default function DemoControlsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <div className="border-b border-line bg-sunken">
        <div className="mx-auto flex h-14 w-full max-w-4xl items-center px-4 sm:px-6">
          <span className="text-sm font-medium text-ink">Tidewild demo controls</span>
        </div>
      </div>
      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
        {children}
      </main>
    </div>
  );
}
