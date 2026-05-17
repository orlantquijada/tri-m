import type { InferRequestType, InferResponseType } from "hono/client";

import { api } from "@/lib/api";
import { createResourceQueries } from "@/lib/queries";

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

export const allUsersQueries = createResourceQueries({
  idType: "string",
  list: () => api.api.users.$get(),
  name: "users",
});

export const userQueries = createResourceQueries({
  create: {
    fn: (data: CreateDistributorUserBody) =>
      api.api.users["distributor-users"].$post({ json: data }),
    onSuccess: ({ queryClient }) => {
      void queryClient.invalidateQueries({
        queryKey: allUsersQueries.keys.lists(),
      });
    },
  },
  idType: "string",
  list: () => api.api.users["distributor-users"].$get(),
  name: "distributor-users",
  update: (id: string, data: UpdateUserBody) =>
    api.api.users[":id"].$patch({ json: data, param: { id } }),
});

export const userKeys = userQueries.keys;

export function useUsersQuery() {
  return allUsersQueries.useList();
}
