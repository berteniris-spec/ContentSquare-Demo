export type CategorySlug = "bags" | "apparel" | "accessories";
export type CategoryRouteSlug = CategorySlug | "all";

export type Silhouette =
  | "backpack"
  | "daypack"
  | "tote"
  | "duffel"
  | "sling"
  | "hip-pack"
  | "sleeve"
  | "jacket"
  | "tee"
  | "fleece"
  | "vest"
  | "shorts"
  | "trousers"
  | "hoodie"
  | "shirt"
  | "beanie"
  | "cap"
  | "wallet"
  | "zip-wallet"
  | "pouch"
  | "bottle"
  | "cube"
  | "keyclip"
  | "roll-top";

export type ProductView = "front" | "back" | "side" | "detail";

export interface Colour {
  name: string;
  slug: string;
  hex: string;
}

export type StockState = "in_stock" | "low_stock" | "out_of_stock";

export interface Product {
  id: string;
  slug: string;
  name: string;
  category: CategorySlug;
  price: number;
  description: string;
  story?: string[];
  features: string[];
  colours: Colour[];
  sizes?: string[];
  stock: StockState;
  silhouette: Silhouette;
  views: ProductView[];
  featured?: number;
}

export interface Category {
  slug: CategoryRouteSlug;
  name: string;
}

export const CATEGORIES: Category[] = [
  { slug: "bags", name: "Bags" },
  { slug: "apparel", name: "Apparel" },
  { slug: "accessories", name: "Accessories" },
  { slug: "all", name: "All products" },
];

// Product colour palette (DESIGN_TOKENS.md section 9). Illustration colours only.
const C = {
  moss: { name: "Moss", slug: "moss", hex: "#5E6B3F" },
  forest: { name: "Forest", slug: "forest", hex: "#2F4A3A" },
  sand: { name: "Sand", slug: "sand", hex: "#CDB892" },
  oat: { name: "Oat", slug: "oat", hex: "#E4D9C4" },
  clay: { name: "Clay", slug: "clay", hex: "#B9876A" },
  rust: { name: "Rust", slug: "rust", hex: "#A4502E" },
  stone: { name: "Stone", slug: "stone", hex: "#9A948A" },
  sea: { name: "Sea", slug: "sea", hex: "#3F6F73" },
  slate: { name: "Slate", slug: "slate", hex: "#5F6E78" },
  navy: { name: "Navy", slug: "navy", hex: "#263449" },
  charcoal: { name: "Charcoal", slug: "charcoal", hex: "#34363A" },
  ochre: { name: "Ochre", slug: "ochre", hex: "#C08A2B" },
  berry: { name: "Berry", slug: "berry", hex: "#7A3B4E" },
  chalk: { name: "Chalk", slug: "chalk", hex: "#F1EEE7" },
} satisfies Record<string, Colour>;

const APPAREL_SIZES = ["XS", "S", "M", "L", "XL"];
const ALL_VIEWS: ProductView[] = ["front", "back", "side", "detail"];

