interface SwitchProps {
  checked: boolean;
  disabled?: boolean;
  labelledBy: string;
  describedBy?: string;
  testId: string;
  onChange: (next: boolean) => void;
}

/** Large ON/OFF switch (role="switch"). Uses aria-disabled (not disabled) so keyboard focus survives a busy state. State is also written as text in the row, never colour only. */
export function Switch({ checked, disabled, labelledBy, describedBy, testId, onChange }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      data-testid={testId}
      aria-disabled={disabled ? true : undefined}
      onClick={() => {
        if (!disabled) onChange(!checked);
      }}
      className="relative inline-flex h-11 w-20 shrink-0 items-center rounded-full border border-line-strong bg-line-strong transition-colors duration-150 aria-checked:border-accent aria-checked:bg-accent aria-disabled:cursor-not-allowed aria-disabled:opacity-60"
    >
      <span
        aria-hidden="true"
        className={`ml-1 size-8 rounded-full bg-surface shadow-sm motion-safe:transition-transform motion-safe:duration-150 ${
          checked ? "translate-x-9" : "translate-x-0"
        }`}
      />
    </button>
  );
}
