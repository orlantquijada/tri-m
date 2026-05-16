import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";

import { customerKeys } from "../customers/queries";

export const receivableKeys = {
  all: ["receivables"] as const,
  detail: (id: number) => [...receivableKeys.details(), id] as const,
  details: () => [...receivableKeys.all, "detail"] as const,
};

export function useReceivableQuery(id: number) {
  return useQuery({
    queryFn: async () => {
      const res = await api.api.receivables[":id"].$get({
        param: { id: String(id) },
      });
      if (!res.ok) {
        throw new Error("Failed to fetch receivable");
      }
      return res.json();
    },
    queryKey: receivableKeys.detail(id),
  });
}

type ReceivablePayload = {
  adminOverride?: boolean;
  customerId: number;
  downPaymentCents: number;
  firstDueDate: string;
  monthlyDueAmountCents?: number;
  paymentTermMonths?: number;
  productDescription: string;
  saleDate: string;
  totalAmountCents: number;
};

export function useCreateReceivableMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: ReceivablePayload) => {
      const res = await api.api.receivables.$post({ json: data });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as { error?: string }).error ?? "Failed to create receivable"
        );
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
