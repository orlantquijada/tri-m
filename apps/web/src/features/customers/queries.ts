import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { InferRequestType, InferResponseType } from "hono/client";

import { api, parseApiError } from "@/lib/api";

export const customerKeys = {
  all: ["customers"] as const,
  detail: (id: number) => [...customerKeys.details(), id] as const,
  details: () => [...customerKeys.all, "detail"] as const,
  lists: () => [...customerKeys.all, "list"] as const,
};

export type CustomerListItem = InferResponseType<
  typeof api.api.customers.$get,
  200
>[number];

export type CustomerWithReceivables = InferResponseType<
  (typeof api.api.customers)[":id"]["$get"],
  200
>;

type CreateCustomerBody = InferRequestType<
  typeof api.api.customers.$post
>["json"];

type UpdateCustomerBody = InferRequestType<
  (typeof api.api.customers)[":id"]["$patch"]
>["json"];

export function useCustomersQuery() {
  return useQuery({
    queryFn: async () => {
      const res = await api.api.customers.$get();
      if (!res.ok) {
        throw new Error("Failed to fetch customers");
      }
      return await res.json();
    },
    queryKey: customerKeys.lists(),
  });
}

export function useCustomerQuery(id: number) {
  return useQuery({
    queryFn: async () => {
      const res = await api.api.customers[":id"].$get({
        param: { id: String(id) },
      });
      if (!res.ok) {
        throw new Error("Failed to fetch customer");
      }
      return await res.json();
    },
    queryKey: customerKeys.detail(id),
  });
}

export function useCreateCustomerMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateCustomerBody) => {
      const res = await api.api.customers.$post({ json: data });
      if (!res.ok) {
        throw await parseApiError(res, "Failed to create customer");
      }
      return res.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
    },
  });
}

export function useUpdateCustomerMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      data,
      id,
    }: {
      data: UpdateCustomerBody;
      id: number;
    }) => {
      const res = await api.api.customers[":id"].$patch({
        json: data,
        param: { id: String(id) },
      });
      if (!res.ok) {
        throw await parseApiError(res, "Failed to update customer");
      }
      return res.json();
    },
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: customerKeys.detail(id) });
    },
  });
}
