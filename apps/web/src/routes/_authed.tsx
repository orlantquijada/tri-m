import {
  Outlet,
  createFileRoute,
  redirect,
  useNavigate,
} from "@tanstack/react-router";
import { useEffect } from "react";

import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/_authed")({
  beforeLoad: async () => {
    if (typeof window === "undefined") {
      return;
    }
    const { data } = await authClient.getSession();
    if (!data?.session) {
      throw redirect({ to: "/login" });
    }
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const navigate = useNavigate();

  useEffect(() => {
    void authClient.getSession().then(({ data }) => {
      if (!data?.session) {
        void navigate({ to: "/login" });
      }
    });
  }, [navigate]);

  return <Outlet />;
}
