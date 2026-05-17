import type { ScheduleStatus } from "schema";

import { Badge } from "@/components/ui/badge";
import type { BadgeVariants } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPeso } from "@/lib/format";

import type { ReceivableWithDetail } from "./queries";

type ScheduleRow = ReceivableWithDetail["schedule"][number];

const scheduleStatusVariant = {
  overdue: "destructive",
  paid: "secondary",
  partial: "default",
  pending: "outline",
} satisfies Record<ScheduleStatus, BadgeVariants["variant"]>;

export function ScheduleTable({ schedule }: { schedule: ScheduleRow[] }) {
  if (schedule.length === 0) {
    return null;
  }

  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold">Payment Schedule</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead className="text-right">Due Amount</TableHead>
            <TableHead className="text-right">Paid</TableHead>
            <TableHead className="text-right">Outstanding</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {schedule.map((row) => (
            <TableRow key={row.id}>
              <TableCell>{row.installmentNo}</TableCell>
              <TableCell>{row.dueDate}</TableCell>
              <TableCell className="text-right font-mono">
                {formatPeso(row.dueAmountCents)}
              </TableCell>
              <TableCell className="text-right font-mono">
                {formatPeso(row.paidAmountCents)}
              </TableCell>
              <TableCell className="text-right font-mono">
                {formatPeso(row.dueAmountCents - row.paidAmountCents)}
              </TableCell>
              <TableCell>
                <Badge variant={scheduleStatusVariant[row.status]}>
                  {row.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
