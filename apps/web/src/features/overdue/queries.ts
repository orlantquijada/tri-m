import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";

export const overdueKeys = {
  all: ["overdue"] as const,
  list: () => [...overdueKeys.all, "list"] as const,
};

export function useOverdueQuery() {
  return useQuery({
    queryFn: async () => {
      const res = await api.api.overdue.$get();
      if (!res.ok) {
        throw new Error("Failed to fetch overdue accounts");
      }
      return await res.json();
    },
    queryKey: overdueKeys.list(),
  });
}
