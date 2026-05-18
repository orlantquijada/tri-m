import { useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPeso } from "@/lib/format";

import { useDistributorPerformanceQuery } from "./queries";
import type { DistributorPerformanceRow } from "./queries";

type SortKey = keyof Omit<DistributorPerformanceRow, "distributorId">;
type SortDir = "asc" | "desc";

function collectionRateColor(pct: number) {
  if (pct >= 80) {
    return "text-green-600";
  }
  if (pct >= 50) {
    return "text-yellow-600";
  }
  return "text-red-600";
}

function SortableHead({
  label,
  col,
  sortKey,
  sortDir,
  onSort,
  className,
}: {
  label: string;
  col: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (col: SortKey) => void;
  className?: string;
}) {
  const active = sortKey === col;
  return (
    <TableHead className={className}>
      <button
        type="button"
        className="flex items-center gap-1 font-medium hover:text-foreground"
        onClick={() => onSort(col)}
      >
        {label}
        <span className="text-muted-foreground">
          {active ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
        </span>
      </button>
    </TableHead>
  );
}

export function DistributorPerformance() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("distributorName");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const { data, error, isLoading } = useDistributorPerformanceQuery({
    from: from || undefined,
    to: to || undefined,
  });

  function handleSort(col: SortKey) {
    if (col === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(col);
      setSortDir("asc");
    }
  }

  const sorted = [...(data ?? [])].toSorted((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    const cmp =
      typeof av === "string" && typeof bv === "string"
        ? av.localeCompare(bv)
        : (av as number) - (bv as number);
    return sortDir === "asc" ? cmp : -cmp;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-md border bg-muted/40 px-4 py-3">
        <div className="space-y-1">
          <Label htmlFor="report-filter-from">From</Label>
          <Input
            id="report-filter-from"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="report-filter-to">To</Label>
          <Input
            id="report-filter-to"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
      </div>

      {isLoading && (
        <p className="p-4 text-muted-foreground">Loading report…</p>
      )}
      {error && <p className="p-4 text-destructive">Failed to load report.</p>}

      {!isLoading && !error && sorted.length === 0 && (
        <p className="p-4 text-muted-foreground">No distributors found.</p>
      )}

      {sorted.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead
                label="Distributor"
                col="distributorName"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={handleSort}
              />
              <SortableHead
                label="Customers"
                col="customerCount"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={handleSort}
                className="text-right"
              />
              <SortableHead
                label="Original Balance"
                col="originalBalanceCents"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={handleSort}
                className="text-right"
              />
              <SortableHead
                label="Collected"
                col="collectedCents"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={handleSort}
                className="text-right"
              />
              <SortableHead
                label="Outstanding"
                col="outstandingCents"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={handleSort}
                className="text-right"
              />
              <SortableHead
                label="Overdue"
                col="overdueCents"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={handleSort}
                className="text-right"
              />
              <SortableHead
                label="Collection Rate"
                col="collectionRatePct"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={handleSort}
                className="text-right"
              />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((row) => (
              <TableRow key={row.distributorId}>
                <TableCell className="font-medium">
                  {row.distributorName}
                </TableCell>
                <TableCell className="text-right">
                  {row.customerCount}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatPeso(row.originalBalanceCents)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatPeso(row.collectedCents)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatPeso(row.outstandingCents)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatPeso(row.overdueCents)}
                </TableCell>
                <TableCell
                  className={`text-right font-mono font-semibold ${collectionRateColor(row.collectionRatePct)}`}
                >
                  {row.collectionRatePct.toFixed(1)}%
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
