import "leaflet/dist/leaflet.css";
import { createFileRoute } from "@tanstack/react-router";

import { customerQueries } from "@/features/customers/queries";
import { MapView } from "@/features/map/map-view";

function MapPage() {
  const { data, error, isLoading } = customerQueries.useList();

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-destructive">
        Failed to load customers
      </div>
    );
  }

  const customersWithCoords = (data ?? []).filter(
    (c): c is typeof c & { latitude: number; longitude: number } =>
      c.latitude !== null && c.longitude !== null
  );

  return (
    <div className="isolate -m-4 h-[calc(100svh-3.5rem)]">
      <MapView customers={customersWithCoords} />
    </div>
  );
}

export const Route = createFileRoute("/_authed/map")({
  component: MapPage,
});
