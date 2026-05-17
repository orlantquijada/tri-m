import { Link } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPeso } from "@/lib/format";

import { customerQueries } from "./queries";
import { riskVariant } from "./risk-badge";

export function CustomerList() {
  const { data, error, isLoading } = customerQueries.useList();

  if (isLoading) {
    return <p className="p-4 text-muted-foreground">Loading...</p>;
  }
  if (error) {
    return <p className="p-4 text-destructive">Failed to load customers.</p>;
  }
  if (!data?.length) {
    return <p className="p-4 text-muted-foreground">No customers found.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead>Address</TableHead>
          <TableHead>Risk</TableHead>
          <TableHead className="text-right">Outstanding</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((customer) => (
          <TableRow key={customer.id}>
            <TableCell className="font-medium">
              <Link
                className="underline-offset-4 hover:underline"
                params={{ id: String(customer.id) }}
                to="/customers/$id"
              >
                {customer.fullName}
              </Link>
            </TableCell>
            <TableCell>{customer.phone}</TableCell>
            <TableCell className="max-w-50 truncate">
              {customer.address}
            </TableCell>
            <TableCell>
              <Badge variant={riskVariant[customer.riskStatus]}>
                {customer.riskStatus}
              </Badge>
            </TableCell>
            <TableCell className="text-right font-mono">
              {formatPeso(customer.outstandingBalanceCents)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
