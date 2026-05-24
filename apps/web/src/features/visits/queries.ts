import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { InferRequestType, InferResponseType } from "hono/client";

import { api, parseApiError } from "@/lib/api";

import { customerQueries } from "../customers/queries";

export type VisitListItem = InferResponseType<
  typeof api.api.visits.$get,
  200
>[number];

export type OpenPromiseItem = InferResponseType<
  (typeof api.api.visits)["open-promises"]["$get"],
  200
>[number];

type CreateVisitBody = InferRequestType<typeof api.api.visits.$post>["json"];

export const visitKeys = {
  all: ["visits"] as const,
  list: (customerId?: string) =>
    ["visits", "list", { customerId: customerId ?? null }] as const,
  openPromises: () => ["visits", "open-promises"] as const,
};

export function useVisitsQuery({ customerId }: { customerId?: string } = {}) {
  return useQuery({
    queryFn: async () => {
      const res = await api.api.visits.$get({
        query: customerId ? { customerId } : {},
      });
      if (!res.ok) {
        throw await parseApiError(
          res as unknown as Response,
          "Failed to load visits"
        );
      }
      return res.json();
    },
    queryKey: visitKeys.list(customerId),
  });
}

export function useOpenPromisesQuery() {
  return useQuery({
    queryFn: async () => {
      const res = await api.api.visits["open-promises"].$get();
      if (!res.ok) {
        throw await parseApiError(
          res as unknown as Response,
          "Failed to load promises"
        );
      }
      return res.json();
    },
    queryKey: visitKeys.openPromises(),
  });
}

export function useRecordVisitMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateVisitBody) => {
      const res = await api.api.visits.$post({ json: data });
      if (!res.ok) {
        throw await parseApiError(
          res as unknown as Response,
          "Failed to record visit"
        );
      }
      return res.json();
    },
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: visitKeys.all });
      void queryClient.invalidateQueries({
        queryKey: customerQueries.keys.detail(vars.customerId),
      });
    },
  });
}

export function useResolvePromiseMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { visitId: string; customerId: string }) => {
      const res = await api.api.visits[":id"]["resolve-promise"].$patch({
        param: { id: vars.visitId },
      });
      if (!res.ok) {
        throw await parseApiError(
          res as unknown as Response,
          "Failed to resolve promise"
        );
      }
      return res.json();
    },
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: visitKeys.all });
      void queryClient.invalidateQueries({
        queryKey: customerQueries.keys.detail(vars.customerId),
      });
    },
  });
}
