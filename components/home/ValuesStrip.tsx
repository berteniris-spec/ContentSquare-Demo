import { LeafIcon, TruckIcon, WrenchIcon } from "@/components/ui/icons";

const VALUES = [
  { Icon: TruckIcon, title: "Free shipping over €75", text: "Standard delivery in 2-4 working days." },
  { Icon: LeafIcon, title: "Better materials", text: "Recycled and organic fabrics wherever we can." },
  { Icon: WrenchIcon, title: "Repairs at cost", text: "Send it back and we fix it, for as long as it lasts." },
];

export function ValuesStrip() {
  return (
    <section data-testid="values-strip" aria-label="Why Tidewild" className="border-y border-line bg-sunken">
      <ul className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-3 lg:px-8">
        {VALUES.map(({ Icon, title, text }) => (
          <li key={title} className="flex gap-4">
            <Icon className="shrink-0 text-accent" />
            <div>
              <h3 className="text-base font-medium text-ink">{title}</h3>
              <p className="mt-1 text-sm text-ink-2">{text}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
