import type { VisitOutcome, VisitType } from "./visit";

export type TimelineEventType =
  | "receivable.created"
  | "payment.recorded"
  | "payment.voided"
  | "visit.recorded"
  | "promise.resolved"
  | "customer.created"
  | "customer.status_changed"
  | "customer.location_changed"
  | "blacklist.requested"
  | "blacklist.approved"
  | "blacklist.rejected";

export type ReceivableCreatedData = {
  receivableId: number;
  productDescription: string;
  originalBalanceCents: number;
  saleDate: string;
};

export type PaymentRecordedData = {
  paymentId: number;
  amountCents: number;
  paymentMethod: string;
  receivableId: number;
  referenceNumber: string | null;
};

export type PaymentVoidedData = {
  paymentId: number;
  amountCents: number;
  reason: string | null;
  receivableId: number;
};

export type VisitRecordedData = {
  visitId: number;
  visitType: VisitType;
  outcome: VisitOutcome;
  notes: string | null;
  promisedAmountCents: number | null;
  promisedDate: string | null;
};

export type PromiseResolvedData = {
  visitId: number;
  promisedAmountCents: number;
  promisedDate: string;
};

export type StatusChangedData = {
  actorId: string;
  previousStatus: string | null;
  newStatus: string | null;
};

export type CustomerCreatedData = {
  actorId: string;
  hasLocation: boolean;
};

export type LocationChangedData = {
  actorId: string;
  previousLatitude: number | null;
  previousLongitude: number | null;
  previousAddress: string | null;
  newLatitude: number | null;
  newLongitude: number | null;
  newAddress: string | null;
};

export type BlacklistRequestedData = {
  requestId: number;
  reason: string;
};

export type BlacklistReviewedData = {
  requestId: number;
  reason: string;
  reviewNote: string | null;
};

export type TimelineEvent =
  | {
      type: "receivable.created";
      occurredAt: Date;
      data: ReceivableCreatedData;
    }
  | { type: "payment.recorded"; occurredAt: Date; data: PaymentRecordedData }
  | { type: "payment.voided"; occurredAt: Date; data: PaymentVoidedData }
  | { type: "visit.recorded"; occurredAt: Date; data: VisitRecordedData }
  | { type: "promise.resolved"; occurredAt: Date; data: PromiseResolvedData }
  | {
      type: "customer.status_changed";
      occurredAt: Date;
      data: StatusChangedData;
    }
  | {
      type: "customer.created";
      occurredAt: Date;
      data: CustomerCreatedData;
    }
  | {
      type: "customer.location_changed";
      occurredAt: Date;
      data: LocationChangedData;
    }
  | {
      type: "blacklist.requested";
      occurredAt: Date;
      data: BlacklistRequestedData;
    }
  | {
      type: "blacklist.approved";
      occurredAt: Date;
      data: BlacklistReviewedData;
    }
  | {
      type: "blacklist.rejected";
      occurredAt: Date;
      data: BlacklistReviewedData;
    };

export type TimelineResponse = {
  events: TimelineEvent[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
};
