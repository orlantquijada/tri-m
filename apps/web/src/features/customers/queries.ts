import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";

export const customerKeys = {
  all: ["customers"] as const,
  detail: (id: number) => [...customerKeys.details(), id] as const,
  details: () => [...customerKeys.all, "detail"] as const,
  lists: () => [...customerKeys.all, "list"] as const,
};

export function useCustomersQuery() {
  return useQuery({
    queryFn: async () => {
      const res = await api.api.customers.$get();
      if (!res.ok) {
        throw new Error("Failed to fetch customers");
      }
      return res.json();
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
      return res.json();
    },
    queryKey: customerKeys.detail(id),
  });
}

type CustomerPayload = {
  address: string;
  distributorId?: number;
  fullName: string;
  latitude?: number | null;
  longitude?: number | null;
  notes?: string | null;
  phone: string;
  riskStatus: "good" | "watchlist" | "blacklisted";
};

export function useCreateCustomerMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CustomerPayload) => {
      const res = await api.api.customers.$post({ json: data });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as { error?: string }).error ?? "Failed to create customer"
        );
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
      data: Partial<CustomerPayload>;
      id: number;
    }) => {
      const res = await api.api.customers[":id"].$patch({
        json: data,
        param: { id: String(id) },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as { error?: string }).error ?? "Failed to update customer"
        );
      }
      return res.json();
    },
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: customerKeys.detail(id) });
    },
  });
}
