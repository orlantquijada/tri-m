import {
  AlertCircleIcon,
  BuildingIcon,
  LayoutDashboardIcon,
  MapIcon,
  Package2Icon,
  UserCogIcon,
  UsersIcon,
} from "lucide-react";
import * as React from "react";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";

const baseNavItems = [
  { icon: <LayoutDashboardIcon />, title: "Dashboard", url: "/dashboard" },
  { icon: <UsersIcon />, title: "Customers", url: "/customers" },
  { icon: <MapIcon />, title: "Map", url: "/map" },
  { icon: <AlertCircleIcon />, title: "Overdue", url: "/overdue" },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: session } = authClient.useSession();

  const isAdmin =
    (session?.user as Record<string, unknown> | undefined)?.role === "admin";

  const navItems = isAdmin
    ? [
        ...baseNavItems,
        {
          icon: <BuildingIcon />,
          title: "Distributors",
          url: "/distributors",
        },
        {
          icon: <UserCogIcon />,
          title: "Users",
          url: "/users",
        },
      ]
    : baseNavItems;

  const user = {
    avatar: session?.user.image ?? "",
    email: session?.user.email ?? "",
    name: session?.user.name ?? "",
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="pointer-events-none select-none"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <Package2Icon className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">Tri-M</span>
                <span className="truncate text-xs text-muted-foreground">
                  Receivables
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
