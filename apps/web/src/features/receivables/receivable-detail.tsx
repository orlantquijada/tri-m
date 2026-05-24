import { Link } from "@tanstack/react-router";

import { formatPeso } from "@/lib/format";

import { PaymentForm } from "../payments/payment-form";
import { PaymentHistory } from "../payments/payment-history";
import type { ReceivableWithDetail } from "./queries";
import { ReceivableStatusBadge } from "./receivable-status-badge";
import { ScheduleTable } from "./schedule-table";

export function ReceivableDetail({
  receivable,
}: {
  receivable: ReceivableWithDetail;
}) {
  return (
    <div className="container mx-auto space-y-8 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Link
            className="text-sm text-muted-foreground hover:underline"
            params={{ id: receivable.customerId }}
            to="/customers/$id"
          >
            ← {receivable.customer.fullName}
          </Link>
          <h1 className="text-xl font-bold sm:text-2xl">
            {receivable.productDescription}
          </h1>
          <ReceivableStatusBadge status={receivable.status} />
        </div>
        <div className="sm:shrink-0">
          <PaymentForm
            currentBalanceCents={receivable.currentBalanceCents}
            customerId={receivable.customerId}
            receivableId={receivable.id}
          />
        </div>
      </div>

      <div className="rounded-lg border p-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Total Amount</p>
            <p className="font-mono text-sm font-medium">
              {formatPeso(receivable.totalAmountCents)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Down Payment</p>
            <p className="font-mono text-sm font-medium">
              {formatPeso(receivable.downPaymentCents)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Original Balance</p>
            <p className="font-mono text-sm font-medium">
              {formatPeso(receivable.originalBalanceCents)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Current Balance</p>
            <p className="font-mono text-base font-bold sm:text-lg">
              {formatPeso(receivable.currentBalanceCents)}
            </p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 border-t pt-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Customer</p>
            <Link
              className="text-sm font-medium underline-offset-4 hover:underline"
              params={{ id: receivable.customerId }}
              to="/customers/$id"
            >
              {receivable.customer.fullName}
            </Link>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Sale Date</p>
            <p className="text-sm font-medium">{receivable.saleDate}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">First Due Date</p>
            <p className="text-sm font-medium">{receivable.firstDueDate}</p>
          </div>
          {receivable.paymentTermMonths !== null && (
            <div>
              <p className="text-xs text-muted-foreground">Payment Terms</p>
              <p className="text-sm font-medium">
                {receivable.paymentTermMonths} months
              </p>
            </div>
          )}
          {receivable.monthlyDueAmountCents !== null && (
            <div>
              <p className="text-xs text-muted-foreground">Monthly Due</p>
              <p className="font-mono text-sm font-medium">
                {formatPeso(receivable.monthlyDueAmountCents)}
              </p>
            </div>
          )}
        </div>
      </div>

      <ScheduleTable schedule={receivable.schedule} />

      <div>
        <h2 className="mb-3 text-lg font-semibold">Payment History</h2>
        <div className="overflow-x-auto">
          <PaymentHistory
            payments={receivable.payments}
            receivableId={receivable.id}
            customerId={receivable.customerId}
          />
        </div>
      </div>
    </div>
  );
}
