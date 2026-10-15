/** Playwright storageState that seeds analytics consent (tw-consent=accepted) for one origin. */
export function consentState(baseURL: string) {
  return {
    cookies: [],
    origins: [{ origin: new URL(baseURL).origin, localStorage: [{ name: "tw-consent", value: "accepted" }] }],
  };
}
