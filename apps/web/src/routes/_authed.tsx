import {
  Outlet,
  createFileRoute,
  redirect,
  useNavigate,
} from "@tanstack/react-router";
import { useEffect } from "react";

import { AppSidebar } from "@/components/app-sidebar";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";

const AuthedLayout = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const check = async () => {
      const { data } = await authClient.getSession();
      if (!data?.session) {
        void navigate({ to: "/login" });
      }
    };
    void check();
  }, [navigate]);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
        </header>
        <main className="flex flex-1 flex-col p-4">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
};

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
