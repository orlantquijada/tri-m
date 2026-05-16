import "leaflet/dist/leaflet.css";
import { createFileRoute } from "@tanstack/react-router";

import { useCustomersQuery } from "@/features/customers/queries";
import { MapView } from "@/features/map/map-view";

function MapPage() {
  const { data, error, isLoading } = useCustomersQuery();

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
        Loading…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-destructive text-sm">
        Failed to load customers
      </div>
    );
  }

  const customersWithCoords = (data ?? []).filter(
    (c): c is typeof c & { latitude: number; longitude: number } =>
      c.latitude !== null && c.longitude !== null
  );

  return (
    <div className="-m-4 h-[calc(100svh-3.5rem)] isolate">
      <MapView customers={customersWithCoords} />
    </div>
  );
}

export const Route = createFileRoute("/_authed/map")({
  component: MapPage,
});
