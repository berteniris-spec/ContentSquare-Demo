import type { FlagKey } from "@/lib/config";
import type { FlagSource } from "@/lib/flags/payload";
import type { FrictionProfile } from "@/lib/flags/resolve";
import type { FlagStorePayload } from "@/lib/flags/store/types";

/** Response of GET/POST /api/demo-controls/flags. */
export interface PanelState {
  configured: boolean;
  store: "upstash" | "memory" | null;
  error?: boolean;
  payload: FlagStorePayload;
  effective: Record<FlagKey, { value: boolean; source: FlagSource }>;
  profile: FrictionProfile;
}
