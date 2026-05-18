import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

import { createRouter } from "../lib/factory";
import { requireSession } from "../middleware/auth";
import { reverseGeocode } from "../services/geocode";

const reverseQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

export const geocode = createRouter().get(
  "/reverse",
  requireSession,
  zValidator("query", reverseQuerySchema),
  async (c) => {
    const { lat, lng } = c.req.valid("query");
    const result = await reverseGeocode(lat, lng);
    return c.json({ data: result });
  }
);
