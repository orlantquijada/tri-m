import { createFileRoute, redirect } from "@tanstack/react-router";

import { DistributorPerformance } from "@/features/reports/distributor-performance";
import { features } from "@/lib/features";

function ReportsPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Performance Report</h1>
        <p className="text-sm text-muted-foreground">
          Per-distributor collection aggregates. Set a date range to scope
          collected amounts.
        </p>
      </div>
      <DistributorPerformance />
    </div>
  );
}

export const Route = createFileRoute("/_authed/reports/")({
  beforeLoad: () => {
    if (!features.reports) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: ReportsPage,
});
