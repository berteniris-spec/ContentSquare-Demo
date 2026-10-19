// Scripted traffic generator for the Tidewild demo store. See scripts/traffic/README (docs/TRAFFIC_GUIDE.md section 9).
import { chromium, type Browser } from "@playwright/test";
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { makeRng, type Rng } from "./rng";
import { pickProfile, cleanUa, type Profile } from "./profiles";
import { PERSONAS, type Persona } from "./personas";
import { withConsent } from "./entries";
import { AbruptEnd, S } from "./session";

const DEFAULT_URL = "https://tidewild-demo.vercel.app";
const SESSION_TIMEOUT_MS = 4 * 60 * 1000;

interface Options {
  url: string;
  sessions: number;
  concurrency: number;
  spreadMinutes: number;
  headless: boolean;
  seed: number;
  only?: string;
  dry: boolean;
  live: boolean;
  pace: number;
}

function fail(msg: string): never {
  console.error(`\nERROR: ${msg}\n`);
  process.exit(1);
}

function parseArgs(argv: string[]): Options {
  const o: Options = {
    url: DEFAULT_URL,
    sessions: 100,
    concurrency: 2,
    spreadMinutes: 0,
    headless: false,
    seed: Date.now() % 1_000_000,
    dry: false,
    live: false,
    pace: 1,
  };
  const val = (i: number, name: string) => {
    const v = argv[i + 1];
    if (v === undefined || v.startsWith("--")) fail(`${name} needs a value`);
    return v;
  };
  const num = (i: number, name: string) => {
    const n = Number(val(i, name));
    if (!Number.isFinite(n) || n < 0) fail(`${name} must be a non-negative number`);
    return n;
  };
  let friction = "baseline";
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case "--url": o.url = val(i, a); i++; break;
      case "--sessions": o.sessions = Math.floor(num(i, a)); i++; break;
      case "--concurrency": o.concurrency = Math.floor(num(i, a)); i++; break;
      case "--spread-minutes": o.spreadMinutes = num(i, a); i++; break;
      case "--seed": o.seed = Math.floor(num(i, a)); i++; break;
      case "--only": o.only = val(i, a); i++; break;
      case "--pace": o.pace = num(i, a); i++; break;
      case "--friction": friction = val(i, a); i++; break;
      case "--headless": o.headless = true; break;
      case "--dry": o.dry = true; break;
      case "--live": o.live = true; break;
      default: fail(`unknown argument ${a}`);
    }
  }
  if (friction !== "baseline") fail('only "--friction baseline" is supported (no ?friction= overrides are ever sent)');
  if (o.concurrency < 1) o.concurrency = 1;
  if (o.concurrency > 3) {
    console.warn("concurrency capped at 3");
    o.concurrency = 3;
  }
  if (o.sessions < 1) fail("--sessions must be at least 1");
  if (o.only && !PERSONAS.some((p) => p.id === o.only)) {
    fail(`unknown persona "${o.only}". Choose one of: ${PERSONAS.map((p) => p.id).join(", ")}`);
  }
  let parsed: URL;
  try {
    parsed = new URL(o.url);
  } catch {
    fail(`invalid --url "${o.url}"`);
  }
  o.url = parsed.origin;
  const local = ["localhost", "127.0.0.1"].includes(parsed.hostname);
  if (!local && !o.live && !o.dry) {
    fail(
      `${o.url} is not localhost. This generator creates real sessions in Contentsquare and GA4 and real (test) orders.\n` +
        "Re-run with the explicit --live flag if you really mean to target this site (your own demo site only).",
    );
  }
  return o;
}

// ---------- Plan ----------

interface Planned {
  index: number;
  persona: Persona;
  profile: Profile;
  entry: string;
  seed: number;
  offsetMs: number;
}

/** Persona counts by largest remainder so the shares are exact for any session count. */
function allocate(n: number): Persona[] {
  const total = PERSONAS.reduce((s, p) => s + p.share, 0);
  const base = PERSONAS.map((p) => ({ p, exact: (n * p.share) / total }));
  const out = base.map((b) => ({ p: b.p, count: Math.floor(b.exact), rem: b.exact % 1 }));
  let left = n - out.reduce((s, b) => s + b.count, 0);
  for (const b of [...out].sort((a, b) => b.rem - a.rem)) {
    if (left-- <= 0) break;
    b.count++;
  }
  return out.flatMap((b) => Array<Persona>(b.count).fill(b.p));
}

