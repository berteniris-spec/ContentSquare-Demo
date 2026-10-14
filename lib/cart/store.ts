// Cart state as a tiny external store backed by localStorage ('tw-cart-v1').
// Read through useSyncExternalStore: the server snapshot is always the empty cart,
// so the first client render matches the server HTML (no hydration mismatch).
import { MAX_QTY, PROMO } from "@/lib/config";

export interface CartItem {
  key: string;
  productId: string;
  slug: string;
  name: string;
  colour: string;
  size?: string;
  unitPrice: number;
  quantity: number;
}

export interface CartState {
  items: CartItem[];
  promoCode: "DEMO10" | null;
}

export const CART_STORAGE_KEY = "tw-cart-v1";
export const EMPTY_CART: CartState = Object.freeze({ items: [], promoCode: null }) as CartState;

export type CartAction =
  | { type: "add"; item: Omit<CartItem, "key"> }
  | { type: "setQuantity"; key: string; quantity: number }
  | { type: "remove"; key: string }
  | { type: "applyPromo" }
  | { type: "removePromo" }
  | { type: "clear" };

export function itemKey(productId: string, colour: string, size?: string): string {
  return `${productId}:${colour}:${size ?? "-"}`;
}

const clampQty = (n: number) => Math.min(MAX_QTY, Math.max(1, Math.round(n)));

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "add": {
      const key = itemKey(action.item.productId, action.item.colour, action.item.size);
      const existing = state.items.find((i) => i.key === key);
      const items = existing
        ? state.items.map((i) =>
            i.key === key ? { ...i, quantity: clampQty(i.quantity + action.item.quantity) } : i,
          )
        : [...state.items, { ...action.item, key, quantity: clampQty(action.item.quantity) }];
      return { ...state, items };
    }
    case "setQuantity":
      return {
        ...state,
        items: state.items.map((i) => (i.key === action.key ? { ...i, quantity: clampQty(action.quantity) } : i)),
      };
    case "remove":
      return { ...state, items: state.items.filter((i) => i.key !== action.key) };
    case "applyPromo":
      return { ...state, promoCode: PROMO.code };
    case "removePromo":
      return { ...state, promoCode: null };
    case "clear":
      return EMPTY_CART;
  }
}

function sanitize(raw: unknown): CartState {
  if (!raw || typeof raw !== "object") return EMPTY_CART;
  const r = raw as Partial<CartState>;
  const items = Array.isArray(r.items)
    ? r.items
        .filter(
          (i): i is CartItem =>
            !!i &&
            typeof i.productId === "string" &&
            typeof i.colour === "string" &&
            typeof i.slug === "string" &&
            typeof i.name === "string" &&
            typeof i.unitPrice === "number" &&
            typeof i.quantity === "number",
        )
        .map((i) => ({
          ...i,
          key: itemKey(i.productId, i.colour, i.size),
          quantity: clampQty(i.quantity),
        }))
    : [];
  return { items, promoCode: r.promoCode === PROMO.code ? PROMO.code : null };
}

let state: CartState = EMPTY_CART;
let loaded = false;
const listeners = new Set<() => void>();

function readStorage(): CartState {
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    return raw ? sanitize(JSON.parse(raw)) : EMPTY_CART;
  } catch {
    return EMPTY_CART;
  }
}

function ensureLoaded() {
  if (!loaded && typeof window !== "undefined") {
    state = readStorage();
    loaded = true;
  }
}

function emit() {
  listeners.forEach((l) => l());
}

function onStorage(e: StorageEvent) {
  if (e.key !== CART_STORAGE_KEY && e.key !== null) return;
  state = readStorage();
  loaded = true;
  emit();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1) window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

export function getSnapshot(): CartState {
  ensureLoaded();
  return state;
}

export function getServerSnapshot(): CartState {
  return EMPTY_CART;
}

export function dispatch(action: CartAction) {
  ensureLoaded();
  state = cartReducer(state, action);
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage unavailable (private mode, quota): the cart still works for this page view.
  }
  emit();
}
