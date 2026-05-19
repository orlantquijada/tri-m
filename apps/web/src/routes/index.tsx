import { createFileRoute, redirect } from "@tanstack/react-router";

import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    if (typeof window === "undefined") {
      return;
    }
    const { data } = await authClient.getSession();
    if (!data?.session) {
      throw redirect({ to: "/login" });
    }
    const role = (data.user as { role?: string } | undefined)?.role;
    throw redirect({ to: role === "distributor" ? "/today" : "/dashboard" });
  },
});
