import { useQuery } from "@tanstack/react-query";
import type { InferResponseType } from "hono/client";

import { api } from "@/lib/api";

export type DistributorPerformanceRow = InferResponseType<
  (typeof api.api.reports)["distributor-performance"]["$get"],
  200
>[number];

export type ReportFilters = {
  from?: string;
  to?: string;
};

export function useDistributorPerformanceQuery(filters: ReportFilters) {
  const query: Record<string, string> = {};
  if (filters.from) {
    query.from = filters.from;
  }
  if (filters.to) {
    query.to = filters.to;
  }

  return useQuery({
    queryFn: async () => {
      const res = await api.api.reports["distributor-performance"].$get({
        query,
      });
      if (!res.ok) {
        throw new Error("Failed to fetch performance report");
      }
      return res.json();
    },
    queryKey: [
      "reports",
      "distributor-performance",
      filters.from ?? "",
      filters.to ?? "",
    ] as const,
  });
}
