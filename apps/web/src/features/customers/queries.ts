import { useQuery } from "@tanstack/react-query";
import type { InferRequestType, InferResponseType } from "hono/client";
import type { RiskStatus } from "schema";

import { api, parseApiError } from "@/lib/api";
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
  list: () => api.api.customers.$get({ query: {} }),
  name: "customers",
  update: (id: number, data: UpdateCustomerBody) =>
    api.api.customers[":id"].$patch({
      json: data,
      param: { id: String(id) },
    }),
});

export const customerKeys = {
  ...customerQueries.keys,
  timeline: (id: number) =>
    [...customerQueries.keys.detail(id), "timeline"] as const,
};

export type CustomerTimeline = InferResponseType<
  (typeof api.api.customers)[":id"]["timeline"]["$get"],
  200
>;

export type CustomerTimelineEvent = CustomerTimeline["events"][number];

export function useCustomerTimelineQuery(customerId: number) {
  return useQuery({
    queryFn: async () => {
      const res = await api.api.customers[":id"].timeline.$get({
        param: { id: String(customerId) },
        query: {},
      });
      if (!res.ok) {
        throw await parseApiError(
          res as unknown as Response,
          "Failed to load timeline"
        );
      }
      return res.json();
    },
    queryKey: customerKeys.timeline(customerId),
  });
}

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

export function useReverseGeocodeQuery(lat: number | null, lng: number | null) {
  return useQuery({
    enabled: lat !== null && lng !== null,
    queryFn: async () => {
      const res = await api.api.geocode.reverse.$get({
        query: { lat: String(lat), lng: String(lng) },
      });
      if (!res.ok) {
        return { data: null };
      }
      return res.json();
    },
    queryKey: ["geocode", "reverse", lat, lng] as const,
    staleTime: 1000 * 60 * 60,
  });
}

export function useMissingLocationCustomersQuery() {
  return useQuery({
    queryFn: async () => {
      const res = await api.api.customers.$get({
        query: { missingLocation: "true" },
      });
      if (!res.ok) {
        throw await parseApiError(
          res as unknown as Response,
          "Failed to fetch customers"
        );
      }
      return res.json();
    },
    queryKey: ["customers", "missing-location"] as const,
  });
}

export type CustomersMapFilters = {
  hasOverdue: boolean;
  riskStatus: RiskStatus[];
};

export function useCustomersMapQuery(filters: CustomersMapFilters) {
  const riskStatusKey = filters.riskStatus.join(",");
  const query: Record<string, string> = {};
  if (filters.hasOverdue) {
    query.hasOverdue = "true";
  }
  if (riskStatusKey) {
    query.riskStatus = riskStatusKey;
  }

  return useQuery({
    queryFn: async () => {
      const res = await api.api.customers.$get({ query });
      if (!res.ok) {
        throw new Error("Failed to fetch customers");
      }
      return res.json();
    },
    queryKey: ["customers", "map", filters.hasOverdue, riskStatusKey] as const,
  });
}
