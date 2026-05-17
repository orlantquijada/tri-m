import { Link } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPeso } from "@/lib/format";

import { distributorQueries } from "./queries";

export function DistributorList() {
  const { data, error, isLoading } = distributorQueries.useList();

  if (isLoading) {
    return <p className="p-4 text-muted-foreground">Loading...</p>;
  }
  if (error) {
    return <p className="p-4 text-destructive">Failed to load distributors.</p>;
  }
  if (!data?.length) {
    return <p className="p-4 text-muted-foreground">No distributors found.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead>Area</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Customers</TableHead>
          <TableHead className="text-right">Outstanding</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((d) => (
          <TableRow key={d.id}>
            <TableCell className="font-medium">{d.name}</TableCell>
            <TableCell>{d.phone}</TableCell>
            <TableCell>{d.assignedArea ?? "—"}</TableCell>
            <TableCell>
              <Badge variant={d.status === "active" ? "default" : "secondary"}>
                {d.status}
              </Badge>
            </TableCell>
            <TableCell className="text-right">{d.customerCount}</TableCell>
            <TableCell className="text-right font-mono">
              {formatPeso(d.outstandingCents)}
            </TableCell>
            <TableCell>
              <Link
                to="/distributors/$id/edit"
                params={{ id: String(d.id) }}
                className={buttonVariants({ size: "sm", variant: "ghost" })}
              >
                Edit
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
