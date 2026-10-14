"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { FieldError, inputClasses, labelClasses } from "@/components/ui/Field";
import { CheckIcon } from "@/components/ui/icons";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function NewsletterSignup() {
  const id = useId();
  const inputId = `${id}-email`;
  const errorId = `${id}-error`;
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = email.trim();
    if (!value) return setError("Enter your email address");
    if (!EMAIL_RE.test(value)) return setError("Enter an email address like name@example.com");
    setError(null);
    setDone(true); // Demo: no network request.
  }

  return (
    <section aria-labelledby="newsletter-heading" className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 md:py-20 lg:px-8">
      <div className="md:grid md:grid-cols-2 md:items-end md:gap-12">
        <div>
          <h2 id="newsletter-heading" className="text-2xl font-semibold tracking-tight">
            Letters from the trail
          </h2>
          <p className="mt-2 text-base text-ink-2">New colours, repair stories and the odd route idea. One email a month.</p>
        </div>
        <div className="mt-6 md:mt-0">
          {done ? (
            <p data-testid="newsletter-thanks" role="status" className="flex items-center gap-2 text-sm text-success">
              <CheckIcon size={18} />
              Thanks for signing up!
            </p>
          ) : (
            <form noValidate onSubmit={onSubmit}>
              <label htmlFor={inputId} className={labelClasses}>
                Email address
              </label>
              <div className="mt-1.5 flex flex-col gap-2 min-[360px]:flex-row">
                <input
                  id={inputId}
                  type="email"
                  name="email"
                  autoComplete="email"
                  data-testid="newsletter-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? errorId : undefined}
                  className={`${inputClasses} flex-1`}
                />
                <Button type="submit" data-testid="newsletter-submit">
                  Sign up
                </Button>
              </div>
              {error && (
                <FieldError id={errorId} testId="newsletter-error">
                  {error}
                </FieldError>
              )}
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
