import { createFileRoute, redirect } from "@tanstack/react-router";

import { requireSession } from "@/lib/auth-client";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    if (typeof window === "undefined") {
      return;
    }
    const data = await requireSession();
    const role = (data.user as { role?: string } | undefined)?.role;
    throw redirect({ to: role === "distributor" ? "/today" : "/dashboard" });
  },
});
