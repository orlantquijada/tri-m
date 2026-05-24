import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { authClient } from "@/lib/auth-client";
import { features } from "@/lib/features";
import { formatPeso } from "@/lib/format";

import type { ReceivableWithDetail } from "../receivables/queries";
import { VoidPaymentDialog } from "./void-payment-dialog";

type Payment = ReceivableWithDetail["payments"][number];

type Props = {
  payments: Payment[];
  receivableId: string;
  customerId: string;
};

export function PaymentHistory({ payments, receivableId, customerId }: Props) {
  const { data: session } = authClient.useSession();
  const isAdmin =
    (session?.user as { role?: string } | undefined)?.role === "admin";
  const showVoid = isAdmin && features.voidPayment;

  if (payments.length === 0) {
    return <p className="text-muted-foreground">No payments recorded yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Method</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead>Reference</TableHead>
          <TableHead>Notes</TableHead>
          {showVoid && <TableHead />}
        </TableRow>
      </TableHeader>
      <TableBody>
        {payments.map((p) => {
          const isVoided = !!p.voidedAt;
          return (
            <TableRow
              key={p.id}
              className={isVoided ? "opacity-50" : undefined}
            >
              <TableCell>{p.paymentDate}</TableCell>
              <TableCell className="capitalize">
                {p.paymentMethod.replace("_", " ")}
              </TableCell>
              <TableCell className="text-right font-mono">
                <span className={isVoided ? "line-through" : undefined}>
                  {formatPeso(p.amountCents)}
                </span>
                {isVoided && (
                  <Tooltip>
                    <TooltipTrigger>
                      <Badge
                        variant="secondary"
                        className="ml-2 cursor-default"
                      >
                        Voided
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>{p.voidReason}</TooltipContent>
                  </Tooltip>
                )}
              </TableCell>
              <TableCell>{p.referenceNumber ?? "—"}</TableCell>
              <TableCell>{p.notes ?? "—"}</TableCell>
              {showVoid && (
                <TableCell className="text-right">
                  {!isVoided && (
                    <VoidPaymentDialog
                      paymentId={p.id}
                      receivableId={receivableId}
                      customerId={customerId}
                    />
                  )}
                </TableCell>
              )}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
