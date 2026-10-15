export {};

declare global {
  interface Window {
    /** Contentsquare command queue. */
    _uxa?: unknown[][];
    /** Set once the Contentsquare tag script has loaded. */
    __csLoaded?: boolean;
    /**
     * Shared data layer. Holds plain `{ event, ... }` objects from track() and the `Arguments`
     * objects pushed by gtag(), so it is typed loosely.
     */
    dataLayer?: unknown[];
    /** Google Analytics command function (defined by ensureGtag()). */
    gtag?: (...args: unknown[]) => void;
    /** Set once ensureGtag() has queued the `js` and `config` commands. */
    __gaInit?: boolean;
  }
}
