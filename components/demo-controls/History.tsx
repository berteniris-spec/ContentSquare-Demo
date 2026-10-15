import { FLAG_META } from "@/lib/config";
import { HISTORY_SHOWN, type FlagAction, type HistoryEntry } from "@/lib/flags/store/types";

const LABEL: Record<FlagAction, string> = {
  toggle: "Toggle",
  all_on: "All friction ON",
  all_off: "All friction OFF",
  only_fix_errors: "Only fix errors",
};

const NAME = Object.fromEntries(FLAG_META.map((m) => [m.key, m.label]));
const onOff = (v: boolean) => (v ? "ON" : "OFF");

export function History({ entries }: { entries: HistoryEntry[] }) {
  const shown = entries.slice(0, HISTORY_SHOWN);
  return (
    <section aria-labelledby="history-title" className="mt-10">
      <h2 id="history-title" className="text-xl font-semibold text-ink">
        History
      </h2>
      {shown.length === 0 ? (
        <p className="mt-3 text-sm text-muted" data-testid="flag-history-empty">
          No changes yet.
        </p>
      ) : null}
      <ol data-testid="flag-history" className="mt-3 divide-y divide-line">
        {shown.map((e, i) => (
          <li key={`${e.at}-${i}`} data-testid="flag-history-entry" className="py-3 text-sm">
            <p>
              <time dateTime={e.at} title={e.at} className="text-muted">
                {new Date(e.at).toLocaleString()}
              </time>{" "}
              <span className="font-medium text-ink">{LABEL[e.action]}</span>
            </p>
            {e.changes.length === 0 ? (
              <p className="text-muted">No effective change.</p>
            ) : (
              <ul className="mt-1 text-ink-2">
                {e.changes.map((c) => (
                  <li key={c.flag}>
                    {NAME[c.flag] ?? c.flag}: {onOff(c.from)} to {onOff(c.to)}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
