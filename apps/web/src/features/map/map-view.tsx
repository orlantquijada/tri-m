import type { Map as LeafletMap, Marker } from "leaflet";
import { useEffect, useRef } from "react";

import type { CustomerListItem } from "@/features/customers/queries";
import { formatPeso, mapsUrl } from "@/lib/format";

type Customer = Pick<
  CustomerListItem,
  | "id"
  | "fullName"
  | "latitude"
  | "longitude"
  | "outstandingBalanceCents"
  | "phone"
  | "riskStatus"
>;

type Props = { customers: Customer[] };

const MANILA: [number, number] = [14.5995, 120.9842];

function esc(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function MapView({ customers }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<Marker[]>([]);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }
    let aborted = false;

    void (async () => {
      const L = await import("leaflet");
      if (aborted || !containerRef.current) {
        return;
      }

      if (!mapRef.current) {
        const map = L.default.map(containerRef.current).setView(MANILA, 12);
        L.default
          .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          })
          .addTo(map);
        mapRef.current = map;
      }

      for (const m of markersRef.current) {
        m.remove();
      }
      markersRef.current = [];

      const map = mapRef.current;
      const added: Marker[] = [];
      for (const c of customers) {
        if (c.latitude === null || c.longitude === null) {
          continue;
        }

        added.push(
          L.default
            .marker([c.latitude, c.longitude])
            .bindPopup(
              `<div style="min-width:160px">
                <p style="font-weight:600;margin:0 0 4px">${esc(c.fullName)}</p>
                <p style="margin:0 0 2px">${esc(c.phone)}</p>
                <p style="margin:0 0 2px">Risk: ${esc(c.riskStatus)}</p>
                <p style="margin:0 0 6px">Balance: ${esc(formatPeso(c.outstandingBalanceCents))}</p>
                <a href="/customers/${c.id}" style="margin-right:8px">Profile</a>
                <a href="${mapsUrl(c.latitude, c.longitude)}" target="_blank" rel="noopener noreferrer">Google Maps</a>
              </div>`
            )
            .addTo(map)
        );
      }
      markersRef.current = added;
    })();

    return () => {
      aborted = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markersRef.current = [];
    };
  }, [customers]);

  return <div ref={containerRef} className="h-full w-full" />;
}
