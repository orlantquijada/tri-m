import { Link, useLocation } from "@tanstack/react-router";
import {
  BoxIcon,
  ClipboardListIcon,
  MenuIcon,
  SunIcon,
  UsersIcon,
} from "lucide-react";
import type { ComponentType } from "react";

import { useSidebar } from "@/components/ui/sidebar";
import { features } from "@/lib/features";
import { cn } from "@/lib/utils";

type NavLink = {
  label: string;
  to: "/today" | "/customers" | "/visits" | "/products";
  icon: ComponentType<{ className?: string }>;
  matchPrefix: string;
};

const ALL_LINKS: NavLink[] = [
  { icon: SunIcon, label: "Today", matchPrefix: "/today", to: "/today" },
  {
    icon: UsersIcon,
    label: "Customers",
    matchPrefix: "/customers",
    to: "/customers",
  },
  {
    icon: ClipboardListIcon,
    label: "Visits",
    matchPrefix: "/visits",
    to: "/visits",
  },
  {
    icon: BoxIcon,
    label: "Products",
    matchPrefix: "/products",
    to: "/products",
  },
];

const LINKS = ALL_LINKS.filter((link) => {
  if (link.to === "/today") {
    return features.today;
  }
  if (link.to === "/visits") {
    return features.visits;
  }
  return true;
});

export function MobileBottomNav() {
  const { pathname } = useLocation();
  const { setOpenMobile } = useSidebar();

  if (!features.mobileBottomNav) {
    return null;
  }

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-stretch border-t bg-background pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {LINKS.map((link) => {
        const Icon = link.icon;
        const active = pathname.startsWith(link.matchPrefix);
        return (
          <Link
            key={link.to}
            to={link.to}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1 text-xs",
              active ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Icon className="size-5" />
            <span>{link.label}</span>
          </Link>
        );
      })}
      <button
        type="button"
        onClick={() => setOpenMobile(true)}
        className="flex min-h-11 flex-1 flex-col items-center justify-center gap-1 text-xs text-muted-foreground"
      >
        <MenuIcon className="size-5" />
        <span>Menu</span>
      </button>
    </nav>
  );
}