function makePlan(o: Options): Planned[] {
  const rng = makeRng(o.seed);
  const personas = o.only ? Array<Persona>(o.sessions).fill(PERSONAS.find((p) => p.id === o.only)!) : rng.shuffle(allocate(o.sessions));
  const spreadMs = o.spreadMinutes * 60_000;
  const offsets = personas.map(() => (spreadMs > 0 ? rng.float(0, spreadMs) : 0)).sort((a, b) => a - b);
  return personas.map((persona, i) => {
    const r = makeRng(o.seed * 1000 + i + 1);
    return {
      index: i + 1,
      persona,
      profile: pickProfile(r, "{CHROME}", !!persona.forcePhone),
      entry: persona.entry(r),
      seed: o.seed * 1000 + i + 1,
      offsetMs: offsets[i],
    };
  });
}

// ---------- Session log ----------

const CSV_HEADER = ["#", "datetime", "phase", "persona", "device", "entry URL", "what I did", "outcome", "notes"];
const csvCell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
const csvRow = (cells: (string | number)[]) => cells.map(csvCell).join(",") + "\n";

interface Result {
  planned: Planned;
  datetime: string;
  actions: string[];
  outcome: string;
  notes: string[];
  purchased: boolean;
  orderValue?: string;
}

// ---------- Run ----------

async function runSession(browser: Browser, o: Options, chromeMajor: string, p: Planned): Promise<Result> {
  const rng = makeRng(p.seed + 7);
  const options = { ...p.profile.options };
  if (options.userAgent) options.userAgent = cleanUa(options.userAgent.replace("{CHROME}", chromeMajor));
  const context = await browser.newContext(options);
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
  });
  // Never navigate to the control panel or its API, whatever happens.
  await context.route(/\/(demo-controls|api\/demo-controls)(\/|\?|$)/, (route) => route.abort());
  const page = await context.newPage();
  const s = new S(page, rng, o.url, p.profile.mobile, o.pace, p.persona.abrupt);
  const result: Result = {
    planned: p,
    datetime: new Date().toISOString().replace("T", " ").slice(0, 19),
    actions: s.actions,
    outcome: "error",
    notes: s.notes,
    purchased: false,
  };
  const body = async () => {
    const entry = withConsent(o.url, p.entry);
    await page.goto(entry, { waitUntil: "domcontentloaded", timeout: 30000 });
    s.log(`landed on ${p.entry} (accepted cookies)`);
    await s.waitForTags();
    await s.beat(400, 1500);
    const outcome = await p.persona.run(s);
    // Short dwell so beacons flush before the context closes.
    await page.waitForTimeout(rng.int(3000, 6000));
    return outcome;
  };
  let timer: NodeJS.Timeout | undefined;
  try {
    result.outcome = await Promise.race([
      body(),
      new Promise<string>((_, reject) => {
        timer = setTimeout(() => reject(new Error("session timeout (4 min)")), SESSION_TIMEOUT_MS);
      }),
    ]);
  } catch (e) {
    if (e instanceof AbruptEnd) {
      result.outcome = "exit (closed tab)";
    } else {
      result.outcome = "error";
      result.notes.push(String((e as Error).message ?? e).split("\n")[0].slice(0, 160));
      if (process.env.TRAFFIC_DEBUG) {
        console.error((e as Error).stack);
        await page.screenshot({ path: `${process.env.TRAFFIC_DEBUG}/err-${p.index}.png` }).catch(() => undefined);
      }
    }
  } finally {
    if (timer) clearTimeout(timer);
    result.purchased = s.state.purchased;
    result.orderValue = s.state.orderValue;
    if (s.state.purchased) result.notes.push(`order ${s.state.orderNumber ?? "?"} ${s.state.orderValue ?? ""}`.trim());
    await context.close().catch(() => undefined);
  }
  return result;
}

