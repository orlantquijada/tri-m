import { z } from "zod";

export const reverseGeocodeAddressSchema = z.object({
  city: z.string().nullable(),
  country: z.string().nullable(),
  region: z.string().nullable(),
  road: z.string().nullable(),
});

export const reverseGeocodeResultSchema = z.object({
  address: reverseGeocodeAddressSchema,
  displayName: z.string(),
});

export type ReverseGeocodeAddress = z.infer<typeof reverseGeocodeAddressSchema>;
export type ReverseGeocodeResult = z.infer<typeof reverseGeocodeResultSchema>;
