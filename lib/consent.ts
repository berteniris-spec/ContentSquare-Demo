"use client";

// Cookie consent state. Stored in localStorage (`tw-consent`) and shared through a custom event so
// every subscriber reacts without a reload. Tracking helpers read getConsent() directly.
import { useSyncExternalStore } from "react";

export const CONSENT_KEY = "tw-consent";
const EVENT = "tw-consent-change";

export type Consent = "accepted" | "declined";
/** `unknown` = server render, or nothing chosen yet. */
export type ConsentState = Consent | "unknown";

export function getConsent(): ConsentState {
  if (typeof window === "undefined") return "unknown";
  try {
    const v = window.localStorage.getItem(CONSENT_KEY);
    return v === "accepted" || v === "declined" ? v : "unknown";
  } catch {
    return "unknown";
  }
}

export function hasConsent(): boolean {
  return getConsent() === "accepted";
}

export function setConsent(value: Consent): void {
  try {
    window.localStorage.setItem(CONSENT_KEY, value);
  } catch {
    // Storage blocked: the choice only lives for this page (state below stays unknown, banner reappears).
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** Reactive consent. `ready` is false until hydrated, so the banner never flashes for returning visitors. */
export function useConsent(): { consent: ConsentState; ready: boolean } {
  const consent = useSyncExternalStore(subscribe, getConsent, () => "unknown" as ConsentState);
  const ready = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  return { consent, ready };
}
