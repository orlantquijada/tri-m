import { Link } from "@tanstack/react-router";

import { ResponsiveTable } from "@/components/responsive-table";
import type { ResponsiveColumn } from "@/components/responsive-table";
import { Badge } from "@/components/ui/badge";
import { QuickActionsBar } from "@/features/shared/quick-actions-bar";
import { features } from "@/lib/features";
import { formatPeso } from "@/lib/format";

import { customerQueries } from "./queries";
import type { CustomerListItem } from "./queries";
import { riskVariant } from "./risk-badge";

const baseColumns: ResponsiveColumn<CustomerListItem>[] = [
  {
    cell: (c) => (
      <Link
        className="underline-offset-4 hover:underline"
        params={{ id: c.id }}
        to="/customers/$id"
      >
        {c.fullName}
      </Link>
    ),
    className: "font-medium",
    header: "Name",
    key: "name",
    mobilePrimary: true,
  },
  {
    cell: (c) => c.phone,
    header: "Phone",
    key: "phone",
    mobileLabel: "Phone",
  },
  {
    cell: (c) => c.address,
    className: "max-w-50 truncate",
    header: "Address",
    key: "address",
    mobileLabel: "Address",
  },
  {
    cell: (c) => (
      <Badge variant={riskVariant[c.riskStatus]}>{c.riskStatus}</Badge>
    ),
    header: "Risk",
    key: "risk",
    mobileLabel: "Risk",
  },
  {
    cell: (c) => formatPeso(c.outstandingBalanceCents),
    className: "text-right font-mono",
    header: "Outstanding",
    headerClassName: "text-right",
    key: "outstanding",
    mobileLabel: "Outstanding",
  },
];

const quickActionsColumn: ResponsiveColumn<CustomerListItem> = {
  cell: (c) => (
    <QuickActionsBar
      customerId={c.id}
      latitude={c.latitude}
      longitude={c.longitude}
      phone={c.phone}
    />
  ),
  header: "",
  key: "actions",
  mobileHidden: true,
};

const columns: ResponsiveColumn<CustomerListItem>[] = features.quickActions
  ? [...baseColumns, quickActionsColumn]
  : baseColumns;

export function CustomerList() {
  const { data, error, isLoading } = customerQueries.useList();

  if (isLoading) {
    return <p className="p-4 text-muted-foreground">Loading...</p>;
  }
  if (error) {
    return <p className="p-4 text-destructive">Failed to load customers.</p>;
  }

  return (
    <ResponsiveTable
      columns={columns}
      data={data ?? []}
      emptyMessage="No customers found."
      keyExtractor={(c) => c.id}
      mobileFooter={
        features.quickActions
          ? (c) => (
              <QuickActionsBar
                customerId={c.id}
                latitude={c.latitude}
                longitude={c.longitude}
                phone={c.phone}
              />
            )
          : undefined
      }
    />
  );
}