export const PRODUCTS: Product[] = [
  // ---------------- Bags ----------------
  {
    id: "p01",
    slug: "trailhead-28-backpack",
    name: "Trailhead 28 backpack",
    category: "bags",
    price: 139,
    description:
      "A 28-litre pack for long day hikes and short overnights. A clamshell opening, a padded back panel and a stowable rain cover keep it simple on the trail.",
    story: [
      "Trailhead started as a sketch on the back of a trail map: one pack that could carry a full day on the hill without feeling like luggage. Three seasons of testing later, it carries a little more than it looks like it should, and sits closer to your back than you expect.",
      "The main compartment opens wide like a suitcase, so you can see everything at once instead of digging from the top. A separate sleeve holds a hydration bladder or a slim laptop, and the lid pocket keeps small things where your hands expect them.",
      "The back panel is made of moulded foam channels that let air move between you and the pack. The hip belt is just wide enough to take weight off your shoulders on a steep climb, and it tucks away when you are walking through town.",
      "The outer fabric is a recycled 420D nylon with a PFC-free water-repellent finish. Seams in high-wear areas are bar-tacked, and every buckle can be replaced at home with a coin.",
      "When something does wear out, send it back. Our repair service fixes zips, buckles and straps at cost, because the most sustainable pack is the one you already own.",
    ],
    features: [
      "28 litres, clamshell main opening",
      "Ventilated foam back panel and removable hip belt",
      "Recycled 420D nylon, PFC-free finish",
      "Stowable rain cover in the base",
    ],
    colours: [C.forest, C.sand, C.slate, C.rust],
    stock: "in_stock",
    silhouette: "backpack",
    views: ALL_VIEWS,
    featured: 1,
  },
  {
    id: "p02",
    slug: "field-tote",
    name: "Field tote",
    category: "bags",
    price: 79,
    description:
      "A sturdy waxed-canvas tote for market runs and daily commutes. Long handles sit comfortably on the shoulder, and an inner zip pocket keeps keys close.",
    features: [
      "Waxed organic cotton canvas",
      "Riveted leather-free handle tabs",
      "Inner zip pocket and open slip pocket",
    ],
    colours: [C.sand, C.moss, C.charcoal],
    stock: "in_stock",
    silhouette: "tote",
    views: ALL_VIEWS,
    featured: 3,
  },
  {
    id: "p03",
    slug: "daypack-18",
    name: "Daypack 18",
    category: "bags",
    price: 95,
    description:
      "A light 18-litre pack for city days and easy trails. One main compartment, a front stash pocket and nothing you will not use.",
    features: [
      "18 litres, top zip opening",
      "Padded laptop sleeve (fits 14 inch)",
      "Front stash pocket with zip",
    ],
    colours: [C.sea, C.charcoal, C.ochre],
    stock: "in_stock",
    silhouette: "daypack",
    views: ALL_VIEWS,
  },
  {
    id: "p04",
    slug: "roll-top-pack",
    name: "Roll-top pack",
    category: "bags",
    price: 119,
    description:
      "A weatherproof roll-top pack that grows with what you carry. Welded seams keep the rain out on the bike and the coast path.",
    features: [
      "20 to 26 litres with roll closure",
      "Welded, waterproof main body",
      "Quick-access front pocket",
      "Reflective details for darker days",
    ],
    colours: [C.charcoal, C.moss, C.clay],
    stock: "in_stock",
    silhouette: "roll-top",
    views: ALL_VIEWS,
    featured: 6,
  },
  {
    id: "p05",
    slug: "weekender-duffel",
    name: "Weekender duffel",
    category: "bags",
    price: 159,
    description:
      "A 45-litre duffel that fits overhead bins and the boot of a small car. Carry it by the handles or on the padded shoulder strap.",
    features: [
      "45 litres, wide U-shaped opening",
      "Removable padded shoulder strap",
      "Luggage pass-through sleeve",
    ],
    colours: [C.navy, C.stone, C.forest],
    stock: "in_stock",
    silhouette: "duffel",
    views: ["front", "back", "side"],
  },
  {
    id: "p06",
    slug: "city-sling",
    name: "City sling",
    category: "bags",
    price: 59,
    description:
      "A compact sling for phone, wallet and keys. Wear it across the chest or over the shoulder and forget it is there.",
    features: [
      "3 litres, two zip compartments",
      "Adjustable strap with quick-release buckle",
      "Recycled ripstop shell",
    ],
    colours: [C.charcoal, C.clay, C.sea],
    stock: "in_stock",
    silhouette: "sling",
    views: ["front", "back", "side"],
  },
  {
    id: "p07",
    slug: "hip-pack",
    name: "Hip pack",
    category: "bags",
    price: 45,
    description:
      "A small hip pack for runs, festivals and dog walks. The belt adjusts with one hand, even when you are moving.",
    features: [
      "1.5 litres with key clip inside",
      "One-hand belt adjuster",
      "Water-repellent recycled nylon",
    ],
    colours: [C.ochre, C.forest, C.charcoal],
    stock: "low_stock",
    silhouette: "hip-pack",
    views: ["front", "back", "side"],
  },
  {
    id: "p08",
    slug: "laptop-sleeve-14",
    name: "Laptop sleeve 14",
    category: "bags",
    price: 49,
    description:
      "A padded sleeve for 13 to 14 inch laptops. A front pocket holds the charger, so you can slide it into any bag and go.",
    features: [
      "Fits 13 to 14 inch laptops",
      "Wraparound zip and soft lining",
      "Front pocket for charger and cables",
    ],
    colours: [C.slate, C.oat, C.charcoal],
    stock: "in_stock",
    silhouette: "sleeve",
    views: ["front", "back", "side"],
  },

  // ---------------- Apparel ----------------
  {
    id: "p09",
    slug: "storm-shell-jacket",
    name: "Storm shell jacket",
    category: "apparel",
    price: 229,
    description:
      "A three-layer waterproof shell for wet, windy days on the hill. Pit zips let heat out on the climb, and the hood fits over a helmet.",
    features: [
      "Three-layer recycled waterproof fabric",
      "Helmet-compatible adjustable hood",
      "Pit zips and two hand pockets",
      "Packs into its own chest pocket",
    ],
    colours: [C.sea, C.rust, C.charcoal, C.ochre],
    sizes: APPAREL_SIZES,
    stock: "in_stock",
    silhouette: "jacket",
    views: ALL_VIEWS,
    featured: 2,
  },
  {
    id: "p10",
    slug: "grid-fleece-pullover",
    name: "Grid fleece pullover",
    category: "apparel",
    price: 99,
    description:
      "A light grid fleece that breathes when you work hard and stays warm when you stop. The half zip makes it easy to cool down.",
    features: [
      "Recycled grid fleece",
      "Half zip with stand collar",
      "Zipped chest pocket",
    ],
    colours: [C.oat, C.forest, C.berry],
    sizes: APPAREL_SIZES,
    stock: "in_stock",
    silhouette: "fleece",
    views: ALL_VIEWS,
    featured: 4,
  },
  {
    id: "p11",
    slug: "packable-down-vest",
    name: "Packable down vest",
    category: "apparel",
    price: 149,
    description:
      "A warm down vest that packs into its own pocket. Wear it as a mid layer on cold mornings or on its own around town.",
    features: [
      "Responsibly sourced 700 fill down",
      "Packs into its hand pocket",
      "Windproof recycled shell",
    ],
    colours: [C.navy, C.moss, C.rust],
    sizes: APPAREL_SIZES,
    stock: "low_stock",
    silhouette: "vest",
    views: ["front", "back", "side"],
  },
  {
    id: "p12",
    slug: "merino-base-tee",
    name: "Merino base tee",
    category: "apparel",
    price: 65,
    description:
      "A soft merino tee that keeps you comfortable over several days. It stays fresh longer than synthetics and does not itch.",
    features: [
      "100% merino wool, 150 g/m²",
      "Flat seams to avoid rubbing under a pack",
      "Naturally odour resistant",
    ],
    colours: [C.stone, C.navy, C.chalk, C.sea],
    sizes: APPAREL_SIZES,
    stock: "in_stock",
    silhouette: "tee",
    views: ["front", "back", "side"],
    featured: 5,
  },
  {
    id: "p13",
    slug: "organic-hoodie",
    name: "Organic hoodie",
    category: "apparel",
    price: 85,
    description:
      "A heavyweight organic cotton hoodie for evenings at camp and slow Sundays. Brushed inside and built to soften with every wash.",
    features: [
      "Organic cotton, brushed inside",
      "Kangaroo pocket and lined hood",
      "Ribbed cuffs and hem",
    ],
    colours: [C.oat, C.charcoal, C.clay],
    sizes: APPAREL_SIZES,
    stock: "in_stock",
    silhouette: "hoodie",
    views: ["front", "back", "side"],
  },
  {
    id: "p14",
    slug: "canvas-overshirt",
    name: "Canvas overshirt",
    category: "apparel",
    price: 89,
    description:
      "A washed canvas overshirt that works as a light jacket. Two chest pockets hold a phone and a notebook.",
    features: [
      "Washed organic cotton canvas",
      "Two flap chest pockets",
      "Corozo buttons",
    ],
    colours: [C.ochre, C.slate, C.forest],
    sizes: APPAREL_SIZES,
    stock: "in_stock",
    silhouette: "shirt",
    views: ["front", "back", "side"],
  },
  {
    id: "p15",
    slug: "trail-shorts",
    name: "Trail shorts",
    category: "apparel",
    price: 55,
    description:
      "Quick-drying shorts with a soft elastic waist and room to move. A zip pocket keeps your keys safe on the trail.",
    features: [
      "Stretch recycled nylon",
      "Elastic waist with drawcord",
      "Zipped back pocket",
    ],
    colours: [C.stone, C.sea, C.charcoal],
    sizes: APPAREL_SIZES,
    stock: "out_of_stock",
    silhouette: "shorts",
    views: ["front", "back", "side"],
  },
  {
    id: "p16",
    slug: "rain-trousers",
    name: "Rain trousers",
    category: "apparel",
    price: 119,
    description:
      "Light waterproof over-trousers that pack small. Ankle zips let you pull them on over boots.",
    features: [
      "Two-and-a-half layer waterproof fabric",
      "Ankle zips to fit over boots",
      "Packs into a small stuff sack",
    ],
    colours: [C.charcoal, C.navy],
    sizes: APPAREL_SIZES,
    stock: "in_stock",
    silhouette: "trousers",
    views: ["front", "back", "side"],
  },

  // ---------------- Accessories ----------------
  {
    id: "p17",
    slug: "wool-beanie",
    name: "Wool beanie",
    category: "accessories",
    price: 29,
    description:
      "A ribbed merino blend beanie with a deep cuff. Warm on the hill and soft enough to wear all day.",
    features: [
      "Merino and recycled nylon blend",
      "Double-layer cuff",
      "One size",
    ],
    colours: [C.rust, C.oat, C.forest, C.navy],
    stock: "in_stock",
    silhouette: "beanie",
    views: ["front", "back", "side"],
    featured: 7,
  },
  {
    id: "p18",
    slug: "six-panel-cap",
    name: "Six-panel cap",
    category: "accessories",
    price: 32,
    description:
      "A low-profile cotton cap with a curved brim. The adjustable strap gives an easy fit.",
    features: [
      "Organic cotton twill",
      "Adjustable back strap",
      "Embroidered eyelets",
    ],
    colours: [C.sand, C.navy, C.moss],
    stock: "in_stock",
    silhouette: "cap",
    views: ["front", "back", "side"],
  },
  {
    id: "p19",
    slug: "slim-card-wallet",
    name: "Slim card wallet",
    category: "accessories",
    price: 39,
    description:
      "A slim wallet for four to six cards and a few folded notes. Made from bonded recycled fibre that feels like soft leather.",
    features: [
      "Holds four to six cards",
      "Centre slot for notes",
      "Bonded recycled fibre",
    ],
    colours: [C.clay, C.charcoal, C.sea],
    stock: "in_stock",
    silhouette: "wallet",
    views: ["front", "back", "side"],
  },
  {
    id: "p20",
    slug: "tech-pouch",
    name: "Tech pouch",
    category: "accessories",
    price: 35,
    description:
      "A padded zip pouch for chargers, cables and a power bank. Elastic loops inside keep everything in its place.",
    features: [
      "Padded shell with elastic loops",
      "Wrist loop for carrying",
      "Water-repellent zip",
    ],
    colours: [C.slate, C.ochre, C.charcoal],
    stock: "in_stock",
    silhouette: "pouch",
    views: ["front", "back", "side"],
  },
  {
    id: "p21",
    slug: "insulated-bottle",
    name: "Insulated bottle",
    category: "accessories",
    price: 34,
    description:
      "A 750 ml steel bottle that keeps drinks cold for a day and hot for a morning. The loop cap clips to a pack.",
    features: [
      "750 ml, double-wall steel",
      "Cold for 24 hours, hot for 12 hours",
      "Leak-proof loop cap",
    ],
    colours: [C.sea, C.chalk, C.rust, C.charcoal],
    stock: "in_stock",
    silhouette: "bottle",
    views: ["front", "back", "side"],
    featured: 8,
  },
  {
    id: "p22",
    slug: "packing-cubes-set",
    name: "Packing cubes set",
    category: "accessories",
    price: 42,
    description:
      "Two packing cubes that keep a bag in order. Mesh tops let you see what is inside without opening them.",
    features: [
      "Set of two: medium and small",
      "Mesh top panels",
      "Grab handles on the side",
    ],
    colours: [C.stone, C.sea, C.berry],
    stock: "in_stock",
    silhouette: "cube",
    views: ["front", "back", "side"],
  },
  {
    id: "p23",
    slug: "key-clip",
    name: "Key clip",
    category: "accessories",
    price: 15,
    description:
      "A webbing key clip with a light alloy carabiner. Clip it to a belt loop or the inside of a pack.",
    features: [
      "Alloy carabiner and split ring",
      "Recycled webbing loop",
      "Weighs 18 g",
    ],
    colours: [C.ochre, C.forest, C.berry],
    stock: "in_stock",
    silhouette: "keyclip",
    views: ["front", "back", "side"],
  },
  {
    id: "p24",
    slug: "travel-wallet",
    name: "Travel wallet",
    category: "accessories",
    price: 59,
    description:
      "A zip wallet for passport, cards, boarding passes and two currencies. Everything you need at the airport in one place.",
    features: [
      "Fits a passport and boarding passes",
      "Six card slots, two note pockets",
      "Zipped coin pocket",
    ],
    colours: [C.navy, C.clay],
    stock: "in_stock",
    silhouette: "zip-wallet",
    views: ["front", "back", "side"],
  },
];

