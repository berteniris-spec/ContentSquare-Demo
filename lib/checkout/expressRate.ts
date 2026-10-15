// Express rate lookup used only by the expressShippingError friction path (flag ON).
// The zone table has no entry for postcodes matching EXPRESS_ERROR_POSTCODE, so the lookup yields
// undefined and reading `.rate` throws a real TypeError, as an unhandled zone lookup would.
import { EXPRESS_ERROR_POSTCODE, EXPRESS_SHIPPING } from "@/lib/config";

const EXPRESS_ZONES: Record<string, { rate: number }> = {
  default: { rate: EXPRESS_SHIPPING },
};

export function expressRateFor(postcode: string): number {
  const compact = postcode.replace(/\s+/g, "");
  const zone = EXPRESS_ZONES[EXPRESS_ERROR_POSTCODE.test(compact) ? compact.slice(0, 2) : "default"];
  return zone.rate;
}
