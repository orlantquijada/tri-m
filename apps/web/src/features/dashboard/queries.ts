import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";

export type TrendRange = "7d" | "30d" | "90d";

export const dashboardKeys = {
  aging: () => [...dashboardKeys.all, "aging"] as const,
  all: ["dashboard"] as const,
  collectionTrend: (range: TrendRange) =>
    [...dashboardKeys.all, "collection-trend", range] as const,
  totals: () => [...dashboardKeys.all, "totals"] as const,
};

export function useDashboardTotalsQuery() {
  return useQuery({
    queryFn: async () => {
      const res = await api.api.dashboard.totals.$get();
      if (!res.ok) {
        throw new Error("Failed to fetch dashboard totals");
      }
      return res.json();
    },
    queryKey: dashboardKeys.totals(),
  });
}

export function useCollectionTrendQuery(range: TrendRange) {
  return useQuery({
    queryFn: async () => {
      const res = await api.api.dashboard["collection-trend"].$get({
        query: { range },
      });
      if (!res.ok) {
        throw new Error("Failed to fetch collection trend");
      }
      return res.json();
    },
    queryKey: dashboardKeys.collectionTrend(range),
  });
}

export function useAgingBucketsQuery() {
  return useQuery({
    queryFn: async () => {
      const res = await api.api.dashboard.aging.$get();
      if (!res.ok) {
        throw new Error("Failed to fetch aging buckets");
      }
      return res.json();
    },
    queryKey: dashboardKeys.aging(),
  });
}
