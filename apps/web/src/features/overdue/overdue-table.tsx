import { Link } from "@tanstack/react-router";
import type { InferResponseType } from "hono/client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { api } from "@/lib/api";
import { formatPeso, mapsUrl } from "@/lib/format";

export type OverdueRow = InferResponseType<
  typeof api.api.overdue.$get,
  200
>[number];

export function OverdueTable({ rows }: { rows: OverdueRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="p-4 text-muted-foreground">No overdue accounts found.</p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Customer</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead>Address</TableHead>
          <TableHead>Distributor</TableHead>
          <TableHead>Product</TableHead>
          <TableHead className="text-right">Total</TableHead>
          <TableHead className="text-right">Balance</TableHead>
          <TableHead>First Due</TableHead>
          <TableHead className="text-right">Days Overdue</TableHead>
          <TableHead>Map</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="font-medium">
              <Link
                className="underline-offset-4 hover:underline"
                params={{ id: String(row.customerId) }}
                to="/customers/$id"
              >
                {row.customerName}
              </Link>
            </TableCell>
            <TableCell>{row.phone}</TableCell>
            <TableCell className="max-w-40 truncate">{row.address}</TableCell>
            <TableCell>{row.distributorName}</TableCell>
            <TableCell className="max-w-40 truncate">
              {row.productDescription}
            </TableCell>
            <TableCell className="text-right font-mono">
              {formatPeso(row.totalAmountCents)}
            </TableCell>
            <TableCell className="text-right font-mono font-semibold text-destructive">
              {formatPeso(row.currentBalanceCents)}
            </TableCell>
            <TableCell>{row.firstDueDate}</TableCell>
            <TableCell className="text-right font-semibold text-destructive">
              {row.daysOverdue}d
            </TableCell>
            <TableCell>
              {row.latitude !== null && row.longitude !== null ? (
                <a
                  className="underline-offset-4 hover:underline text-sm"
                  href={mapsUrl(row.latitude, row.longitude)}
                  rel="noreferrer"
                  target="_blank"
                >
                  Open
                </a>
              ) : (
                <span className="text-muted-foreground text-sm">—</span>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
