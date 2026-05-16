import { Link } from "@tanstack/react-router";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPeso } from "@/lib/format";

import { PaymentForm } from "../payments/payment-form";
import type { ReceivableWithDetail } from "./queries";
import { ReceivableStatusBadge } from "./receivable-status-badge";

export function ReceivableDetail({
  receivable,
}: {
  receivable: ReceivableWithDetail;
}) {
  return (
    <div className="container mx-auto space-y-8 p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Link
            className="text-sm text-muted-foreground hover:underline"
            params={{ id: String(receivable.customerId) }}
            to="/customers/$id"
          >
            ← {receivable.customer.fullName}
          </Link>
          <h1 className="text-2xl font-bold">
            {receivable.productDescription}
          </h1>
          <ReceivableStatusBadge status={receivable.status} />
        </div>
        <PaymentForm
          currentBalanceCents={receivable.currentBalanceCents}
          customerId={receivable.customerId}
          receivableId={receivable.id}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 rounded-lg border p-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <p className="text-sm text-muted-foreground">Customer</p>
          <Link
            className="font-medium underline-offset-4 hover:underline"
            params={{ id: String(receivable.customerId) }}
            to="/customers/$id"
          >
            {receivable.customer.fullName}
          </Link>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Sale Date</p>
          <p className="font-medium">{receivable.saleDate}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">First Due Date</p>
          <p className="font-medium">{receivable.firstDueDate}</p>
        </div>
        {receivable.paymentTermMonths !== null && (
          <div>
            <p className="text-sm text-muted-foreground">Payment Terms</p>
            <p className="font-medium">{receivable.paymentTermMonths} months</p>
          </div>
        )}
        {receivable.monthlyDueAmountCents !== null && (
          <div>
            <p className="text-sm text-muted-foreground">Monthly Due</p>
            <p className="font-medium font-mono">
              {formatPeso(receivable.monthlyDueAmountCents)}
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 rounded-lg border p-4 sm:grid-cols-4">
        <div>
          <p className="text-sm text-muted-foreground">Total Amount</p>
          <p className="font-medium font-mono">
            {formatPeso(receivable.totalAmountCents)}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Down Payment</p>
          <p className="font-medium font-mono">
            {formatPeso(receivable.downPaymentCents)}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Original Balance</p>
          <p className="font-medium font-mono">
            {formatPeso(receivable.originalBalanceCents)}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Current Balance</p>
          <p className="text-lg font-bold font-mono">
            {formatPeso(receivable.currentBalanceCents)}
          </p>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Payment History</h2>
        {receivable.payments.length === 0 ? (
          <p className="text-muted-foreground">No payments recorded yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Method</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {receivable.payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.paymentDate}</TableCell>
                  <TableCell className="capitalize">
                    {p.paymentMethod.replace("_", " ")}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatPeso(p.amountCents)}
                  </TableCell>
                  <TableCell>{p.referenceNumber ?? "—"}</TableCell>
                  <TableCell>{p.notes ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