export type SortKey = "featured" | "price-asc" | "price-desc";
export const SORT_KEYS: SortKey[] = ["featured", "price-asc", "price-desc"];

export function getCategory(slug: string): Category | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}

export function getByCategory(slug: CategoryRouteSlug): Product[] {
  return slug === "all" ? PRODUCTS : PRODUCTS.filter((p) => p.category === slug);
}

export function getBySlug(slug: string): Product | undefined {
  return PRODUCTS.find((p) => p.slug === slug);
}

export function getById(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}

export function getFeatured(): Product[] {
  return PRODUCTS.filter((p) => p.featured !== undefined).sort(
    (a, b) => (a.featured ?? 0) - (b.featured ?? 0),
  );
}

/** Up to `count` products: same category first, then others; excludes current. */
export function getRelated(product: Product, count = 4): Product[] {
  const others = PRODUCTS.filter((p) => p.id !== product.id);
  const same = others.filter((p) => p.category === product.category);
  const rest = others.filter((p) => p.category !== product.category);
  return [...same, ...rest].slice(0, count);
}

/** Featured: featured items first by rank, then catalogue order. Stable. */
export function sortProducts(products: Product[], sort: SortKey): Product[] {
  const list = [...products];
  if (sort === "price-asc") return list.sort((a, b) => a.price - b.price);
  if (sort === "price-desc") return list.sort((a, b) => b.price - a.price);
  return list.sort(
    (a, b) => (a.featured ?? Number.POSITIVE_INFINITY) - (b.featured ?? Number.POSITIVE_INFINITY),
  );
}

export function parseSort(value: string | null | undefined): SortKey {
  return SORT_KEYS.includes(value as SortKey) ? (value as SortKey) : "featured";
}
