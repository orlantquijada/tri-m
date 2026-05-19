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

export function mapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

export function mapHref(lat: number, lng: number, isMobile: boolean): string {
  return isMobile ? `geo:${lat},${lng}?q=${lat},${lng}` : mapsUrl(lat, lng);
}

export function parseFloatOrNull(value: string): number | null {
  if (!value) {
    return null;
  }
  const n = Number.parseFloat(value);
  return Number.isNaN(n) ? null : n;
}
