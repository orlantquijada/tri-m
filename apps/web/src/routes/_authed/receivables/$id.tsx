import { createFileRoute, useParams } from "@tanstack/react-router";

import { useReceivableQuery } from "@/features/receivables/queries";
import { ReceivableDetail } from "@/features/receivables/receivable-detail";

function ReceivableDetailPage() {
  const { id } = useParams({ from: "/_authed/receivables/$id" });
  const { data, error, isLoading } = useReceivableQuery(Number(id));

  if (isLoading) {
    return <p className="p-6 text-muted-foreground">Loading…</p>;
  }
  if (error || !data) {
    return <p className="p-6 text-destructive">Failed to load receivable.</p>;
  }

  return <ReceivableDetail receivable={data} />;
}

export const Route = createFileRoute("/_authed/receivables/$id")({
  component: ReceivableDetailPage,
});
