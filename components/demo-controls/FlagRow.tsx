import { type Capability, type FlagMeta } from "@/lib/config";
import type { FlagSource } from "@/lib/flags/payload";
import { Switch } from "./Switch";

const CAPABILITY: Record<Capability, { label: string; className: string }> = {
  funnel: { label: "Funnel", className: "bg-accent-soft text-accent-ink" },
  heatmaps: { label: "Heatmaps", className: "bg-warning-soft text-warning" },
  replay: { label: "Session replay", className: "bg-sunken text-ink-2" },
  errors: { label: "Errors", className: "bg-error-soft text-error" },
};

const SOURCE: Record<FlagSource, string> = { global: "set here", env: "build env", default: "code default" };

function formatTime(iso: string | undefined): string {
  if (!iso) return "never";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "never" : d.toLocaleString();
}

interface FlagRowProps {
  meta: FlagMeta;
  value: boolean;
  source: FlagSource;
  updatedAt: string | undefined;
  disabled: boolean;
  onToggle: (next: boolean) => void;
}

export function FlagRow({ meta, value, source, updatedAt, disabled, onToggle }: FlagRowProps) {
  const cap = CAPABILITY[meta.capability];
  const labelId = `flag-label-${meta.key}`;
  const descId = `flag-desc-${meta.key}`;
  return (
    <li data-testid={`flag-row-${meta.key}`} className="flex items-start gap-4 py-5">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h3 id={labelId} className="text-base font-semibold text-ink">
            {meta.label}
          </h3>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${cap.className}`}>{cap.label}</span>
        </div>
        <p id={descId} className="mt-1 text-sm text-ink-2">
          {meta.description}
        </p>
        <p className="mt-1.5 text-sm text-muted">
          <span className="text-base font-semibold text-ink" data-testid={`flag-state-${meta.key}`}>
            {value ? "ON" : "OFF"}
          </span>{" "}
          ({SOURCE[source]}) · Last changed:{" "}
          <span data-testid={`flag-updated-${meta.key}`} title={updatedAt}>
            {formatTime(updatedAt)}
          </span>
        </p>
      </div>
      <Switch
        checked={value}
        disabled={disabled}
        labelledBy={labelId}
        describedBy={descId}
        testId={`flag-toggle-${meta.key}`}
        onChange={onToggle}
      />
    </li>
  );
}
