import { Link } from "@tanstack/react-router";
import type { VisitOutcome, VisitType } from "schema";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPeso } from "@/lib/format";

import { useResolvePromiseMutation, useVisitsQuery } from "./queries";
import type { VisitListItem } from "./queries";

const TYPE_LABELS: Record<VisitType, string> = {
  in_person: "In person",
  other: "Other",
  phone: "Phone",
  sms: "SMS",
};

const OUTCOME_LABELS: Record<VisitOutcome, string> = {
  no_answer: "No answer",
  other: "Other",
  paid: "Paid",
  promised: "Promised",
  refused: "Refused",
  wrong_contact: "Wrong contact",
};

function outcomeVariant(
  outcome: VisitOutcome
): "default" | "secondary" | "destructive" | "outline" {
  switch (outcome) {
    case "paid": {
      return "default";
    }
    case "promised": {
      return "secondary";
    }
    case "refused": {
      return "destructive";
    }
    default: {
      return "outline";
    }
  }
}

function formatTimestamp(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString();
}

export function VisitList({ customerId }: { customerId: number }) {
  const { data, isLoading, error } = useVisitsQuery({ customerId });

  if (isLoading) {
    return <p className="text-muted-foreground">Loading visits...</p>;
  }
  if (error) {
    return <p className="text-destructive">{error.message}</p>;
  }
  if (!data || data.length === 0) {
    return <p className="text-muted-foreground">No visits recorded yet.</p>;
  }

  return (
    <ul className="space-y-3">
      {data.map((visit) => (
        <VisitRow key={visit.id} visit={visit} customerId={customerId} />
      ))}
    </ul>
  );
}

function VisitRow({
  visit,
  customerId,
}: {
  visit: VisitListItem;
  customerId: number;
}) {
  const resolveMutation = useResolvePromiseMutation();
  const hasGps = visit.gpsLat !== null && visit.gpsLng !== null;
  const isOpenPromise =
    visit.outcome === "promised" && visit.promiseResolvedAt === null;

  return (
    <li className="rounded-md border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={outcomeVariant(visit.outcome)}>
          {OUTCOME_LABELS[visit.outcome]}
        </Badge>
        <span className="text-sm font-medium">{TYPE_LABELS[visit.type]}</span>
        <span className="ml-auto text-xs text-muted-foreground">
          {formatTimestamp(visit.createdAt)}
        </span>
      </div>
      {visit.outcome === "promised" &&
        visit.promisedAmountCents !== null &&
        visit.promisedDate !== null && (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <span>
              Promised {formatPeso(visit.promisedAmountCents)} by{" "}
              {visit.promisedDate}
            </span>
            {visit.promiseResolvedAt ? (
              <Badge variant="outline">
                Resolved {formatTimestamp(visit.promiseResolvedAt)}
              </Badge>
            ) : (
              <Button
                size="sm"
                variant="outline"
                disabled={resolveMutation.isPending}
                onClick={() =>
                  resolveMutation.mutate({ customerId, visitId: visit.id })
                }
              >
                {resolveMutation.isPending ? "Resolving..." : "Mark resolved"}
              </Button>
            )}
          </div>
        )}
      {visit.notes && (
        <p className="mt-2 text-sm text-muted-foreground">{visit.notes}</p>
      )}
      {hasGps && (
        <div className="mt-2 flex gap-3 text-xs">
          <Link
            className="text-blue-600 underline-offset-4 hover:underline"
            search={{ focus: customerId }}
            to="/map"
          >
            View on map
          </Link>
        </div>
      )}
      {isOpenPromise && resolveMutation.error && (
        <p className="mt-1 text-xs text-destructive">
          {resolveMutation.error.message}
        </p>
      )}
    </li>
  );
}
