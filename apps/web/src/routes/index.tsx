import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";

import { authClient, defaultRouteForRole } from "@/lib/auth-client";

function IndexRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const { data } = await authClient.getSession();
        if (cancelled) {
          return;
        }
        if (!data?.session) {
          void navigate({ replace: true, to: "/login" });
          return;
        }
        const role = (data.user as { role?: string } | undefined)?.role;
        void navigate({ replace: true, to: defaultRouteForRole(role) });
      } catch {
        if (!cancelled) {
          void navigate({ replace: true, to: "/login" });
        }
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="flex min-h-svh items-center justify-center">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}

export const Route = createFileRoute("/")({
  component: IndexRedirect,
});