async function launch(headless: boolean): Promise<Browser> {
  const args = ["--disable-blink-features=AutomationControlled"];
  if (headless) {
    try {
      // New headless mode (full Chromium): no "HeadlessChrome" in UA or client hints.
      return await chromium.launch({ headless: true, channel: "chromium", args });
    } catch {
      /* fall back to the headless shell */
    }
  }
  return chromium.launch({ headless, args });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const o = parseArgs(process.argv.slice(2));
  const plan = makePlan(o);

  console.log(`Target: ${o.url}  sessions: ${o.sessions}  concurrency: ${o.concurrency}  seed: ${o.seed}  ${o.headless ? "headless" : "headed"}`);
  console.log("Friction mode: baseline. No ?friction= overrides are sent; this run reflects whatever state the control panel currently has.");

  if (o.dry) {
    console.log("\nPlanned sessions (dry run, nothing is visited):");
    for (const p of plan) {
      const at = o.spreadMinutes > 0 ? ` +${(p.offsetMs / 60000).toFixed(1)}min` : "";
      console.log(`${String(p.index).padStart(3)}  ${p.persona.name.padEnd(20)} ${p.profile.label.padEnd(34)} ${p.entry}${at}`);
    }
    const counts = new Map<string, number>();
    for (const p of plan) counts.set(p.persona.name, (counts.get(p.persona.name) ?? 0) + 1);
    console.log("\n" + [...counts].map(([k, v]) => `${k}: ${v}`).join(", "));
    return;
  }

  const outDir = path.join(__dirname, "out");
  mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const logFile = path.join(outDir, `session-log-${stamp}.csv`);
  writeFileSync(logFile, csvRow(CSV_HEADER));

  const browser = await launch(o.headless);
  const chromeMajor = browser.version().split(".")[0];
  const results: Result[] = [];
  const startedAt = Date.now();
  let next = 0;
  let lastStart = 0;
  let stopping = false;
  process.on("SIGINT", () => {
    console.log("\nStopping after the running sessions finish...");
    stopping = true;
  });

  async function worker() {
    while (!stopping) {
      const p = plan[next++];
      if (!p) return;
      const wait = startedAt + p.offsetMs - Date.now();
      if (wait > 0) await sleep(wait);
      // Jittered gap between session starts (also in spread mode).
      const gap = lastStart + 1000 + Math.random() * 3000 - Date.now();
      if (gap > 0) await sleep(gap);
      lastStart = Date.now();
      let r: Result;
      try {
        r = await runSession(browser, o, chromeMajor, p);
      } catch (e) {
        r = {
          planned: p,
          datetime: new Date().toISOString().replace("T", " ").slice(0, 19),
          actions: [],
          outcome: "error",
          notes: [`setup failed: ${String((e as Error).message).split("\n")[0]}`],
          purchased: false,
        };
      }
      results.push(r);
      appendFileSync(
        logFile,
        csvRow([p.index, r.datetime, "A", p.persona.name, p.profile.label, p.entry, r.actions.join("; "), r.outcome, r.notes.join("; ")]),
      );
      console.log(`[${results.length}/${plan.length}] #${p.index} ${p.persona.name} on ${p.profile.label}: ${r.outcome}${r.notes.length ? ` (${r.notes[r.notes.length - 1]})` : ""}`);
    }
  }
  await Promise.all(Array.from({ length: o.concurrency }, worker));
  await browser.close().catch(() => undefined);

  // Summary
  const per = new Map<string, number>();
  for (const r of results) per.set(r.planned.persona.name, (per.get(r.planned.persona.name) ?? 0) + 1);
  const purchases = results.filter((r) => r.purchased);
  const errors = results.filter((r) => r.outcome === "error").length;
  const devices = new Map<string, number>();
  for (const r of results) devices.set(r.planned.profile.kind, (devices.get(r.planned.profile.kind) ?? 0) + 1);
  console.log("\n===== Summary =====");
  console.log(`Sessions run: ${results.length}  in ${((Date.now() - startedAt) / 60000).toFixed(1)} min`);
  for (const [k, v] of per) console.log(`  ${k.padEnd(22)} ${v}`);
  console.log(`Devices: ${[...devices].map(([k, v]) => `${k} ${v}`).join(", ")}`);
  console.log(`Purchases: ${purchases.length}`);
  console.log(`Errors: ${errors}`);
  console.log(`Session log: ${logFile}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

export type { Rng };
