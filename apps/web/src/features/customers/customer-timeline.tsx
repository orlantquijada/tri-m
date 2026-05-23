import {
  CalendarCheck,
  CheckCircle2,
  CircleDollarSign,
  FileText,
  MapPin,
  PhoneCall,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  UserPlus,
  XCircle,
} from "lucide-react";
import type { ReactNode } from "react";

import { formatPeso } from "@/lib/format";
import { cn } from "@/lib/utils";

import { useCustomerTimelineQuery } from "./queries";
import type { CustomerTimelineEvent } from "./queries";

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

const ABS_DATE = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function formatRelative(input: string | Date): string {
  const date = typeof input === "string" ? new Date(input) : input;
  const diff = Date.now() - date.getTime();
  if (diff < MINUTE_MS) {
    return "Just now";
  }
  if (diff < HOUR_MS) {
    const m = Math.floor(diff / MINUTE_MS);
    return `${m} minute${m === 1 ? "" : "s"} ago`;
  }
  if (diff < DAY_MS) {
    const h = Math.floor(diff / HOUR_MS);
    return `${h} hour${h === 1 ? "" : "s"} ago`;
  }
  return ABS_DATE.format(date);
}

type RenderedEvent = {
  icon: ReactNode;
  title: string;
  detail?: ReactNode;
  muted?: boolean;
};

function renderReceivableCreated(
  data: Extract<CustomerTimelineEvent, { type: "receivable.created" }>["data"]
): RenderedEvent {
  return {
    detail: (
      <>
        <span className="font-mono">
          {formatPeso(data.originalBalanceCents)}
        </span>
        {data.productDescription ? ` · ${data.productDescription}` : null}
      </>
    ),
    icon: <FileText className="size-4" />,
    title: "Receivable opened",
  };
}

function renderPaymentRecorded(
  data: Extract<CustomerTimelineEvent, { type: "payment.recorded" }>["data"]
): RenderedEvent {
  const method = data.paymentMethod.replace("_", " ");
  return {
    detail: (
      <>
        <span className="font-mono">{formatPeso(data.amountCents)}</span>
        {method ? ` via ${method}` : null}
        {data.referenceNumber ? ` · Ref ${data.referenceNumber}` : null}
      </>
    ),
    icon: <CircleDollarSign className="size-4" />,
    title: "Payment recorded",
  };
}

function renderPaymentVoided(
  data: Extract<CustomerTimelineEvent, { type: "payment.voided" }>["data"]
): RenderedEvent {
  return {
    detail: (
      <>
        <span className="font-mono line-through">
          {formatPeso(data.amountCents)}
        </span>
        {data.reason ? ` · ${data.reason}` : null}
      </>
    ),
    icon: <XCircle className="size-4" />,
    muted: true,
    title: "Payment voided",
  };
}

function renderVisitRecorded(
  data: Extract<CustomerTimelineEvent, { type: "visit.recorded" }>["data"]
): RenderedEvent {
  const visitType = data.visitType.replace("_", " ");
  const outcome = data.outcome.replace("_", " ");
  const promised =
    data.promisedAmountCents !== null && data.promisedDate !== null
      ? ` · Promised ${formatPeso(data.promisedAmountCents)} by ${data.promisedDate}`
      : "";
  return {
    detail: (
      <>
        <span className="capitalize">{outcome}</span>
        {promised}
        {data.notes ? ` · ${data.notes}` : null}
      </>
    ),
    icon: <PhoneCall className="size-4" />,
    title: `Visit — ${visitType}`,
  };
}

function renderPromiseResolved(
  data: Extract<CustomerTimelineEvent, { type: "promise.resolved" }>["data"]
): RenderedEvent {
  return {
    detail: (
      <>
        <span className="font-mono">
          {formatPeso(data.promisedAmountCents)}
        </span>
        {data.promisedDate ? ` by ${data.promisedDate}` : null}
      </>
    ),
    icon: <CheckCircle2 className="size-4" />,
    title: "Promise resolved",
  };
}

function renderCustomerCreated(
  data: Extract<CustomerTimelineEvent, { type: "customer.created" }>["data"]
): RenderedEvent {
  return {
    detail: data.hasLocation
      ? "Pin captured at creation"
      : "No pin at creation",
    icon: <UserPlus className="size-4" />,
    muted: !data.hasLocation,
    title: "Customer added",
  };
}

