import { Link } from "@tanstack/react-router";

import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPeso, mapsUrl } from "@/lib/format";
import { cn } from "@/lib/utils";

import { ReceivableStatusBadge } from "../receivables/receivable-status-badge";
import { RecordVisitDialog } from "../visits/record-visit-dialog";
import { VisitList } from "../visits/visit-list";
import { BlacklistRequestButton } from "./blacklist-request-button";
import type { CustomerWithReceivables } from "./queries";
import { RiskBadge } from "./risk-badge";

export function CustomerProfile({
  customer,
}: {
  customer: CustomerWithReceivables;
}) {
  const customerMapsUrl =
    customer.latitude !== null && customer.longitude !== null
      ? mapsUrl(customer.latitude, customer.longitude)
      : null;

  return (
    <div className="container mx-auto space-y-8 p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">{customer.fullName}</h1>
          <RiskBadge riskStatus={customer.riskStatus} />
          <BlacklistRequestButton
            customerId={customer.id}
            riskStatus={customer.riskStatus}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            className={cn(buttonVariants({ variant: "outline" }))}
            params={{ id: String(customer.id) }}
            to="/customers/$id/edit"
          >
            Edit
          </Link>
          <RecordVisitDialog customerId={customer.id} />
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
          {customerMapsUrl ? (
            <a
              className="font-medium text-blue-600 underline-offset-4 hover:underline"
              href={customerMapsUrl}
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
                    <Link
                      className="underline-offset-4 hover:underline"
                      params={{ id: String(r.id) }}
                      to="/receivables/$id"
                    >
                      {r.productDescription}
                    </Link>
                  </TableCell>
                  <TableCell>{r.saleDate}</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatPeso(r.originalBalanceCents)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatPeso(r.currentBalanceCents)}
                  </TableCell>
                  <TableCell>
                    <ReceivableStatusBadge status={r.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Visits</h2>
        <VisitList customerId={customer.id} />
      </div>
    </div>
  );
}
