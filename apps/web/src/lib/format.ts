const pesoFormatter = new Intl.NumberFormat("en-PH", {
  currency: "PHP",
  style: "currency",
});

export function formatPeso(cents: number) {
  return pesoFormatter.format(cents / 100);
}

export function parsePeso(value: string): number {
  const n = Number.parseFloat(value);
  return Number.isNaN(n) ? 0 : Math.round(n * 100);
}
