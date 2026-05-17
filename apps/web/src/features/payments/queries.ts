import type { InferRequestType } from "hono/client";

import { api } from "@/lib/api";
import { createResourceQueries } from "@/lib/queries";

import { customerQueries } from "../customers/queries";
import { receivableQueries } from "../receivables/queries";

type CreatePaymentBody = InferRequestType<
  typeof api.api.payments.$post
>["json"];

type CreatePaymentVars = CreatePaymentBody & { customerId: number };

export const paymentQueries = createResourceQueries({
  create: {
    fn: (data: CreatePaymentVars) => {
      const { customerId: _cid, ...body } = data;
      return api.api.payments.$post({ json: body });
    },
    onSuccess: ({ queryClient, vars }) => {
      void queryClient.invalidateQueries({
        queryKey: receivableQueries.keys.detail(vars.receivableId),
      });
      void queryClient.invalidateQueries({
        queryKey: customerQueries.keys.detail(vars.customerId),
      });
    },
  },
  name: "payments",
});

export const paymentKeys = paymentQueries.keys;
