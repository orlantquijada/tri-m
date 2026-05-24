import type { InferResponseType } from "hono/client";
import {
  AlertTriangleIcon,
  BanknoteIcon,
  ClockIcon,
  WalletIcon,
} from "lucide-react";

import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AgingBuckets } from "@/features/overdue/aging-buckets";
import type { api } from "@/lib/api";
import { formatPeso } from "@/lib/format";

type Totals = InferResponseType<typeof api.api.dashboard.totals.$get, 200>;
type Aging = InferResponseType<typeof api.api.dashboard.aging.$get, 200>;

type CardSpec = {
  caption: string;
  icon: React.ReactNode;
  label: string;
  subCaption: string;
  value: string;
};

export function DashboardCards({
  aging,
  totals,
}: {
  aging?: Aging;
  totals: Totals;
}) {
  const cards: CardSpec[] = [
    {
      caption: "Total billed",
      icon: <WalletIcon className="size-4" />,
      label: "Total Receivables",
      subCaption: "Across all active receivables",
      value: formatPeso(totals.totalReceivablesCents),
    },
    {
      caption: "Cleared by payments",
      icon: <BanknoteIcon className="size-4" />,
      label: "Total Collected",
      subCaption: "Lifetime cash + transfers",
      value: formatPeso(totals.totalCollectedCents),
    },
    {
      caption: "Awaiting collection",
      icon: <ClockIcon className="size-4" />,
      label: "Outstanding Balance",
      subCaption: "Open invoices not yet paid",
      value: formatPeso(totals.outstandingCents),
    },
    {
      caption: "Past due — follow up",
      icon: <AlertTriangleIcon className="size-4" />,
      label: "Overdue Amount",
      subCaption: "Beyond first due date",
      value: formatPeso(totals.overdueCents),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ caption, icon, label, subCaption, value }) => (
          <Card key={label}>
            <CardHeader>
              <CardDescription>{label}</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                {value}
              </CardTitle>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1.5 text-sm">
              <div className="flex items-center gap-2 font-medium">
                {icon}
                {caption}
              </div>
              <div className="text-muted-foreground">{subCaption}</div>
            </CardFooter>
          </Card>
        ))}
      </div>
      {aging && (
        <div>
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            Aging Breakdown
          </h2>
          <AgingBuckets aging={aging} />
        </div>
      )}
    </div>
  );
}
