import type * as Leaflet from "leaflet";
import type { DivIcon, Marker } from "leaflet";
import { ArrowDownIcon, ArrowUpIcon, XIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DEFAULT_MAP_CENTER } from "@/features/map/constants";
import { useLeafletMap } from "@/features/map/use-leaflet-map";
import { useOverdueQuery } from "@/features/overdue/queries";
import { formatPeso } from "@/lib/format";

type OverdueRow = NonNullable<
  ReturnType<typeof useOverdueQuery>["data"]
>["rows"][number];

type Stop = {
  rowId: string;
  customerId: string;
  customerName: string;
  phone: string;
  address: string;
  latitude: number;
  longitude: number;
  balanceCents: number;
};

function numberedIcon(L: typeof Leaflet, n: number): DivIcon {
  return L.divIcon({
    className: "",
    html: `<div style="background:#0f172a;color:#fff;border:2px solid #fff;border-radius:9999px;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;box-shadow:0 1px 4px rgba(0,0,0,0.4)">${n}</div>`,
    iconAnchor: [14, 14],
    iconSize: [28, 28],
  });
}

function esc(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function csvCell(v: string | number) {
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replaceAll('"', '""')}"`;
  }
  return s;
}

function downloadCsv(stops: Stop[]) {
  const header = [
    "stop_no",
    "customer_name",
    "phone",
    "address",
    "latitude",
    "longitude",
    "balance_cents",
  ];
  const lines = [header.join(",")];
  for (const [idx, s] of stops.entries()) {
    lines.push(
      [
        idx + 1,
        s.customerName,
        s.phone,
        s.address,
        s.latitude,
        s.longitude,
        s.balanceCents,
      ]
        .map(csvCell)
        .join(",")
    );
  }
  const blob = new Blob([lines.join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "collection-route.csv";
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function CollectionMap({ stops }: { stops: Stop[] }) {
  const markersRef = useRef<Marker[]>([]);
  const { containerRef, leafletRef, mapRef, ready } = useLeafletMap({
    center: DEFAULT_MAP_CENTER,
    zoom: 12,
  });

  useEffect(() => {
    if (!ready) {
      return;
    }
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!(L && map)) {
      return;
    }
    for (const m of markersRef.current) {
      m.remove();
    }
    markersRef.current = [];

    for (const [idx, s] of stops.entries()) {
      const marker = L.marker([s.latitude, s.longitude], {
        icon: numberedIcon(L, idx + 1),
      })
        .addTo(map)
        .bindPopup(
          `<div style="min-width:160px">
                <p style="font-weight:600;margin:0 0 4px">#${idx + 1} ${esc(s.customerName)}</p>
                <p style="margin:0 0 2px">${esc(s.phone)}</p>
                <p style="margin:0 0 2px">${esc(s.address)}</p>
                <p style="margin:0">Balance: ${esc(formatPeso(s.balanceCents))}</p>
              </div>`
        );
      markersRef.current.push(marker);
    }

    if (stops.length > 0) {
      const bounds = L.latLngBounds(
        stops.map((s) => [s.latitude, s.longitude] as [number, number])
      );
      map.fitBounds(bounds, { maxZoom: 15, padding: [40, 40] });
    }
  }, [stops, ready, leafletRef, mapRef]);

  return <div className="isolate h-full w-full" ref={containerRef} />;
}

export function CollectionRouteView() {
  const { data, error, isLoading } = useOverdueQuery();
  const [stops, setStops] = useState<Stop[]>([]);

  const rows: OverdueRow[] = data?.rows ?? [];
  const stopIds = useMemo(() => new Set(stops.map((s) => s.rowId)), [stops]);

  const addStop = (row: OverdueRow) => {
    if (row.latitude === null || row.longitude === null) {
      return;
    }
    if (stopIds.has(row.id)) {
      return;
    }
    setStops((prev) => [
      ...prev,
      {
        address: row.address,
        balanceCents: row.currentBalanceCents,
        customerId: row.customerId,
        customerName: row.customerName,
        latitude: row.latitude as number,
        longitude: row.longitude as number,
        phone: row.phone,
        rowId: row.id,
      },
    ]);
  };

  const removeStop = (rowId: string) => {
    setStops((prev) => prev.filter((s) => s.rowId !== rowId));
  };

  const moveStop = (rowId: string, dir: -1 | 1) => {
    setStops((prev) => {
      const idx = prev.findIndex((s) => s.rowId === rowId);
      const next = idx + dir;
      if (idx === -1 || next < 0 || next >= prev.length) {
        return prev;
      }
      const copy = [...prev];
      const [item] = copy.splice(idx, 1);
      copy.splice(next, 0, item);
      return copy;
    });
  };

  return (
    <div className="grid h-full grid-cols-1 gap-4 lg:grid-cols-[420px_1fr]">
      <div className="flex min-h-0 flex-col gap-4 overflow-hidden">
        <section className="flex flex-col rounded-md border">
          <header className="flex items-center justify-between border-b p-3">
            <div>
              <h2 className="text-sm font-semibold">Route</h2>
              <p className="text-xs text-muted-foreground">
                {stops.length} stop{stops.length === 1 ? "" : "s"}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                disabled={stops.length === 0}
                onClick={() => downloadCsv(stops)}
                size="sm"
                variant="outline"
              >
                Export CSV
              </Button>
              <Button
                disabled={stops.length === 0}
                onClick={() => setStops([])}
                size="sm"
                variant="ghost"
              >
                Clear
              </Button>
            </div>
          </header>
          <ol className="max-h-72 overflow-y-auto">
            {stops.length === 0 && (
              <li className="p-3 text-sm text-muted-foreground">
                No stops yet. Add overdue customers below.
              </li>
            )}
            {stops.map((s, idx) => (
              <li
                className="flex items-start gap-2 border-b p-2 last:border-b-0"
                key={s.rowId}
              >
                <span className="mt-1 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {s.customerName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {s.address}
                  </p>
                  <p className="font-mono text-xs">
                    {formatPeso(s.balanceCents)}
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  <Button
                    aria-label="Move up"
                    disabled={idx === 0}
                    onClick={() => moveStop(s.rowId, -1)}
                    size="icon"
                    variant="ghost"
                  >
                    <ArrowUpIcon className="size-4" />
                  </Button>
                  <Button
                    aria-label="Move down"
                    disabled={idx === stops.length - 1}
                    onClick={() => moveStop(s.rowId, 1)}
                    size="icon"
                    variant="ghost"
                  >
                    <ArrowDownIcon className="size-4" />
                  </Button>
                  <Button
                    aria-label="Remove"
                    onClick={() => removeStop(s.rowId)}
                    size="icon"
                    variant="ghost"
                  >
                    <XIcon className="size-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="flex min-h-0 flex-1 flex-col rounded-md border">
          <header className="border-b p-3">
            <h2 className="text-sm font-semibold">Overdue customers</h2>
            <p className="text-xs text-muted-foreground">
              Tap "Add" to append to the route.
            </p>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {isLoading && (
              <p className="p-3 text-sm text-muted-foreground">Loading…</p>
            )}
            {error && (
              <p className="p-3 text-sm text-destructive">
                Failed to load overdue customers.
              </p>
            )}
            {!isLoading && !error && rows.length === 0 && (
              <p className="p-3 text-sm text-muted-foreground">
                No overdue customers.
              </p>
            )}
            <ul>
              {rows.map((row) => {
                const hasGps = row.latitude !== null && row.longitude !== null;
                const added = stopIds.has(row.id);
                return (
                  <li
                    className="flex items-start justify-between gap-2 border-b p-2 last:border-b-0"
                    key={row.id}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {row.customerName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {row.address}
                      </p>
                      <p className="font-mono text-xs text-destructive">
                        {formatPeso(row.currentBalanceCents)} ·{" "}
                        {row.daysOverdue}d
                      </p>
                    </div>
                    {hasGps ? (
                      <Button
                        disabled={added}
                        onClick={() => addStop(row)}
                        size="sm"
                        variant={added ? "secondary" : "default"}
                      >
                        {added ? "Added" : "Add"}
                      </Button>
                    ) : (
                      <Badge variant="outline">No GPS</Badge>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      </div>

      <div className="min-h-[400px] overflow-hidden rounded-md border lg:min-h-0">
        <CollectionMap stops={stops} />
      </div>
    </div>
  );
}
