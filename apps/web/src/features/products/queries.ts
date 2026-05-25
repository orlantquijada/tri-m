import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

export type StockLevelItem = InferResponseType<
  (typeof api.api.products)["stock-levels"]["$get"],
  200
>[number];

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

export const stockLevelsKey = ["products", "stock-levels"] as const;

export function useStockLevels() {
  return useQuery({
    queryFn: async () => {
      const res = await api.api.products["stock-levels"].$get({ query: {} });
      if (!res.ok) {
        throw await parseApiError(
          res as unknown as Response,
          "Failed to fetch stock levels"
        );
      }
      return res.json();
    },
    queryKey: stockLevelsKey,
  });
}

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
