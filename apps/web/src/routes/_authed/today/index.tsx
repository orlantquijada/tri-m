import { createFileRoute, redirect } from "@tanstack/react-router";

import { TodayView } from "@/features/today/today-view";
import { features } from "@/lib/features";

export const Route = createFileRoute("/_authed/today/")({
  beforeLoad: () => {
    if (!features.today) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: TodayView,
});
