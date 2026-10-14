"use client";

import type { InputHTMLAttributes } from "react";
import { FieldError, inputClasses, labelClasses } from "@/components/ui/Field";

/** Label + input + optional hint + inline error, wired with aria-describedby / aria-invalid. */
export function TextField({
  name,
  label,
  error,
  hint,
  className = "",
  ...input
}: {
  name: string;
  label: string;
  error?: string | null;
  hint?: string;
  className?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "name" | "id">) {
  const id = `checkout-${name}`;
  const describedBy = [hint ? `hint-${name}` : null, error ? `error-${name}` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className={labelClasses}>
        {label}
      </label>
      <input
        id={id}
        name={name}
        data-testid={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`${inputClasses} mt-1.5`}
        {...input}
      />
      {hint && (
        <p id={`hint-${name}`} className="mt-1.5 text-sm text-muted">
          {hint}
        </p>
      )}
      {error && <FieldError id={`error-${name}`}>{error}</FieldError>}
    </div>
  );
}
