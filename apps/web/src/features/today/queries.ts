import { useQuery } from "@tanstack/react-query";
import type { InferResponseType } from "hono/client";

import { api, parseApiError } from "@/lib/api";

export type TodayPayload = InferResponseType<
  typeof api.api.dashboard.today.$get,
  200
>;

export const todayKeys = {
  all: ["today"] as const,
};

export function useTodayQuery() {
  return useQuery({
    queryFn: async () => {
      const res = await api.api.dashboard.today.$get();
      if (!res.ok) {
        throw await parseApiError(
          res as unknown as Response,
          "Failed to load today"
        );
      }
      return res.json();
    },
    queryKey: todayKeys.all,
  });
}
