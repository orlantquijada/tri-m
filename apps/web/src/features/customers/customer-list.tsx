import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { useCustomersQuery } from "./queries";

function formatPeso(cents: number) {
  return new Intl.NumberFormat("en-PH", {
    currency: "PHP",
    style: "currency",
  }).format(cents / 100);
}

const riskVariant = {
  blacklisted: "destructive",
  good: "outline",
  watchlist: "secondary",
} as const;

export function CustomerList() {
  const { data, error, isLoading } = useCustomersQuery();

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
            <TableCell className="font-medium">{customer.fullName}</TableCell>
            <TableCell>{customer.phone}</TableCell>
            <TableCell className="max-w-[200px] truncate">
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
