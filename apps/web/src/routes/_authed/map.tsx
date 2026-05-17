import "leaflet/dist/leaflet.css";
import {
  createFileRoute,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";
import { useMemo } from "react";
import { riskStatusEnum } from "schema";
import { z } from "zod";

import { useCustomersMapQuery } from '@/features/customers/queries';
import type { CustomersMapFilters } from '@/features/customers/queries';
import { MapFilters } from "@/features/map/map-filters";
import { MapView } from "@/features/map/map-view";

const searchSchema = z.object({
  hasOverdue: z
    .union([z.boolean(), z.enum(["true", "false"])])
    .optional()
    .transform((v) => (typeof v === "boolean" ? v : v === "true")),
  riskStatus: z
    .union([z.string(), z.array(riskStatusEnum)])
    .optional()
    .transform((v) => {
      if (!v) {
        return [] as z.infer<typeof riskStatusEnum>[];
      }
      const arr = Array.isArray(v) ? v : v.split(",").filter(Boolean);
      return arr.filter(
        (s): s is z.infer<typeof riskStatusEnum> =>
          riskStatusEnum.safeParse(s).success
      );
    }),
});

function MapPage() {
  const search = useSearch({ from: "/_authed/map" });
  const navigate = useNavigate();
  const filters: CustomersMapFilters = {
    hasOverdue: search.hasOverdue ?? false,
    riskStatus: search.riskStatus ?? [],
  };

  const { data, error, isLoading } = useCustomersMapQuery(filters);

  const customersWithCoords = useMemo(
    () =>
      (data ?? []).filter(
        (c): c is typeof c & { latitude: number; longitude: number } =>
          c.latitude !== null && c.longitude !== null
      ),
    [data]
  );

  if (isLoading && !data) {
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

  return (
    <div className="isolate -m-4 flex h-[calc(100svh-3.5rem)] flex-col">
      <MapFilters
        value={filters}
        onChange={(next) => {
          void navigate({
            replace: true,
            search: {
              hasOverdue: next.hasOverdue ? true : undefined,
              riskStatus:
                next.riskStatus.length > 0 ? next.riskStatus : undefined,
            },
            to: "/map",
          });
        }}
      />
      <div className="min-h-0 flex-1">
        <MapView customers={customersWithCoords} />
      </div>
    </div>
  );
}

export const Route = createFileRoute("/_authed/map")({
  component: MapPage,
  validateSearch: searchSchema,
});
