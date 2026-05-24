import "leaflet/dist/leaflet.css";
import type { Map as LeafletMap } from "leaflet";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";
import { useEffect, useRef, useState } from "react";

import { OSM_TILE_ATTRIBUTION, OSM_TILE_URL } from "./constants";

type LeafletNamespace = typeof import("leaflet");

let defaultIconPatched = false;
function patchDefaultIcon(L: LeafletNamespace) {
  if (defaultIconPatched) {
    return;
  }
  defaultIconPatched = true;
  delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
  L.Icon.Default.mergeOptions({ iconRetinaUrl, iconUrl, shadowUrl });
}

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
    let resizeObserver: ResizeObserver | null = null;

    void (async () => {
      const L = await import("leaflet");
      if (aborted || !containerRef.current || mapRef.current) {
        return;
      }
      patchDefaultIcon(L);
      const container = containerRef.current;
      const map = L.map(container).setView(center, zoom);
      L.tileLayer(OSM_TILE_URL, { attribution: OSM_TILE_ATTRIBUTION }).addTo(
        map
      );
      mapRef.current = map;
      leafletRef.current = L;
      await onReadyRef.current?.(map, L);
      if (aborted) {
        return;
      }
      requestAnimationFrame(() => {
        if (!aborted) {
          map.invalidateSize();
        }
      });
      if (typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(() => {
          map.invalidateSize();
        });
        resizeObserver.observe(container);
      }
      setReady(true);
    })();

    return () => {
      aborted = true;
      resizeObserver?.disconnect();
      resizeObserver = null;
      mapRef.current?.remove();
      mapRef.current = null;
      leafletRef.current = null;
    };
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { containerRef, leafletRef, mapRef, ready };
}
