import { reverseGeocodeResultSchema } from "schema";
import type { ReverseGeocodeResult } from "schema";
import { z } from "zod";

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";
const USER_AGENT = "tri-m-furniture-collections/1.0 (internal-tool)";
const ACCEPT_LANGUAGE = "en";
const REFILL_INTERVAL_MS = 1000;
const FETCH_TIMEOUT_MS = 5000;

let tokens = 1;
let lastRefill = Date.now();

function takeToken(): boolean {
  const now = Date.now();
  const elapsed = now - lastRefill;
  if (elapsed >= REFILL_INTERVAL_MS) {
    tokens = Math.min(1, tokens + Math.floor(elapsed / REFILL_INTERVAL_MS));
    lastRefill = now;
  }
  if (tokens <= 0) {
    return false;
  }
  tokens -= 1;
  return true;
}

const nominatimAddressSchema = z
  .object({
    city: z.string(),
    country: z.string(),
    municipality: z.string(),
    neighbourhood: z.string(),
    pedestrian: z.string(),
    province: z.string(),
    region: z.string(),
    road: z.string(),
    state: z.string(),
    suburb: z.string(),
    town: z.string(),
    village: z.string(),
  })
  .partial();

const nominatimResponseSchema = z.object({
  address: nominatimAddressSchema.optional(),
  display_name: z.string().min(1),
});

export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<ReverseGeocodeResult | null> {
  if (!takeToken()) {
    return null;
  }
  const url = new URL("/reverse", NOMINATIM_BASE);
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("zoom", "18");
  url.searchParams.set("addressdetails", "1");

  try {
    const res = await fetch(url, {
      headers: {
        "Accept-Language": ACCEPT_LANGUAGE,
        "User-Agent": USER_AGENT,
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) {
      return null;
    }
    const parsed = nominatimResponseSchema.safeParse(await res.json());
    if (!parsed.success) {
      return null;
    }
    const { address: addr = {}, display_name } = parsed.data;
    const projected = reverseGeocodeResultSchema.safeParse({
      address: {
        city:
          addr.city ??
          addr.town ??
          addr.village ??
          addr.municipality ??
          addr.suburb ??
          addr.neighbourhood ??
          null,
        country: addr.country ?? null,
        region: addr.region ?? addr.state ?? addr.province ?? null,
        road: addr.road ?? addr.pedestrian ?? null,
      },
      displayName: display_name,
    });
    return projected.success ? projected.data : null;
  } catch {
    return null;
  }
}
