import "leaflet/dist/leaflet.css";
import type { Map as LeafletMap } from "leaflet";
import { useEffect, useRef, useState } from "react";

import { OSM_TILE_ATTRIBUTION, OSM_TILE_URL } from "./constants";

type LeafletNamespace = typeof import("leaflet");

type Options = {
  center: [number, number];
  zoom: number;
  onReady?: (map: LeafletMap, L: LeafletNamespace) => void | Promise<void>;
};

export function useLeafletMap({ center, zoom, onReady }: Options) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const leafletRef = useRef<LeafletNamespace | null>(null);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }
    let aborted = false;

    void (async () => {
      const L = await import("leaflet");
      if (aborted || !containerRef.current || mapRef.current) {
        return;
      }
      const map = L.map(containerRef.current).setView(center, zoom);
      L.tileLayer(OSM_TILE_URL, { attribution: OSM_TILE_ATTRIBUTION }).addTo(
        map
      );
      mapRef.current = map;
      leafletRef.current = L;
      await onReadyRef.current?.(map, L);
      if (!aborted) {
        setReady(true);
      }
    })();

    return () => {
      aborted = true;
      mapRef.current?.remove();
      mapRef.current = null;
      leafletRef.current = null;
    };
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { containerRef, leafletRef, mapRef, ready };
}
