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

export type StockMovementItem = InferResponseType<
  (typeof api.api)["stock-movements"]["$get"],
  200
>[number];

type CreateProductBody = InferRequestType<
  typeof api.api.products.$post
>["json"];

type UpdateProductBody = InferRequestType<
  (typeof api.api.products)[":id"]["$patch"]
>["json"];

type RecordMovementBody = InferRequestType<
  (typeof api.api)["stock-movements"]["$post"]
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

export const movementKeys = {
  all: ["movements"] as const,
  list: (productId: string) => ["movements", productId] as const,
  recent: (limit: number) => ["movements", "recent", limit] as const,
};

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

export function useProductStockLevels(productId: string) {
  return useQuery({
    queryFn: async () => {
      const res = await api.api.products["stock-levels"].$get({
        query: { productId },
      });
      if (!res.ok) {
        throw await parseApiError(
          res as unknown as Response,
          "Failed to fetch stock levels"
        );
      }
      return res.json();
    },
    queryKey: [...stockLevelsKey, productId] as const,
  });
}

export function useMovements(
  productId: string,
  options: { includeVoided?: boolean } = {}
) {
  const includeVoided = options.includeVoided ?? true;
  return useQuery({
    queryFn: async () => {
      const res = await api.api["stock-movements"].$get({
        query: { includeVoided: String(includeVoided), productId },
      });
      if (!res.ok) {
        throw await parseApiError(
          res as unknown as Response,
          "Failed to fetch movements"
        );
      }
      return res.json();
    },
    queryKey: [...movementKeys.list(productId), { includeVoided }] as const,
  });
}

export function useRecentMovements(limit = 5) {
  return useQuery({
    queryFn: async () => {
      const res = await api.api["stock-movements"].$get({
        query: { limit: String(limit) },
      });
      if (!res.ok) {
        throw await parseApiError(
          res as unknown as Response,
          "Failed to fetch recent movements"
        );
      }
      return res.json();
    },
    queryKey: movementKeys.recent(limit),
  });
}

export function useRecordMovement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: RecordMovementBody) => {
      const res = await api.api["stock-movements"].$post({ json: data });
      if (!res.ok) {
        throw await parseApiError(
          res as unknown as Response,
          "Failed to record movement"
        );
      }
      return res.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: stockLevelsKey });
      void queryClient.invalidateQueries({ queryKey: movementKeys.all });
    },
  });
}

export function useVoidMovement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await api.api["stock-movements"][":id"].void.$post({
        json: { reason },
        param: { id },
      });
      if (!res.ok) {
        throw await parseApiError(
          res as unknown as Response,
          "Failed to void movement"
        );
      }
      return res.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: stockLevelsKey });
      void queryClient.invalidateQueries({ queryKey: movementKeys.all });
    },
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
