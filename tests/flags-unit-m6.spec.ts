import { readFileSync } from "node:fs";
import { join } from "node:path";
import { FLAG_KEYS, FRICTION } from "../lib/config";
import { applyAction, describeEffective, parseAction, sanitizePayload } from "../lib/flags/payload";
import { checkPin, isPinConfigured } from "../lib/flags/pin";
import { resolveFlags } from "../lib/flags/resolve";
import { getStore } from "../lib/flags/store";
import { HISTORY_CAP, HISTORY_SHOWN, type FlagStorePayload } from "../lib/flags/store/types";
import { expect, test } from "./fixtures";

// Tester unit tests for M6 (pure node, no server, no network, no real store).
function withEnv<T>(env: Record<string, string | undefined>, fn: () => T): T {
  const saved: Record<string, string | undefined> = {};
  for (const k of Object.keys(env)) saved[k] = process.env[k];
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  try {
    return fn();
  } finally {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}
const NO_UPSTASH = { KV_REST_API_URL: undefined, KV_REST_API_TOKEN: undefined, UPSTASH_REDIS_REST_URL: undefined, UPSTASH_REDIS_REST_TOKEN: undefined };
const empty: FlagStorePayload = { flags: {}, updatedAt: {}, flagHistory: [] };

test.describe("PIN check (unit)", () => {
  test("accepts only the exact PIN; empty, null, prefix, suffix, case, whitespace and unicode all fail", () => {
    const r = withEnv({ DEMO_CONTROLS_PIN: "246810" }, () => ({
      ok: checkPin("246810"),
      none: [checkPin(null), checkPin(undefined), checkPin("")],
      near: [checkPin("24681"), checkPin("2468100"), checkPin(" 246810"), checkPin("246810 "), checkPin("246811"), checkPin("٢٤٦٨١٠")],
      long: checkPin("9".repeat(100_000)),
    }));
    expect(r.ok).toBe(true);
    expect(r.none).toEqual([false, false, false]);
    expect(r.near).toEqual([false, false, false, false, false, false]);
    expect(r.long).toBe(false);
  });

  test("empty or unset PIN env disables the panel and nothing matches, not even an empty input", () => {
    for (const v of ["", undefined]) {
      withEnv({ DEMO_CONTROLS_PIN: v }, () => {
        expect(isPinConfigured()).toBe(false);
        expect([checkPin(""), checkPin("anything"), checkPin(null)]).toEqual([false, false, false]);
      });
    }
    expect(withEnv({ DEMO_CONTROLS_PIN: "1" }, () => [isPinConfigured(), checkPin("1")])).toEqual([true, true]);
  });

  test("implementation uses crypto.timingSafeEqual on equal-length digests (no ===/!== on the PIN)", () => {
    const src = readFileSync(join(__dirname, "..", "lib", "flags", "pin.ts"), "utf8");
    expect(src).toMatch(/timingSafeEqual\(/);
    expect(src).toMatch(/createHash\(/);
    // strip comments, then no direct equality between the provided and expected values
    const code = src.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(code).not.toMatch(/provided\s*[!=]==?\s*expected|expected\s*[!=]==?\s*provided/);
  });

  test("timing: wrong PINs of different length/prefix take about as long as a near-miss (coarse, 4000 calls each)", () => {
    withEnv({ DEMO_CONTROLS_PIN: "246810" }, () => {
      const time = (pin: string) => {
        const t0 = process.hrtime.bigint();
        for (let i = 0; i < 4000; i++) checkPin(pin);
        return Number(process.hrtime.bigint() - t0) / 1e6;
      };
      time("warm");
      const nearMiss = time("246811"); // 5 of 6 chars right
      const farMiss = time("999999");
      // not a proof of constant time; guards against an early-exit comparison (would be ~order of magnitude apart)
      const ratio = Math.max(nearMiss, farMiss) / Math.max(1, Math.min(nearMiss, farMiss));
      expect(ratio).toBeLessThan(4);
    });
  });
});

test.describe("store selection (unit)", () => {
  const KV = { KV_REST_API_URL: "https://example.invalid", KV_REST_API_TOKEN: "x", UPSTASH_REDIS_REST_URL: undefined, UPSTASH_REDIS_REST_TOKEN: undefined };
  test("FLAG_STORE is case-insensitive and trimmed", () => {
    expect(withEnv({ ...NO_UPSTASH, FLAG_STORE: " MEMORY ", VERCEL: undefined }, () => getStore()?.name)).toBe("memory");
    expect(withEnv({ ...KV, FLAG_STORE: " None ", VERCEL: undefined }, () => getStore())).toBeNull();
  });
  test("memory beats Upstash vars of either naming scheme; VERCEL set refuses memory even with Upstash vars", () => {
    expect(withEnv({ ...NO_UPSTASH, UPSTASH_REDIS_REST_URL: "https://e.invalid", UPSTASH_REDIS_REST_TOKEN: "t", FLAG_STORE: "memory", VERCEL: undefined }, () => getStore()?.name)).toBe("memory");
    expect(withEnv({ ...KV, FLAG_STORE: "memory", VERCEL: "1" }, () => getStore())).toBeNull();
    expect(withEnv({ ...NO_UPSTASH, FLAG_STORE: "memory", VERCEL: "1" }, () => getStore())).toBeNull();
    // VERCEL="" is falsy: not on Vercel
    expect(withEnv({ ...NO_UPSTASH, FLAG_STORE: "memory", VERCEL: "" }, () => getStore()?.name)).toBe("memory");
  });
  test("FLAG_STORE=upstash needs credentials; half a credential pair is not enough; unknown mode falls back to auto", () => {
    expect(withEnv({ ...NO_UPSTASH, FLAG_STORE: "upstash" }, () => getStore())).toBeNull();
    expect(withEnv({ ...NO_UPSTASH, KV_REST_API_URL: "https://e.invalid", FLAG_STORE: "" }, () => getStore())).toBeNull();
    expect(withEnv({ ...KV, FLAG_STORE: "upstash" }, () => getStore()?.name)).toBe("upstash");
    expect(withEnv({ ...KV, FLAG_STORE: "bogus" }, () => getStore()?.name)).toBe("upstash");
    expect(withEnv({ ...NO_UPSTASH, FLAG_STORE: "bogus" }, () => getStore())).toBeNull();
  });
});

test.describe("actions, history and sanitising (unit)", () => {
  test("history: newest first, capped at 30, panel shows 20", () => {
    expect(HISTORY_CAP).toBe(30);
    expect(HISTORY_SHOWN).toBe(20);
    let p = empty;
    for (let i = 0; i < 45; i++) p = applyAction(p, { action: "toggle", flag: "slowHero", value: i % 2 === 0 }, new Date(Date.UTC(2026, 0, 1, 0, 0, i)));
    expect(p.flagHistory).toHaveLength(30);
    expect(p.flagHistory[0].at).toBe(new Date(Date.UTC(2026, 0, 1, 0, 0, 44)).toISOString());
    expect(p.flagHistory[29].at).toBe(new Date(Date.UTC(2026, 0, 1, 0, 0, 15)).toISOString());
  });

  test("updatedAt: set for changed flags, kept for unchanged ones; no-op toggle records an empty change list", () => {
    const t1 = new Date("2026-02-01T10:00:00Z");
    const t2 = new Date("2026-02-01T11:00:00Z");
    // slowHero default is ON: switching OFF is a real change
    const a = applyAction(empty, { action: "toggle", flag: "slowHero", value: false }, t1);
    expect(a.updatedAt.slowHero).toBe(t1.toISOString());
    expect(a.flagHistory[0].changes).toEqual([{ flag: "slowHero", from: true, to: false }]);
    // same value again: effective unchanged, updatedAt untouched, history entry has no changes
    const b = applyAction(a, { action: "toggle", flag: "slowHero", value: false }, t2);
    expect(b.updatedAt.slowHero).toBe(t1.toISOString());
    expect(b.flagHistory[0].changes).toEqual([]);
    expect(b.flagHistory).toHaveLength(2);
    // other flag untouched
    expect(b.updatedAt.promoField).toBeUndefined();
  });

  test("all_on / all_off set all 9 flags; only_fix_errors = 7 ON, postcodeValidation and expressShippingError OFF", () => {
    const on = applyAction(empty, { action: "all_on" });
    expect(FLAG_KEYS.every((k) => on.flags[k] === true)).toBe(true);
    const off = applyAction(on, { action: "all_off" });
    expect(FLAG_KEYS.every((k) => off.flags[k] === false)).toBe(true);
    expect(off.flagHistory[0].changes).toHaveLength(9);
    const fix = applyAction(on, { action: "only_fix_errors" });
    expect(FLAG_KEYS.filter((k) => fix.flags[k]).sort()).toEqual(FLAG_KEYS.filter((k) => k !== "postcodeValidation" && k !== "expressShippingError").sort());
    expect(describeEffective(fix).profile).toBe("fixed");
    expect(describeEffective(on).profile).toBe("express_error");
    expect(describeEffective(off).profile).toBe("clean");
    expect(describeEffective(empty).profile).toBe("baseline");
  });

  test("applyAction does not mutate its input", () => {
    const before = JSON.stringify(empty);
    applyAction(empty, { action: "all_on" });
    expect(JSON.stringify(empty)).toBe(before);
  });

  test("describeEffective: source global > env > default", () => {
    // ENV_FLAGS are read from NEXT_PUBLIC_FRICTION_* in this node process (unset here => default); global wins
    const d = describeEffective({ flags: { slowHero: false }, updatedAt: {}, flagHistory: [] });
    expect(d.effective.slowHero).toEqual({ value: false, source: "global" });
    expect(d.effective.promoField.source === "default" || d.effective.promoField.source === "env").toBe(true);
  });

  test("resolver: global layer from the store beats env and defaults; override still beats global", () => {
    const env = { postcodeValidation: false };
    expect(resolveFlags({ env, defaults: FRICTION }).postcodeValidation).toBe(false);
    expect(resolveFlags({ global: { postcodeValidation: true }, env, defaults: FRICTION }).postcodeValidation).toBe(true);
    expect(resolveFlags({ override: { postcodeValidation: false }, global: { postcodeValidation: true }, env, defaults: FRICTION }).postcodeValidation).toBe(false);
  });

  test("parseAction rejects every malformed body", () => {
    const bad: unknown[] = [
      null, undefined, 1, "toggle", [], {}, { action: "nope" }, { action: "toggle" }, { action: "toggle", flag: "slowHero" },
      { action: "toggle", flag: "slowHero", value: "true" }, { action: "toggle", flag: "slowHero", value: 1 },
      { action: "toggle", flag: "__proto__", value: true }, { action: "toggle", flag: "constructor", value: true },
      { action: "toggle", flag: "SlowHero", value: true }, { action: "ALL_ON" },
    ];
    for (const b of bad) expect(parseAction(b), JSON.stringify(b)).toBeNull();
    expect(parseAction({ action: "all_off", extra: 1 })).toEqual({ action: "all_off" });
  });

  test("sanitizePayload drops junk: unknown keys, wrong types, bad history entries, oversize history", () => {
    const raw = {
      flags: { slowHero: false, promoField: "yes", bogus: true, __proto__: { x: 1 } },
      updatedAt: { slowHero: "2026-01-01T00:00:00Z", promoField: 5 },
      flagHistory: [
        { at: "2026-01-01T00:00:00Z", action: "toggle", changes: [{ flag: "slowHero", from: true, to: false }, { flag: "bogus", from: true, to: false }, "x"] },
        { at: 5, action: "toggle", changes: [] },
        { at: "x", action: "evil", changes: [] },
        null,
        ...Array.from({ length: 50 }, () => ({ at: "2026-01-01T00:00:00Z", action: "all_on", changes: [] })),
      ],
    };
    const s = sanitizePayload(raw);
    expect(s.flags).toEqual({ slowHero: false });
    expect(s.updatedAt).toEqual({ slowHero: "2026-01-01T00:00:00Z" });
    expect(s.flagHistory[0].changes).toEqual([{ flag: "slowHero", from: true, to: false }]);
    expect(s.flagHistory.length).toBeLessThanOrEqual(30);
    expect(sanitizePayload(null)).toEqual(empty);
    expect(sanitizePayload("garbage")).toEqual(empty);
    expect(sanitizePayload([])).toEqual(empty);
  });
});
