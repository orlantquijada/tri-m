import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPeso } from "@/lib/format";

import type { ReceivableWithDetail } from "../receivables/queries";

type Payment = ReceivableWithDetail["payments"][number];

export function PaymentHistory({ payments }: { payments: Payment[] }) {
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
        </TableRow>
      </TableHeader>
      <TableBody>
        {payments.map((p) => (
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
  );
}
