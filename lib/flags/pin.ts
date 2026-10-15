import { createHash, timingSafeEqual } from "node:crypto";

export function isPinConfigured(): boolean {
  return (process.env.DEMO_CONTROLS_PIN ?? "").length > 0;
}

const digest = (value: string) => createHash("sha256").update(value).digest();

/** Constant-time comparison (both sides hashed to equal length first). False when no PIN is set. */
export function checkPin(provided: string | null | undefined): boolean {
  const expected = process.env.DEMO_CONTROLS_PIN ?? "";
  if (!expected || !provided) return false;
  return timingSafeEqual(digest(provided), digest(expected));
}
