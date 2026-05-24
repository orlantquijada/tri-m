import { createFileRoute } from "@tanstack/react-router";

import { ChartAreaInteractive } from "@/features/dashboard/chart-area-interactive";
import { DashboardCards } from "@/features/dashboard/dashboard-cards";
import {
  useAgingBucketsQuery,
  useDashboardTotalsQuery,
} from "@/features/dashboard/queries";

function DashboardPage() {
  const { data, error, isLoading } = useDashboardTotalsQuery();
  const { data: aging } = useAgingBucketsQuery();

  return (
    <div className="flex flex-col gap-6">
      {isLoading && <p className="text-muted-foreground">Loading...</p>}
      {error && <p className="text-destructive">Failed to load totals.</p>}
      {data && <DashboardCards aging={aging} totals={data} />}
      {data && <ChartAreaInteractive />}
    </div>
  );
}

export const Route = createFileRoute("/_authed/dashboard")({
  component: DashboardPage,
});
