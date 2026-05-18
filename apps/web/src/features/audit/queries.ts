import { useQuery } from "@tanstack/react-query";
import type { InferResponseType } from "hono/client";
import type { AuditEntityType } from "schema";

import { api } from "@/lib/api";

export type AuditEventRow = InferResponseType<
  typeof api.api.audit.$get,
  200
>["events"][number];

export type AuditFilters = {
  entityType?: AuditEntityType;
  from?: string;
  limit: number;
  page: number;
  to?: string;
};

export function useAuditQuery(filters: AuditFilters) {
  const query: Record<string, string> = {
    limit: String(filters.limit),
    page: String(filters.page),
  };
  if (filters.entityType) {
    query.entityType = filters.entityType;
  }
  if (filters.from) {
    query.from = filters.from;
  }
  if (filters.to) {
    query.to = filters.to;
  }

  return useQuery({
    queryFn: async () => {
      const res = await api.api.audit.$get({ query });
      if (!res.ok) {
        throw new Error("Failed to fetch audit log");
      }
      return res.json();
    },
    queryKey: [
      "audit",
      filters.page,
      filters.limit,
      filters.entityType ?? "all",
      filters.from ?? "",
      filters.to ?? "",
    ] as const,
  });
}
