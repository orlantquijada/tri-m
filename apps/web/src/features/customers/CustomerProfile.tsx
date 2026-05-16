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
import { cn } from "@/lib/utils";

import { formatPeso } from "./format";
import { RiskBadge } from "./RiskBadge";

const statusVariant = {
  current: "outline",
  fully_paid: "secondary",
  overdue: "destructive",
} as const;

type Receivable = {
  currentBalanceCents: number;
  firstDueDate: string;
  id: number;
  originalBalanceCents: number;
  productDescription: string;
  saleDate: string;
  status: "current" | "fully_paid" | "overdue";
};

type Customer = {
  address: string;
  distributorId: number;
  fullName: string;
  id: number;
  latitude: number | null;
  longitude: number | null;
  notes: string | null;
  phone: string;
  receivables: Receivable[];
  riskStatus: "blacklisted" | "good" | "watchlist";
};

export function CustomerProfile({ customer }: { customer: Customer }) {
  const mapsUrl =
    customer.latitude != null && customer.longitude != null
      ? `https://www.google.com/maps?q=${customer.latitude},${customer.longitude}`
      : null;

  return (
    <div className="container mx-auto space-y-8 p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">{customer.fullName}</h1>
          <RiskBadge riskStatus={customer.riskStatus} />
        </div>
        <div className="flex gap-2">
          <Link
            className={cn(buttonVariants({ variant: "outline" }))}
            params={{ id: String(customer.id) }}
            to="/customers/$id/edit"
          >
            Edit
          </Link>
          <a
            className={cn(buttonVariants())}
            href={`/receivables/new?customerId=${customer.id}`}
          >
            Add Receivable
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 rounded-lg border p-4 sm:grid-cols-2">
        <div>
          <p className="text-sm text-muted-foreground">Phone</p>
          <p className="font-medium">{customer.phone}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Address</p>
          <p className="font-medium">{customer.address}</p>
        </div>
        {customer.notes && (
          <div className="sm:col-span-2">
            <p className="text-sm text-muted-foreground">Notes</p>
            <p className="font-medium">{customer.notes}</p>
          </div>
        )}
        <div>
          <p className="text-sm text-muted-foreground">Location</p>
          {mapsUrl ? (
            <a
              className="font-medium text-blue-600 underline-offset-4 hover:underline"
              href={mapsUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              Open in Google Maps
            </a>
          ) : (
            <p className="text-muted-foreground">No location set</p>
          )}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Receivables</h2>
        {customer.receivables.length === 0 ? (
          <p className="text-muted-foreground">No receivables yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Sale Date</TableHead>
                <TableHead className="text-right">Original</TableHead>
                <TableHead className="text-right">Current Balance</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customer.receivables.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">
                    <a
                      className="underline-offset-4 hover:underline"
                      href={`/receivables/${r.id}`}
                    >
                      {r.productDescription}
                    </a>
                  </TableCell>
                  <TableCell>{r.saleDate}</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatPeso(r.originalBalanceCents)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatPeso(r.currentBalanceCents)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[r.status]}>{r.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
