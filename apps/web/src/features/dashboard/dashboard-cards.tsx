import type { InferResponseType } from "hono/client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { api } from "@/lib/api";
import { formatPeso } from "@/lib/format";

type Totals = InferResponseType<typeof api.api.dashboard.totals.$get, 200>;

export function DashboardCards({ totals }: { totals: Totals }) {
  const cards = [
    {
      label: "Total Receivables",
      value: formatPeso(totals.totalReceivablesCents),
    },
    { label: "Total Collected", value: formatPeso(totals.totalCollectedCents) },
    {
      label: "Outstanding Balance",
      value: formatPeso(totals.outstandingCents),
    },
    { label: "Overdue Amount", value: formatPeso(totals.overdueCents) },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map(({ label, value }) => (
        <Card key={label}>
          <CardHeader>
            <CardTitle>{label}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-mono text-2xl font-bold">{value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
