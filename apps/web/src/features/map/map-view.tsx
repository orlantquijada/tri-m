import type { Map as LeafletMap } from "leaflet";
import { useEffect, useRef } from "react";
import type { RiskStatus } from "schema";

import { formatPeso } from "@/features/customers/format";

type Customer = {
  id: number;
  fullName: string;
  latitude: number;
  longitude: number;
  outstandingBalanceCents: number;
  phone: string;
  riskStatus: RiskStatus;
};

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

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    void import("leaflet").then((L) => {
      if (!containerRef.current || mapRef.current) {
        return;
      }

      const map = L.default.map(containerRef.current).setView(MANILA, 12);

      L.default
        .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        })
        .addTo(map);

      for (const c of customers) {
        L.default
          .marker([c.latitude, c.longitude])
          .bindPopup(
            `<div style="min-width:160px">
              <p style="font-weight:600;margin:0 0 4px">${esc(c.fullName)}</p>
              <p style="margin:0 0 2px">${esc(c.phone)}</p>
              <p style="margin:0 0 2px">Risk: ${esc(c.riskStatus)}</p>
              <p style="margin:0 0 6px">Balance: ${esc(formatPeso(c.outstandingBalanceCents))}</p>
              <a href="/customers/${c.id}" style="margin-right:8px">Profile</a>
              <a href="https://www.google.com/maps?q=${c.latitude},${c.longitude}" target="_blank" rel="noopener noreferrer">Google Maps</a>
            </div>`
          )
          .addTo(map);
      }

      mapRef.current = map;
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [customers]);

  return <div ref={containerRef} className="h-full w-full" />;
}
