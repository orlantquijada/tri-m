import { useQuery } from "@tanstack/react-query";
import type { InferResponseType } from "hono/client";

import { api, parseApiError } from "@/lib/api";

export const distributorKeys = {
  all: ["distributors"] as const,
  lists: () => [...distributorKeys.all, "list"] as const,
};

export type DistributorListItem = InferResponseType<
  typeof api.api.distributors.$get,
  200
>[number];

export function useDistributorsQuery() {
  return useQuery({
    queryFn: async () => {
      const res = await api.api.distributors.$get();
      if (!res.ok) {
        throw await parseApiError(res, "Failed to fetch distributors");
      }
      return res.json();
    },
    queryKey: distributorKeys.lists(),
  });
}
