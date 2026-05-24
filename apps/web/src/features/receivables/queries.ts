import type { InferRequestType, InferResponseType } from "hono/client";

import { api } from "@/lib/api";
import { createResourceQueries } from "@/lib/queries";

import { customerQueries } from "../customers/queries";

export type ReceivableWithDetail = InferResponseType<
  (typeof api.api.receivables)[":id"]["$get"],
  200
>;

type CreateReceivableBody = InferRequestType<
  typeof api.api.receivables.$post
>["json"];

export const receivableQueries = createResourceQueries({
  create: {
    fn: (data: CreateReceivableBody) =>
      api.api.receivables.$post({ json: data }),
    onSuccess: ({ queryClient, vars }) => {
      void queryClient.invalidateQueries({
        queryKey: customerQueries.keys.lists(),
      });
      void queryClient.invalidateQueries({
        queryKey: customerQueries.keys.detail(vars.customerId),
      });
    },
  },
  detail: (id: string) =>
    api.api.receivables[":id"].$get({ param: { id } }),
  idType: "string",
  name: "receivables",
});

export const receivableKeys = receivableQueries.keys;
