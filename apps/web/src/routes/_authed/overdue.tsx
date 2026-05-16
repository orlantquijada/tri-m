import { createFileRoute } from "@tanstack/react-router";

import { OverdueTable } from "@/features/overdue/overdue-table";
import { useOverdueQuery } from "@/features/overdue/queries";

function OverduePage() {
  const { data, error, isLoading } = useOverdueQuery();

  return (
    <main className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Overdue Accounts</h1>
        <p className="text-sm text-muted-foreground">
          Receivables with outstanding balance past their first due date.
        </p>
      </div>
      {isLoading && <p className="text-muted-foreground">Loading...</p>}
      {error && (
        <p className="text-destructive">Failed to load overdue accounts.</p>
      )}
      {data && <OverdueTable rows={data} />}
    </main>
  );
}

export const Route = createFileRoute("/_authed/overdue")({
  component: OverduePage,
});
