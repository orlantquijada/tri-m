const pesoFormatter = new Intl.NumberFormat("en-PH", {
  currency: "PHP",
  style: "currency",
});

export function formatPeso(cents: number) {
  return pesoFormatter.format(cents / 100);
}

export function formatPesoOrDash(cents: number | null): string {
  return cents === null ? "—" : pesoFormatter.format(cents / 100);
}

export function parsePeso(value: string): number {
  const n = Number.parseFloat(value);
  return Number.isNaN(n) ? 0 : Math.round(n * 100);
}

export function parsePesoOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const n = Number.parseFloat(trimmed);
  if (Number.isNaN(n) || n < 0) {
    return null;
  }
  return Math.round(n * 100);
}

export function centsToPesoInput(cents: number | null): string {
  return cents === null ? "" : (cents / 100).toFixed(2);
}

export function formatDateTime(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleString();
}

export function mapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

export function parseFloatOrNull(value: string): number | null {
  if (!value) {
    return null;
  }
  const n = Number.parseFloat(value);
  return Number.isNaN(n) ? null : n;
}
