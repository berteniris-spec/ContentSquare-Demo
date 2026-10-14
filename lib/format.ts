const eur = new Intl.NumberFormat("en-IE", {
  style: "currency",
  currency: "EUR",
});

/** Always two decimals, e.g. "€129.00", "€6.95". */
export function formatPrice(amount: number): string {
  return eur.format(amount);
}

export function pluralise(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
