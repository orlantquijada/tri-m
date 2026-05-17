import { createFileRoute } from "@tanstack/react-router";

import { DashboardCards } from "@/features/dashboard/dashboard-cards";
import { useDashboardTotalsQuery } from "@/features/dashboard/queries";

function DashboardPage() {
  const { data, error, isLoading } = useDashboardTotalsQuery();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Dashboard</h1>
      {isLoading && <p className="text-muted-foreground">Loading...</p>}
      {error && <p className="text-destructive">Failed to load totals.</p>}
      {data && <DashboardCards totals={data} />}
    </div>
  );
}

export const Route = createFileRoute("/_authed/dashboard")({
  component: DashboardPage,
});
