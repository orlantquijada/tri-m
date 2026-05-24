import { Link } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { QuickActionsBar } from "@/features/shared/quick-actions-bar";
import { formatPeso } from "@/lib/format";

import { useOpenPromisesQuery, useResolvePromiseMutation } from "./queries";
import type { OpenPromiseItem } from "./queries";

function dueLabel(daysUntilDue: number): {
  label: string;
  tone: "overdue" | "today" | "soon" | "later";
} {
  if (daysUntilDue < 0) {
    const days = Math.abs(daysUntilDue);
    return {
      label: `${days} ${days === 1 ? "day" : "days"} overdue`,
      tone: "overdue",
    };
  }
  if (daysUntilDue === 0) {
    return { label: "Due today", tone: "today" };
  }
  if (daysUntilDue <= 2) {
    return {
      label: `Due in ${daysUntilDue} ${daysUntilDue === 1 ? "day" : "days"}`,
      tone: "soon",
    };
  }
  return { label: `Due in ${daysUntilDue} days`, tone: "later" };
}

const TONE_CLASSES = {
  later:
    "bg-emerald-100 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100",
  overdue: "bg-red-100 text-red-900 dark:bg-red-900 dark:text-red-100",
  soon: "bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-100",
  today: "bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-100",
} as const;

export function OpenPromisesCard() {
  const { data, isLoading, error } = useOpenPromisesQuery();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Open promises</CardTitle>
        <CardDescription>
          Unresolved promises sorted by promised date.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <p className="text-muted-foreground">Loading promises...</p>
        )}
        {error && <p className="text-destructive">{error.message}</p>}
        {data && data.length === 0 && (
          <p className="text-muted-foreground">No open promises.</p>
        )}
        {data && data.length > 0 && (
          <ul className="space-y-3">
            {data.map((promise) => (
              <OpenPromiseRow key={promise.id} promise={promise} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function OpenPromiseRow({ promise }: { promise: OpenPromiseItem }) {
  const resolveMutation = useResolvePromiseMutation();
  const tone = dueLabel(promise.daysUntilDue);

  if (resolveMutation.isPending || resolveMutation.isSuccess) {
    return null;
  }

  return (
    <li className="flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1 space-y-1">
        <Link
          className="font-medium underline-offset-4 hover:underline"
          params={{ id: promise.customer.id }}
          to="/customers/$id"
        >
          {promise.customer.fullName}
        </Link>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>
            {promise.promisedAmountCents !== null
              ? formatPeso(promise.promisedAmountCents)
              : "—"}
          </span>
          <span>·</span>
          <span>{promise.promisedDate ?? "—"}</span>
        </div>
      </div>
      <div className="flex flex-col items-start gap-2 sm:items-end">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={TONE_CLASSES[tone.tone]} variant="outline">
            {tone.label}
          </Badge>
          <Button
            onClick={() =>
              resolveMutation.mutate({
                customerId: promise.customer.id,
                visitId: promise.id,
              })
            }
            size="sm"
            variant="outline"
          >
            Resolved
          </Button>
        </div>
        <QuickActionsBar
          customerId={promise.customer.id}
          latitude={promise.customer.latitude}
          layout="row"
          longitude={promise.customer.longitude}
          phone={promise.customer.phone}
        />
        {resolveMutation.error && (
          <p className="text-xs text-destructive">
            {resolveMutation.error.message}
          </p>
        )}
      </div>
    </li>
  );
}
