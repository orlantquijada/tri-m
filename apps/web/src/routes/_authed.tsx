import { Outlet, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { AppSidebar } from "@/components/app-sidebar";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { authClient, requireSession } from "@/lib/auth-client";

function AuthedLayout() {
  const navigate = useNavigate();

  useEffect(() => {
    const check = async () => {
      try {
        const { data } = await authClient.getSession();
        if (!data?.session) {
          void navigate({ to: "/login" });
        }
      } catch {
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
          <Separator className="mr-2 h-4" orientation="vertical" />
        </header>
        <main className="flex flex-1 flex-col p-4 pb-20 md:pb-4">
          <Outlet />
        </main>
        <MobileBottomNav />
      </SidebarInset>
    </SidebarProvider>
  );
}

export const Route = createFileRoute("/_authed")({
  beforeLoad: async () => {
    if (typeof window === "undefined") {
      return;
    }
    await requireSession();
  },
  component: AuthedLayout,
});
