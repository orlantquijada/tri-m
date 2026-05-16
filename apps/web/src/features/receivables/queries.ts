import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { InferRequestType, InferResponseType } from "hono/client";
import type { PaymentInsert, CustomerSelect } from "schema";

import { api, parseApiError } from "@/lib/api";

import { customerKeys } from "../customers/queries";

export const receivableKeys = {
  all: ["receivables"] as const,
  detail: (id: number) => [...receivableKeys.details(), id] as const,
  details: () => [...receivableKeys.all, "detail"] as const,
};

export function useCreatePaymentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      data: PaymentInsert & { customerId: CustomerSelect["id"] }
    ) => {
      const { customerId: _cid, ...body } = data;
      const res = await api.api.payments.$post({ json: body });
      if (!res.ok) {
        throw await parseApiError(res, "Failed to record payment");
      }
      return res.json();
    },
    onSuccess: (_result, { customerId, receivableId }) => {
      void queryClient.invalidateQueries({
        queryKey: receivableKeys.detail(receivableId),
      });
      void queryClient.invalidateQueries({
        queryKey: customerKeys.detail(customerId),
      });
    },
  });
}

export type ReceivableWithDetail = InferResponseType<
  (typeof api.api.receivables)[":id"]["$get"],
  200
>;

export function useReceivableQuery(id: number) {
  return useQuery({
    queryFn: async (): Promise<ReceivableWithDetail> => {
      const res = await api.api.receivables[":id"].$get({
        param: { id: String(id) },
      });
      if (!res.ok) {
        throw new Error("Failed to fetch receivable");
      }
      return (await res.json()) as ReceivableWithDetail;
    },
    queryKey: receivableKeys.detail(id),
  });
}

type CreateReceivableBody = InferRequestType<
  typeof api.api.receivables.$post
>["json"];

export function useCreateReceivableMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateReceivableBody) => {
      const res = await api.api.receivables.$post({ json: data });
      if (!res.ok) {
        throw await parseApiError(res, "Failed to create receivable");
      }
      return res.json();
    },
    onSuccess: (_data, { customerId }) => {
      void queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
      void queryClient.invalidateQueries({
        queryKey: customerKeys.detail(customerId),
      });
    },
  });
}
