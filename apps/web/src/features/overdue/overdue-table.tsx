import { Link } from "@tanstack/react-router";
import type { InferResponseType } from "hono/client";

import { ResponsiveTable } from "@/components/responsive-table";
import type { ResponsiveColumn } from "@/components/responsive-table";
import { QuickActionsBar } from "@/features/shared/quick-actions-bar";
import type { api } from "@/lib/api";
import { formatPeso } from "@/lib/format";

export type OverdueRow = InferResponseType<
  typeof api.api.overdue.$get,
  200
>["rows"][number];

const columns: ResponsiveColumn<OverdueRow>[] = [
  {
    cell: (row) => (
      <Link
        className="underline-offset-4 hover:underline"
        params={{ id: row.customerId }}
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
    cell: (row) => (
      <QuickActionsBar
        currentBalanceCents={row.currentBalanceCents}
        customerId={row.customerId}
        latitude={row.latitude}
        layout="wrap"
        longitude={row.longitude}
        phone={row.phone}
        receivableId={row.id}
      />
    ),
    header: "",
    key: "actions",
    mobileHidden: true,
  },
];

export function OverdueTable({ rows }: { rows: OverdueRow[] }) {
  return (
    <ResponsiveTable
      columns={columns}
      data={rows}
      emptyMessage="No overdue accounts found."
      keyExtractor={(r) => r.id}
      mobileFooter={(row) => (
        <QuickActionsBar
          currentBalanceCents={row.currentBalanceCents}
          customerId={row.customerId}
          latitude={row.latitude}
          layout="row"
          longitude={row.longitude}
          phone={row.phone}
          receivableId={row.id}
        />
      )}
    />
  );
}
