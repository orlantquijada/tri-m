import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";

export function useCustomersQuery() {
  return useQuery({
    queryFn: async () => {
      const res = await api.api.customers.$get();
      if (!res.ok) {
        throw new Error("Failed to fetch customers");
      }
      return res.json();
    },
    queryKey: ["customers"],
  });
}
