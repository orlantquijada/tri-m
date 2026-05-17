import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { InferRequestType, InferResponseType } from "hono/client";

import { api, parseApiError } from "@/lib/api";

export const userKeys = {
  all: ["users"] as const,
  distributorUsers: () => [...userKeys.all, "distributor-users"] as const,
};

export type DistributorUser = InferResponseType<
  (typeof api.api.users)["distributor-users"]["$get"],
  200
>[number];

type CreateDistributorUserBody = InferRequestType<
  (typeof api.api.users)["distributor-users"]["$post"]
>["json"];

type UpdateUserBody = InferRequestType<
  (typeof api.api.users)[":id"]["$patch"]
>["json"];

export function useDistributorUsersQuery() {
  return useQuery({
    queryFn: async () => {
      const res = await api.api.users["distributor-users"].$get();
      if (!res.ok) {
        throw await parseApiError(res, "Failed to fetch distributor users");
      }
      return res.json();
    },
    queryKey: userKeys.distributorUsers(),
  });
}

export function useCreateDistributorUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateDistributorUserBody) => {
      const res = await api.api.users["distributor-users"].$post({
        json: data,
      });
      if (!res.ok) {
        throw await parseApiError(res, "Failed to create distributor user");
      }
      return res.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: userKeys.distributorUsers(),
      });
    },
  });
}

export function useUpdateUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ data, id }: { data: UpdateUserBody; id: string }) => {
      const res = await api.api.users[":id"].$patch({
        json: data,
        param: { id },
      });
      if (!res.ok) {
        throw await parseApiError(res, "Failed to update user");
      }
      return res.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: userKeys.distributorUsers(),
      });
    },
  });
}
