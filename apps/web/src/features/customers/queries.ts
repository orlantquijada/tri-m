import { useQuery } from "@tanstack/react-query";
import type { InferRequestType, InferResponseType } from "hono/client";

import { api } from "@/lib/api";
import { createResourceQueries } from "@/lib/queries";

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

export const customerQueries = createResourceQueries({
  create: (data: CreateCustomerBody) => api.api.customers.$post({ json: data }),
  detail: (id: number) =>
    api.api.customers[":id"].$get({ param: { id: String(id) } }),
  list: () => api.api.customers.$get(),
  name: "customers",
  update: (id: number, data: UpdateCustomerBody) =>
    api.api.customers[":id"].$patch({
      json: data,
      param: { id: String(id) },
    }),
});

export const customerKeys = customerQueries.keys;

export function usePhoneLookup(phone: string) {
  return useQuery({
    enabled: phone.length > 0,
    queryFn: async () => {
      const res = await api.api.customers.lookup.$get({ query: { phone } });
      if (!res.ok) {
        return { matches: [] as PhoneLookupMatch[] };
      }
      return res.json() as Promise<{ matches: PhoneLookupMatch[] }>;
    },
    queryKey: ["customers", "lookup", phone],
  });
}

type PhoneLookupMatch = InferResponseType<
  typeof api.api.customers.lookup.$get,
  200
>["matches"][number];
