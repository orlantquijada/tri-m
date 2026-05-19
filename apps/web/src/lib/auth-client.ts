import { redirect } from "@tanstack/react-router";
import { createAuthClient } from "better-auth/react";

import { env } from "./env";

export const authClient = createAuthClient({
  baseURL: env.VITE_API_URL,
  fetchOptions: {
    credentials: "include",
  },
});

type SessionData = NonNullable<
  Awaited<ReturnType<typeof authClient.getSession>>["data"]
>;

export async function requireSession(): Promise<SessionData> {
  let data: Awaited<ReturnType<typeof authClient.getSession>>["data"];
  try {
    ({ data } = await authClient.getSession());
  } catch {
    throw redirect({ to: "/login" });
  }
  if (!data?.session) {
    throw redirect({ to: "/login" });
  }
  return data;
}
