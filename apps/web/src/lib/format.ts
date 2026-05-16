const pesoFormatter = new Intl.NumberFormat("en-PH", {
  currency: "PHP",
  style: "currency",
});

export function formatPeso(cents: number) {
  return pesoFormatter.format(cents / 100);
}
