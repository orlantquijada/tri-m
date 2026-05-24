import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { InferRequestType, InferResponseType } from "hono/client";

import { api, parseApiError } from "@/lib/api";
import { createResourceQueries } from "@/lib/queries";

export type ProductListItem = InferResponseType<
  typeof api.api.products.$get,
  200
>[number];

export type Product = InferResponseType<
  (typeof api.api.products)[":id"]["$get"],
  200
>;

type CreateProductBody = InferRequestType<
  typeof api.api.products.$post
>["json"];

type UpdateProductBody = InferRequestType<
  (typeof api.api.products)[":id"]["$patch"]
>["json"];

export const productQueries = createResourceQueries({
  create: (data: CreateProductBody) => api.api.products.$post({ json: data }),
  detail: (id: string) => api.api.products[":id"].$get({ param: { id } }),
  idType: "string",
  list: () => api.api.products.$get({ query: {} }),
  name: "products",
  update: (id: string, data: UpdateProductBody) =>
    api.api.products[":id"].$patch({
      json: data,
      param: { id },
    }),
});

export const productKeys = productQueries.keys;

export function useArchiveProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.api.products[":id"].archive.$post({
        param: { id },
      });
      if (!res.ok) {
        throw await parseApiError(
          res as unknown as Response,
          "Failed to archive product"
        );
      }
      return res.json();
    },
    onSuccess: (data, id) => {
      queryClient.setQueryData(productKeys.detail(id), data);
      void queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    },
  });
}
