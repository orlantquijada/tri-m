import type { InferRequestType, InferResponseType } from "hono/client";

import { api } from "@/lib/api";
import { createResourceQueries } from "@/lib/queries";

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

export const distributorQueries = createResourceQueries({
  create: (data: CreateDistributorBody) =>
    api.api.distributors.$post({ json: data }),
  detail: (id: number) =>
    api.api.distributors[":id"].$get({ param: { id: String(id) } }),
  list: () => api.api.distributors.$get(),
  name: "distributors",
  update: (id: number, data: UpdateDistributorBody) =>
    api.api.distributors[":id"].$patch({
      json: data,
      param: { id: String(id) },
    }),
});

export const distributorKeys = distributorQueries.keys;
