import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";

export const dashboardKeys = {
  aging: () => [...dashboardKeys.all, "aging"] as const,
  all: ["dashboard"] as const,
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
