"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { inputClasses, labelClasses } from "@/components/ui/Field";
import { AlertCircleIcon, InfoIcon, LockIcon } from "@/components/ui/icons";
import { FLAG_META } from "@/lib/config";
import type { FlagAction } from "@/lib/flags/store/types";
import type { FrictionProfile } from "@/lib/flags/resolve";
import { FlagRow } from "./FlagRow";
import { History } from "./History";
import type { PanelState } from "./types";

const PIN_KEY = "tw-demo-pin";
const API = "/api/demo-controls/flags";

const PROFILE: Record<FrictionProfile, string> = {
  baseline: "Phase A: baseline (all friction on, express error off)",
  express_error: "Phase B: express shipping error on",
  fixed: "Phase C: errors fixed (postcode and express off)",
  clean: "All friction off",
};

type Phase = "checking" | "locked" | "ready";

export function ControlPanel({ pinConfigured }: { pinConfigured: boolean }) {
  const [phase, setPhase] = useState<Phase>(pinConfigured ? "checking" : "locked");
  const [pin, setPin] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [state, setState] = useState<PanelState | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const request = useCallback(async (usePin: string, body?: object) => {
    const res = await fetch(API, {
      method: body ? "POST" : "GET",
      headers: { "x-demo-pin": usePin, ...(body ? { "content-type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
    const json = (await res.json().catch(() => ({}))) as Partial<PanelState> & { error?: string };
    return { res, json };
  }, []);

  const unlock = useCallback(
    async (candidate: string, fromStorage: boolean) => {
      try {
        const { res, json } = await request(candidate);
        if (res.ok) {
          sessionStorage.setItem(PIN_KEY, candidate);
          setPin(candidate);
          setState(json as PanelState);
          setPinError(null);
          setPhase("ready");
          return;
        }
        if (fromStorage) sessionStorage.removeItem(PIN_KEY);
        if (!fromStorage) {
          setPinError(res.status === 503 ? "Control panel disabled: set DEMO_CONTROLS_PIN" : "Wrong PIN");
        }
      } catch {
        if (!fromStorage) setPinError("Could not reach the server. Try again.");
      }
      setPhase("locked");
    },
    [request],
  );

  useEffect(() => {
    const stored = pinConfigured ? sessionStorage.getItem(PIN_KEY) : null;
    // Deferred so no state is set synchronously in the effect body.
    queueMicrotask(() => {
      if (stored) void unlock(stored, true);
      else setPhase("locked");
    });
  }, [pinConfigured, unlock]);

  const send = async (body: object) => {
    setBusy(true);
    setApiError(null);
    try {
      const { res, json } = await request(pin, body);
      if (res.ok) setState(json as PanelState);
      else if (res.status === 401) lock();
      else setApiError(describeError(json.error));
    } catch {
      setApiError("Could not reach the server. Nothing was changed.");
    }
    setBusy(false);
  };

  const refresh = async () => {
    setBusy(true);
    setApiError(null);
    try {
      const { res, json } = await request(pin);
      if (res.ok) setState(json as PanelState);
      else setApiError(describeError(json.error));
    } catch {
      setApiError("Could not reach the server.");
    }
    setBusy(false);
  };

  function lock() {
    sessionStorage.removeItem(PIN_KEY);
    setPin("");
    setPinInput("");
    setState(null);
    setApiError(null);
    setPhase("locked");
  }

  const master = (action: Exclude<FlagAction, "toggle">) => void send({ action });

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight text-ink md:text-4xl">Demo controls</h1>
      {!pinConfigured ? (
        <p
          data-testid="pin-disabled"
          role="status"
          className="mt-6 flex gap-2 rounded-md border border-line-strong bg-sunken p-4 text-base text-ink"
        >
          <InfoIcon size={20} className="mt-0.5 shrink-0" />
          <span>Control panel disabled: set DEMO_CONTROLS_PIN</span>
        </p>
      ) : phase === "checking" ? (
        <p className="mt-6 text-base text-muted">Checking...</p>
      ) : phase === "locked" ? (
        <form
          className="mt-6 max-w-sm"
          onSubmit={(e) => {
            e.preventDefault();
            if (pinInput) void unlock(pinInput, false);
          }}
        >
          <label htmlFor="pin" className={labelClasses}>
            PIN
          </label>
          <input
            id="pin"
            data-testid="pin-input"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            aria-invalid={pinError ? true : undefined}
            aria-describedby={pinError ? "pin-error" : undefined}
            className={`${inputClasses} mt-1.5`}
          />
          {pinError ? (
            <p id="pin-error" data-testid="pin-error" role="alert" className="mt-1.5 flex gap-1.5 text-sm text-error">
              <AlertCircleIcon size={16} className="mt-0.5 shrink-0" />
              <span>{pinError}</span>
            </p>
          ) : null}
          <Button type="submit" data-testid="pin-submit" className="mt-4 w-full">
            Unlock
          </Button>
        </form>
      ) : state ? (
        <Panel
          state={state}
          busy={busy}
          apiError={apiError}
          onToggle={(flag, value) => void send({ action: "toggle", flag, value })}
          onMaster={master}
          onRefresh={() => void refresh()}
          onLock={lock}
        />
      ) : null}
    </div>
  );
}

function describeError(code: string | undefined): string {
  if (code === "store_not_configured") return "Global store not configured. Nothing was changed.";
  if (code === "store_error") return "The global store did not respond. Nothing was changed.";
  if (code === "invalid_body") return "The server rejected that request.";
  return "Something went wrong. Nothing was changed.";
}

interface PanelProps {
  state: PanelState;
  busy: boolean;
  apiError: string | null;
  onToggle: (flag: (typeof FLAG_META)[number]["key"], value: boolean) => void;
  onMaster: (action: Exclude<FlagAction, "toggle">) => void;
  onRefresh: () => void;
  onLock: () => void;
}

function Panel({ state, busy, apiError, onToggle, onMaster, onRefresh, onLock }: PanelProps) {
  const usable = state.configured && !state.error;
  const disabled = !usable || busy;
  // aria-disabled (not `disabled`) so keyboard focus stays on the pressed button while busy.
  const soft = (off: boolean, fn: () => void) => ({
    "aria-disabled": off ? true : undefined,
    onClick: () => {
      if (!off) fn();
    },
  });
  return (
    <>
      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        {usable ? (
          <p data-testid="store-status" className="flex gap-2 text-base text-ink">
            <span aria-hidden="true" className="mt-2 size-2.5 shrink-0 rounded-full bg-success" />
            <span>
              Global store: {state.store} (connected)
            </span>
          </p>
        ) : (
          <p
            data-testid="store-status"
            role="status"
            className="flex max-w-prose gap-2 rounded-md border border-line-strong bg-warning-soft p-4 text-base text-warning"
          >
            <AlertCircleIcon size={20} className="mt-0.5 shrink-0" />
            <span>
              {state.configured
                ? "Global store not reachable: toggles disabled. Visitors use env defaults and ?friction= overrides."
                : "Global store not configured: toggles disabled. Visitors use env defaults and ?friction= overrides."}
            </span>
          </p>
        )}
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" {...soft(busy, onRefresh)} data-testid="btn-refresh">
            Refresh
          </Button>
          <Button variant="secondary" size="sm" onClick={onLock} data-testid="btn-lock">
            <LockIcon size={16} /> Lock
          </Button>
        </div>
      </div>

      <p className="mt-4 text-base text-ink-2">
        Current profile:{" "}
        <strong className="font-semibold text-ink" data-testid="friction-profile" data-profile={state.profile}>
          {state.profile}
        </strong>
        <span className="block text-sm text-muted" data-testid="friction-phase">
          {PROFILE[state.profile]}
        </span>
      </p>

      {apiError ? (
        <p data-testid="panel-error" role="alert" className="mt-4 flex gap-2 text-base text-error">
          <AlertCircleIcon size={20} className="mt-0.5 shrink-0" />
          <span>{apiError}</span>
        </p>
      ) : null}

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Button {...soft(disabled, () => onMaster("all_on"))} data-testid="btn-all-on">
          All friction ON
        </Button>
        <Button variant="secondary" {...soft(disabled, () => onMaster("all_off"))} data-testid="btn-all-off">
          All friction OFF
        </Button>
        <Button
          variant="secondary"
          {...soft(disabled, () => onMaster("only_fix_errors"))}
          data-testid="btn-only-fix-errors"
        >
          Only fix errors
        </Button>
      </div>

      <ul className="mt-6 divide-y divide-line border-y border-line" aria-label="Friction flags">
        {FLAG_META.map((meta) => (
          <FlagRow
            key={meta.key}
            meta={meta}
            value={state.effective[meta.key].value}
            source={state.effective[meta.key].source}
            updatedAt={state.payload.updatedAt[meta.key]}
            disabled={disabled}
            onToggle={(next) => onToggle(meta.key, next)}
          />
        ))}
      </ul>

      <History entries={state.payload.flagHistory} />
    </>
  );
}
