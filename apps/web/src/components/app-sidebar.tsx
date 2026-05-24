import {
  AlertCircleIcon,
  BarChart2Icon,
  BoxIcon,
  BuildingIcon,
  ClipboardListIcon,
  HistoryIcon,
  LayoutDashboardIcon,
  MapIcon,
  Package2Icon,
  RouteIcon,
  SunIcon,
  UserCogIcon,
  UsersIcon,
} from "lucide-react";
import * as React from "react";

import { NavMain } from "@/components/nav-main";
import type { NavGroup } from "@/components/nav-main";
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
import { features } from "@/lib/features";

const workspaceGroup: NavGroup = {
  items: [
    ...(features.today
      ? [{ icon: <SunIcon />, title: "Today", url: "/today" as const }]
      : []),
    { icon: <LayoutDashboardIcon />, title: "Dashboard", url: "/dashboard" },
    { icon: <UsersIcon />, title: "Customers", url: "/customers" },
    { icon: <MapIcon />, title: "Map", url: "/map" },
  ],
  label: "Workspace",
};

const collectionsGroup: NavGroup = {
  items: [
    { icon: <AlertCircleIcon />, title: "Overdue", url: "/overdue" },
    ...(features.collectionRoutes
      ? [
          {
            icon: <RouteIcon />,
            title: "Collection Route",
            url: "/collection-routes" as const,
          },
        ]
      : []),
    ...(features.visits
      ? [
          {
            icon: <ClipboardListIcon />,
            title: "Visits",
            url: "/visits" as const,
          },
        ]
      : []),
  ],
  label: "Collections",
};

const inventoryGroup: NavGroup = {
  items: [{ icon: <BoxIcon />, title: "Products", url: "/products" }],
  label: "Inventory",
};

const adminGroup: NavGroup = {
  items: [
    { icon: <BuildingIcon />, title: "Distributors", url: "/distributors" },
    { icon: <UserCogIcon />, title: "Users", url: "/users" },
    ...(features.audit
      ? [
          {
            icon: <HistoryIcon />,
            title: "Audit Log",
            url: "/audit" as const,
          },
        ]
      : []),
    ...(features.reports
      ? [
          {
            icon: <BarChart2Icon />,
            title: "Reports",
            url: "/reports" as const,
          },
        ]
      : []),
  ],
  label: "Admin",
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: session } = authClient.useSession();

  const isAdmin =
    (session?.user as Record<string, unknown> | undefined)?.role === "admin";

  const groups: NavGroup[] = isAdmin
    ? [workspaceGroup, collectionsGroup, inventoryGroup, adminGroup]
    : [workspaceGroup, collectionsGroup, inventoryGroup];

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
        <NavMain groups={groups} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
