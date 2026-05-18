import { Link, createFileRoute } from "@tanstack/react-router";
import type { VisitOutcome, VisitType } from "schema";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useVisitsQuery } from "@/features/visits/queries";
import { formatPeso } from "@/lib/format";

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

function VisitsPage() {
  const { data, isLoading, error } = useVisitsQuery();

  return (
    <main className="container mx-auto p-6">
      <h1 className="mb-6 text-2xl font-bold">Visits</h1>
      {isLoading && <p className="text-muted-foreground">Loading...</p>}
      {error && <p className="text-destructive">{error.message}</p>}
      {data && data.length === 0 && (
        <p className="text-muted-foreground">No visits yet.</p>
      )}
      {data && data.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Outcome</TableHead>
              <TableHead>Promise</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((visit) => (
              <TableRow key={visit.id}>
                <TableCell>
                  {new Date(visit.createdAt).toLocaleString()}
                </TableCell>
                <TableCell>
                  <Link
                    className="underline-offset-4 hover:underline"
                    params={{ id: String(visit.customerId) }}
                    to="/customers/$id"
                  >
                    #{visit.customerId}
                  </Link>
                </TableCell>
                <TableCell>{TYPE_LABELS[visit.type]}</TableCell>
                <TableCell>
                  <Badge variant={outcomeVariant(visit.outcome)}>
                    {OUTCOME_LABELS[visit.outcome]}
                  </Badge>
                </TableCell>
                <TableCell>
                  {visit.outcome === "promised" &&
                  visit.promisedAmountCents !== null &&
                  visit.promisedDate !== null
                    ? `${formatPeso(visit.promisedAmountCents)} by ${visit.promisedDate}${visit.promiseResolvedAt ? " ✓" : ""}`
                    : "—"}
                </TableCell>
                <TableCell className="max-w-xs truncate">
                  {visit.notes ?? ""}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </main>
  );
}

export const Route = createFileRoute("/_authed/visits/")({
  component: VisitsPage,
});