function renderLocationChanged(
  data: Extract<
    CustomerTimelineEvent,
    { type: "customer.location_changed" }
  >["data"]
): RenderedEvent {
  const addressChanged =
    (data.previousAddress ?? "") !== (data.newAddress ?? "");
  const coordsChanged =
    data.previousLatitude !== data.newLatitude ||
    data.previousLongitude !== data.newLongitude;

  let detail: ReactNode = null;
  let title = "Location updated";
  if (addressChanged && coordsChanged) {
    detail = (
      <>
        Address: "{data.previousAddress ?? "—"}" → "{data.newAddress ?? "—"}"
      </>
    );
  } else if (addressChanged) {
    detail = (
      <>
        "{data.previousAddress ?? "—"}" → "{data.newAddress ?? "—"}"
      </>
    );
    title = "Address updated";
  } else if (coordsChanged) {
    const prev =
      data.previousLatitude !== null && data.previousLongitude !== null
        ? `${data.previousLatitude.toFixed(5)}, ${data.previousLongitude.toFixed(5)}`
        : "no pin";
    const next =
      data.newLatitude !== null && data.newLongitude !== null
        ? `${data.newLatitude.toFixed(5)}, ${data.newLongitude.toFixed(5)}`
        : "no pin";
    detail = `${prev} → ${next}`;
    title = "Pin moved";
  }
  return {
    detail,
    icon: <MapPin className="size-4" />,
    title,
  };
}

function renderStatusChanged(
  data: Extract<
    CustomerTimelineEvent,
    { type: "customer.status_changed" }
  >["data"]
): RenderedEvent {
  return {
    detail: (
      <span className="capitalize">
        {data.previousStatus ?? "—"} → {data.newStatus ?? "—"}
      </span>
    ),
    icon: <CalendarCheck className="size-4" />,
    title: "Risk status changed",
  };
}

function renderBlacklistReviewed(
  data: Extract<
    CustomerTimelineEvent,
    { type: "blacklist.approved" | "blacklist.rejected" }
  >["data"],
  variant: "approved" | "rejected"
): RenderedEvent {
  return {
    detail: data.reviewNote,
    icon:
      variant === "approved" ? (
        <ShieldCheck className="size-4" />
      ) : (
        <ShieldX className="size-4" />
      ),
    title: variant === "approved" ? "Blacklist approved" : "Blacklist rejected",
  };
}

function renderEvent(event: CustomerTimelineEvent): RenderedEvent {
  switch (event.type) {
    case "receivable.created": {
      return renderReceivableCreated(event.data);
    }
    case "payment.recorded": {
      return renderPaymentRecorded(event.data);
    }
    case "payment.voided": {
      return renderPaymentVoided(event.data);
    }
    case "visit.recorded": {
      return renderVisitRecorded(event.data);
    }
    case "promise.resolved": {
      return renderPromiseResolved(event.data);
    }
    case "customer.status_changed": {
      return renderStatusChanged(event.data);
    }
    case "customer.created": {
      return renderCustomerCreated(event.data);
    }
    case "customer.location_changed": {
      return renderLocationChanged(event.data);
    }
    case "blacklist.requested": {
      return {
        detail: event.data.reason,
        icon: <ShieldAlert className="size-4" />,
        title: "Blacklist requested",
      };
    }
    case "blacklist.approved": {
      return renderBlacklistReviewed(event.data, "approved");
    }
    case "blacklist.rejected": {
      return renderBlacklistReviewed(event.data, "rejected");
    }
    default: {
      const _exhaustive: never = event;
      return _exhaustive;
    }
  }
}

function eventKey(event: CustomerTimelineEvent): string {
  switch (event.type) {
    case "receivable.created": {
      return `${event.type}-${event.data.receivableId}`;
    }
    case "payment.recorded":
    case "payment.voided": {
      return `${event.type}-${event.data.paymentId}`;
    }
    case "visit.recorded":
    case "promise.resolved": {
      return `${event.type}-${event.data.visitId}`;
    }
    case "customer.status_changed":
    case "customer.created":
    case "customer.location_changed": {
      return `${event.type}-${event.occurredAt}`;
    }
    case "blacklist.requested":
    case "blacklist.approved":
    case "blacklist.rejected": {
      return `${event.type}-${event.data.requestId}`;
    }
    default: {
      const _exhaustive: never = event;
      return _exhaustive;
    }
  }
}

export function CustomerTimeline({ customerId }: { customerId: number }) {
  const { data, isLoading, error } = useCustomerTimelineQuery(customerId);

  if (isLoading) {
    return <p className="text-muted-foreground">Loading activity...</p>;
  }
  if (error) {
    return <p className="text-destructive">{error.message}</p>;
  }
  if (!data || data.events.length === 0) {
    return <p className="text-muted-foreground">No activity yet.</p>;
  }

  return (
    <ol className="relative space-y-4 border-l pl-6">
      {data.events.map((event) => {
        const rendered = renderEvent(event);
        return (
          <li
            key={eventKey(event)}
            className={cn(
              "relative",
              rendered.muted && "text-muted-foreground"
            )}
          >
            <span className="absolute -left-[33px] flex size-6 items-center justify-center rounded-full border bg-background text-muted-foreground">
              {rendered.icon}
            </span>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <p className="font-medium">{rendered.title}</p>
              <span className="text-xs text-muted-foreground">
                {formatRelative(event.occurredAt)}
              </span>
            </div>
            {rendered.detail && (
              <p className="mt-1 break-words text-sm text-muted-foreground">
                {rendered.detail}
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
