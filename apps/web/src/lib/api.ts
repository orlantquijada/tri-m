import type { AppType } from "api";
import { hc } from "hono/client";

import { env } from "./env";

export const api = hc<AppType>(env.VITE_API_URL, {
  init: { credentials: "include" },
});

export async function parseApiError(
  res: Response,
  fallback: string
): Promise<Error> {
  const body = await res.json().catch(() => ({}));
  return new Error((body as { error?: string }).error ?? fallback);
}
