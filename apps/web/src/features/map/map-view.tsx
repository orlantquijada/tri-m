import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import type { Marker, MarkerClusterGroup } from "leaflet";
import { useEffect, useRef } from "react";

import type { CustomerListItem } from "@/features/customers/queries";
import { DEFAULT_MAP_CENTER } from "@/features/map/constants";
import { useLeafletMap } from "@/features/map/use-leaflet-map";
import { formatPeso, mapsUrl } from "@/lib/format";

type Customer = Pick<
  CustomerListItem,
  | "fullName"
  | "id"
  | "latitude"
  | "longitude"
  | "outstandingBalanceCents"
  | "phone"
  | "riskStatus"
>;

type Props = { customers: Customer[] };

const MAP_VIEW_ZOOM = 12;

function esc(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function MapView({ customers }: Props) {
  const clusterRef = useRef<MarkerClusterGroup | null>(null);

  const { containerRef, leafletRef, ready } = useLeafletMap({
    center: DEFAULT_MAP_CENTER,
    onReady: async (map, L) => {
      await import("leaflet.markercluster");
      const cluster = L.markerClusterGroup();
      map.addLayer(cluster);
      clusterRef.current = cluster;
    },
    zoom: MAP_VIEW_ZOOM,
  });

  useEffect(() => {
    if (!ready) {
      return;
    }
    const L = leafletRef.current;
    const cluster = clusterRef.current;
    if (!(L && cluster)) {
      return;
    }
    cluster.clearLayers();
    const markers: Marker[] = [];
    for (const c of customers) {
      if (c.latitude === null || c.longitude === null) {
        continue;
      }
      markers.push(
        L.marker([c.latitude, c.longitude]).bindPopup(
          `<div style="min-width:160px">
                <p style="font-weight:600;margin:0 0 4px">${esc(c.fullName)}</p>
                <p style="margin:0 0 2px">${esc(c.phone)}</p>
                <p style="margin:0 0 2px">Risk: ${esc(c.riskStatus)}</p>
                <p style="margin:0 0 6px">Balance: ${esc(formatPeso(c.outstandingBalanceCents))}</p>
                <a href="/customers/${c.id}" style="margin-right:8px">Profile</a>
                <a href="${mapsUrl(c.latitude, c.longitude)}" target="_blank" rel="noopener noreferrer">Google Maps</a>
              </div>`
        )
      );
    }
    cluster.addLayers(markers);
  }, [customers, ready, leafletRef]);

  return <div className="h-full w-full" ref={containerRef} />;
}
