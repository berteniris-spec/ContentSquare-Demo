export {};

declare global {
  interface Window {
    /** Contentsquare command queue. */
    _uxa?: unknown[][];
    /** Set once the Contentsquare tag script has loaded. */
    __csLoaded?: boolean;
    /** GA4-style data layer. */
    dataLayer?: Record<string, unknown>[];
  }
}
