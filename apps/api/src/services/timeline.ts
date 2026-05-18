import {
  auditEvents as auditEventsTable,
  blacklistRequests as blacklistRequestsTable,
  customers as customersTable,
  db,
  payments as paymentsTable,
  receivables as receivablesTable,
  visits as visitsTable,
} from "db";
import type { InferSelectModel } from "drizzle-orm";
import { and, desc, eq } from "drizzle-orm";
import type {
  TimelineEvent,
  TimelineResponse,
  VisitOutcome,
  VisitType,
} from "schema";

import { notFound } from "../lib/http";
import { Scope } from "../lib/scope";
import type { User } from "../middleware/auth";

type BuildTimelineOptions = {
  page?: number;
  limit?: number;
};

function parseMetadata(raw: string | null): Record<string, unknown> {
  if (!raw) {
    return {};
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

type ReceivableRow = Pick<
  InferSelectModel<typeof receivablesTable>,
  | "createdAt"
  | "id"
  | "originalBalanceCents"
  | "productDescription"
  | "saleDate"
>;

type PaymentRow = Pick<
  InferSelectModel<typeof paymentsTable>,
  | "amountCents"
  | "createdAt"
  | "id"
  | "paymentMethod"
  | "receivableId"
  | "referenceNumber"
  | "voidReason"
  | "voidedAt"
>;

type VisitRow = Pick<
  InferSelectModel<typeof visitsTable>,
  | "createdAt"
  | "id"
  | "notes"
  | "outcome"
  | "promiseResolvedAt"
  | "promisedAmountCents"
  | "promisedDate"
  | "type"
>;

type StatusChangeRow = Pick<
  InferSelectModel<typeof auditEventsTable>,
  "actorId" | "createdAt" | "metadata"
>;

type BlacklistRow = Pick<
  InferSelectModel<typeof blacklistRequestsTable>,
  "createdAt" | "id" | "reason" | "reviewNote" | "reviewedAt" | "status"
>;

function receivableEvent(row: ReceivableRow): TimelineEvent {
  return {
    data: {
      originalBalanceCents: row.originalBalanceCents,
      productDescription: row.productDescription,
      receivableId: row.id,
      saleDate: row.saleDate,
    },
    occurredAt: row.createdAt,
    type: "receivable.created",
  };
}

function paymentEvents(row: PaymentRow): TimelineEvent[] {
  const recorded: TimelineEvent = {
    data: {
      amountCents: row.amountCents,
      paymentId: row.id,
      paymentMethod: row.paymentMethod,
      receivableId: row.receivableId,
      referenceNumber: row.referenceNumber,
    },
    occurredAt: row.createdAt,
    type: "payment.recorded",
  };
  if (!row.voidedAt) {
    return [recorded];
  }
  const voidedAt = new Date(row.voidedAt);
  if (Number.isNaN(voidedAt.getTime())) {
    return [recorded];
  }
  return [
    recorded,
    {
      data: {
        amountCents: row.amountCents,
        paymentId: row.id,
        reason: row.voidReason,
        receivableId: row.receivableId,
      },
      occurredAt: voidedAt,
      type: "payment.voided",
    },
  ];
}

function visitEvents(row: VisitRow): TimelineEvent[] {
  const recorded: TimelineEvent = {
    data: {
      notes: row.notes,
      outcome: row.outcome as VisitOutcome,
      promisedAmountCents: row.promisedAmountCents,
      promisedDate: row.promisedDate,
      visitId: row.id,
      visitType: row.type as VisitType,
    },
    occurredAt: row.createdAt,
    type: "visit.recorded",
  };
  if (
    row.promiseResolvedAt === null ||
    row.outcome !== "promised" ||
    row.promisedAmountCents === null ||
    row.promisedDate === null
  ) {
    return [recorded];
  }
  return [
    recorded,
    {
      data: {
        promisedAmountCents: row.promisedAmountCents,
        promisedDate: row.promisedDate,
        visitId: row.id,
      },
      occurredAt: row.promiseResolvedAt,
      type: "promise.resolved",
    },
  ];
}

function statusChangeEvent(row: StatusChangeRow): TimelineEvent {
  const meta = parseMetadata(row.metadata);
  return {
    data: {
      actorId: row.actorId,
      newStatus: typeof meta.newStatus === "string" ? meta.newStatus : null,
      previousStatus:
        typeof meta.previousStatus === "string" ? meta.previousStatus : null,
    },
    occurredAt: row.createdAt,
    type: "customer.status_changed",
  };
}

function blacklistEvents(row: BlacklistRow): TimelineEvent[] {
  const requested: TimelineEvent = {
    data: {
      reason: row.reason,
      requestId: row.id,
    },
    occurredAt: row.createdAt,
    type: "blacklist.requested",
  };
  if (!row.reviewedAt || row.status === "pending") {
    return [requested];
  }
  return [
    requested,
    {
      data: {
        reason: row.reason,
        requestId: row.id,
        reviewNote: row.reviewNote,
      },
      occurredAt: row.reviewedAt,
      type:
        row.status === "approved" ? "blacklist.approved" : "blacklist.rejected",
    },
  ];
}

export async function buildTimeline(
  user: User,
  customerId: number,
  options: BuildTimelineOptions = {}
): Promise<TimelineResponse> {
  const page = options.page ?? 1;
  const limit = options.limit ?? 50;
  const upperBound = page * limit;

  const [customer] = await db
    .select({
      distributorId: customersTable.distributorId,
      id: customersTable.id,
    })
    .from(customersTable)
    .where(eq(customersTable.id, customerId));

  if (!customer) {
    throw notFound("Customer not found");
  }
  Scope.forUser(user).assertCanRead(customer.distributorId);

  const [
    receivableRows,
    paymentRows,
    visitRows,
    statusChangeRows,
    blacklistRows,
  ] = await Promise.all([
    db
      .select({
        createdAt: receivablesTable.createdAt,
        id: receivablesTable.id,
        originalBalanceCents: receivablesTable.originalBalanceCents,
        productDescription: receivablesTable.productDescription,
        saleDate: receivablesTable.saleDate,
      })
      .from(receivablesTable)
      .where(eq(receivablesTable.customerId, customerId))
      .orderBy(desc(receivablesTable.createdAt))
      .limit(upperBound),

    db
      .select({
        amountCents: paymentsTable.amountCents,
        createdAt: paymentsTable.createdAt,
        id: paymentsTable.id,
        paymentMethod: paymentsTable.paymentMethod,
        receivableId: paymentsTable.receivableId,
        referenceNumber: paymentsTable.referenceNumber,
        voidReason: paymentsTable.voidReason,
        voidedAt: paymentsTable.voidedAt,
      })
      .from(paymentsTable)
      .where(eq(paymentsTable.customerId, customerId))
      .orderBy(desc(paymentsTable.createdAt))
      .limit(upperBound),

    db
      .select({
        createdAt: visitsTable.createdAt,
        id: visitsTable.id,
        notes: visitsTable.notes,
        outcome: visitsTable.outcome,
        promiseResolvedAt: visitsTable.promiseResolvedAt,
        promisedAmountCents: visitsTable.promisedAmountCents,
        promisedDate: visitsTable.promisedDate,
        type: visitsTable.type,
      })
      .from(visitsTable)
      .where(eq(visitsTable.customerId, customerId))
      .orderBy(desc(visitsTable.createdAt))
      .limit(upperBound),

    db
      .select({
        actorId: auditEventsTable.actorId,
        createdAt: auditEventsTable.createdAt,
        metadata: auditEventsTable.metadata,
      })
      .from(auditEventsTable)
      .where(
        and(
          eq(auditEventsTable.entityType, "customer"),
          eq(auditEventsTable.entityId, String(customerId)),
          eq(auditEventsTable.event, "customer.status_changed")
        )
      )
      .orderBy(desc(auditEventsTable.createdAt))
      .limit(upperBound),

    db
      .select({
        createdAt: blacklistRequestsTable.createdAt,
        id: blacklistRequestsTable.id,
        reason: blacklistRequestsTable.reason,
        reviewNote: blacklistRequestsTable.reviewNote,
        reviewedAt: blacklistRequestsTable.reviewedAt,
        status: blacklistRequestsTable.status,
      })
      .from(blacklistRequestsTable)
      .where(eq(blacklistRequestsTable.customerId, customerId))
      .orderBy(desc(blacklistRequestsTable.createdAt))
      .limit(upperBound),
  ]);

  const events: TimelineEvent[] = [
    ...receivableRows.map(receivableEvent),
    ...paymentRows.flatMap(paymentEvents),
    ...visitRows.flatMap(visitEvents),
    ...statusChangeRows.map(statusChangeEvent),
    ...blacklistRows.flatMap(blacklistEvents),
  ];

  events.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());

  const start = (page - 1) * limit;
  const sliced = events.slice(start, start + limit);

  return {
    events: sliced,
    hasMore: start + sliced.length < events.length,
    limit,
    page,
    total: events.length,
  };
}
