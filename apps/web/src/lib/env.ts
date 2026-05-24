import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  client: {
    VITE_API_URL: z.url(),
    VITE_DEMO_MODE: z
      .preprocess((v) => v === "true" || v === true, z.boolean())
      .optional(),
  },
  clientPrefix: "VITE_",
  runtimeEnv: import.meta.env,
});
