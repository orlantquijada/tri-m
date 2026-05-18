import { useState } from "react";
import type { AuditEntityType } from "schema";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { useAuditQuery } from "./queries";

const PAGE_SIZE = 50;

const ENTITY_TYPE_OPTIONS: { label: string; value: AuditEntityType | "all" }[] =
  [
    { label: "All", value: "all" },
    { label: "Payment", value: "payment" },
    { label: "Customer", value: "customer" },
    { label: "Blacklist", value: "blacklist_request" },
    { label: "User", value: "user" },
  ];

function formatTimestamp(value: string | Date): string {
  const d = value instanceof Date ? value : new Date(value);
  return d.toLocaleString();
}

function metadataSummary(raw: string | null): string {
  if (!raw) {
    return "—";
  }
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return Object.entries(parsed)
      .map(([k, v]) => `${k}=${String(v)}`)
      .join(", ");
  } catch {
    return raw;
  }
}

export function AuditLog() {
  const [entityType, setEntityType] = useState<AuditEntityType | "all">("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);

  const { data, error, isLoading } = useAuditQuery({
    entityType: entityType === "all" ? undefined : entityType,
    from: from || undefined,
    limit: PAGE_SIZE,
    page,
    to: to || undefined,
  });

  const events = data?.events ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleFilterChange = (mutate: () => void) => {
    mutate();
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-md border bg-muted/40 px-4 py-3">
        <div className="space-y-1">
          <Label htmlFor="audit-filter-entity">Entity</Label>
          <NativeSelect
            id="audit-filter-entity"
            value={entityType}
            onChange={(e) =>
              handleFilterChange(() =>
                setEntityType(e.target.value as AuditEntityType | "all")
              )
            }
          >
            {ENTITY_TYPE_OPTIONS.map((opt) => (
              <NativeSelectOption key={opt.value} value={opt.value}>
                {opt.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1">
          <Label htmlFor="audit-filter-from">From</Label>
          <Input
            id="audit-filter-from"
            type="date"
            value={from}
            onChange={(e) => handleFilterChange(() => setFrom(e.target.value))}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="audit-filter-to">To</Label>
          <Input
            id="audit-filter-to"
            type="date"
            value={to}
            onChange={(e) => handleFilterChange(() => setTo(e.target.value))}
          />
        </div>
      </div>

      {isLoading && (
        <p className="p-4 text-muted-foreground">Loading audit events…</p>
      )}
      {error && (
        <p className="p-4 text-destructive">Failed to load audit log.</p>
      )}

      {!isLoading && !error && events.length === 0 && (
        <p className="p-4 text-muted-foreground">No events match the filter.</p>
      )}

      {events.length > 0 && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Distributor</TableHead>
                <TableHead>Metadata</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((ev) => (
                <TableRow key={ev.id}>
                  <TableCell className="whitespace-nowrap font-mono text-xs">
                    {formatTimestamp(ev.createdAt)}
                  </TableCell>
                  <TableCell className="font-medium">{ev.event}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {ev.entityType} #{ev.entityId}
                  </TableCell>
                  <TableCell>
                    {ev.actorName ?? ev.actorEmail ?? ev.actorId}
                  </TableCell>
                  <TableCell>{ev.distributorName ?? "—"}</TableCell>
                  <TableCell className="max-w-md truncate text-xs text-muted-foreground">
                    {metadataSummary(ev.metadata)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between px-1 text-sm text-muted-foreground">
            <span>
              Page {page} of {totalPages} · {total} event
              {total === 1 ? "" : "s"}
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
