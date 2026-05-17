// Pure Receivable domain functions — no DB, no side effects.
// Money: INTEGER cents throughout (no floats).

import { differenceInCalendarDays, isBefore, startOfDay } from "date-fns";

export function computeOriginalBalance(input: {
  totalAmountCents: number;
  downPaymentCents: number;
}): number {
  return input.totalAmountCents - input.downPaymentCents;
}

type ReceivableStatus = "current" | "overdue" | "fully_paid";

export function applyPayment(
  receivable: { currentBalanceCents: number; status: ReceivableStatus },
  amountCents: number
): { newBalanceCents: number; newStatus: ReceivableStatus } {
  const newBalanceCents = receivable.currentBalanceCents - amountCents;
  const newStatus: ReceivableStatus =
    newBalanceCents === 0 ? "fully_paid" : receivable.status;
  return { newBalanceCents, newStatus };
}

// Matches SQL: date(firstDueDate) < date('now') AND currentBalanceCents > 0
export function isOverdue(
  receivable: { currentBalanceCents: number; firstDueDate: string },
  today: Date
): boolean {
  return (
    receivable.currentBalanceCents > 0 &&
    isBefore(startOfDay(new Date(receivable.firstDueDate)), startOfDay(today))
  );
}

// Matches SQL: cast(julianday('now') - julianday(firstDueDate) as integer)
export function daysOverdue(
  receivable: { firstDueDate: string },
  today: Date
): number {
  return differenceInCalendarDays(
    startOfDay(today),
    startOfDay(new Date(receivable.firstDueDate))
  );
}

// Placeholder — D3 aging buckets not yet implemented.
export function agingBucket(
  _receivable: { currentBalanceCents: number; firstDueDate: string },
  _today: Date
): "current" | "1-30" | "31-60" | "61-90" | "90+" {
  return "current";
}
