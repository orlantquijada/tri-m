import { Link } from "@tanstack/react-router";
import type { InferResponseType } from "hono/client";

import { ResponsiveTable } from "@/components/responsive-table";
import type { ResponsiveColumn } from "@/components/responsive-table";
import { Button, buttonVariants } from "@/components/ui/button";
import type { api } from "@/lib/api";
import { formatPeso, mapsUrl } from "@/lib/format";
import { cn } from "@/lib/utils";

import { RecordVisitDialog } from "../visits/record-visit-dialog";

export type OverdueRow = InferResponseType<
  typeof api.api.overdue.$get,
  200
>["rows"][number];

const columns: ResponsiveColumn<OverdueRow>[] = [
  {
    cell: (row) => (
      <Link
        className="underline-offset-4 hover:underline"
        params={{ id: String(row.customerId) }}
        to="/customers/$id"
      >
        {row.customerName}
      </Link>
    ),
    className: "font-medium",
    header: "Customer",
    key: "customer",
    mobilePrimary: true,
  },
  {
    cell: (row) => row.phone,
    header: "Phone",
    key: "phone",
    mobileLabel: "Phone",
  },
  {
    cell: (row) => row.address,
    className: "max-w-40 truncate",
    header: "Address",
    key: "address",
    mobileLabel: "Address",
  },
  {
    cell: (row) => row.distributorName,
    header: "Distributor",
    key: "distributor",
    mobileLabel: "Distributor",
  },
  {
    cell: (row) => row.productDescription,
    className: "max-w-40 truncate",
    header: "Product",
    key: "product",
    mobileLabel: "Product",
  },
  {
    cell: (row) => formatPeso(row.totalAmountCents),
    className: "text-right font-mono",
    header: "Total",
    headerClassName: "text-right",
    key: "total",
    mobileHidden: true,
  },
  {
    cell: (row) => formatPeso(row.currentBalanceCents),
    className: "text-right font-mono font-semibold text-destructive",
    header: "Balance",
    headerClassName: "text-right",
    key: "balance",
    mobileLabel: "Balance",
  },
  {
    cell: (row) => row.firstDueDate,
    header: "First Due",
    key: "firstDue",
    mobileHidden: true,
  },
  {
    cell: (row) => (
      <span className="font-semibold text-destructive">{row.daysOverdue}d</span>
    ),
    className: "text-right font-semibold text-destructive",
    header: "Days Overdue",
    headerClassName: "text-right",
    key: "daysOverdue",
    mobileLabel: "Days overdue",
  },
  {
    cell: (row) =>
      row.latitude !== null && row.longitude !== null ? (
        <a
          className="text-sm underline-offset-4 hover:underline"
          href={mapsUrl(row.latitude, row.longitude)}
          rel="noreferrer"
          target="_blank"
        >
          Open
        </a>
      ) : (
        <span className="text-sm text-muted-foreground">—</span>
      ),
    header: "Map",
    key: "map",
    mobileHidden: true,
  },
];

export function OverdueTable({ rows }: { rows: OverdueRow[] }) {
  return (
    <ResponsiveTable
      columns={columns}
      data={rows}
      keyExtractor={(r) => r.id}
      emptyMessage="No overdue accounts found."
      mobileFooter={(row) => (
        <div className="flex flex-wrap gap-2 pt-1">
          {row.latitude !== null && row.longitude !== null ? (
            <a
              className={cn(
                buttonVariants({ size: "sm", variant: "outline" }),
                "min-h-11"
              )}
              href={mapsUrl(row.latitude, row.longitude)}
              rel="noreferrer"
              target="_blank"
            >
              Map
            </a>
          ) : null}
          <RecordVisitDialog
            customerId={row.customerId}
            trigger={
              <Button size="sm" variant="outline" className="min-h-11">
                Visit
              </Button>
            }
          />
        </div>
      )}
    />
  );
}
