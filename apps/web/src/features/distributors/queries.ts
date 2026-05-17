import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { InferRequestType, InferResponseType } from "hono/client";

import { api, parseApiError } from "@/lib/api";

export const distributorKeys = {
  all: ["distributors"] as const,
  detail: (id: number) => [...distributorKeys.details(), id] as const,
  details: () => [...distributorKeys.all, "detail"] as const,
  lists: () => [...distributorKeys.all, "list"] as const,
};

export type DistributorListItem = InferResponseType<
  typeof api.api.distributors.$get,
  200
>[number];

export type DistributorDetail = InferResponseType<
  (typeof api.api.distributors)[":id"]["$get"],
  200
>;

type CreateDistributorBody = InferRequestType<
  typeof api.api.distributors.$post
>["json"];

type UpdateDistributorBody = InferRequestType<
  (typeof api.api.distributors)[":id"]["$patch"]
>["json"];

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

export function useDistributorQuery(id: number) {
  return useQuery({
    queryFn: async () => {
      const res = await api.api.distributors[":id"].$get({
        param: { id: String(id) },
      });
      if (!res.ok) {
        throw await parseApiError(res, "Failed to fetch distributor");
      }
      return res.json();
    },
    queryKey: distributorKeys.detail(id),
  });
}

export function useCreateDistributorMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateDistributorBody) => {
      const res = await api.api.distributors.$post({ json: data });
      if (!res.ok) {
        throw await parseApiError(res, "Failed to create distributor");
      }
      return res.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: distributorKeys.lists() });
    },
  });
}

export function useUpdateDistributorMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      data,
      id,
    }: {
      data: UpdateDistributorBody;
      id: number;
    }) => {
      const res = await api.api.distributors[":id"].$patch({
        json: data,
        param: { id: String(id) },
      });
      if (!res.ok) {
        throw await parseApiError(res, "Failed to update distributor");
      }
      return res.json();
    },
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: distributorKeys.lists() });
      void queryClient.invalidateQueries({
        queryKey: distributorKeys.detail(id),
      });
    },
  });
}
